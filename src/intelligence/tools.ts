import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IConnectConfig } from "../shared/config.js";
import { ok, err } from "../shared/result.js";
import { runSwift } from "../shared/swift.js";

interface TextResult {
  output: string;
}

export function registerIntelligenceTools(server: McpServer, _config: IConnectConfig): void {
  server.registerTool(
    "summarize_text",
    {
      title: "Summarize Text",
      description:
        "Summarize text using Apple Intelligence (on-device Foundation Models). Requires macOS 26+ with Apple Silicon.",
      inputSchema: {
        text: z.string().describe("Text to summarize"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ text }) => {
      try {
        const result = await runSwift<TextResult>("summarize", JSON.stringify({ text }));
        return ok(result);
      } catch (e) {
        return err(`Failed to summarize: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "rewrite_text",
    {
      title: "Rewrite Text",
      description:
        "Rewrite text in a specified tone using Apple Intelligence (on-device Foundation Models). Requires macOS 26+ with Apple Silicon.",
      inputSchema: {
        text: z.string().describe("Text to rewrite"),
        tone: z
          .enum(["professional", "friendly", "concise"])
          .optional()
          .default("professional")
          .describe("Target tone (default: professional)"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ text, tone }) => {
      try {
        const result = await runSwift<TextResult>("rewrite", JSON.stringify({ text, tone }));
        return ok(result);
      } catch (e) {
        return err(`Failed to rewrite: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );

  server.registerTool(
    "proofread_text",
    {
      title: "Proofread Text",
      description:
        "Proofread and correct grammar/spelling using Apple Intelligence (on-device Foundation Models). Requires macOS 26+ with Apple Silicon.",
      inputSchema: {
        text: z.string().describe("Text to proofread"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ text }) => {
      try {
        const result = await runSwift<TextResult>("proofread", JSON.stringify({ text }));
        return ok(result);
      } catch (e) {
        return err(`Failed to proofread: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  );
}
