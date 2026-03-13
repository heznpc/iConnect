/** Return a successful MCP tool response with JSON-formatted data. */
export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

/** Return an MCP tool error response. */
export function err(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/** Standardized catch-block helper for tool handlers. */
export function toolError(action: string, e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return err(`Failed to ${action}: ${msg}`);
}
