#!/usr/bin/env node
// RFC 0005 Step 2 — local Keycloak devcontainer launcher.
//
// Spins up a pinned Keycloak image, imports the `airmcp` realm from
// docker/keycloak-realm.json (single client `airmcp-dev`, single user
// `dev/dev`, scopes `mcp:read mcp:write mcp:destructive mcp:admin`),
// then prints the exact env vars and curl snippet a developer needs
// to run AirMCP against it locally.
//
// Goals
//   • Zero interaction — `npm run dev:oauth` and wait.
//   • Deterministic realm — the JSON import is version-controlled.
//   • Clean exit — Ctrl-C stops the container.
//
// This is intentionally a shell wrapper around docker / docker compose;
// reimplementing it natively would couple AirMCP's dev UX to a specific
// Node OAuth framework. The compose file + realm JSON stay readable by
// hand, so developers who need to customize are one file edit away.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const COMPOSE_FILE = join(ROOT, "docker", "docker-compose.dev-oauth.yml");

if (!existsSync(COMPOSE_FILE)) {
  console.error(`[dev:oauth] compose file not found at ${COMPOSE_FILE}`);
  process.exit(1);
}

const banner = [
  "",
  "[dev:oauth] starting Keycloak dev realm (airmcp) on http://localhost:8081",
  "",
  "  Once the admin console comes up (~15s), in a new shell run:",
  "",
  "    export AIRMCP_OAUTH_ISSUER=http://localhost:8081/realms/airmcp",
  "    export AIRMCP_OAUTH_AUDIENCE=http://localhost:3000/mcp",
  "    export AIRMCP_ALLOW_NETWORK=with-oauth",
  "    npm run dev -- --http --port 3000",
  "",
  "  Fetch a token (password grant, dev-only):",
  "",
  "    curl -s -X POST http://localhost:8081/realms/airmcp/protocol/openid-connect/token \\",
  '      -H "Content-Type: application/x-www-form-urlencoded" \\',
  '      -d "grant_type=password&client_id=airmcp-dev&username=dev&password=dev&scope=mcp:read mcp:write"',
  "",
  "  Call AirMCP with the returned access_token:",
  "",
  "    curl -s http://localhost:3000/.well-known/oauth-protected-resource",
  "",
  "  Ctrl-C to stop Keycloak.",
  "",
].join("\n");

console.error(banner);

// Prefer `docker compose` (v2) over legacy `docker-compose`. The Docker
// Desktop default on macOS/Linux 2023+ is v2; fall back for CI / older
// installs that still have the standalone binary.
async function hasDockerComposeV2() {
  return new Promise((resolve) => {
    const p = spawn("docker", ["compose", "version"], { stdio: "ignore" });
    p.on("exit", (code) => resolve(code === 0));
    p.on("error", () => resolve(false));
  });
}

const v2 = await hasDockerComposeV2();
const cmd = v2 ? "docker" : "docker-compose";
const args = v2 ? ["compose", "-f", COMPOSE_FILE, "up"] : ["-f", COMPOSE_FILE, "up"];

const child = spawn(cmd, args, { stdio: "inherit" });
const stop = () => {
  if (!child.killed) child.kill("SIGINT");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
