// JXA scripts for macOS system automation.

import { esc, escJxaShell } from "../shared/esc.js";

export function getClipboardScript(): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    let text;
    try { text = app.theClipboard(); } catch(e) { text = ''; }
    const content = (typeof text === 'object') ? JSON.stringify(text) : String(text);
    JSON.stringify({content: content});
  `;
}

export function setClipboardScript(text: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const text = '${esc(text)}';
    app.setTheClipboardTo(text);
    JSON.stringify({set: true, length: text.length});
  `;
}

export function getVolumeScript(): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const vol = app.getVolumeSettings();
    JSON.stringify({
      outputVolume: vol.outputVolume,
      inputVolume: vol.inputVolume,
      outputMuted: vol.outputMuted
    });
  `;
}

export function setVolumeScript(volume?: number, muted?: boolean): string {
  const parts: string[] = [];
  if (volume !== undefined) parts.push(`outputVolume: ${Math.max(0, Math.min(100, Math.round(volume)))}`);
  if (muted !== undefined) parts.push(`outputMuted: ${muted}`);
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.setVolume(null, {${parts.join(", ")}});
    const vol = app.getVolumeSettings();
    JSON.stringify({
      outputVolume: vol.outputVolume,
      outputMuted: vol.outputMuted
    });
  `;
}

export function toggleDarkModeScript(): string {
  return `
    const se = Application('System Events');
    const current = se.appearancePreferences.darkMode();
    se.appearancePreferences.darkMode = !current;
    JSON.stringify({darkMode: !current});
  `;
}

export function getFrontmostAppScript(): string {
  return `
    const se = Application('System Events');
    const procs = se.processes.whose({frontmost: true})();
    if (procs.length === 0) throw new Error('No frontmost app found');
    const proc = procs[0];
    JSON.stringify({
      name: proc.name(),
      bundleIdentifier: proc.bundleIdentifier(),
      pid: proc.unixId()
    });
  `;
}

export function listRunningAppsScript(): string {
  return `
    const se = Application('System Events');
    const procs = se.applicationProcesses();
    const result = [];
    for (const p of procs) {
      try {
        result.push({
          name: p.name(),
          bundleIdentifier: p.bundleIdentifier(),
          pid: p.unixId(),
          visible: p.visible()
        });
      } catch(e) {}
    }
    JSON.stringify({total: result.length, apps: result});
  `;
}

export function getScreenInfoScript(): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const output = app.doShellScript('system_profiler SPDisplaysDataType -json');
    const data = JSON.parse(output);
    const displays = [];
    for (const gpu of (data.SPDisplaysDataType || [])) {
      for (const d of (gpu.spdisplays_ndrvs || [])) {
        displays.push({
          name: d._name,
          resolution: d._spdisplays_resolution,
          pixelWidth: d._spdisplays_pixels ? parseInt(d._spdisplays_pixels.split(' x ')[0]) : null,
          pixelHeight: d._spdisplays_pixels ? parseInt(d._spdisplays_pixels.split(' x ')[1]) : null,
          retina: d.spdisplays_retina === 'spdisplays_yes'
        });
      }
    }
    JSON.stringify({displays: displays});
  `;
}

export function captureScreenshotScript(path: string, region?: string): string {
  const regionFlag = region === "selection" ? " -i" : region === "window" ? " -w" : "";
  const safePath = escJxaShell(path);
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.doShellScript('screencapture -x${regionFlag} "${safePath}"');
    const info = app.doShellScript('stat -f "%z" "${safePath}"');
    JSON.stringify({captured: true, path: '${esc(path)}', sizeBytes: parseInt(info)});
  `;
}

export function showNotificationScript(message: string, title?: string, subtitle?: string, sound?: string): string {
  const opts: string[] = [];
  if (title) opts.push(`withTitle: '${esc(title)}'`);
  if (subtitle) opts.push(`subtitle: '${esc(subtitle)}'`);
  if (sound) opts.push(`soundName: '${esc(sound)}'`);
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.displayNotification('${esc(message)}', {${opts.join(', ')}});
    JSON.stringify({sent: true, message: '${esc(message)}'});
  `;
}
