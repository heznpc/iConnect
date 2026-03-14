import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SkillDefinition, SkillResult, StepResult } from "./types.js";

const SINGLE_TEMPLATE_RE = /^\{\{([^}]+)\}\}$/;
const EMBEDDED_TEMPLATE_RE = /\{\{([^}]+)\}\}/g;

/**
 * Resolve `{{stepId.field.path}}` templates against collected step results.
 *
 * - If the entire string is a single `{{...}}`, returns the raw value (preserves type).
 * - Otherwise, replaces each `{{...}}` within the string with its stringified value.
 * - Recurses into plain objects and arrays.
 */
export function resolveTemplates(value: unknown, results: Map<string, unknown>): unknown {
  if (typeof value === "string") {
    // Entire string is a single template → return raw value
    const singleMatch = SINGLE_TEMPLATE_RE.exec(value);
    if (singleMatch) {
      return resolvePath(singleMatch[1].trim(), results);
    }
    // Mixed string with embedded templates
    return value.replace(EMBEDDED_TEMPLATE_RE, (_match, path: string) => {
      const resolved = resolvePath(path.trim(), results);
      return resolved === undefined || resolved === null ? "" : String(resolved);
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveTemplates(v, results));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveTemplates(v, results);
    }
    return out;
  }
  return value;
}

function resolvePath(path: string, results: Map<string, unknown>): unknown {
  const parts = path.split(".");
  const stepId = parts[0];
  let current: unknown = results.get(stepId);
  for (let i = 1; i < parts.length && current != null; i++) {
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

/**
 * Look up a registered tool's handler on the McpServer and invoke it.
 */
async function callTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = (server as any)._registeredTools as
    | Record<string, { handler: (...a: unknown[]) => unknown; enabled: boolean }>
    | undefined;
  if (!tools) throw new Error("Tool registry not available");
  const tool = tools[toolName];
  if (!tool) throw new Error(`Tool "${toolName}" not found`);
  if (!tool.enabled) throw new Error(`Tool "${toolName}" is disabled`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await tool.handler(args, {})) as any;
}

function parseToolResponse(response: { content: Array<{ type: string; text: string }>; isError?: boolean }): unknown {
  if (response.isError) {
    throw new Error(response.content[0]?.text ?? "Tool returned an error");
  }
  const text = response.content[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function executeSkill(
  server: McpServer,
  skill: SkillDefinition,
): Promise<SkillResult> {
  const results = new Map<string, unknown>();
  const stepResults: StepResult[] = [];

  for (const step of skill.steps) {
    // Evaluate only_if / skip_if
    if (step.only_if) {
      const resolved = resolveTemplates(step.only_if, results);
      if (!resolved) {
        stepResults.push({ id: step.id, status: "skipped" });
        continue;
      }
    }
    if (step.skip_if) {
      const resolved = resolveTemplates(step.skip_if, results);
      if (resolved) {
        stepResults.push({ id: step.id, status: "skipped" });
        continue;
      }
    }

    // Resolve template variables in args
    const resolvedArgs = (step.args ? resolveTemplates(step.args, results) : {}) as Record<string, unknown>;

    try {
      const response = await callTool(server, step.tool, resolvedArgs);
      const data = parseToolResponse(response);
      results.set(step.id, data);
      stepResults.push({ id: step.id, status: "ok", data });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.set(step.id, null);
      stepResults.push({ id: step.id, status: "error", error });
      return { skill: skill.name, steps: stepResults, success: false };
    }
  }

  return { skill: skill.name, steps: stepResults, success: true };
}
