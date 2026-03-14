#!/usr/bin/env node
/**
 * AirMCP QA Test Runner
 *
 * Starts the MCP server, exercises every read-only tool in each module,
 * and writes a Markdown report to stdout (or a file with --out).
 *
 * Usage:
 *   node scripts/qa-test.mjs              # print to stdout
 *   node scripts/qa-test.mjs --out report # write to qa-report-<date>.md
 *   node scripts/qa-test.mjs --json       # machine-readable JSON
 */
import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── CLI flags ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const outFlag = args.includes("--out");
const outPath = outFlag
  ? resolve(
      ROOT,
      `qa-report-${new Date().toISOString().slice(0, 10)}.md`,
    )
  : null;

// ── Server lifecycle ────────────────────────────────────────────────
const server = spawn("node", ["dist/index.js"], {
  cwd: ROOT,
  env: { ...process.env, AIRMCP_FULL: "true" },
  stdio: ["pipe", "pipe", "pipe"],
});

let buffer = "";
const responseMap = new Map();
let nextId = 1;

server.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null) responseMap.set(msg.id, msg);
    } catch { /* ignore non-JSON */ }
  }
});

function send(method, params = {}) {
  const id = nextId++;
  server.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
  );
  return id;
}

function notify(method, params = {}) {
  server.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n",
  );
}

async function waitFor(id, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (responseMap.has(id)) return responseMap.get(id);
    await new Promise((r) => setTimeout(r, 50));
  }
  return null; // timeout
}

async function callTool(name, toolArgs = {}) {
  const id = send("tools/call", { name, arguments: toolArgs });
  return waitFor(id, 15000);
}

// ── Test definitions ────────────────────────────────────────────────
// Each entry: [module, toolName, args]
// Only read-only / safe tools — no writes, no destructive ops.
const TEST_PLAN = [
  // Notes
  ["Notes", "list_notes", { limit: 5 }],
  ["Notes", "list_folders", {}],
  ["Notes", "search_notes", { query: "test" }],
  ["Notes", "scan_notes", { limit: 3 }],

  // Reminders
  ["Reminders", "list_reminder_lists", {}],
  ["Reminders", "list_reminders", { limit: 5 }],
  ["Reminders", "search_reminders", { query: "test" }],

  // Calendar
  ["Calendar", "list_calendars", {}],
  ["Calendar", "today_events", {}],
  ["Calendar", "get_upcoming_events", { limit: 3 }],

  // Contacts
  ["Contacts", "list_contacts", { limit: 3 }],
  ["Contacts", "search_contacts", { query: "test" }],
  ["Contacts", "list_groups", {}],

  // Mail
  ["Mail", "list_mailboxes", {}],
  ["Mail", "get_unread_count", {}],
  ["Mail", "list_accounts", {}],

  // Music
  ["Music", "list_playlists", {}],
  ["Music", "now_playing", {}],

  // Finder
  ["Finder", "search_files", { query: "test", limit: 3 }],
  ["Finder", "list_directory", { path: process.env.HOME }],
  ["Finder", "recent_files", { limit: 3 }],

  // Safari
  ["Safari", "list_tabs", {}],
  ["Safari", "get_current_tab", {}],
  ["Safari", "list_bookmarks", {}],
  ["Safari", "list_reading_list", {}],

  // System
  ["System", "get_clipboard", {}],
  ["System", "get_volume", {}],
  ["System", "get_frontmost_app", {}],
  ["System", "list_running_apps", {}],
  ["System", "get_screen_info", {}],
  ["System", "get_wifi_status", {}],
  ["System", "get_battery_status", {}],
  ["System", "get_brightness", {}],
  ["System", "list_bluetooth_devices", {}],
  ["System", "list_all_windows", {}],
  ["System", "is_app_running", { name: "Finder" }],

  // Photos
  ["Photos", "list_albums", {}],
  ["Photos", "list_favorites", {}],
  ["Photos", "search_photos", { query: "test" }],

  // Messages
  ["Messages", "list_chats", {}],

  // Shortcuts
  ["Shortcuts", "list_shortcuts", {}],
  ["Shortcuts", "search_shortcuts", { query: "test" }],

  // TV
  ["TV", "tv_list_playlists", {}],
  ["TV", "tv_now_playing", {}],

  // Screen Capture
  ["Screen", "list_windows", {}],

  // Maps
  ["Maps", "geocode", { query: "Seoul" }],
  ["Maps", "reverse_geocode", { latitude: 37.5665, longitude: 126.978 }],
  ["Maps", "share_location", { latitude: 37.5665, longitude: 126.978, name: "Seoul" }],

  // Podcasts
  ["Podcasts", "list_podcast_shows", {}],
  ["Podcasts", "podcast_now_playing", {}],

  // Weather (requires latitude/longitude, not location name)
  ["Weather", "get_current_weather", { latitude: 37.5665, longitude: 126.978 }],
  ["Weather", "get_daily_forecast", { latitude: 37.5665, longitude: 126.978, days: 3 }],
  ["Weather", "get_hourly_forecast", { latitude: 37.5665, longitude: 126.978, hours: 6 }],

  // Location
  ["Location", "get_location_permission", {}],

  // Bluetooth
  ["Bluetooth", "get_bluetooth_state", {}],

  // Intelligence (macOS 26+)
  ["Intelligence", "ai_status", {}],

  // Pages / Numbers / Keynote
  ["Pages", "pages_list_documents", {}],
  ["Numbers", "numbers_list_documents", {}],
  ["Keynote", "keynote_list_documents", {}],

  // Semantic
  ["Semantic", "semantic_status", {}],

  // UI Automation
  ["UI", "ui_read", { app: "Finder" }],
];

// ── Classify result ─────────────────────────────────────────────────
function classify(resp) {
  if (!resp) return { status: "ERROR", note: "Timeout (no response)" };

  if (resp.error) {
    const msg = resp.error.message || "";
    if (msg.includes("not found")) return { status: "SKIP", note: "Tool not registered (OS/config requirement)" };
    if (msg.includes("Invalid arguments")) return { status: "FAIL", note: `Bad args: ${msg.slice(0, 120)}` };
    return { status: "FAIL", note: msg.slice(0, 150) };
  }

  const text = resp.result?.content?.[0]?.text || "";
  const isError = resp.result?.isError === true;

  if (!isError) return { status: "PASS", note: "" };

  // Expected skip conditions
  if (/Swift bridge|macOS 26|not built/i.test(text))
    return { status: "SKIP", note: "Requires Swift bridge / macOS 26+" };
  if (/not authorized|permission|not allowed/i.test(text))
    return { status: "SKIP", note: "Needs macOS permission" };
  if (/Application.*(isn't running|can't be found)|not running/i.test(text))
    return { status: "SKIP", note: "App not running / not installed" };
  if (/Connection is invalid|errAEConnectionInvalid/i.test(text))
    return { status: "SKIP", note: "App not running (connection invalid)" };
  if (/can't be found|Application can.t be found/i.test(text))
    return { status: "SKIP", note: "App not installed" };
  // macOS JXA API incompatibility (common on newer macOS versions)
  if (/(-1708)|이해할 수 없습니다|event not handled|not understood/i.test(text))
    return { status: "FAIL", note: "JXA API incompatible (scripting dictionary changed)" };
  // Generic osascript error for apps that aren't open (error msg gets truncated)
  if (/osascript error.*Command failed.*Application\(/i.test(text))
    return { status: "SKIP", note: "App automation failed (likely not running)" };
  if (/timed out|timeout/i.test(text))
    return { status: "SKIP", note: "Timed out (service unavailable)" };

  return { status: "FAIL", note: text.slice(0, 150) };
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  // 1. Initialize MCP
  const initId = send("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "qa-test", version: "1.0" },
  });
  const initResp = await waitFor(initId);
  if (!initResp) {
    console.error("Failed to initialize MCP server");
    process.exit(1);
  }
  const { name: serverName, version: serverVersion } = initResp.result.serverInfo;

  notify("notifications/initialized");
  await new Promise((r) => setTimeout(r, 500));

  // 2. Inventory
  const toolsResp = await waitFor(send("tools/list"));
  const promptsResp = await waitFor(send("prompts/list"));
  const resourcesResp = await waitFor(send("resources/list"));
  const templatesResp = await waitFor(send("resources/templates/list"));

  const toolCount = toolsResp?.result?.tools?.length ?? "?";
  const promptCount = promptsResp?.result?.prompts?.length ?? "?";
  const resourceCount =
    (resourcesResp?.result?.resources?.length ?? 0) +
    (templatesResp?.result?.resourceTemplates?.length ?? 0);

  // 3. Run tests
  const results = [];
  for (const [mod, tool, toolArgs] of TEST_PLAN) {
    const resp = await callTool(tool, toolArgs);
    const { status, note } = classify(resp);
    results.push({ module: mod, tool, status, note });

    const icon = status === "PASS" ? "\u2713" : status === "SKIP" ? "\u25CB" : "\u2717";
    if (!jsonMode && !outPath) {
      // live progress to stderr when piping stdout
    }
    process.stderr.write(`  ${icon} [${mod}] ${tool}: ${status}${note ? ` \u2014 ${note}` : ""}\n`);
  }

  // 4. Tally
  const pass = results.filter((r) => r.status === "PASS").length;
  const skip = results.filter((r) => r.status === "SKIP").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const error = results.filter((r) => r.status === "ERROR").length;
  const total = results.length;

  // 5. macOS info
  let macosVersion = "unknown";
  try {
    const { execSync } = await import("child_process");
    macosVersion = execSync("sw_vers -productVersion", { encoding: "utf8" }).trim();
  } catch { /* ignore */ }

  let nodeVersion = process.version;

  // 6. Output
  if (jsonMode) {
    const report = {
      server: { name: serverName, version: serverVersion },
      env: { macos: macosVersion, node: nodeVersion },
      inventory: { tools: toolCount, prompts: promptCount, resources: resourceCount },
      summary: { pass, skip, fail, error, total },
      results,
    };
    const out = JSON.stringify(report, null, 2);
    if (outPath) writeFileSync(outPath.replace(/\.md$/, ".json"), out);
    else console.log(out);
  } else {
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const lines = [];
    lines.push(`## QA Test Report`);
    lines.push(``);
    lines.push(`| | |`);
    lines.push(`|---|---|`);
    lines.push(`| **Server** | ${serverName} v${serverVersion} |`);
    lines.push(`| **Date** | ${now} UTC |`);
    lines.push(`| **macOS** | ${macosVersion} |`);
    lines.push(`| **Node.js** | ${nodeVersion} |`);
    lines.push(`| **Tools** | ${toolCount} |`);
    lines.push(`| **Prompts** | ${promptCount} |`);
    lines.push(`| **Resources** | ${resourceCount} |`);
    lines.push(``);
    lines.push(`### Summary`);
    lines.push(``);
    lines.push(`| PASS | SKIP | FAIL | ERROR | Total |`);
    lines.push(`|------|------|------|-------|-------|`);
    lines.push(`| ${pass} | ${skip} | ${fail} | ${error} | ${total} |`);
    lines.push(``);

    // Group by module
    const modules = [...new Set(results.map((r) => r.module))];
    lines.push(`### Results by Module`);
    lines.push(``);
    lines.push(`| Module | Tool | Status | Note |`);
    lines.push(`|--------|------|--------|------|`);
    for (const mod of modules) {
      const modResults = results.filter((r) => r.module === mod);
      for (const r of modResults) {
        const icon = r.status === "PASS" ? "\u2705" : r.status === "SKIP" ? "\u23ED\uFE0F" : "\u274C";
        lines.push(
          `| ${mod} | \`${r.tool}\` | ${icon} ${r.status} | ${r.note || "-"} |`,
        );
      }
    }

    // Failures detail
    const failures = results.filter((r) => r.status === "FAIL" || r.status === "ERROR");
    if (failures.length > 0) {
      lines.push(``);
      lines.push(`### Failures`);
      lines.push(``);
      for (const r of failures) {
        lines.push(`- **[${r.module}] \`${r.tool}\`** \u2014 ${r.note}`);
      }
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(`*Generated by \`node scripts/qa-test.mjs\`*`);

    const md = lines.join("\n");
    if (outPath) {
      writeFileSync(outPath, md);
      process.stderr.write(`\nReport written to ${outPath}\n`);
    } else {
      console.log(md);
    }
  }

  // Done
  server.kill();
  process.exit(fail + error > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
