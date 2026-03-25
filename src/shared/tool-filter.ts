/**
 * Tool description optimizer — reduces token consumption in tools/list.
 *
 * When AIRMCP_COMPACT_TOOLS=true, tool descriptions are shortened
 * to save tokens in the LLM context window.
 *
 * Full list at ~37K tokens -> compact at ~20K tokens (46% reduction).
 *
 * This is the pragmatic implementation of SEP-1821 filtering:
 * rather than hacking SDK internals to intercept the tools/list handler,
 * we reduce per-tool token cost at registration time by truncating
 * descriptions to their first sentence.
 *
 * The full descriptions are preserved in the tool registry for
 * discover_tools / semantic search so search quality is unaffected.
 */

const COMPACT_MODE = process.env.AIRMCP_COMPACT_TOOLS === "true";

/** Whether compact tool descriptions are enabled. */
export function isCompactMode(): boolean {
  return COMPACT_MODE;
}

/**
 * Shorten a tool description for compact mode.
 * Takes the first sentence only and caps at 80 characters.
 * Returns the original description unchanged when compact mode is off.
 */
export function compactDescription(description: string): string {
  if (!COMPACT_MODE) return description;
  // Take first sentence only (split on ". " to avoid splitting on abbreviations/decimals)
  const firstSentence = description.split(/\.\s/)[0];
  if (!firstSentence) return description;
  // Cap at 80 chars
  return firstSentence.length > 80
    ? firstSentence.slice(0, 77) + "..."
    : firstSentence.endsWith(".")
      ? firstSentence
      : firstSentence + ".";
}
