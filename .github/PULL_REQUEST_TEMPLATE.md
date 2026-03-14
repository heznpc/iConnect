## Summary

<!-- What does this PR do? Keep it to 1-3 sentences. -->

## Type of Change

- [ ] New feature (new tool, module, or prompt)
- [ ] Bug fix
- [ ] Refactoring (no behavior change)
- [ ] Documentation
- [ ] CI/CD or build configuration

## Checklist

- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] User input is escaped with `esc()` / `escJxaShell()` (if adding JXA scripts)
- [ ] Tool has `annotations` with `readOnlyHint` or `destructiveHint`
- [ ] README / docs updated (if tool count or features changed)

## QA Reports

### Read-Only Smoke Test

<!--
  npm run build && npm run qa
-->

<details>
<summary>Read-Only Test Results (click to expand)</summary>

<!-- Paste the output of `node scripts/qa-test.mjs` below -->

```
PASS: ?  |  SKIP: ?  |  FAIL: ?  |  ERROR: ?
```

</details>

### CRUD Roundtrip Test

<!--
  npm run qa:crud
  (or specific modules: node scripts/qa-crud-test.mjs --module notes,calendar)
-->

<details>
<summary>CRUD Test Results (click to expand)</summary>

<!-- Paste the output of `node scripts/qa-crud-test.mjs` below -->

```
PASS: ?  |  SKIP: ?  |  FAIL: ?  |  WARN: ?
```

</details>

### Modules Affected

<!-- Check modules you changed — reviewers will focus on these. -->

- [ ] Notes
- [ ] Reminders
- [ ] Calendar
- [ ] Contacts
- [ ] Mail
- [ ] Music
- [ ] Finder
- [ ] Safari
- [ ] System
- [ ] Photos
- [ ] Messages
- [ ] Shortcuts
- [ ] TV
- [ ] Screen
- [ ] Maps
- [ ] Podcasts
- [ ] Weather
- [ ] Location
- [ ] Bluetooth
- [ ] Intelligence
- [ ] Pages / Numbers / Keynote
- [ ] Semantic
- [ ] UI Automation
- [ ] Shared / Infrastructure

### Manual Testing

<!--
For modules in the "Skipped" list (Messages, Mail-Send, System-Power, etc.),
describe manual testing and outcomes here.
-->
