import { describe, test, expect } from '@jest/globals';
import {
  getClipboardScript,
  setClipboardScript,
  getVolumeScript,
  setVolumeScript,
  toggleDarkModeScript,
  getFrontmostAppScript,
} from '../dist/system/scripts.js';

describe('system script generators', () => {
  test('getClipboardScript reads clipboard', () => {
    const script = getClipboardScript();
    expect(script).toContain('theClipboard()');
    expect(script).toContain('includeStandardAdditions');
  });

  test('setClipboardScript sets clipboard text', () => {
    const script = setClipboardScript('hello world');
    expect(script).toContain('setTheClipboardTo');
    expect(script).toContain('hello world');
  });

  test('getVolumeScript reads volume settings', () => {
    const script = getVolumeScript();
    expect(script).toContain('getVolumeSettings');
    expect(script).toContain('outputVolume');
    expect(script).toContain('outputMuted');
  });

  test('setVolumeScript sets volume', () => {
    const script = setVolumeScript(75, false);
    expect(script).toContain('setVolume');
    expect(script).toContain('75');
    expect(script).toContain('outputMuted: false');
  });

  test('toggleDarkModeScript toggles appearance', () => {
    const script = toggleDarkModeScript();
    expect(script).toContain('System Events');
    expect(script).toContain('appearancePreferences');
    expect(script).toContain('darkMode');
  });

  test('getFrontmostAppScript gets active app', () => {
    const script = getFrontmostAppScript();
    expect(script).toContain('frontmost: true');
    expect(script).toContain('bundleIdentifier');
  });
});

describe('system esc() injection prevention', () => {
  test('escapes single quotes in clipboard text', () => {
    const script = setClipboardScript("it's a test");
    expect(script).toContain("it\\'s a test");
  });
});
