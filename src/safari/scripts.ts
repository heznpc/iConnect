// JXA scripts for Apple Safari automation.

import { esc } from "../shared/esc.js";

export function listTabsScript(): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    const result = [];
    for (let w = 0; w < wins.length; w++) {
      const tabs = wins[w].tabs();
      for (let t = 0; t < tabs.length; t++) {
        result.push({
          windowIndex: w,
          tabIndex: t,
          title: tabs[t].name(),
          url: tabs[t].url()
        });
      }
    }
    JSON.stringify(result);
  `;
}

export function readPageContentScript(windowIndex: number, tabIndex: number, maxLength: number): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    if (${windowIndex} >= wins.length) throw new Error('Window index out of range');
    const tabs = wins[${windowIndex}].tabs();
    if (${tabIndex} >= tabs.length) throw new Error('Tab index out of range');
    const tab = tabs[${tabIndex}];
    const source = tab.source() || '';
    const truncated = source.slice(0, ${maxLength});
    JSON.stringify({
      title: tab.name(),
      url: tab.url(),
      content: truncated,
      truncated: source.length > ${maxLength}
    });
  `;
}

export function getCurrentTabScript(): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    if (wins.length === 0) throw new Error('No Safari windows open');
    const tab = wins[0].currentTab();
    JSON.stringify({
      title: tab.name(),
      url: tab.url()
    });
  `;
}

export function openUrlScript(url: string): string {
  return `
    const Safari = Application('Safari');
    Safari.activate();
    const u = '${esc(url)}';
    Safari.openLocation(u);
    JSON.stringify({opened: true, url: u});
  `;
}

export function closeTabScript(windowIndex: number, tabIndex: number): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    if (${windowIndex} >= wins.length) throw new Error('Window index out of range');
    const tabs = wins[${windowIndex}].tabs();
    if (${tabIndex} >= tabs.length) throw new Error('Tab index out of range');
    const name = tabs[${tabIndex}].name();
    tabs[${tabIndex}].close();
    JSON.stringify({closed: true, title: name});
  `;
}

export function activateTabScript(windowIndex: number, tabIndex: number): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    if (${windowIndex} >= wins.length) throw new Error('Window index out of range');
    const tabs = wins[${windowIndex}].tabs();
    if (${tabIndex} >= tabs.length) throw new Error('Tab index out of range');
    wins[${windowIndex}].currentTab = tabs[${tabIndex}];
    Safari.activate();
    JSON.stringify({activated: true, title: tabs[${tabIndex}].name(), url: tabs[${tabIndex}].url()});
  `;
}

export function runJavascriptScript(code: string, windowIndex: number, tabIndex: number): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    if (${windowIndex} >= wins.length) throw new Error('Window index out of range');
    const tabs = wins[${windowIndex}].tabs();
    if (${tabIndex} >= tabs.length) throw new Error('Tab index out of range');
    const result = Safari.doJavaScript('${esc(code)}', {in: tabs[${tabIndex}]});
    JSON.stringify({result: String(result || '')});
  `;
}

export function searchTabsScript(query: string): string {
  return `
    const Safari = Application('Safari');
    const wins = Safari.windows();
    const q = '${esc(query)}'.toLowerCase();
    const result = [];
    for (let w = 0; w < wins.length; w++) {
      const tabs = wins[w].tabs();
      for (let t = 0; t < tabs.length; t++) {
        const title = tabs[t].name() || '';
        const url = tabs[t].url() || '';
        if (title.toLowerCase().includes(q) || url.toLowerCase().includes(q)) {
          result.push({
            windowIndex: w,
            tabIndex: t,
            title: title,
            url: url
          });
        }
      }
    }
    JSON.stringify({returned: result.length, tabs: result});
  `;
}
