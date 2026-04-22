# RFC 0006 — Swift Bridge `--dump-example-output` for True Schema Contract

- **Status**: Draft
- **Author**: heznpc + Claude
- **Created**: 2026-04-23
- **Target**: v2.12.0
- **Related**: RFC 0001 (error categories), `src/health/tools.ts` (TS-side fixtures), `swift/Sources/AirMcpBridge/main.swift`, `swift/Sources/AirMCPKit/HealthService.swift`, `tests/script-shape-contract.test.js`

---

## 1. Motivation

The JXA-backed Wave 3 tools (messages, shortcuts) already have an end-to-end contract: scripts.ts exports typed interfaces + `*_EXAMPLE` constants, tools.ts binds them to `runJxa<T>()` and assertions, and `tests/script-shape-contract.test.js` parses each example through the declared `outputSchema` with strict Zod.

The Swift-bridge side (`health_*`, upcoming `photos/semantic/location/bluetooth/intelligence/speech/vision` payloads) has only **half** of that contract. The PR landing alongside this RFC adds hand-maintained TS fixtures (`HEALTH_SUMMARY_EXAMPLE`, etc.) paired with compile-time assertions and the same Zod round-trip test — but the fixtures mirror the Swift Encodable structs **by hand**. A developer who renames `HealthSummary.sleepHoursLastNight` → `sleepHoursLast` in Swift can still commit without the TS fixture noticing, because:

1. Swift is built by a different toolchain (`swift build`) than the TS check (`tsc --noEmit`)
2. No step today parses Swift's **actual runtime output** against the TS Zod schema

The gap: a drift on the Swift side ships silently, and the TS `runSwift<HealthSummary>` generic lies about what the binary returns.

## 2. Goal

Close the loop: the CI must, on every run, ask the Swift binary what JSON each command produces and hand that JSON to the TS Zod `outputSchema`. No hand-maintained fixtures in the critical path.

## 3. Proposed Design

### 3.1 Swift CLI new flag

Add `--dump-example-output <command>` to `swift/Sources/AirMcpBridge/main.swift`. When present, the binary:

1. Skips the normal command dispatch
2. Looks up a static `[command: Encodable]` registry (populated at startup)
3. Encodes the example as JSON, writes to stdout, exits 0

```swift
// Pseudocode
let dumpTarget = args.first(where: { $0 == "--dump-example-output" }).map { args[args.index(of: $0)! + 1] }
if let dumpTarget {
    guard let example = EXAMPLE_REGISTRY[dumpTarget] else { exit(64) }
    try JSONEncoder().encode(example).write(to: stdout)
    exit(0)
}
```

Each command contributes one entry:
```swift
EXAMPLE_REGISTRY["health-summary"] = HealthSummary(stepsToday: 0, heartRateAvg7d: nil, sleepHoursLastNight: 0, activeEnergyToday: 0, exerciseMinutesToday: 0)
EXAMPLE_REGISTRY["health-steps"] = ["stepsToday": 0]
// ...
```

### 3.2 Node-side consumer

`tests/script-shape-contract.test.js` gains a `describe('Swift bridge — live examples')` block that:
1. Spawns `swift/.build/release/AirMcpBridge --dump-example-output <cmd>` for each health tool
2. Parses stdout as JSON
3. Runs the result through `z.object(tool.opts.outputSchema).strict().safeParse(...)`

Guarded by `process.env.AIRMCP_SWIFT_BRIDGE_AVAILABLE === "1"` so the test auto-skips on non-macOS runners. CI ci.yml sets it after `swift build` succeeds.

### 3.3 Removing hand-maintained fixtures

Once 3.1 + 3.2 land, the v2.11-era `HEALTH_SUMMARY_EXAMPLE` / `HEALTH_STEPS_EXAMPLE` / etc. constants in `src/health/tools.ts` become redundant. The migration PR:
- Deletes the `export const HEALTH_*_EXAMPLE` constants
- Removes the health `describe` block from `script-shape-contract.test.js` (the live-Swift block replaces it)
- Leaves the TypeScript interfaces + `runSwift<HealthSummary>` generic bindings in place — they still catch same-side renames at compile time

## 4. Risks / Open Questions

### R1. Swift CLI binary must be buildable on every PR
- **Risk**: CI runners without macOS can't run the live test. Linux / Docker-based contributor environments would skip the live check, losing coverage.
- **Mitigation**: Same skip gate (`AIRMCP_SWIFT_BRIDGE_AVAILABLE`) already used for health unit tests. The main ci.yml job runs on `macos-latest` and always has the bridge.

### R2. `Encodable` non-determinism
- **Risk**: `HealthSummary` has `Double` fields; Swift's `JSONEncoder` may emit `0` vs `0.0` inconsistently between OS versions. Strict Zod `z.number()` accepts both, but if we later tighten types, this becomes a flake.
- **Mitigation**: Use `.sortedKeys` + fixed example values that don't land on 0.0 edge cases.

### R3. Scope creep — all Swift-backed modules
- **Risk**: v2.11 landed fixtures only for `health_*` (5 tools). The RFC implies rolling the pattern out to `photos`, `semantic`, `location`, `bluetooth`, `intelligence`, `speech`, `vision`. That is ~40+ commands, each needing an `EXAMPLE_REGISTRY` entry.
- **Mitigation**: Stage by module; one PR per module. Acceptance criterion: the tool's `outputSchema` is present AND a live example passes.

### R4. CI time budget
- **Risk**: Each `--dump-example-output` spawn is ~100–300ms. 40 commands → ~5–10s extra CI time.
- **Mitigation**: Acceptable. If it grows, batch all commands into one `--dump-all` that emits an NDJSON stream.

## 5. Rollout

| Phase | Content | Version |
|---|---|---|
| 1 | Swift `--dump-example-output` flag + `EXAMPLE_REGISTRY` for health commands only. Node-side consumer test. `AIRMCP_SWIFT_BRIDGE_AVAILABLE` gate. | v2.12.0 |
| 2 | Delete hand-maintained `HEALTH_*_EXAMPLE` constants. | v2.12.0 |
| 3 | Extend to `photos`, `semantic`, `location`, `bluetooth` (next-highest-traffic Swift-backed modules). | v2.13.0 |
| 4 | Extend to remaining Swift-backed modules (`intelligence`, `speech`, `vision`). | v2.14.0 |
| 5 | (Stretch) Generate TS interfaces from Swift via a codegen step, eliminating the compile-time half of the hand-maintenance too. | v2.15.0 or later |

## 6. Acceptance Criteria

- `npm run smoke` continues to pass (unchanged contract).
- `npm test` grows a `describe('Swift bridge — live examples')` block with at least one assertion per health command, each invoking the real Swift binary.
- A deliberate drift (rename `HealthSummary.sleepHoursLastNight` in Swift) fails the live test on CI within the same PR.
- `SECURITY.md` or `CONTRIBUTING.md` documents the `--dump-example-output` flag as a developer tool; the binary only enables it in debug / non-stripped builds if that's a trivial safety measure.

## 7. Alternatives Considered

- **Swift codegen → TS types**: heavier (Swift AST walker), but fully eliminates hand-maintained fixtures. Possible v2.15+ stretch. Not the right first step given RFC 0006's minimal-surface goal.
- **JSON Schema export from Swift**: Swift's `JSONEncoder` has no built-in schema dump. Third-party libs exist but introduce a non-trivial dependency. Rejected for now.
- **Contract tests only at `npm run smoke` time**: requires TCC-granted macOS with a signed-in HealthKit account — not reproducible in CI. Rejected.
