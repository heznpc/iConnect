/**
 * Pure scope-gate decision tests (RFC 0005 §3.4, Step 2).
 *
 * These pin the scope → tool mapping without spinning up jose / JWKS /
 * Express. A regression here means a client that used to have access
 * suddenly loses it or vice versa — either side is a breaking change.
 */
import { describe, test, expect } from '@jest/globals';
import {
  requiredScopeFor,
  callerSatisfies,
  evaluateScopeGate,
} from '../dist/shared/oauth-scope.js';

describe('requiredScopeFor', () => {
  test('read-only non-destructive → mcp:read', () => {
    expect(requiredScopeFor({ toolName: 'list_notes', isReadOnly: true, isDestructive: false })).toBe('mcp:read');
  });

  test('non-read non-destructive → mcp:write', () => {
    expect(requiredScopeFor({ toolName: 'create_reminder', isReadOnly: false, isDestructive: false })).toBe('mcp:write');
  });

  test('destructive → mcp:destructive (even if read-only flag somehow set)', () => {
    // Policy: destructive beats readOnly — if a tool is marked destructive
    // we want the strongest scope, regardless of other annotations.
    expect(requiredScopeFor({ toolName: 'delete_note', isReadOnly: false, isDestructive: true })).toBe('mcp:destructive');
    expect(requiredScopeFor({ toolName: 'delete_note', isReadOnly: true, isDestructive: true })).toBe('mcp:destructive');
  });

  test('admin tools pin to mcp:admin regardless of annotations', () => {
    // audit_log is marked readOnly + non-destructive, but introspection
    // of the audit trail is still privileged.
    expect(requiredScopeFor({ toolName: 'audit_log', isReadOnly: true, isDestructive: false })).toBe('mcp:admin');
    expect(requiredScopeFor({ toolName: 'audit_summary', isReadOnly: true, isDestructive: false })).toBe('mcp:admin');
    expect(requiredScopeFor({ toolName: 'memory_forget', isReadOnly: false, isDestructive: true })).toBe('mcp:admin');
    expect(requiredScopeFor({ toolName: 'setup_permissions', isReadOnly: false, isDestructive: false })).toBe('mcp:admin');
  });
});

describe('callerSatisfies (scope hierarchy)', () => {
  test('mcp:admin implies everything else', () => {
    expect(callerSatisfies('mcp:admin', ['mcp:admin'])).toBe(true);
    expect(callerSatisfies('mcp:destructive', ['mcp:admin'])).toBe(true);
    expect(callerSatisfies('mcp:write', ['mcp:admin'])).toBe(true);
    expect(callerSatisfies('mcp:read', ['mcp:admin'])).toBe(true);
  });

  test('mcp:destructive implies write + read but NOT admin', () => {
    expect(callerSatisfies('mcp:destructive', ['mcp:destructive'])).toBe(true);
    expect(callerSatisfies('mcp:write', ['mcp:destructive'])).toBe(true);
    expect(callerSatisfies('mcp:read', ['mcp:destructive'])).toBe(true);
    expect(callerSatisfies('mcp:admin', ['mcp:destructive'])).toBe(false);
  });

  test('mcp:write implies read but NOT destructive / admin', () => {
    expect(callerSatisfies('mcp:write', ['mcp:write'])).toBe(true);
    expect(callerSatisfies('mcp:read', ['mcp:write'])).toBe(true);
    expect(callerSatisfies('mcp:destructive', ['mcp:write'])).toBe(false);
    expect(callerSatisfies('mcp:admin', ['mcp:write'])).toBe(false);
  });

  test('mcp:read is bottom of the lattice', () => {
    expect(callerSatisfies('mcp:read', ['mcp:read'])).toBe(true);
    expect(callerSatisfies('mcp:write', ['mcp:read'])).toBe(false);
    expect(callerSatisfies('mcp:destructive', ['mcp:read'])).toBe(false);
    expect(callerSatisfies('mcp:admin', ['mcp:read'])).toBe(false);
  });

  test('multiple scopes — any one satisfying is enough', () => {
    // Token carries both write AND read — destructive call still blocked.
    expect(callerSatisfies('mcp:destructive', ['mcp:read', 'mcp:write'])).toBe(false);
    // Token carries destructive + something unrelated — destructive works.
    expect(callerSatisfies('mcp:destructive', ['offline_access', 'mcp:destructive'])).toBe(true);
  });

  test('empty scope list denies everything', () => {
    expect(callerSatisfies('mcp:read', [])).toBe(false);
    expect(callerSatisfies('mcp:admin', [])).toBe(false);
  });

  test('unknown scope strings are silently ignored', () => {
    // Some AS emit arbitrary app scopes; we shouldn't crash or widen.
    expect(callerSatisfies('mcp:read', ['email', 'profile', 'openid'])).toBe(false);
    expect(callerSatisfies('mcp:read', ['email', 'mcp:read'])).toBe(true);
  });
});

describe('evaluateScopeGate', () => {
  test('allowed path returns required + no missing', () => {
    const d = evaluateScopeGate({
      toolName: 'list_notes',
      isReadOnly: true,
      isDestructive: false,
      callerScopes: ['mcp:read'],
    });
    expect(d).toEqual({ allowed: true, required: 'mcp:read' });
  });

  test('denied path sets missing = required', () => {
    const d = evaluateScopeGate({
      toolName: 'delete_note',
      isReadOnly: false,
      isDestructive: true,
      callerScopes: ['mcp:write'],
    });
    expect(d).toEqual({ allowed: false, required: 'mcp:destructive', missing: 'mcp:destructive' });
  });

  test('admin tool with read-only scope denied', () => {
    const d = evaluateScopeGate({
      toolName: 'audit_log',
      isReadOnly: true,
      isDestructive: false,
      callerScopes: ['mcp:read', 'mcp:write', 'mcp:destructive'],
    });
    // destructive does NOT imply admin.
    expect(d.allowed).toBe(false);
    expect(d.missing).toBe('mcp:admin');
  });

  test('admin scope unlocks admin tools', () => {
    const d = evaluateScopeGate({
      toolName: 'memory_forget',
      isReadOnly: false,
      isDestructive: true,
      callerScopes: ['mcp:admin'],
    });
    expect(d.allowed).toBe(true);
    expect(d.required).toBe('mcp:admin');
  });
});
