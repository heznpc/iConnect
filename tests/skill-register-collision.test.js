/**
 * Runtime regression test for the graceful-skip behavior added to
 * registerSkills() in response to the v2.8.0 "Prompt weekly-review is
 * already registered" crash.
 *
 * Contract being verified:
 *   1. If a skill's name collides with an already-registered prompt/tool,
 *      registerSkills does NOT throw.
 *   2. The colliding skill is NOT registered (skip).
 *   3. Non-colliding skills in the same batch ARE still registered.
 *   4. The skip count is returned in the result.
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { toolRegistry } from '../dist/shared/tool-registry.js';
import { registerSkills } from '../dist/skills/register.js';

/**
 * A minimal stand-in server. After toolRegistry.installOn() wraps these
 * methods, the registry becomes the source of truth for "what was
 * registered", so we assert on the registry rather than the mock.
 */
function makeFakeServer() {
  return {
    prompt: () => ({}),
    registerPrompt: () => ({}),
    tool: () => ({}),
    registerTool: () => ({}),
  };
}

function makeSkill(overrides = {}) {
  return {
    name: 'unit-collision-skill',
    title: 'Unit Collision Skill',
    description: 'Used only in tests for the collision guard.',
    expose_as: 'prompt',
    steps: [{ id: 's1', tool: 'some_tool' }],
    ...overrides,
  };
}

describe('registerSkills graceful-skip on name collision', () => {
  beforeEach(() => {
    toolRegistry.reset(); // requires NODE_ENV=test, which Jest sets
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('skips a prompt skill whose name collides with a pre-registered prompt', () => {
    const server = makeFakeServer();
    toolRegistry.installOn(server);

    // Simulate another module having already claimed "weekly-review".
    server.prompt('weekly-review', 'pre-existing', () => ({}));
    expect(toolRegistry.getPromptNames()).toEqual(['weekly-review']);

    const result = registerSkills(server, [
      makeSkill({ name: 'weekly-review', expose_as: 'prompt' }),
    ]);

    expect(result).toEqual({ prompts: 0, tools: 0, skipped: 1 });
    // Registry still holds ONLY the pre-existing entry — the skill was skipped.
    expect(toolRegistry.getPromptNames()).toEqual(['weekly-review']);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('collides with an already-registered prompt'),
    );
  });

  test('skips a tool skill whose skill_<name> collides with a pre-registered tool', () => {
    const server = makeFakeServer();
    toolRegistry.installOn(server);

    // Simulate another module having already claimed "skill_inbox-triage".
    server.registerTool(
      'skill_inbox-triage',
      { description: 'pre-existing', inputSchema: {} },
      async () => ({}),
    );
    expect(toolRegistry.getToolNames()).toEqual(['skill_inbox-triage']);

    const result = registerSkills(server, [
      makeSkill({ name: 'inbox-triage', expose_as: 'tool' }),
    ]);

    expect(result).toEqual({ prompts: 0, tools: 0, skipped: 1 });
    // Only the pre-existing tool remains — the skill was skipped.
    expect(toolRegistry.getToolNames()).toEqual(['skill_inbox-triage']);
  });

  test('still registers non-colliding skills when one in the batch collides', () => {
    const server = makeFakeServer();
    toolRegistry.installOn(server);

    // Pre-claim "taken-name" only.
    server.prompt('taken-name', 'pre-existing', () => ({}));

    const result = registerSkills(server, [
      makeSkill({ name: 'taken-name', expose_as: 'prompt' }),
      makeSkill({ name: 'fresh-name', expose_as: 'prompt' }),
      makeSkill({ name: 'fresh-tool', expose_as: 'tool' }),
    ]);

    expect(result).toEqual({ prompts: 1, tools: 1, skipped: 1 });

    // Registry: pre-existing + fresh-name (prompt); skill_fresh-tool (tool).
    expect(toolRegistry.getPromptNames().sort()).toEqual(['fresh-name', 'taken-name']);
    expect(toolRegistry.getToolNames()).toEqual(['skill_fresh-tool']);
  });

  test('does not throw when every skill collides', () => {
    const server = makeFakeServer();
    toolRegistry.installOn(server);

    server.prompt('a', '-', () => ({}));
    server.prompt('b', '-', () => ({}));

    expect(() =>
      registerSkills(server, [
        makeSkill({ name: 'a', expose_as: 'prompt' }),
        makeSkill({ name: 'b', expose_as: 'prompt' }),
      ]),
    ).not.toThrow();
  });
});
