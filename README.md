# iConnect

MCP server for the entire Apple ecosystem — Notes, Reminders, Calendar, Contacts, Mail, Messages, Music, Finder, Safari, System, Photos, Shortcuts, Apple Intelligence, and TV. Connect any AI to your Mac.

> [한국어](README.ko.md)

## Get Started (2 minutes)

### 1. Install Node.js

If you don't have Node.js, install it first:

```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org (LTS version)
```

### 2. Run the Setup Wizard

```bash
npx iconnect-mcp init
```

This will:
- Let you choose which Apple apps to connect (Notes, Calendar, Reminders, etc.)
- Automatically configure Claude Desktop
- Save your preferences to `~/.config/iconnect/config.json`

### 3. Restart Claude Desktop

That's it! Claude can now read your notes, manage reminders, check your calendar, and more.

### Troubleshooting

```bash
npx iconnect-mcp doctor
```

Checks Node.js version, config files, Claude Desktop setup, macOS permissions, and module status — all in one command.

---

## What Can It Do?

**123 tools** across 14 Apple app modules + semantic search, **11 MCP resources**, and **23 prompts**:

| Module | What it does | Tools |
|--------|-------------|-------|
| **Notes** | Read, create, search, organize notes and folders | 12 |
| **Reminders** | Create tasks, set due dates, manage lists | 11 |
| **Calendar** | View events, create meetings, check schedule | 10 |
| **Contacts** | Look up people, manage contact info | 10 |
| **Mail** | Read, search, send, reply to emails | 11 |
| **Music** | Control playback, search tracks, manage playlists | 9 |
| **Finder** | Browse files, search with Spotlight, organize | 8 |
| **Safari** | Read web pages, manage tabs | 8 |
| **System** | Clipboard, volume, dark mode, screenshots, notifications | 10 |
| **Photos** | Browse albums, import/delete photos | 9 |
| **Messages** | View chats, send iMessages | 6 |
| **Shortcuts** | Run Siri Shortcuts from AI | 4 |
| **Intelligence** | On-device summarize, rewrite, proofread (macOS 26+) | 3 |
| **TV** | Browse library, control playback, search content | 6 |
| **Semantic** | On-device cross-app semantic search (Swift bridge) | 4 |

All tools include MCP annotations (`readOnlyHint`, `destructiveHint`, `openWorldHint`) for client-side safety UI.

## Module Presets

By default, new installations start with 5 core modules (Notes, Reminders, Calendar, Shortcuts, System) to keep things simple. You can enable more anytime:

```bash
# Re-run the setup wizard to change modules
npx iconnect-mcp init

# Or enable all modules at once
npx iconnect-mcp --full
```

Or edit `~/.config/iconnect/config.json` directly:

```json
{
  "disabledModules": ["messages", "intelligence"]
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx iconnect-mcp init` | Interactive setup wizard |
| `npx iconnect-mcp doctor` | Diagnose installation issues |
| `npx iconnect-mcp` | Start MCP server (stdio, default) |
| `npx iconnect-mcp --full` | Start with all 14 modules enabled |
| `npx iconnect-mcp --http` | Start as HTTP server (port 3847) |

## Alternative Setup (Manual)

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "iconnect": {
      "command": "npx",
      "args": ["-y", "iconnect-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add iconnect -- npx -y iconnect-mcp
```

### Local Development

```bash
git clone https://github.com/heznpc/iConnect.git
cd iConnect
npm install
npm run build
node dist/index.js
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ICONNECT_INCLUDE_SHARED` | `false` | Include shared notes/folders |
| `ICONNECT_ALLOW_SEND_MESSAGES` | `true` | Allow sending iMessages |
| `ICONNECT_ALLOW_SEND_MAIL` | `true` | Allow sending emails |
| `ICONNECT_FULL` | `false` | Enable all modules (ignores preset) |
| `ICONNECT_DISABLE_{MODULE}` | — | Disable a specific module (e.g. `ICONNECT_DISABLE_MUSIC=true`) |
| `GEMINI_API_KEY` | — | Google Gemini API key for higher-quality embeddings (optional) |

### Config File

`~/.config/iconnect/config.json`:

```json
{
  "disabledModules": ["messages", "intelligence"],
  "includeShared": false,
  "allowSendMessages": true,
  "allowSendMail": true,
  "hitl": {
    "level": "destructive-only",
    "timeout": 30
  }
}
```

## Advanced Features

### HTTP Mode

Run iConnect as an HTTP server for remote agents or multi-client setups:

```bash
npx iconnect-mcp --http --port 3847
```

### Human-in-the-Loop (HITL)

Require manual approval before destructive operations:

```json
{
  "hitl": {
    "level": "destructive-only",
    "timeout": 30
  }
}
```

Levels: `off`, `destructive-only`, `all-writes`, `all`

### Menubar App (Optional)

A native SwiftUI companion app for server status monitoring and permission setup:

```bash
cd app && swift build -c release
```

### Semantic Search (Optional)

On-device cross-app semantic search powered by Apple's NLContextualEmbedding. Find related notes, events, reminders, and emails by meaning — not just keywords.

```bash
npm run swift-build  # Build the Swift bridge first
```

Then use the tools:
1. `semantic_index` — Index data from enabled Apple apps into a local vector store
2. `semantic_search` — Search by meaning across all indexed data
3. `find_related` — Find items related to a specific note/event/reminder
4. `semantic_status` — Check index status

Supports Korean, English, Japanese, Chinese with automatic language detection. Optionally set `GEMINI_API_KEY` for higher-quality Google Gemini embeddings.

### Swift Bridge (Optional)

For semantic search, recurring events/reminders (EventKit), photo import/delete (PhotoKit), and Apple Intelligence — requires macOS 26+:

```bash
npm run swift-build
```

## Tools Reference

<details>
<summary>Notes (12 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_notes` | List all notes with title, folder, dates | read |
| `search_notes` | Search by keyword in title and body | read |
| `read_note` | Read full content by ID | read |
| `create_note` | Create a note with HTML body | write |
| `update_note` | Replace entire body | destructive |
| `delete_note` | Delete (moved to Recently Deleted) | destructive |
| `move_note` | Move to another folder | destructive |
| `list_folders` | List folders with note counts | read |
| `create_folder` | Create a new folder | write |
| `scan_notes` | Bulk scan with metadata and preview | read |
| `compare_notes` | Compare 2-5 notes side by side | read |
| `bulk_move_notes` | Move multiple notes at once | destructive |
</details>

<details>
<summary>Reminders (11 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_reminder_lists` | List all lists with counts | read |
| `list_reminders` | Filter by list/completed | read |
| `read_reminder` | Full details by ID | read |
| `create_reminder` | Create with due date/priority | write |
| `update_reminder` | Update properties | destructive |
| `complete_reminder` | Mark complete/incomplete | write |
| `delete_reminder` | Delete permanently | destructive |
| `search_reminders` | Search by keyword in name/body | read |
| `create_reminder_list` | Create a new reminder list | write |
| `delete_reminder_list` | Delete a reminder list | destructive |
| `create_recurring_reminder` | Create with recurrence rule (Swift/EventKit) | write |
</details>

<details>
<summary>Calendar (10 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_calendars` | List calendars with name/color | read |
| `list_events` | Events in date range with pagination | read |
| `read_event` | Full details with attendees | read |
| `create_event` | Create with location/description | write |
| `update_event` | Update properties | destructive |
| `delete_event` | Delete permanently | destructive |
| `search_events` | Keyword search in date range | read |
| `get_upcoming_events` | Next N events from now | read |
| `today_events` | All events for today | read |
| `create_recurring_event` | Create with recurrence rule (Swift/EventKit) | write |
</details>

<details>
<summary>Contacts (10 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_contacts` | List with email/phone, pagination | read |
| `search_contacts` | Search by name, email, phone, or org | read |
| `read_contact` | Full details (emails, phones, addresses) | read |
| `create_contact` | Create with email/phone/org | write |
| `update_contact` | Update properties | destructive |
| `delete_contact` | Delete permanently | destructive |
| `list_groups` | List contact groups | read |
| `add_contact_email` | Add email to existing contact | write |
| `add_contact_phone` | Add phone to existing contact | write |
| `list_group_members` | List contacts in a group | read |
</details>

<details>
<summary>Mail (11 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_mailboxes` | List mailboxes with unread counts | read |
| `list_messages` | Recent messages in a mailbox | read |
| `read_message` | Full message content | read |
| `search_messages` | Search by subject/sender | read |
| `mark_message_read` | Mark read/unread | write |
| `flag_message` | Flag/unflag a message | write |
| `get_unread_count` | Total unread across all mailboxes | read |
| `move_message` | Move message to another mailbox | destructive |
| `list_accounts` | List all mail accounts | read |
| `send_mail` | Compose and send an email | write |
| `reply_mail` | Reply to an email message | write |
</details>

<details>
<summary>Music (9 tools)</summary>

| Tool | Description | Type |
|------|-------------|------|
| `list_playlists` | List playlists with track counts | read |
| `list_tracks` | Tracks in a playlist | read |
| `now_playing` | Current track and playback state | read |
| `playback_control` | Play, pause, next, previous | write |
| `search_tracks` | Search by name/artist/album | read |
| `play_track` | Play a specific track by name | write |
| `play_playlist` | Start playing a playlist | write |
| `get_track_info` | Detailed track metadata | read |
| `set_shuffle` | Set shuffle and repeat mode | write |
</details>

<details>
<summary>Finder, Safari, System, Photos, Messages, Shortcuts, Intelligence, TV</summary>

See the full tool list in the [Tools Reference](https://github.com/heznpc/iConnect/wiki/Tools-Reference) or run the server to explore via your AI client.
</details>

## Prompts

### Per-App
- **organize-notes** — Classify notes by topic, create folders, move
- **find-duplicates** — Find similar notes, compare, suggest cleanup
- **weekly-review** — Summarize past week's notes
- **organize-reminders** — Scan, identify overdue/completed, cleanup
- **daily-review** — Today's due reminders with priorities
- **schedule-review** — Upcoming events, conflicts, optimizations
- **meeting-prep** — Event details + related notes for meeting prep

### Cross-Module
- **daily-briefing** — Today's events + due reminders + recent notes
- **weekly-digest** — Past N days: events + notes + reminders combined
- **meeting-notes-to-reminders** — Extract action items from meeting notes, create reminders
- **event-follow-up** — Create follow-up note and reminders after a meeting
- **research-with-safari** — Safari research + Notes에 결과 저장
- **focus-session** — Calendar + Reminders + Music focus session
- **file-organizer** — Finder file organization + Notes logging

### Developer Workflows
- **dev-session** — Scan project, check specs, research docs, create session notes
- **debug-loop** — Capture errors from Safari/clipboard, locate code, log bugs
- **screen-capture-flow** — Screenshot → Photos import → annotation notes
- **app-release-prep** — Calendar schedule + Notes changelog + Reminders checklist
- **idea-to-task** — Break idea into tasks → Reminders + Calendar time blocks
- **build-log** — Analyze build output, log errors or celebrate success

### Shortcuts
- **shortcut-automation** — Discover and chain Siri Shortcuts for automation
- **shortcut-discovery** — Find relevant shortcuts for a task
- **shortcut-troubleshooting** — Debug and fix broken shortcuts

## Requirements

- macOS (Apple apps require macOS)
- Node.js >= 18
- Apple Intelligence tools require macOS 26+ with Apple Silicon

## Limitations

- **Notes**: Move copies and deletes (new ID, reset dates, lost attachments). Update replaces entire body.
- **Calendar/Reminders**: JXA recurrence is read-only — use Swift bridge for recurring items.
- **Messages**: Chat message history not accessible via JXA. Send requires known buddy.
- **Safari**: Reading page content requires "Allow JavaScript from Apple Events" in Safari Developer menu.
- **Photos**: Full import/delete requires Swift bridge (macOS 26+).

## License

MIT
