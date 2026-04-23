// RFC 0007 Swift codegen — pure helper functions.
//
// Extracted from scripts/gen-swift-intents.mjs so they can be
// exercised by unit tests (see tests/codegen-helpers.test.js)
// without spinning up the full manifest → codegen pipeline. Every
// function here is input → output with no I/O, no process.env read,
// no filesystem access.
//
// Keeping these in a shared module also prepares the ground for a
// future split of gen-swift-intents.mjs into focused files — that
// refactor is deferred until the RFC 0007 stack merges (see the
// PR chain 112 → 123).

// Swift reserved words — Swift identifiers can't use `default`,
// `class`, `init`, etc. Map any collision to a `_`-suffixed name;
// the JSON-Schema property name stays the wire contract, the Swift
// variable just dodges the keyword.
export const SWIFT_RESERVED = new Set([
  "default",
  "class",
  "struct",
  "init",
  "public",
  "private",
  "extension",
  "import",
  "static",
  "return",
  "self",
  "func",
  "case",
  "switch",
  "if",
  "else",
  "for",
  "while",
  "in",
  "where",
  "operator",
  "protocol",
  "typealias",
]);

export function swiftIdent(name) {
  return SWIFT_RESERVED.has(name) ? `${name}_` : name;
}

// snake_case / kebab-case / mixed → PascalCase. Skills may arrive
// with dashes (e.g. `skill_focus-guardian`); Swift identifiers
// require alphanumeric only, so split on any non-word char.
export function toPascalCase(snake) {
  return snake
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

// audit_log → AuditLogIntent. Avoids collision with hand-written
// intents that live in app/Sources/AirMCPApp (different Swift module).
export function intentStructName(toolName) {
  return `${toPascalCase(toolName)}Intent`;
}

// Swift-safe string literal for a LocalizedStringResource /
// description. Escapes backslashes and double-quotes. Strips newlines
// to avoid breaking the single-line literal form AppIntent accepts.
export function swiftLit(s) {
  return (s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ").trim();
}

// Humanize a camelCase / snake_case property name into a display
// label. "stepsToday" → "Steps Today", "sleep_hours" → "Sleep Hours".
export function humanizeKey(key) {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Swift identifier for an enum case value. JSON-Schema enum values
// we currently carry are all pure [A-Za-z_][A-Za-z0-9_]* (verified
// via the manifest). Non-identifier-safe values throw — this forces
// a future manifest slip to surface at codegen time, not as Swift
// compile errors.
export function enumCaseName(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`enum value "${value}" is not a safe Swift identifier`);
  }
  return SWIFT_RESERVED.has(value) ? `${value}_` : value;
}

// Human-readable display label for an enum case, shown in the
// Shortcuts picker. "nextTrack" → "Next Track", "selection" →
// "Selection".
export function enumCaseDisplayLabel(value) {
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Per-tool, per-param AppEnum type name. Using a tool-scoped name
// avoids cross-tool collision when two tools define the same param
// name with different enum value sets.
export function enumTypeName(toolName, paramName) {
  return `${toPascalCase(toolName)}${toPascalCase(paramName)}Option`;
}

// Pick a `ConfirmationActionName` literal for a destructive tool.
// Apple only exposes `.go` and `.send` on this type as of iOS 26
// (checked with `swiftc -typecheck` — `.delete`/`.save` don't compile,
// and `ConfirmationActionName` has no public initializers), so we map:
//   send/reply/post → `.send` (renders as "Send")
//   everything else → `.go`  (generic verb)
export function intentActionNameFor(toolName) {
  if (/^(send|reply|post)_/.test(toolName)) return ".send";
  return ".go";
}
