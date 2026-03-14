import { describe, test, expect } from '@jest/globals';
import {
  uiOpenAppScript,
  uiClickScript,
  uiTypeScript,
  uiPressKeyScript,
  uiScrollScript,
  uiReadScript,
} from '../dist/ui/scripts.js';

describe('ui script generators', () => {
  // --- uiOpenAppScript ---
  test('uiOpenAppScript activates the named app', () => {
    const script = uiOpenAppScript('Safari');
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('app.activate()');
  });

  test('uiOpenAppScript reads accessibility tree', () => {
    const script = uiOpenAppScript('Finder');
    expect(script).toContain("System Events");
    expect(script).toContain('frontmost: true');
    expect(script).toContain('bundleIdentifier');
    expect(script).toContain('JSON.stringify');
  });

  // --- uiClickScript (coordinate mode) ---
  test('uiClickScript by coordinates uses cliclick', () => {
    const script = uiClickScript(undefined, 100, 200);
    expect(script).toContain("cliclick c:100,200");
    expect(script).toContain("method: 'coordinate'");
    expect(script).toContain('x: 100');
    expect(script).toContain('y: 200');
  });

  test('uiClickScript by coordinates activates app when appName given', () => {
    const script = uiClickScript('Safari', 50, 75);
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('activate()');
    expect(script).toContain("cliclick c:50,75");
  });

  test('uiClickScript by coordinates omits activate when no appName', () => {
    const script = uiClickScript(undefined, 10, 20);
    expect(script).not.toContain('activate()');
    expect(script).toContain("cliclick c:10,20");
  });

  // --- uiClickScript (text search mode) ---
  test('uiClickScript by text searches UI hierarchy', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'Save');
    expect(script).toContain("method: 'text_search'");
    expect(script).toContain("'Save'");
    expect(script).toContain('findElement');
  });

  test('uiClickScript with role filters by role', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'OK', 'AXButton');
    expect(script).toContain("el.role() === 'AXButton'");
    expect(script).toContain("'OK'");
  });

  test('uiClickScript without role matches all roles', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'Submit');
    expect(script).toContain('true');
    expect(script).not.toContain("el.role() ===");
  });

  test('uiClickScript with index targets correct match', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'Item', undefined, 3);
    expect(script).toContain('Math.min(3,');
  });

  test('uiClickScript defaults index to 0', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'Item');
    expect(script).toContain('Math.min(0,');
  });

  test('uiClickScript text search activates app when appName given', () => {
    const script = uiClickScript('Notes', undefined, undefined, 'Done');
    expect(script).toContain("Application('Notes')");
    expect(script).toContain('activate()');
  });

  // --- uiTypeScript ---
  test('uiTypeScript sends keystroke for text', () => {
    const script = uiTypeScript('hello world');
    expect(script).toContain("se.keystroke('hello world')");
    expect(script).toContain('typed: true');
    expect(script).toContain('length: 11');
  });

  test('uiTypeScript activates app when appName given', () => {
    const script = uiTypeScript('abc', 'TextEdit');
    expect(script).toContain("Application('TextEdit')");
    expect(script).toContain('activate()');
  });

  test('uiTypeScript omits activate when no appName', () => {
    const script = uiTypeScript('abc');
    expect(script).not.toContain('activate()');
  });

  // --- uiPressKeyScript ---
  test('uiPressKeyScript uses keyCode for special keys', () => {
    const script = uiPressKeyScript('return');
    expect(script).toContain('se.keyCode(36');
    expect(script).toContain('keyCode: 36');
  });

  test('uiPressKeyScript uses keyCode for escape', () => {
    const script = uiPressKeyScript('escape');
    expect(script).toContain('se.keyCode(53');
  });

  test('uiPressKeyScript uses keyCode for tab', () => {
    const script = uiPressKeyScript('tab');
    expect(script).toContain('se.keyCode(48');
  });

  test('uiPressKeyScript uses keyCode for arrow keys', () => {
    expect(uiPressKeyScript('up')).toContain('se.keyCode(126');
    expect(uiPressKeyScript('down')).toContain('se.keyCode(125');
    expect(uiPressKeyScript('left')).toContain('se.keyCode(123');
    expect(uiPressKeyScript('right')).toContain('se.keyCode(124');
  });

  test('uiPressKeyScript uses keystroke for single characters', () => {
    const script = uiPressKeyScript('a');
    expect(script).toContain("se.keystroke('a'");
    expect(script).not.toContain('keyCode');
  });

  test('uiPressKeyScript maps command modifier', () => {
    const script = uiPressKeyScript('s', ['command']);
    expect(script).toContain("'command down'");
    expect(script).toContain('using:');
  });

  test('uiPressKeyScript maps cmd alias to command', () => {
    const script = uiPressKeyScript('s', ['cmd']);
    expect(script).toContain("'command down'");
  });

  test('uiPressKeyScript maps shift modifier', () => {
    const script = uiPressKeyScript('a', ['shift']);
    expect(script).toContain("'shift down'");
  });

  test('uiPressKeyScript maps option and alt aliases', () => {
    const scriptOption = uiPressKeyScript('a', ['option']);
    const scriptAlt = uiPressKeyScript('a', ['alt']);
    expect(scriptOption).toContain("'option down'");
    expect(scriptAlt).toContain("'option down'");
  });

  test('uiPressKeyScript maps control and ctrl aliases', () => {
    const scriptControl = uiPressKeyScript('a', ['control']);
    const scriptCtrl = uiPressKeyScript('a', ['ctrl']);
    expect(scriptControl).toContain("'control down'");
    expect(scriptCtrl).toContain("'control down'");
  });

  test('uiPressKeyScript combines multiple modifiers', () => {
    const script = uiPressKeyScript('s', ['command', 'shift']);
    expect(script).toContain("'command down'");
    expect(script).toContain("'shift down'");
    expect(script).toContain('using:');
  });

  test('uiPressKeyScript filters invalid modifiers', () => {
    const script = uiPressKeyScript('s', ['command', 'invalidMod']);
    expect(script).toContain("'command down'");
    expect(script).not.toContain('invalidMod');
  });

  test('uiPressKeyScript deduplicates equivalent modifiers', () => {
    const script = uiPressKeyScript('s', ['cmd', 'command']);
    const matches = script.match(/command down/g);
    expect(matches).toHaveLength(1);
  });

  test('uiPressKeyScript omits using clause when no modifiers', () => {
    const script = uiPressKeyScript('a');
    expect(script).not.toContain('using:');
  });

  test('uiPressKeyScript activates app when appName given', () => {
    const script = uiPressKeyScript('return', undefined, 'Safari');
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('activate()');
  });

  test('uiPressKeyScript omits activate when no appName', () => {
    const script = uiPressKeyScript('return');
    expect(script).not.toContain('activate()');
  });

  // --- uiScrollScript ---
  test('uiScrollScript scrolls up with up arrow keyCode', () => {
    const script = uiScrollScript('up', 5);
    expect(script).toContain("direction: 'up'");
    expect(script).toContain('amount: 5');
    expect(script).toContain('se.keyCode(126)');
  });

  test('uiScrollScript scrolls down with down arrow keyCode', () => {
    const script = uiScrollScript('down', 3);
    expect(script).toContain("direction: 'down'");
    expect(script).toContain('amount: 3');
    expect(script).toContain('se.keyCode(125)');
  });

  test('uiScrollScript scrolls left with left arrow keyCode', () => {
    const script = uiScrollScript('left', 2);
    expect(script).toContain("direction: 'left'");
    expect(script).toContain('se.keyCode(123)');
  });

  test('uiScrollScript scrolls right with right arrow keyCode', () => {
    const script = uiScrollScript('right', 4);
    expect(script).toContain("direction: 'right'");
    expect(script).toContain('se.keyCode(124)');
  });

  test('uiScrollScript activates app when appName given', () => {
    const script = uiScrollScript('down', 1, 'Safari');
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('activate()');
  });

  test('uiScrollScript omits activate when no appName', () => {
    const script = uiScrollScript('down', 1);
    expect(script).not.toContain('activate()');
  });

  // --- uiReadScript ---
  test('uiReadScript reads accessibility tree of frontmost app', () => {
    const script = uiReadScript();
    expect(script).toContain("System Events");
    expect(script).toContain('frontmost: true');
    expect(script).toContain('bundleIdentifier');
    expect(script).toContain('readTree');
    expect(script).toContain('JSON.stringify');
  });

  test('uiReadScript activates app when appName given', () => {
    const script = uiReadScript('Finder');
    expect(script).toContain("Application('Finder')");
    expect(script).toContain('activate()');
  });

  test('uiReadScript omits activate when no appName', () => {
    const script = uiReadScript();
    expect(script).not.toContain('activate()');
  });

  test('uiReadScript uses default maxDepth of 3', () => {
    const script = uiReadScript();
    expect(script).toContain('maxDepth: 3');
  });

  test('uiReadScript uses custom maxDepth', () => {
    const script = uiReadScript(undefined, 5);
    expect(script).toContain('maxDepth: 5');
  });

  test('uiReadScript uses default maxElements of 200', () => {
    const script = uiReadScript();
    expect(script).toContain('maxCount = 200');
  });

  test('uiReadScript uses custom maxElements', () => {
    const script = uiReadScript(undefined, undefined, 500);
    expect(script).toContain('maxCount = 500');
  });

  test('uiReadScript captures menu bar items', () => {
    const script = uiReadScript();
    expect(script).toContain('menuBarItems');
    expect(script).toContain('menuBar');
  });
});

describe('ui esc() injection prevention', () => {
  test('escapes single quotes in app name', () => {
    const script = uiOpenAppScript("it's a test");
    expect(script).toContain("it\\'s a test");
    expect(script).not.toContain("it's a test");
  });

  test('escapes backslashes in app name', () => {
    const script = uiOpenAppScript('path\\to\\app');
    expect(script).toContain('path\\\\to\\\\app');
  });

  test('escapes newlines in typed text', () => {
    const script = uiTypeScript('line1\nline2');
    expect(script).toContain('line1\\nline2');
  });

  test('escapes single quotes in typed text', () => {
    const script = uiTypeScript("it's done");
    expect(script).toContain("it\\'s done");
    expect(script).not.toContain("it's done");
  });

  test('escapes single quotes in click search text', () => {
    const script = uiClickScript(undefined, undefined, undefined, "it's here");
    expect(script).toContain("it\\'s here");
    expect(script).not.toContain("it's here");
  });

  test('escapes single quotes in click role', () => {
    const script = uiClickScript(undefined, undefined, undefined, 'OK', "AX'Button");
    expect(script).toContain("AX\\'Button");
  });

  test('escapes backslashes in typed text', () => {
    const script = uiTypeScript('C:\\Users\\file');
    expect(script).toContain('C:\\\\Users\\\\file');
  });

  test('escapes single quotes in key name', () => {
    const script = uiPressKeyScript("x'y");
    expect(script).toContain("x\\'y");
    expect(script).not.toContain("x'y");
  });

  test('escapes single quotes in pressKey appName', () => {
    const script = uiPressKeyScript('return', undefined, "it's app");
    expect(script).toContain("it\\'s app");
    expect(script).not.toContain("it's app");
  });

  test('handles unicode content in app names', () => {
    const script = uiOpenAppScript('日本語アプリ');
    expect(script).toContain('日本語アプリ');
  });

  test('handles unicode content in typed text', () => {
    const script = uiTypeScript('한국어 텍스트');
    expect(script).toContain('한국어 텍스트');
  });

  test('handles unicode content in click search text', () => {
    const script = uiClickScript(undefined, undefined, undefined, '按钮');
    expect(script).toContain('按钮');
  });
});
