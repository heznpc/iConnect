import { describe, test, expect } from '@jest/globals';
import {
  getClipboardScript,
  setClipboardScript,
  getVolumeScript,
  setVolumeScript,
  toggleDarkModeScript,
  getFrontmostAppScript,
  launchAppScript,
  quitAppScript,
  isAppRunningScript,
  listAllWindowsScript,
  moveWindowScript,
  resizeWindowScript,
  minimizeWindowScript,
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

describe('app management script generators', () => {
  test('launchAppScript activates app', () => {
    const script = launchAppScript('Safari');
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('activate()');
  });

  test('quitAppScript quits app', () => {
    const script = quitAppScript('Safari');
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('quit()');
  });

  test('isAppRunningScript checks process list', () => {
    const script = isAppRunningScript('Finder');
    expect(script).toContain('System Events');
    expect(script).toContain("name: 'Finder'");
    expect(script).toContain('bundleIdentifier');
    expect(script).toContain('running');
  });
});

describe('window management script generators', () => {
  test('listAllWindowsScript lists all windows', () => {
    const script = listAllWindowsScript();
    expect(script).toContain('System Events');
    expect(script).toContain('backgroundOnly: false');
    expect(script).toContain('windows()');
    expect(script).toContain('position');
    expect(script).toContain('size');
  });

  test('moveWindowScript sets position', () => {
    const script = moveWindowScript('Safari', 100, 200);
    expect(script).toContain('System Events');
    expect(script).toContain("byName('Safari')");
    expect(script).toContain('win.position = [100, 200]');
  });

  test('moveWindowScript with window title', () => {
    const script = moveWindowScript('Safari', 0, 0, 'Google');
    expect(script).toContain("name: 'Google'");
    expect(script).toContain('win.position = [0, 0]');
  });

  test('resizeWindowScript sets size', () => {
    const script = resizeWindowScript('Terminal', 800, 600);
    expect(script).toContain('System Events');
    expect(script).toContain("byName('Terminal')");
    expect(script).toContain('win.size = [800, 600]');
  });

  test('resizeWindowScript with window title', () => {
    const script = resizeWindowScript('Safari', 1024, 768, 'GitHub');
    expect(script).toContain("name: 'GitHub'");
    expect(script).toContain('win.size = [1024, 768]');
  });

  test('minimizeWindowScript minimizes', () => {
    const script = minimizeWindowScript('Safari', false);
    expect(script).toContain('System Events');
    expect(script).toContain('win.minimized = true');
  });

  test('minimizeWindowScript restores', () => {
    const script = minimizeWindowScript('Safari', true);
    expect(script).toContain('win.minimized = false');
  });

  test('minimizeWindowScript with window title', () => {
    const script = minimizeWindowScript('Safari', false, 'Inbox');
    expect(script).toContain("name: 'Inbox'");
    expect(script).toContain('win.minimized = true');
  });
});

describe('system esc() injection prevention', () => {
  test('escapes single quotes in clipboard text', () => {
    const script = setClipboardScript("it's a test");
    expect(script).toContain("it\\'s a test");
  });

  test('escapes single quotes in app name', () => {
    const script = launchAppScript("Tom's App");
    expect(script).toContain("Tom\\'s App");
  });

  test('escapes single quotes in quit app name', () => {
    const script = quitAppScript("Tom's App");
    expect(script).toContain("Tom\\'s App");
  });

  test('escapes single quotes in isAppRunning', () => {
    const script = isAppRunningScript("Tom's App");
    expect(script).toContain("Tom\\'s App");
  });

  test('escapes single quotes in moveWindow app name', () => {
    const script = moveWindowScript("Tom's App", 0, 0);
    expect(script).toContain("Tom\\'s App");
  });

  test('escapes single quotes in window title', () => {
    const script = moveWindowScript('Safari', 0, 0, "Tom's Page");
    expect(script).toContain("Tom\\'s Page");
  });

  test('escapes backslashes in app name', () => {
    const script = launchAppScript('path\\app');
    expect(script).toContain('path\\\\app');
  });
});
