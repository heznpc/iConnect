/**
 * Pure scope-gate decision — "given this tool and this caller's scopes,
 * is the call allowed?".
 *
 * Lives in src/shared (not src/server/oauth-verifier.ts) so the
 * tool-registry pre-handler gate can import it without dragging in
 * jose / JWKS machinery. RFC 0005 §3.4 is the reference table:
 *
 *   mcp:read         — every readOnlyHint: true tool
 *   mcp:write        — non-destructive writes
 *   mcp:destructive  — destructiveHint: true
 *   mcp:admin        — audit_* / memory_forget / setup_permissions
 *
 * Scope implication: admin → destructive → write → read. A token that
 * carries `mcp:destructive` can also make read + write calls. This
 * matches how most authorization servers issue cumulative scopes.
 */

export type ScopeRequirement = "mcp:read" | "mcp:write" | "mcp:destructive" | "mcp:admin";

const ADMIN_TOOL_NAMES = new Set(["audit_log", "audit_summary", "memory_forget", "setup_permissions"]);

export interface ScopeGateInput {
  toolName: string;
  isReadOnly: boolean;
  isDestructive: boolean;
  callerScopes: string[];
}

export interface ScopeGateDecision {
  allowed: boolean;
  required: ScopeRequirement;
  missing?: ScopeRequirement;
}

export function requiredScopeFor(
  input: Pick<ScopeGateInput, "toolName" | "isReadOnly" | "isDestructive">,
): ScopeRequirement {
  if (ADMIN_TOOL_NAMES.has(input.toolName)) return "mcp:admin";
  if (input.isDestructive) return "mcp:destructive";
  if (input.isReadOnly) return "mcp:read";
  return "mcp:write";
}

const SCOPE_IMPLIES: Record<ScopeRequirement, ScopeRequirement[]> = {
  "mcp:admin": ["mcp:admin", "mcp:destructive", "mcp:write", "mcp:read"],
  "mcp:destructive": ["mcp:destructive", "mcp:write", "mcp:read"],
  "mcp:write": ["mcp:write", "mcp:read"],
  "mcp:read": ["mcp:read"],
};

export function callerSatisfies(required: ScopeRequirement, callerScopes: string[]): boolean {
  for (const s of callerScopes) {
    const implied = SCOPE_IMPLIES[s as ScopeRequirement];
    if (implied && implied.includes(required)) return true;
  }
  return false;
}

export function evaluateScopeGate(input: ScopeGateInput): ScopeGateDecision {
  const required = requiredScopeFor(input);
  const allowed = callerSatisfies(required, input.callerScopes);
  return allowed ? { allowed: true, required } : { allowed: false, required, missing: required };
}
