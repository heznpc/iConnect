import { appendFile, mkdir, stat, rename } from "node:fs/promises";
import { join } from "node:path";
import { PATHS } from "./constants.js";

const AUDIT_PATH = join(PATHS.VECTOR_STORE, "audit.jsonl");
const MAX_ARG_LENGTH = 500;
const MAX_ENTRY_SIZE = 10_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — rotate after this
const FLUSH_INTERVAL = 5_000; // flush buffer every 5s

interface AuditEntry {
  timestamp: string;
  tool: string;
  args?: Record<string, unknown>;
  status: "ok" | "error";
  durationMs?: number;
}

let initialized = false;
let buffer: string[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

async function ensureDir(): Promise<void> {
  if (initialized) return;
  await mkdir(PATHS.VECTOR_STORE, { recursive: true });
  initialized = true;
}

/** Log a tool call to the audit log. Buffered — flushes every 5s. */
export function auditLog(entry: AuditEntry): void {
  const sanitized = entry.args ? sanitizeArgs(entry.args) : undefined;
  let line = JSON.stringify({ ...entry, args: sanitized });
  if (line.length > MAX_ENTRY_SIZE) {
    line = JSON.stringify({ ...entry, args: { _truncated: true }, _note: "entry exceeded 10KB limit" });
  }
  buffer.push(line);
  ensureFlushTimer();
}

function ensureFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushBuffer().catch(() => {});
  }, FLUSH_INTERVAL);
  if (flushTimer.unref) flushTimer.unref();
}

async function flushBuffer(): Promise<void> {
  if (buffer.length === 0) return;
  const lines = buffer.join("\n") + "\n";
  buffer = [];
  try {
    await ensureDir();
    await appendFile(AUDIT_PATH, lines, "utf-8");
    await rotateIfNeeded();
  } catch {
    // non-critical
  }
}

async function rotateIfNeeded(): Promise<void> {
  try {
    const s = await stat(AUDIT_PATH);
    if (s.size > MAX_FILE_SIZE) {
      const rotated = AUDIT_PATH.replace(".jsonl", `.${Date.now()}.jsonl`);
      await rename(AUDIT_PATH, rotated);
    }
  } catch {
    // file doesn't exist or rename failed — fine
  }
}

function sanitizeArgs(args: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 3) return { _truncated: true };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (/\b(password|secret|token|api_?key|auth_?token|credential)\b/i.test(key)) {
      result[key] = "[REDACTED]";
      continue;
    }
    if (typeof value === "string" && value.length > MAX_ARG_LENGTH) {
      result[key] = value.slice(0, MAX_ARG_LENGTH) + `... (${value.length} chars)`;
    } else if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeArgs(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}
