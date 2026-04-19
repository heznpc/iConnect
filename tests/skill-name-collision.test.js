/**
 * Static regression test for the class of bug that shipped in v2.8.0 and
 * crashed the server on startup with
 *     "Prompt weekly-review is already registered"
 *
 * Root cause: a built-in skill YAML (src/skills/builtins/weekly-review.yaml)
 * used the same `name:` as an already-registered MCP prompt
 * (src/cross/prompts.ts registers "weekly-review"). The MCP SDK throws on
 * duplicate prompt registration, so the entire server refused to start.
 *
 * This test catches that class of collision BEFORE publish by scanning
 * source files statically — no server boot, no network, no mocks.
 */

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const BUILTINS_DIR = join(REPO_ROOT, 'src', 'skills', 'builtins');
const SRC_DIR = join(REPO_ROOT, 'src');

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function loadBuiltinSkills() {
  const files = readdirSync(BUILTINS_DIR).filter(
    (f) => f.endsWith('.yaml') || f.endsWith('.yml'),
  );
  return files.map((file) => {
    const raw = readFileSync(join(BUILTINS_DIR, file), 'utf8');
    const parsed = parseYaml(raw);
    return { file, ...parsed };
  });
}

/** Recursively collect every .ts file under src/, skipping the skills engine. */
function collectTsSources(root) {
  const out = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(p);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        out.push(p);
      }
    }
  }
  walk(root);
  return out;
}

/**
 * Extract every literal prompt name registered via `server.prompt(...)` or
 * `server.registerPrompt(...)`. The SDK accepts the name as the first string
 * argument — we match both single-line and multi-line call shapes.
 *
 * We deliberately skip src/skills/register.ts because those registrations
 * come from YAML at runtime, not from source literals.
 */
function extractRegisteredPromptNames(files) {
  const names = new Set();
  // Matches:   server.prompt( "name"   OR   server.registerPrompt(  "name"
  // Allows whitespace / newlines between `(` and the opening quote.
  const rx = /server\.(?:prompt|registerPrompt)\s*\(\s*["']([a-z][a-z0-9-]*)["']/g;
  for (const file of files) {
    // Skip the dynamic skill registration site — its name is runtime data.
    if (file.endsWith(`${'skills'}/register.ts`) || file.endsWith('skills\\register.ts')) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(rx)) {
      names.add(m[1]);
    }
  }
  return names;
}

/**
 * Extract every literal tool name registered via `server.tool(...)` or
 * `server.registerTool(...)`. Same rationale as above.
 */
function extractRegisteredToolNames(files) {
  const names = new Set();
  const rx = /server\.(?:tool|registerTool)\s*\(\s*["']([a-zA-Z0-9_-]+)["']/g;
  for (const file of files) {
    if (file.endsWith(`${'skills'}/register.ts`) || file.endsWith('skills\\register.ts')) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(rx)) {
      names.add(m[1]);
    }
  }
  return names;
}

// ───────────────────────────────────────────────────────────────────────────
// Tests
// ───────────────────────────────────────────────────────────────────────────

describe('built-in skill name collision guard', () => {
  const skills = loadBuiltinSkills();
  const sources = collectTsSources(SRC_DIR);
  const registeredPrompts = extractRegisteredPromptNames(sources);
  const registeredTools = extractRegisteredToolNames(sources);

  test('at least one built-in skill is discovered', () => {
    // Guards against a silently broken scanner that finds no files and
    // therefore finds no collisions.
    expect(skills.length).toBeGreaterThan(0);
  });

  test('scanner discovered at least one built-in prompt literal', () => {
    // Guards against a regex breakage that would make the collision test
    // vacuously pass.
    expect(registeredPrompts.size).toBeGreaterThan(0);
  });

  test.each(
    // Jest.each rows: [skillFile, skillName, expose_as]
    loadBuiltinSkills().map((s) => [s.file, s.name, s.expose_as]),
  )(
    '%s: skill "%s" (expose_as=%s) does not collide with a built-in prompt/tool',
    (_file, name, exposeAs) => {
      if (exposeAs === 'prompt') {
        expect(registeredPrompts.has(name)).toBe(false);
      } else if (exposeAs === 'tool') {
        // Skills exposed as tools register under `skill_<name>` — check the
        // prefixed form.
        expect(registeredTools.has(`skill_${name}`)).toBe(false);
      }
    },
  );

  test('built-in skill names are unique among themselves', () => {
    const counts = new Map();
    for (const s of skills) {
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
    const dups = [...counts.entries()].filter(([, n]) => n > 1);
    expect(dups).toEqual([]);
  });

  test('every built-in skill has a valid expose_as value', () => {
    for (const s of skills) {
      expect(['prompt', 'tool']).toContain(s.expose_as);
    }
  });
});
