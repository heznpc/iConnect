import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runJxa } from "../shared/jxa.js";
import type { IConnectConfig } from "../shared/config.js";
import { ok, err } from "../shared/result.js";
import {
  listShortcutsScript,
  runShortcutScript,
  searchShortcutsScript,
  getShortcutDetailScript,
} from "./scripts.js";

export function registerShortcutsTools(server: McpServer, _config: IConnectConfig): void {
  server.registerTool("list_shortcuts", {
    title: "List Shortcuts",
    description: "List all available Siri Shortcuts on this Mac.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => {
    try { return ok(await runJxa(listShortcutsScript())); }
    catch (e) { return err(`Failed to list shortcuts: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("run_shortcut", {
    title: "Run Shortcut",
    description: "Run a Siri Shortcut by name. Optionally provide text input. Returns the shortcut's output. Note: shortcuts may trigger UI prompts or perform system actions.",
    inputSchema: {
      name: z.string().describe("Shortcut name (exact match)"),
      input: z.string().optional().describe("Optional text input for the shortcut"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ name, input }) => {
    try { return ok(await runJxa(runShortcutScript(name, input))); }
    catch (e) { return err(`Failed to run shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("search_shortcuts", {
    title: "Search Shortcuts",
    description: "Search Siri Shortcuts by name keyword.",
    inputSchema: {
      query: z.string().describe("Search keyword to match against shortcut names"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ query }) => {
    try { return ok(await runJxa(searchShortcutsScript(query))); }
    catch (e) { return err(`Failed to search shortcuts: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("get_shortcut_detail", {
    title: "Get Shortcut Detail",
    description: "Get details about a Siri Shortcut including its actions.",
    inputSchema: {
      name: z.string().describe("Shortcut name (exact match)"),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ name }) => {
    try { return ok(await runJxa(getShortcutDetailScript(name))); }
    catch (e) { return err(`Failed to get shortcut detail: ${e instanceof Error ? e.message : String(e)}`); }
  });
}
