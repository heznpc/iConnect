// JXA scripts for macOS Shortcuts automation.

import { esc, escJxaShell } from "../shared/esc.js";

export function listShortcutsScript(): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const output = app.doShellScript('shortcuts list');
    const names = output.split('\\n').filter(n => n.length > 0);
    JSON.stringify({total: names.length, shortcuts: names});
  `;
}

export function runShortcutScript(name: string, input?: string): string {
  const inputPart = input !== undefined
    ? ` --input-type text --input "${escJxaShell(input)}"`
    : "";
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const output = app.doShellScript('shortcuts run "${escJxaShell(name)}"${inputPart}');
    JSON.stringify({shortcut: '${esc(name)}', output: output});
  `;
}

export function searchShortcutsScript(query: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const output = app.doShellScript('shortcuts list');
    const names = output.split('\\n').filter(n => n.length > 0);
    const q = '${esc(query)}'.toLowerCase();
    const matches = names.filter(n => n.toLowerCase().includes(q));
    JSON.stringify({total: matches.length, shortcuts: matches});
  `;
}

export function getShortcutDetailScript(name: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    let actions = '';
    try {
      actions = app.doShellScript('shortcuts view "${escJxaShell(name)}" 2>&1 || true');
    } catch(e) {
      actions = 'Details not available';
    }
    JSON.stringify({shortcut: '${esc(name)}', detail: actions});
  `;
}
