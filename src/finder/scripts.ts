// JXA scripts for Finder automation (file search, tags, info).

import { esc, escJxaShell } from "../shared/esc.js";

export function searchFilesScript(folder: string, query: string, limit: number): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const results = app.doShellScript('mdfind -onlyin "${escJxaShell(folder)}" "${escJxaShell(query)}" | head -${limit}');
    const paths = results.split(/[\\r\\n]+/).filter(p => p.length > 0);
    const result = paths.map(p => {
      try {
        const escaped = p.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\$/g, '\\\\$').replace(/\`/g, '\\\\\`');
        const stat = app.doShellScript('stat -f "%z %m" "' + escaped + '"');
        const parts = stat.split(' ');
        const size = parseInt(parts[0], 10);
        const mtime = parseInt(parts[1], 10);
        return {
          path: p, name: p.split('/').pop(),
          size: size, modificationDate: new Date(mtime * 1000).toISOString()
        };
      } catch(e) {
        return {path: p, name: p.split('/').pop()};
      }
    });
    JSON.stringify({total: paths.length, files: result});
  `;
}

export function getFileInfoScript(path: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const Finder = Application('Finder');
    const posixFile = Path('${esc(path)}');
    const item = Finder.items[posixFile.toString()];
    const tags = (function() {
      try {
        const output = app.doShellScript('mdls -name kMDItemUserTags -raw "${escJxaShell(path)}"');
        if (output.includes('null')) return [];
        return output.replace(/[()\\n\\t]/g, '').split(',').map(t => t.trim().replace(/"/g, '')).filter(t => t);
      } catch(e) { return []; }
    })();
    JSON.stringify({
      path: '${esc(path)}',
      name: item.name(),
      kind: item.kind(),
      size: item.size(),
      creationDate: item.creationDate().toISOString(),
      modificationDate: item.modificationDate().toISOString(),
      tags: tags
    });
  `;
}

export function setTagsScript(path: string, tags: string[]): string {
  const tagArgs = tags.map((t) => `'${esc(t)}'`).join(", ");
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    ObjC.import('Foundation');
    const url = $.NSURL.fileURLWithPath('${esc(path)}');
    const tagArray = $.NSArray.arrayWithArray([${tagArgs}]);
    url.setResourceValueForKeyError(tagArray, 'NSURLTagNamesKey', null);
    JSON.stringify({path: '${esc(path)}', tags: [${tagArgs}]});
  `;
}

export function recentFilesScript(folder: string, days: number, limit: number): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const dateStr = new Date(Date.now() - ${days} * 86400000).toISOString().split('T')[0];
    const results = app.doShellScript('mdfind -onlyin "${escJxaShell(folder)}" "kMDItemContentModificationDate >= $time.iso(' + dateStr + ')" | head -${limit}');
    const paths = results.split(/[\\r\\n]+/).filter(p => p.length > 0);
    const result = paths.map(p => ({path: p, name: p.split('/').pop()}));
    JSON.stringify({total: paths.length, files: result});
  `;
}

export function listDirectoryScript(path: string, limit: number): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    const output = app.doShellScript('ls -1 "${escJxaShell(path)}" | head -${limit}');
    const fileNames = output.split(/[\\r\\n]+/).filter(n => n.length > 0);
    const result = fileNames.map(name => {
      try {
        const fullPath = '${esc(path)}' + '/' + name;
        const escaped = fullPath.replace(/\\\\/g, '\\\\\\\\').replace(/"/g, '\\\\"').replace(/\\$/g, '\\\\$').replace(/\`/g, '\\\\\`');
        const stat = app.doShellScript('stat -f "%z %m %HT" "' + escaped + '"');
        const parts = stat.split(' ');
        const size = parseInt(parts[0], 10);
        const mtime = parseInt(parts[1], 10);
        const kind = parts.slice(2).join(' ') || 'unknown';
        return {
          name: name, kind: kind, size: size,
          modificationDate: new Date(mtime * 1000).toISOString()
        };
      } catch(e) {
        return {name: name, kind: 'unknown'};
      }
    });
    JSON.stringify({total: fileNames.length, returned: result.length, items: result});
  `;
}

export function moveFileScript(source: string, destination: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.doShellScript('mv "${escJxaShell(source)}" "${escJxaShell(destination)}"');
    JSON.stringify({moved: true, source: '${esc(source)}', destination: '${esc(destination)}'});
  `;
}

export function trashFileScript(path: string): string {
  return `
    const Finder = Application('Finder');
    const posixFile = Path('${esc(path)}');
    const item = Finder.items[posixFile.toString()];
    const name = item.name();
    Finder.delete(item);
    JSON.stringify({trashed: true, name: name, path: '${esc(path)}'});
  `;
}

export function createFolderScript(path: string): string {
  return `
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    app.doShellScript('mkdir -p "${escJxaShell(path)}"');
    JSON.stringify({created: true, path: '${esc(path)}'});
  `;
}
