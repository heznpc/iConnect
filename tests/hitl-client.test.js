import { describe, test, expect, afterEach } from '@jest/globals';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { HitlClient } from '../dist/shared/hitl.js';

function createTestSocket(handler) {
  const socketPath = join(tmpdir(), `airmcp-test-${randomUUID()}.sock`);
  const server = createServer((conn) => {
    let buffer = '';
    conn.setEncoding('utf-8');
    conn.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        handler(JSON.parse(line), conn);
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(socketPath, () => {
      resolve({ server, socketPath });
    });
  });
}

describe('HitlClient', () => {
  const cleanups = [];

  afterEach(() => {
    for (const fn of cleanups) fn();
    cleanups.length = 0;
  });

  test('requestApproval returns true when approved', async () => {
    const { server, socketPath } = await createTestSocket((req, conn) => {
      conn.write(JSON.stringify({
        id: req.id,
        type: 'hitl_response',
        approved: true,
      }) + '\n');
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 5 });
    cleanups.push(() => client.dispose());

    const result = await client.requestApproval('test_tool', { key: 'val' }, true, false);
    expect(result).toBe(true);
  });

  test('requestApproval returns false when denied', async () => {
    const { server, socketPath } = await createTestSocket((req, conn) => {
      conn.write(JSON.stringify({
        id: req.id,
        type: 'hitl_response',
        approved: false,
      }) + '\n');
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 5 });
    cleanups.push(() => client.dispose());

    const result = await client.requestApproval('delete_note', {}, true, false);
    expect(result).toBe(false);
  });

  test('requestApproval times out and returns false', async () => {
    const { server, socketPath } = await createTestSocket(() => {
      // Never respond
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 1 });
    cleanups.push(() => client.dispose());

    const result = await client.requestApproval('slow_tool', {}, false, false);
    expect(result).toBe(false);
  }, 10000);

  test('requestApproval returns false when socket unreachable', async () => {
    const client = new HitlClient({
      socketPath: '/tmp/airmcp-nonexistent-socket.sock',
      level: 'all',
      timeout: 2,
    });
    cleanups.push(() => client.dispose());

    const result = await client.requestApproval('test_tool', {}, false, false);
    expect(result).toBe(false);
  });

  test('dispose cleans up socket', async () => {
    const { server, socketPath } = await createTestSocket((req, conn) => {
      conn.write(JSON.stringify({
        id: req.id,
        type: 'hitl_response',
        approved: true,
      }) + '\n');
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 5 });

    // Establish connection
    await client.requestApproval('test', {}, false, false);

    // Dispose should not throw
    client.dispose();
    client.dispose(); // Double dispose should be safe
  });

  test('sends correct request format', async () => {
    let receivedRequest;
    const { server, socketPath } = await createTestSocket((req, conn) => {
      receivedRequest = req;
      conn.write(JSON.stringify({
        id: req.id,
        type: 'hitl_response',
        approved: true,
      }) + '\n');
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 5 });
    cleanups.push(() => client.dispose());

    await client.requestApproval('delete_note', { id: 'abc' }, true, false);

    expect(receivedRequest.type).toBe('hitl_request');
    expect(receivedRequest.tool).toBe('delete_note');
    expect(receivedRequest.args).toEqual({ id: 'abc' });
    expect(receivedRequest.destructive).toBe(true);
    expect(receivedRequest.openWorld).toBe(false);
    expect(receivedRequest.id).toBeDefined();
  });

  test('handles multiple concurrent requests', async () => {
    const { server, socketPath } = await createTestSocket((req, conn) => {
      const approved = req.tool.includes('odd');
      conn.write(JSON.stringify({
        id: req.id,
        type: 'hitl_response',
        approved,
      }) + '\n');
    });
    cleanups.push(() => server.close());

    const client = new HitlClient({ socketPath, level: 'all', timeout: 5 });
    cleanups.push(() => client.dispose());

    const [r1, r2, r3] = await Promise.all([
      client.requestApproval('odd_tool', {}, false, false),
      client.requestApproval('even_tool', {}, false, false),
      client.requestApproval('odd_other', {}, false, false),
    ]);

    expect(r1).toBe(true);
    expect(r2).toBe(false);
    expect(r3).toBe(true);
  });
});
