/**
 * Per-request context store — scoped via AsyncLocalStorage so values set
 * in an Express middleware reach the MCP tool handler without plumbing
 * through the SDK.
 *
 * Today it carries OAuth claims (RFC 0005 Step 2) so the tool-registry
 * pre-handler gate can check scopes without each tool having to read
 * the Authorization header itself. Stays intentionally tiny: the store
 * is OPTIONAL — legacy Bearer / loopback-only paths never enter it, and
 * the gate treats an absent store as "no auth enforcement" so the
 * existing test suite + local stdio deployments continue unchanged.
 */
import { AsyncLocalStorage } from "node:async_hooks";

export interface OAuthClaims {
  /** JWT `sub` claim — the authenticated principal. */
  subject: string;
  /** Parsed `scope` string split on whitespace per RFC 6749 §3.3. */
  scopes: string[];
  /** Raw decoded JWT payload for downstream consumers that need more
   *  than sub + scopes (e.g. custom claims from the authorization
   *  server). Never forwarded to tool handlers — kept for debugging /
   *  audit enrichment only. */
  raw: Record<string, unknown>;
}

export interface RequestContext {
  oauth?: OAuthClaims;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/** Convenience — returns OAuth claims if set, undefined if the current
 *  call stack wasn't entered through an OAuth middleware. */
export function getOAuthClaims(): OAuthClaims | undefined {
  return storage.getStore()?.oauth;
}
