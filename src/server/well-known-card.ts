/**
 * `.well-known/mcp.json` — MCP Server Card builder.
 *
 * Pure function that assembles the discovery card served at
 * `/.well-known/mcp.json`. Lives in its own module so the card shape
 * can be unit-tested without spinning up an Express server.
 *
 * Registry crawlers (Anthropic MCP Registry, Smithery, PulseMCP,
 * Glama) hit this endpoint to build their catalog. Beyond the MCP
 * spec minimum (2025-11-25: name, version, transport, capabilities),
 * AirMCP adds:
 *   - `tools: { count, names[] }` — full tool inventory so crawlers
 *     can surface the surface area without opening a session
 *   - `modules[]` — the enabled module list for this host (depends
 *     on config + OS compatibility gates)
 *   - `license` / `homepage` — standard registry metadata
 *   - `schema_version` — pins the spec revision the card conforms to
 *   - `network_policy` + `allowed_origins` — from RFC 0002 so
 *     Managed Agents can reason about exposure before connecting
 */

// Source of truth for AllowNetwork lives in http-transport.ts; kept
// inline here instead of imported so this module stays free of Express
// / MCP SDK dependencies — tests can load it without mocking either.
// Keep in sync when the policy enum grows.
type AllowNetwork =
  | "loopback-only"
  | "with-token"
  | "with-token+origin"
  | "with-oauth"
  | "with-oauth+origin"
  | "unauthenticated";

/** True when the effective policy expects OAuth 2.1 + Resource Indicators
 *  auth. Shared between the discovery card builder below and the
 *  http-transport route handler so both stay in sync. */
export function isOAuthPolicy(policy: AllowNetwork): boolean {
  return policy === "with-oauth" || policy === "with-oauth+origin";
}

export interface ServerCardInput {
  /** npm package name, used as the card's primary identifier. */
  name: string;
  version: string;
  description?: string;
  license?: string;
  homepage?: string;
  websiteUrl: string;
  /** Full icon descriptor per MCP spec — `{ src, mimeType, sizes }`
   *  or a bare data/https URL. Embedded verbatim into `icons[]`. */
  icon: string | { src: string; mimeType?: string; sizes?: string[] };
  httpToken?: string;
  allowNetwork: AllowNetwork;
  allowedOrigins: string[];
  tools: { count: number; names: string[] };
  modules: string[];
  /** RFC 0005 Step 1 — OAuth issuer + audience for the authorization
   *  block. Emitted only when `allowNetwork` is an `with-oauth*` policy
   *  and both are non-empty. */
  oauth?: { issuer: string; audience: string };
}

/** Advertised OAuth scopes (RFC 0005 §3.4). Declaring them in Step 1
 *  lets clients negotiate the right token audience even before scope
 *  enforcement lands in Step 2. */
export const SCOPES_SUPPORTED = ["mcp:read", "mcp:write", "mcp:destructive", "mcp:admin"] as const;

/** MCP spec revision this card shape conforms to. Bumped when the
 *  published spec changes its top-level contract.  */
export const SCHEMA_VERSION = "2025-11-25" as const;

export function buildServerCard(input: ServerCardInput): Record<string, unknown> {
  const card: Record<string, unknown> = {
    name: input.name,
    version: input.version,
    schema_version: SCHEMA_VERSION,
    websiteUrl: input.websiteUrl,
    icons: [input.icon],
    transport: { type: "streamable-http", url: "/mcp" },
    capabilities: {
      tools: { listChanged: true },
      prompts: { listChanged: true },
      resources: { listChanged: true },
    },
    network_policy: input.allowNetwork,
    tools: {
      count: input.tools.count,
      names: input.tools.names,
    },
    modules: input.modules,
  };

  // Optional fields — only emit when present so the card stays tight
  // on stdio-first deployments where most of this is absent.
  if (input.description) card.description = input.description;
  if (input.license) card.license = input.license;
  if (input.homepage) card.homepage = input.homepage;

  // Authorization block — prefer OAuth when the policy says so, fall
  // through to Bearer when the legacy token is set, otherwise omit.
  // The OAuth block follows RFC 0005 §3.3 / RFC 9728 shape so Managed
  // Agents / Cowork / browser MCP clients can bootstrap the flow
  // against the declared authorization_server before the first call.
  if (isOAuthPolicy(input.allowNetwork) && input.oauth?.issuer && input.oauth.audience) {
    card.authorization = {
      type: "oauth2",
      resource: input.oauth.audience,
      authorization_servers: [input.oauth.issuer],
      scopes_supported: [...SCOPES_SUPPORTED],
    };
  } else if (input.httpToken) {
    card.authorization = { type: "bearer" };
  }

  if (input.allowedOrigins.length > 0) card.allowed_origins = input.allowedOrigins;
  if (input.allowNetwork === "unauthenticated") card.security = "insecure";

  return card;
}

/** RFC 9728 — `GET /.well-known/oauth-protected-resource`. Advertises
 *  the resource server + authorization server pairing so RFC 8707 /
 *  MCP 2025-06-18 spec-conformant clients can discover the flow
 *  without guessing. Emitted only when the policy is `with-oauth*`
 *  and both issuer + audience are configured — otherwise the endpoint
 *  returns 404 so crawlers don't incorrectly advertise OAuth.
 *
 *  No token signing algorithms are pinned beyond RS256/ES256 because
 *  AirMCP's verifier will use the authorization server's JWKS to pick
 *  a matching key. Symmetric algorithms are excluded to prevent key-
 *  confusion attacks (shared secrets between clients + AS).  */
export function buildOAuthProtectedResourceCard(audience: string, issuer: string): Record<string, unknown> {
  return {
    resource: audience,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    resource_signing_alg_values_supported: ["RS256", "ES256"],
    scopes_supported: [...SCOPES_SUPPORTED],
  };
}
