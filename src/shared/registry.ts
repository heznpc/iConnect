import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IConnectConfig } from "./config.js";

export interface ModuleRegistration {
  name: string;
  tools: (server: McpServer, config: IConnectConfig) => void;
  prompts?: (server: McpServer) => void;
  /** Minimum macOS version required for this module (e.g. 26 for macOS 26+). */
  minMacosVersion?: number;
}
