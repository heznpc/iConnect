import { describe, test, expect } from '@jest/globals';
import {
  listTabsScript,
  readPageContentScript,
  getCurrentTabScript,
  openUrlScript,
} from '../dist/safari/scripts.js';

describe('safari script generators', () => {
  test('listTabsScript accesses Safari windows and tabs', () => {
    const script = listTabsScript();
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('windows()');
    expect(script).toContain('tabs()');
    expect(script).toContain('.name()');
    expect(script).toContain('.url()');
  });

  test('readPageContentScript reads source with bounds check', () => {
    const script = readPageContentScript(0, 2, 5000);
    expect(script).toContain("Application('Safari')");
    expect(script).toContain('tabs[2]');
    expect(script).toContain('source()');
    expect(script).toContain('5000');
  });

  test('getCurrentTabScript reads frontmost tab', () => {
    const script = getCurrentTabScript();
    expect(script).toContain('currentTab()');
    expect(script).toContain('tab.name()');
    expect(script).toContain('tab.url()');
  });

  test('openUrlScript sets document URL', () => {
    const script = openUrlScript('https://example.com');
    expect(script).toContain('https://example.com');
    expect(script).toContain('openLocation');
    expect(script).toContain('activate()');
  });
});

describe('safari esc() injection prevention', () => {
  test('escapes single quotes in URL', () => {
    const script = openUrlScript("https://example.com/it's-a-page");
    expect(script).toContain("it\\'s-a-page");
  });
});
