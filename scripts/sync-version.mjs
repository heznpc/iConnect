#!/usr/bin/env node
/**
 * sync-version.mjs — Single source of truth version sync.
 *
 * Reads version from package.json and propagates to:
 *   1. server.json                          (MCP registry manifest)
 *   2. app/.../UpdateManager.swift          (menubar app update checker)
 *   3. src/shared/constants.ts              (User-Agent header)
 *   4. scripts/bundle-app.sh               (CFBundleShortVersionString)
 *
 * Usage:
 *   node scripts/sync-version.mjs           # sync all files
 *   node scripts/sync-version.mjs --check   # verify all in sync (CI)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const VERSION = pkg.version;
const MAJOR_MINOR = VERSION.split(".").slice(0, 2).join(".");

const checkMode = process.argv.includes("--check");
let dirty = false;

function syncFile(relPath, replacements) {
  const absPath = resolve(root, relPath);
  if (!existsSync(absPath)) {
    console.warn(`  skip: ${relPath} (not found)`);
    return;
  }
  let content = readFileSync(absPath, "utf8");
  let changed = false;

  for (const { pattern, replacement, label } of replacements) {
    const updated = content.replace(pattern, replacement);
    if (updated !== content) {
      changed = true;
      content = updated;
    } else if (!pattern.test(content.replace(pattern, replacement) === content ? "" : content)) {
      // Check if the current value already matches
      if (!pattern.test(content)) {
        console.warn(`  warn: ${relPath} — pattern not found for "${label}"`);
      }
    }
  }

  if (changed) {
    if (checkMode) {
      console.error(`  STALE: ${relPath}`);
      dirty = true;
    } else {
      writeFileSync(absPath, content);
      console.log(`  sync: ${relPath}`);
    }
  } else {
    console.log(`  ok:   ${relPath}`);
  }
}

console.log(`\nVersion sync: ${VERSION}\n`);

// 1. server.json
const serverJsonPath = resolve(root, "server.json");
if (existsSync(serverJsonPath)) {
  const sj = JSON.parse(readFileSync(serverJsonPath, "utf8"));
  let sjChanged = false;
  if (sj.version !== VERSION) {
    sj.version = VERSION;
    sjChanged = true;
  }
  if (sj.packages?.[0]?.version !== VERSION) {
    sj.packages[0].version = VERSION;
    sjChanged = true;
  }
  if (sjChanged) {
    if (checkMode) {
      console.error("  STALE: server.json");
      dirty = true;
    } else {
      writeFileSync(serverJsonPath, JSON.stringify(sj, null, 2) + "\n");
      console.log("  sync: server.json");
    }
  } else {
    console.log("  ok:   server.json");
  }
}

// 2. UpdateManager.swift — currentVersion = "x.y.z"
syncFile("app/Sources/AirMCPApp/UpdateManager.swift", [
  {
    pattern: /private let currentVersion = "[^"]+"/,
    replacement: `private let currentVersion = "${VERSION}"`,
    label: "currentVersion",
  },
]);

// 3. constants.ts — User-Agent AirMCP/x.y
syncFile("src/shared/constants.ts", [
  {
    pattern: /AirMCP\/[\d.]+ \(/,
    replacement: `AirMCP/${MAJOR_MINOR} (`,
    label: "USER_AGENT",
  },
]);

// 4. bundle-app.sh — CFBundleShortVersionString
syncFile("scripts/bundle-app.sh", [
  {
    pattern: /CFBundleShortVersionString string [\d.]+/,
    replacement: `CFBundleShortVersionString string ${VERSION}`,
    label: "CFBundleShortVersionString",
  },
]);

console.log("");

if (checkMode && dirty) {
  console.error("Version mismatch detected. Run: node scripts/sync-version.mjs");
  process.exit(1);
}
