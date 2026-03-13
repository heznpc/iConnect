import { describe, test, expect, beforeEach } from '@jest/globals';
import { installHitlGuard } from '../dist/shared/hitl-guard.js';

/**
 * Creates a minimal mock McpServer whose registerTool captures registrations.
 * After installHitlGuard patches it, we can inspect what callback was stored
 * (original vs wrapped) to infer whether approval is required.
 */
function makeMockServer() {
  const registrations = [];
  const server = {
    registerTool(name, toolConfig, callback) {
      registrations.push({ name, toolConfig, callback });
    },
  };
  return { server, registrations };
}

function makeConfig(level, whitelist = []) {
  return {
    includeShared: false,
    disabledModules: new Set(),
    shareApprovalModules: new Set(),
    allowSendMessages: true,
    allowSendMail: true,
    hitl: {
      level,
      whitelist: new Set(whitelist),
      timeout: 30000,
      socketPath: '/tmp/fake.sock',
    },
  };
}

function makeMockHitlClient(autoApprove = true) {
  const calls = [];
  return {
    calls,
    requestApproval(tool, args, destructive, openWorld) {
      calls.push({ tool, args, destructive, openWorld });
      return Promise.resolve(autoApprove);
    },
    dispose() {},
  };
}

// ---------- basic export tests ----------

describe('installHitlGuard export', () => {
  test('is a function', () => {
    expect(typeof installHitlGuard).toBe('function');
  });
});

// ---------- level: "off" ----------

describe('level "off"', () => {
  test('never wraps any tool', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('off');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('destructive_tool', { annotations: { destructiveHint: true, readOnlyHint: false } }, original);
    server.registerTool('write_tool', { annotations: { readOnlyHint: false } }, original);
    server.registerTool('read_tool', { annotations: { readOnlyHint: true } }, original);

    // With "off", callbacks should be the original (no wrapping)
    for (const reg of registrations) {
      expect(reg.callback).toBe(original);
    }
  });
});

// ---------- level: "destructive-only" ----------

describe('level "destructive-only"', () => {
  test('wraps tools with destructiveHint=true', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('destructive-only');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('dangerous', { annotations: { destructiveHint: true } }, original);

    expect(registrations).toHaveLength(1);
    expect(registrations[0].callback).not.toBe(original);
  });

  test('does NOT wrap tools without destructiveHint', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('destructive-only');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('safe_write', { annotations: { readOnlyHint: false } }, original);
    server.registerTool('reader', { annotations: { readOnlyHint: true } }, original);
    server.registerTool('no_annotations', {}, original);

    for (const reg of registrations) {
      expect(reg.callback).toBe(original);
    }
  });
});

// ---------- level: "all-writes" ----------

describe('level "all-writes"', () => {
  test('wraps tools with readOnlyHint=false', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all-writes');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('writer', { annotations: { readOnlyHint: false } }, original);

    expect(registrations[0].callback).not.toBe(original);
  });

  test('does NOT wrap read-only tools', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all-writes');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('reader', { annotations: { readOnlyHint: true } }, original);

    expect(registrations[0].callback).toBe(original);
  });

  test('does NOT wrap tools with no annotations (readOnlyHint defaults to undefined, not false)', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all-writes');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('ambiguous', {}, original);

    // readOnlyHint is undefined, and `undefined === false` is false → no wrap
    expect(registrations[0].callback).toBe(original);
  });
});

// ---------- level: "all" ----------

describe('level "all"', () => {
  test('wraps every tool regardless of annotations', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all');

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('read', { annotations: { readOnlyHint: true } }, original);
    server.registerTool('write', { annotations: { readOnlyHint: false } }, original);
    server.registerTool('bare', {}, original);

    for (const reg of registrations) {
      expect(reg.callback).not.toBe(original);
    }
  });
});

// ---------- whitelist ----------

describe('whitelist', () => {
  test('whitelisted tool is never wrapped even at level "all"', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all', ['trusted_tool']);

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('trusted_tool', { annotations: { destructiveHint: true } }, original);

    expect(registrations[0].callback).toBe(original);
  });

  test('non-whitelisted tool is still wrapped', () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient();
    const config = makeConfig('all', ['trusted_tool']);

    installHitlGuard(server, hitl, config);

    const original = () => 'original';
    server.registerTool('untrusted_tool', {}, original);

    expect(registrations[0].callback).not.toBe(original);
  });
});

// ---------- wrapped callback behaviour ----------

describe('wrapped callback behaviour', () => {
  test('calls hitlClient.requestApproval and forwards to original on approve', async () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient(true);
    const config = makeConfig('all');

    installHitlGuard(server, hitl, config);

    let called = false;
    const original = () => { called = true; return 'result'; };
    server.registerTool('my_tool', { annotations: { destructiveHint: true, openWorldHint: true } }, original);

    const wrapped = registrations[0].callback;
    const result = await wrapped({ foo: 'bar' });

    expect(hitl.calls).toHaveLength(1);
    expect(hitl.calls[0].tool).toBe('my_tool');
    expect(hitl.calls[0].args).toEqual({ foo: 'bar' });
    expect(hitl.calls[0].destructive).toBe(true);
    expect(hitl.calls[0].openWorld).toBe(true);
    expect(called).toBe(true);
    expect(result).toBe('result');
  });

  test('returns error when approval is denied', async () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient(false);
    const config = makeConfig('all');

    installHitlGuard(server, hitl, config);

    let called = false;
    const original = () => { called = true; };
    server.registerTool('blocked_tool', {}, original);

    const wrapped = registrations[0].callback;
    const result = await wrapped({});

    expect(called).toBe(false);
    expect(result).toHaveProperty('isError', true);
    expect(result.content[0].text).toContain('blocked_tool');
    expect(result.content[0].text).toContain('denied');
  });

  test('defaults destructiveHint and openWorldHint to false when annotations are absent', async () => {
    const { server, registrations } = makeMockServer();
    const hitl = makeMockHitlClient(true);
    const config = makeConfig('all');

    installHitlGuard(server, hitl, config);

    const original = () => 'ok';
    server.registerTool('bare_tool', {}, original);

    await registrations[0].callback({});

    expect(hitl.calls[0].destructive).toBe(false);
    expect(hitl.calls[0].openWorld).toBe(false);
  });
});
