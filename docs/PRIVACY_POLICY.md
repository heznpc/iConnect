# Privacy Policy

**iConnect** — MCP Server for Apple Apps on macOS
Last updated: 2026-03-13

## Overview

iConnect is an open-source, local-first MCP (Model Context Protocol) server that runs entirely on your Mac. It provides tools for interacting with Apple apps (Notes, Reminders, Calendar, Contacts, Mail, Messages, Music, Finder, Safari, System, Photos, Shortcuts, and Apple Intelligence) through JXA (JavaScript for Automation) and a Swift bridge.

This privacy policy explains how iConnect handles your data.

## Data Collection

**iConnect does not collect any data.** Specifically:

- No analytics or telemetry
- No usage tracking
- No crash reporting to external services
- No cookies or browser fingerprinting
- No advertising or marketing data collection

## How Your Data Is Handled

iConnect operates as a bridge between an MCP client (such as Claude Desktop) and the Apple apps on your Mac. When you use iConnect:

1. **All processing is local.** iConnect runs on your machine and communicates with Apple apps through macOS automation APIs. Your data never leaves your Mac via iConnect.

2. **Data flows only between the MCP client and your local apps.** When you ask the MCP client to read or modify data in an Apple app, iConnect executes that request locally. The data is read from or written to the app on your Mac.

3. **No external servers.** iConnect does not operate or connect to any remote server, database, or cloud service of its own. It has no backend infrastructure.

## Transport Modes

- **stdio (default):** Communication happens through standard input/output between the MCP client and iConnect on your local machine. No network traffic is involved.
- **HTTP/SSE:** When enabled, iConnect listens on a local network interface. This mode is intended for local or LAN use. You are responsible for securing network access if you choose to expose this transport.

## Third-Party Services

iConnect does not integrate with, send data to, or receive data from any third-party service. The MCP client you use (e.g., Claude Desktop) has its own privacy policy, which governs how that client handles data it receives.

## macOS Permissions

iConnect requires macOS automation permissions to interact with Apple apps. These permissions are managed by macOS and are granted by you through system prompts. iConnect uses these permissions solely to execute the actions you request through the MCP client.

## Open Source

iConnect is open-source software under the MIT License. You can inspect the full source code at [github.com/heznpc/iConnect](https://github.com/heznpc/iConnect) to verify these claims.

## Changes to This Policy

Updates to this policy will be reflected in this file in the repository. The "Last updated" date at the top will be revised accordingly.

## Contact

For questions about this privacy policy, open an issue on the [GitHub repository](https://github.com/heznpc/iConnect).
