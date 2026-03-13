import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runJxa } from "../shared/jxa.js";
import type { IConnectConfig } from "../shared/config.js";
import { ok, err } from "../shared/result.js";
import {
  getClipboardScript,
  setClipboardScript,
  getVolumeScript,
  setVolumeScript,
  toggleDarkModeScript,
  getFrontmostAppScript,
  listRunningAppsScript,
  getScreenInfoScript,
  showNotificationScript,
  captureScreenshotScript,
} from "./scripts.js";

export function registerSystemTools(server: McpServer, _config: IConnectConfig): void {
  server.registerTool(
    "get_clipboard",
    {
      title: "Get Clipboard",
      description: "Read the current text content of the system clipboard.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa<{ content: string }>(getClipboardScript()));
      } catch (e) {
        return err(`Failed to get clipboard: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "set_clipboard",
    {
      title: "Set Clipboard",
      description: "Write text to the system clipboard, replacing its current content.",
      inputSchema: {
        text: z.string().describe("Text to copy to the clipboard"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ text }) => {
      try {
        return ok(await runJxa<{ set: boolean; length: number }>(setClipboardScript(text)));
      } catch (e) {
        return err(`Failed to set clipboard: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "get_volume",
    {
      title: "Get Volume",
      description: "Get the current system output volume level and mute state.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa<{ outputVolume: number; inputVolume: number; outputMuted: boolean }>(getVolumeScript()));
      } catch (e) {
        return err(`Failed to get volume: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "set_volume",
    {
      title: "Set Volume",
      description: "Set the system output volume (0-100) and/or mute state.",
      inputSchema: {
        volume: z.number().min(0).max(100).optional().describe("Output volume level (0-100)"),
        muted: z.boolean().optional().describe("Whether to mute output audio"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ volume, muted }) => {
      try {
        return ok(await runJxa<{ outputVolume: number; outputMuted: boolean }>(setVolumeScript(volume, muted)));
      } catch (e) {
        return err(`Failed to set volume: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "toggle_dark_mode",
    {
      title: "Toggle Dark Mode",
      description: "Toggle macOS appearance between dark mode and light mode.",
      inputSchema: {},
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa<{ darkMode: boolean }>(toggleDarkModeScript()));
      } catch (e) {
        return err(`Failed to toggle dark mode: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "get_frontmost_app",
    {
      title: "Get Frontmost App",
      description: "Get the name, bundle identifier, and PID of the currently active (frontmost) application.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa<{ name: string; bundleIdentifier: string; pid: number }>(getFrontmostAppScript()));
      } catch (e) {
        return err(`Failed to get frontmost app: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "list_running_apps",
    {
      title: "List Running Apps",
      description: "List all running applications with name, bundle identifier, PID, and visibility.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa(listRunningAppsScript()));
      } catch (e) {
        return err(`Failed to list running apps: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "get_screen_info",
    {
      title: "Get Screen Info",
      description: "Get display information including resolution, pixel dimensions, and Retina status.",
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return ok(await runJxa(getScreenInfoScript()));
      } catch (e) {
        return err(`Failed to get screen info: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "show_notification",
    {
      title: "Show Notification",
      description: "Display a macOS system notification with optional title, subtitle, and sound.",
      inputSchema: {
        message: z.string().describe("Notification body text"),
        title: z.string().optional().describe("Notification title"),
        subtitle: z.string().optional().describe("Notification subtitle"),
        sound: z.string().optional().describe("Sound name to play (e.g. 'Frog', 'Glass', 'Hero')"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ message, title, subtitle, sound }) => {
      try {
        return ok(await runJxa(showNotificationScript(message, title, subtitle, sound)));
      } catch (e) {
        return err(`Failed to show notification: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "capture_screenshot",
    {
      title: "Capture Screenshot",
      description: "Take a screenshot and save to the specified path. Supports full screen, window, or selection capture.",
      inputSchema: {
        path: z.string().min(1).describe("Absolute file path to save the screenshot (e.g. '/tmp/screenshot.png')"),
        region: z.enum(["fullscreen", "window", "selection"]).optional().default("fullscreen").describe("Capture region: fullscreen (default), window, or selection"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ path, region }) => {
      try {
        return ok(await runJxa(captureScreenshotScript(path, region)));
      } catch (e) {
        return err(`Failed to capture screenshot: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
}
