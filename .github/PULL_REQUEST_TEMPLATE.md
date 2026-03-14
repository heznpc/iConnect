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

## QA Report

<!--
Run the QA test and paste the output here:

  npm run build && node scripts/qa-test.mjs

The script exercises all read-only tools and generates a Markdown report.
If a tool you changed shows FAIL, explain why or fix it before merging.
-->

<details>
<summary>QA Test Results (click to expand)</summary>

<!-- Paste the output of `node scripts/qa-test.mjs` below -->

```
PASS: ?  |  SKIP: ?  |  FAIL: ?  |  ERROR: ?
```

</details>

### Modules Affected

<!-- Which modules did you change? List them so reviewers know what to focus on. -->

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
Describe any manual testing beyond the QA script.
For write/destructive tools, explain what you tested and the outcome.
-->
