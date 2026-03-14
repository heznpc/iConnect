# AGENTS.md

> Context for AI coding assistants (Claude Code, Cursor, Copilot, Cline, etc.)

## Project Structure

```
src/
├── index.ts              # Server entry — registers all modules
├── notes/                # Apple Notes (12 tools, 3 prompts)
│   ├── tools.ts, scripts.ts, prompts.ts
├── reminders/            # Apple Reminders (7 tools, 2 prompts)
│   ├── tools.ts, scripts.ts, prompts.ts
├── calendar/             # Apple Calendar (7 tools, 2 prompts)
│   ├── tools.ts, scripts.ts, prompts.ts
├── contacts/             # Apple Contacts (7 tools)
│   ├── tools.ts, scripts.ts
├── mail/                 # Apple Mail (5 tools)
│   ├── tools.ts, scripts.ts
├── music/                # Apple Music (5 tools)
│   ├── tools.ts, scripts.ts
├── finder/               # Finder (4 tools)
│   ├── tools.ts, scripts.ts
├── intelligence/         # Apple Intelligence (3 tools, macOS 26+)
│   └── tools.ts
├── cross/                # Cross-module prompts (4 prompts)
│   └── prompts.ts
└── shared/
    ├── jxa.ts            # JXA execution (osascript wrapper)
    ├── swift.ts          # Swift bridge (Foundation Models)
    ├── esc.ts            # String escaping for JXA injection prevention
    ├── result.ts         # ok()/err() MCP response helpers
    └── config.ts         # Environment variable parsing
swift/                    # Swift package for Apple Intelligence
tests/                    # Script generator tests (81 tests)
```

## Module Pattern

Each module follows: `scripts.ts` (JXA generators) + `tools.ts` (MCP registration) + optional `prompts.ts`.

- `scripts.ts`: import `esc` from `../shared/esc.js`, return JXA strings
- `tools.ts`: import `ok, err` from `../shared/result.js`, register via `server.registerTool()`
- All tools must have `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- Tools return `ok(data)` or `err(message)`, never throw

## Key Patterns

- **JXA scripts**: `esc()` for injection prevention, `JSON.stringify` output
- **Swift bridge**: `runSwift(command, input)` — spawns binary, JSON via stdin/stdout
- **stdio only**: `console.log()` breaks MCP — use `console.error()` for debug

## Do NOT Modify

- `.github/workflows/` CI/CD pipeline structure
- `tsconfig.json` module settings (`Node16`)
- `esc()` function in `shared/esc.ts` without security review
