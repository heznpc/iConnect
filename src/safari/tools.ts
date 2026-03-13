import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runJxa } from "../shared/jxa.js";
import type { IConnectConfig } from "../shared/config.js";
import { ok, err } from "../shared/result.js";
import {
  listTabsScript,
  readPageContentScript,
  getCurrentTabScript,
  openUrlScript,
  closeTabScript,
  activateTabScript,
  runJavascriptScript,
  searchTabsScript,
} from "./scripts.js";

export function registerSafariTools(server: McpServer, _config: IConnectConfig): void {
  server.registerTool(
    "list_tabs",
    {
      title: "List Safari Tabs",
      description: "List all open tabs across all Safari windows with title and URL.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return ok(await runJxa(listTabsScript()));
      } catch (e) {
        return err(`Failed to list tabs: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "read_page_content",
    {
      title: "Read Page Content",
      description: "Read the HTML source of a Safari tab. Specify window and tab index from list_tabs.",
      inputSchema: {
        windowIndex: z.number().int().min(0).optional().default(0).describe("Window index (default: 0)"),
        tabIndex: z.number().int().min(0).optional().default(0).describe("Tab index (default: 0)"),
        maxLength: z.number().int().min(100).max(50000).optional().default(10000).describe("Max content length (default: 10000)"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ windowIndex, tabIndex, maxLength }) => {
      try {
        return ok(await runJxa(readPageContentScript(windowIndex, tabIndex, maxLength)));
      } catch (e) {
        return err(`Failed to read page: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "get_current_tab",
    {
      title: "Get Current Tab",
      description: "Get the title and URL of the active Safari tab.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        return ok(await runJxa(getCurrentTabScript()));
      } catch (e) {
        return err(`Failed to get current tab: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "open_url",
    {
      title: "Open URL",
      description: "Open a URL in Safari's frontmost window.",
      inputSchema: {
        url: z.string().url().describe("URL to open"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url }) => {
      try {
        return ok(await runJxa(openUrlScript(url)));
      } catch (e) {
        return err(`Failed to open URL: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "close_tab",
    {
      title: "Close Tab",
      description: "Close a specific Safari tab. Use list_tabs to find window/tab indices.",
      inputSchema: {
        windowIndex: z.number().int().min(0).optional().default(0).describe("Window index (default: 0)"),
        tabIndex: z.number().int().min(0).describe("Tab index"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ windowIndex, tabIndex }) => {
      try {
        return ok(await runJxa(closeTabScript(windowIndex, tabIndex)));
      } catch (e) {
        return err(`Failed to close tab: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "activate_tab",
    {
      title: "Activate Tab",
      description: "Switch to a specific Safari tab. Use list_tabs to find window/tab indices.",
      inputSchema: {
        windowIndex: z.number().int().min(0).optional().default(0).describe("Window index (default: 0)"),
        tabIndex: z.number().int().min(0).describe("Tab index"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ windowIndex, tabIndex }) => {
      try {
        return ok(await runJxa(activateTabScript(windowIndex, tabIndex)));
      } catch (e) {
        return err(`Failed to activate tab: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "run_javascript",
    {
      title: "Run JavaScript",
      description: "Execute JavaScript in a Safari tab. Use list_tabs to find window/tab indices. Returns the result as a string.",
      inputSchema: {
        code: z.string().describe("JavaScript to execute"),
        windowIndex: z.number().int().min(0).optional().default(0).describe("Window index (default: 0)"),
        tabIndex: z.number().int().min(0).optional().default(0).describe("Tab index (default: 0)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ code, windowIndex, tabIndex }) => {
      try {
        return ok(await runJxa(runJavascriptScript(code, windowIndex, tabIndex)));
      } catch (e) {
        return err(`Failed to run JavaScript: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "search_tabs",
    {
      title: "Search Tabs",
      description: "Search open Safari tabs by title or URL keyword.",
      inputSchema: {
        query: z.string().describe("Search keyword to match against tab titles and URLs"),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ query }) => {
      try {
        return ok(await runJxa(searchTabsScript(query)));
      } catch (e) {
        return err(`Failed to search tabs: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
}
