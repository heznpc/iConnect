/** Escape a string for safe interpolation inside JXA single-quoted literals. */
export function esc(str: string): string {
  return (
    str
      .replace(/\0/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
  );
}

/** Escape a string for safe interpolation inside AppleScript double-quoted strings. */
export function escAS(str: string): string {
  return (
    str
      .replace(/\0/g, "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
  );
}

/** Escape a string for safe interpolation inside shell double-quoted arguments via doShellScript. */
export function escShell(str: string): string {
  return str
    .replace(/\0/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Escape for shell double-quoted arguments INSIDE a JXA single-quoted string.
 * Two layers: inner escShell for shell, outer esc for JXA single-quote context.
 * Use this whenever doShellScript("...${value}...") is inside a JXA '...' literal.
 */
export function escJxaShell(str: string): string {
  const shellSafe = escShell(str);
  return shellSafe.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Ensure n is a finite integer — prevents shell injection if a non-number leaks through validation. */
export function safeInt(n: number): number {
  const v = Math.trunc(n);
  if (!Number.isSafeInteger(v)) throw new RangeError(`Expected safe integer, got ${n}`);
  return v;
}
