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
  deleteShortcutScript,
  exportShortcutScript,
  importShortcutScript,
  createShortcutScript,
  duplicateShortcutScript,
  editShortcutScript,
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

  server.registerTool("create_shortcut", {
    title: "Create Shortcut",
    description: "Create a new Siri Shortcut by name. Uses UI automation to open the Shortcuts app and create a new empty shortcut. The shortcut must be further configured in the Shortcuts app.",
    inputSchema: {
      name: z.string().describe("Name for the new shortcut"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ name }) => {
    try { return ok(await runJxa(createShortcutScript(name))); }
    catch (e) { return err(`Failed to create shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("delete_shortcut", {
    title: "Delete Shortcut",
    description: "Delete a Siri Shortcut by name. Uses the macOS shortcuts CLI (macOS 13+). This action is permanent and cannot be undone.",
    inputSchema: {
      name: z.string().describe("Shortcut name to delete (exact match)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async ({ name }) => {
    try { return ok(await runJxa(deleteShortcutScript(name))); }
    catch (e) { return err(`Failed to delete shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("export_shortcut", {
    title: "Export Shortcut",
    description: "Export a Siri Shortcut to a .shortcut file. Uses the macOS shortcuts CLI to save the shortcut to the specified output path.",
    inputSchema: {
      name: z.string().describe("Shortcut name to export (exact match)"),
      outputPath: z.string().describe("File path to export the .shortcut file to (e.g. ~/Desktop/MyShortcut.shortcut)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ name, outputPath }) => {
    try { return ok(await runJxa(exportShortcutScript(name, outputPath))); }
    catch (e) { return err(`Failed to export shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("import_shortcut", {
    title: "Import Shortcut",
    description: "Import a .shortcut file into Siri Shortcuts. Uses the macOS shortcuts CLI to import the shortcut from the specified file path.",
    inputSchema: {
      filePath: z.string().describe("Path to the .shortcut file to import"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ filePath }) => {
    try { return ok(await runJxa(importShortcutScript(filePath))); }
    catch (e) { return err(`Failed to import shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("duplicate_shortcut", {
    title: "Duplicate Shortcut",
    description: "Duplicate an existing Siri Shortcut. Exports the shortcut to a temporary file and re-imports it with a new name.",
    inputSchema: {
      name: z.string().describe("Name of the shortcut to duplicate (exact match)"),
      newName: z.string().describe("Name for the duplicated shortcut"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, async ({ name, newName }) => {
    try { return ok(await runJxa(duplicateShortcutScript(name, newName))); }
    catch (e) { return err(`Failed to duplicate shortcut: ${e instanceof Error ? e.message : String(e)}`); }
  });

  server.registerTool("edit_shortcut", {
    title: "Edit Shortcut",
    description: "Open a Siri Shortcut in the Shortcuts app for manual editing. Uses UI automation (System Events) to activate the app, search for the shortcut, and open it. The user can then edit the shortcut in the Shortcuts app UI.",
    inputSchema: {
      name: z.string().describe("Shortcut name to edit (exact match)"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async ({ name }) => {
    try { return ok(await runJxa(editShortcutScript(name))); }
    catch (e) { return err(`Failed to open shortcut for editing: ${e instanceof Error ? e.message : String(e)}`); }
  });
}
