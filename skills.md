# iConnect Shortcuts Skills Guide

A practical guide for AI agents on using Siri Shortcuts effectively through iConnect's MCP tools.

## Available Tools

| Tool | Purpose |
|------|---------|
| `list_shortcuts` | List all shortcuts on the Mac |
| `search_shortcuts` | Find shortcuts by keyword |
| `get_shortcut_detail` | Inspect a shortcut's actions |
| `run_shortcut` | Execute a shortcut with optional text input |
| `create_shortcut` | Create a new empty shortcut (UI automation) |
| `delete_shortcut` | Permanently delete a shortcut by name |
| `export_shortcut` | Export a shortcut to a .shortcut file |
| `import_shortcut` | Import a shortcut from a .shortcut file |

## Shortcut Patterns

### Conditions

Shortcuts support If/Otherwise/End If blocks for branching logic. Common conditions:

- **Input type checks** — branch based on whether input is text, URL, image, etc.
- **Text comparisons** — equals, contains, begins with, ends with
- **Number comparisons** — equals, greater than, less than
- **Date comparisons** — is before, is after, is today

Example flow: receive input, check if it contains a URL, open Safari if yes, save to Notes if no.

### Loops

- **Repeat** — execute actions a fixed number of times
- **Repeat with Each** — iterate over a list of items (files, text lines, contacts)
- The `Current Item` variable holds each element during iteration

### Variables

- **Set Variable / Get Variable** — store and retrieve named values
- **Magic Variables** — every action output is automatically available as a variable
- **Ask for Input** — prompt the user (note: blocks automation when run via CLI)

### Text Processing

- **Split Text** — split by newline, comma, or custom separator
- **Combine Text** — join list items with a separator
- **Replace Text** — regex or literal replacement
- **Match Text** — regex pattern matching with capture groups
- **Change Case** — upper, lower, title case

### Data Flow

- **Get Dictionary Value** — extract values from JSON/dictionary objects
- **Set Dictionary Value** — build structured data
- **Get Item from List** — index into a list (first, last, random, index N)
- **Count** — count items in a list or characters in text

## Chaining Strategies

### Sequential chaining

Pass the output of one shortcut as input to the next:

```
1. run_shortcut("Extract URLs", input: articleText)
   -> returns list of URLs
2. run_shortcut("Summarize Page", input: urls)
   -> returns summaries
3. run_shortcut("Format Report", input: summaries)
   -> returns formatted report
```

### Discovery-first approach

Always verify shortcuts exist before running them:

```
1. search_shortcuts(query: "pdf")
   -> find relevant shortcuts
2. get_shortcut_detail(name: "Convert to PDF")
   -> understand what it expects
3. run_shortcut(name: "Convert to PDF", input: data)
   -> execute with correct input
```

### Export-modify-import cycle

For sharing or backing up shortcut configurations:

```
1. export_shortcut(name: "My Workflow", outputPath: "~/Desktop/My Workflow.shortcut")
   -> saves to file
2. Transfer or back up the .shortcut file
3. import_shortcut(filePath: "~/Desktop/My Workflow.shortcut")
   -> import on same or different Mac
```

## Common System Actions Reference

These are built-in Shortcuts actions frequently found in user shortcuts:

| Action | What it does |
|--------|-------------|
| Get Current Date | Returns current date/time |
| Format Date | Convert date to string with format |
| Get Contents of URL | HTTP request (GET, POST, PUT) |
| Show Result | Display output (or return to CLI) |
| Show Notification | System notification banner |
| Copy to Clipboard | Copy text to clipboard |
| Get Clipboard | Read clipboard content |
| Open URL | Open in default browser |
| Open App | Launch an application |
| Run Shell Script | Execute bash/zsh commands |
| Run AppleScript | Execute AppleScript code |
| Get File | Access files from iCloud Drive or local storage |
| Save File | Save data to a file |
| Send Message | Send via Messages app |
| Send Email | Compose and send via Mail |
| Create Note | Add a note in Apple Notes |
| Add New Reminder | Create a reminder |
| Add New Event | Create a calendar event |
| Set Volume | Adjust system volume |
| Set Brightness | Adjust screen brightness |
| Toggle Appearance | Switch dark/light mode |

## Error Handling Patterns

### Name matching errors

Shortcut names must match exactly, including case and whitespace:

```
# Wrong
run_shortcut(name: "my shortcut")

# Right - verify first
search_shortcuts(query: "my shortcut")
# Use the exact name returned
run_shortcut(name: "My Shortcut")
```

### Timeout handling

Some shortcuts take longer than the default timeout (30 seconds). If a shortcut times out:
- Check if it requires user interaction (UI prompts block CLI execution)
- Check if it performs network requests that may be slow
- Consider breaking it into smaller shortcuts

### Missing shortcut errors

If `run_shortcut` fails with "shortcut not found":
1. Use `list_shortcuts` to get all available names
2. Use `search_shortcuts` with partial keywords
3. Check for typos or name changes

### Permission errors

Some shortcut actions require specific permissions:
- Accessibility access for UI automation
- Location services for location-based shortcuts
- Photo library access for photo operations
- Contacts access for contact operations

If a shortcut fails with permission errors, guide the user to grant the required permission in System Settings > Privacy & Security.

### Handling shortcuts that require interaction

Some shortcuts trigger UI dialogs (Ask for Input, Choose from Menu). These will hang when run via CLI. Strategies:
- Inspect with `get_shortcut_detail` to identify interactive actions before running
- Provide input text via the `input` parameter to skip input prompts when possible
- Warn the user that a shortcut may require manual interaction

## Examples: Combining iConnect Modules with Shortcuts

### Daily digest automation

```
1. list_events (Calendar) -> get today's meetings
2. list_reminders (Reminders) -> get due tasks
3. run_shortcut("Format Daily Digest", input: combined data)
4. create_note (Notes) -> save the formatted digest
```

### File processing pipeline

```
1. search_files (Finder) -> find files matching criteria
2. run_shortcut("Convert to PDF", input: file paths)
3. run_shortcut("Compress Files", input: PDF paths)
4. show_notification (System) -> notify completion
```

### Research workflow

```
1. run_shortcut("Search Web", input: query)
2. read_page_content (Safari) -> extract content
3. run_shortcut("Summarize Text", input: content)
4. create_note (Notes) -> save research summary
5. create_reminder (Reminders) -> follow-up task
```

### Backup shortcuts

```
1. list_shortcuts -> get all shortcut names
2. For each shortcut:
   export_shortcut(name, outputPath: "~/Shortcuts-Backup/<name>.shortcut")
3. show_notification (System) -> "Backup complete: N shortcuts exported"
```

### Import shared shortcuts

```
1. search_files (Finder) -> find .shortcut files in Downloads
2. For each file:
   import_shortcut(filePath)
3. list_shortcuts -> verify imports
```

### Clean up unused shortcuts

```
1. list_shortcuts -> get all names
2. get_shortcut_detail for each -> inspect actions
3. Identify empty or broken shortcuts
4. delete_shortcut for confirmed removals
5. create_note (Notes) -> log what was cleaned up
```

## Best Practices

1. **Always discover first** — use `list_shortcuts` and `search_shortcuts` before attempting to run anything.
2. **Inspect before executing** — use `get_shortcut_detail` to understand what a shortcut does before running it.
3. **Use exact names** — shortcut names are case-sensitive. Always use the name exactly as returned by `list_shortcuts`.
4. **Export before deleting** — use `export_shortcut` to back up a shortcut before using `delete_shortcut`.
5. **Chain with other modules** — combine Shortcuts with Notes, Calendar, Reminders, Finder, and other iConnect modules for powerful workflows.
6. **Handle errors gracefully** — wrap shortcut operations in try/catch logic and provide meaningful fallbacks.
7. **Warn about UI prompts** — shortcuts with interactive actions will block CLI execution. Always check with `get_shortcut_detail` first.
8. **Respect destructive operations** — `delete_shortcut` is permanent. Always confirm with the user before deleting.
