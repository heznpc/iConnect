/**
 * Startup banner — Spring Boot / ASCII art style.
 * Outputs to stderr so it doesn't interfere with MCP stdio transport.
 */

const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";
const WHITE = "\x1b[37m";

// ASCII art — compact, works in 80-col terminals
const LOGO = `
${CYAN}     ___   _      ${MAGENTA}__  __  ___  ___${RESET}
${CYAN}    / _ | (_)____${MAGENTA}/  |/  |/ __\\/ _ \\${RESET}
${CYAN}   / __ |/ / __/${MAGENTA}/ /|_/ / /__/ ___/${RESET}
${CYAN}  /_/ |_/_/_/  ${MAGENTA}/_/  /_/\\___/_/${RESET}`;

export interface BannerInfo {
  version: string;
  transport: "stdio" | "http";
  port?: number;
  modulesEnabled: string[];
  modulesDisabled: string[];
  modulesOsBlocked: string[];
  toolCount: number;
  promptCount?: number;
  dynamicShortcuts: number;
  skillsBuiltin: number;
  skillsUser: number;
  hitlLevel: string;
  macosVersion: number;
  nodeVersion: string;
  sendMessages: boolean;
  sendMail: boolean;
}

export function printBanner(info: BannerInfo): void {
  const log = (...args: string[]) => console.error(...args);

  log(LOGO);
  log("");
  log(`  ${DIM}:: AirMCP v${info.version} ::${RESET}                ${DIM}macOS ${info.macosVersion} / Node ${info.nodeVersion}${RESET}`);
  log("");

  // Modules
  const modLine = info.modulesEnabled.map((m) => `${GREEN}${m}${RESET}`).join(`${DIM}, ${RESET}`);
  log(`  ${BOLD}Modules${RESET}  ${DIM}(${info.modulesEnabled.length} active)${RESET}`);
  log(`  ${DIM}├${RESET} ${modLine}`);
  if (info.modulesDisabled.length > 0) {
    log(`  ${DIM}├ disabled: ${info.modulesDisabled.join(", ")}${RESET}`);
  }
  if (info.modulesOsBlocked.length > 0) {
    log(`  ${DIM}├ ${YELLOW}unavailable:${RESET} ${DIM}${info.modulesOsBlocked.join(", ")}${RESET}`);
  }
  log("");

  // Stats
  log(`  ${BOLD}Stats${RESET}`);
  log(`  ${DIM}├${RESET} Tools: ${BOLD}${info.toolCount}${RESET}${info.dynamicShortcuts > 0 ? ` ${DIM}(+${info.dynamicShortcuts} shortcut tools)${RESET}` : ""}`);
  if (info.promptCount) {
    log(`  ${DIM}├${RESET} Prompts: ${info.promptCount}`);
  }
  log(`  ${DIM}├${RESET} Skills: ${info.skillsBuiltin} built-in${info.skillsUser > 0 ? `, ${info.skillsUser} user` : ""}`);
  log(`  ${DIM}├${RESET} HITL: ${info.hitlLevel === "off" ? `${DIM}off${RESET}` : `${YELLOW}${info.hitlLevel}${RESET}`}`);
  log("");

  // Security
  log(`  ${BOLD}Security${RESET}`);
  log(`  ${DIM}├${RESET} Send Messages: ${info.sendMessages ? `${GREEN}on${RESET}` : `${DIM}off${RESET}`}`);
  log(`  ${DIM}├${RESET} Send Mail: ${info.sendMail ? `${GREEN}on${RESET}` : `${DIM}off${RESET}`}`);
  log("");

  // Transport
  if (info.transport === "http") {
    log(`  ${GREEN}▶${RESET} Server running on ${BOLD}http://localhost:${info.port}/mcp${RESET}`);
  } else {
    log(`  ${GREEN}▶${RESET} Server running on ${BOLD}stdio${RESET}`);
  }
  log("");
}
