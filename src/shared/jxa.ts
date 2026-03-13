import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const TIMEOUT_MS = 30_000;
const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

export async function runJxa<T>(script: string): Promise<T> {
  let stdout: string;
  try {
    const result = await execFileAsync(
      "osascript",
      ["-l", "JavaScript", "-e", script],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
    );
    stdout = result.stdout;
  } catch (e: unknown) {
    const err = e as { killed?: boolean; signal?: string; stderr?: string };
    if (err.killed || err.signal === "SIGTERM") {
      throw new Error(`osascript timed out after ${TIMEOUT_MS / 1000}s`, { cause: e });
    }
    throw e;
  }
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error("osascript returned empty output");
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`osascript returned invalid JSON: ${trimmed.slice(0, 200)}`);
  }
}
