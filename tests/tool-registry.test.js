import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies that tool-registry imports
jest.unstable_mockModule('../dist/shared/usage-tracker.js', () => ({
  usageTracker: { record: jest.fn() },
}));
jest.unstable_mockModule('../dist/shared/audit.js', () => ({
  auditLog: jest.fn(),
}));
jest.unstable_mockModule('../dist/shared/tool-filter.js', () => ({
  compactDescription: jest.fn((d) => d ? d.substring(0, 80) : d),
}));

const { toolRegistry } = await import('../dist/shared/tool-registry.js');

function createMockServer() {
  const tools = new Map();
  const prompts = new Map();
  return {
    registerTool: jest.fn((name, opts, handler) => {
      tools.set(name, { opts, handler });
    }),
    tool: jest.fn((name, ...rest) => {
      tools.set(name, { rest });
    }),
    registerPrompt: jest.fn((name, opts, callback) => {
      prompts.set(name, { opts, callback });
    }),
    prompt: jest.fn((name, ...rest) => {
      prompts.set(name, { rest });
    }),
    _tools: tools,
    _prompts: prompts,
  };
}

describe('ToolRegistry', () => {
  let server;

  beforeEach(() => {
    server = createMockServer();
    toolRegistry.installOn(server);
  });

  test('starts with zero tools and prompts', () => {
    expect(toolRegistry.getToolCount()).toBe(0);
    expect(toolRegistry.getPromptCount()).toBe(0);
    expect(toolRegistry.getToolNames()).toEqual([]);
    expect(toolRegistry.getPromptNames()).toEqual([]);
  });

  test('tracks tool registrations via registerTool', () => {
    server.registerTool('test_tool', {
      title: 'Test Tool',
      description: 'A test tool for testing',
    }, async () => ({ content: [{ type: 'text', text: 'ok' }] }));

    expect(toolRegistry.getToolCount()).toBe(1);
    expect(toolRegistry.getToolNames()).toEqual(['test_tool']);
  });

  test('tracks multiple tool registrations', () => {
    server.registerTool('tool_a', { title: 'Tool A', description: 'First' }, async () => ({}));
    server.registerTool('tool_b', { title: 'Tool B', description: 'Second' }, async () => ({}));
    server.registerTool('tool_c', { title: 'Tool C', description: 'Third' }, async () => ({}));

    expect(toolRegistry.getToolCount()).toBe(3);
    expect(toolRegistry.getToolNames()).toContain('tool_a');
    expect(toolRegistry.getToolNames()).toContain('tool_b');
    expect(toolRegistry.getToolNames()).toContain('tool_c');
  });

  test('getToolInfo returns correct info', () => {
    server.registerTool('my_tool', {
      title: 'My Tool',
      description: 'Does something useful',
    }, async () => ({}));

    const info = toolRegistry.getToolInfo('my_tool');
    expect(info).toBeDefined();
    expect(info.name).toBe('my_tool');
    expect(info.title).toBe('My Tool');
    expect(info.description).toBe('Does something useful');
  });

  test('getToolInfo returns undefined for unknown tool', () => {
    expect(toolRegistry.getToolInfo('nonexistent')).toBeUndefined();
  });

  test('searchTools finds tools by name', () => {
    server.registerTool('search_notes', { title: 'Search Notes', description: 'Search' }, async () => ({}));
    server.registerTool('list_notes', { title: 'List Notes', description: 'List' }, async () => ({}));
    server.registerTool('read_mail', { title: 'Read Mail', description: 'Read' }, async () => ({}));

    const results = toolRegistry.searchTools('notes');
    expect(results.length).toBe(2);
    expect(results.map(r => r.name)).toContain('search_notes');
    expect(results.map(r => r.name)).toContain('list_notes');
  });

  test('searchTools scores name matches higher than description', () => {
    server.registerTool('calendar_event', { title: 'Cal', description: 'Create event' }, async () => ({}));
    server.registerTool('other_tool', { title: 'Other', description: 'Manages calendar items' }, async () => ({}));

    const results = toolRegistry.searchTools('calendar');
    expect(results[0].name).toBe('calendar_event');
  });

  test('searchTools respects limit', () => {
    for (let i = 0; i < 30; i++) {
      server.registerTool(`tool_${i}`, { title: `Tool ${i}`, description: 'test tool' }, async () => ({}));
    }

    const results = toolRegistry.searchTools('tool', 5);
    expect(results.length).toBe(5);
  });

  test('searchTools returns empty for no matches', () => {
    server.registerTool('my_tool', { title: 'My Tool', description: 'Something' }, async () => ({}));
    expect(toolRegistry.searchTools('zzzznonexistent')).toEqual([]);
  });

  test('callTool invokes registered handler', async () => {
    const handler = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'result' }],
    });
    server.registerTool('callable', { title: 'Callable' }, handler);

    const result = await toolRegistry.callTool('callable', { key: 'value' });
    expect(result.content[0].text).toBe('result');
  });

  test('callTool throws for unknown tool', async () => {
    await expect(toolRegistry.callTool('nonexistent', {}))
      .rejects.toThrow('Tool "nonexistent" not found');
  });

  test('tracks prompt registrations via registerPrompt', () => {
    server.registerPrompt('my_prompt', {}, async () => ({}));

    expect(toolRegistry.getPromptCount()).toBe(1);
    expect(toolRegistry.getPromptNames()).toEqual(['my_prompt']);
  });

  test('getPromptCallback returns callback', () => {
    const cb = async () => ({});
    server.registerPrompt('test_prompt', {}, cb);

    const retrieved = toolRegistry.getPromptCallback('test_prompt');
    expect(retrieved).toBeDefined();
  });

  test('getPromptCallback returns undefined for unknown prompt', () => {
    expect(toolRegistry.getPromptCallback('nonexistent')).toBeUndefined();
  });

  test('installOn clears previous registrations', () => {
    server.registerTool('old_tool', { title: 'Old' }, async () => ({}));
    expect(toolRegistry.getToolCount()).toBe(1);

    // Re-install on a new server
    const server2 = createMockServer();
    toolRegistry.installOn(server2);
    expect(toolRegistry.getToolCount()).toBe(0);
  });
});
