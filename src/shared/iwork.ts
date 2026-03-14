import { esc } from "./esc.js";

/**
 * Map short app names to bundle IDs for iWork apps.
 * macOS 26 (Tahoe) renamed iWork apps (e.g. "Pages" → "Pages Creator Studio"),
 * so JXA `Application('Pages')` no longer works.  Bundle IDs are stable.
 */
const IWORK_BUNDLE_IDS: Record<string, string> = {
  Pages: "com.apple.Pages",
  Numbers: "com.apple.Numbers",
  Keynote: "com.apple.Keynote",
};

/** Resolve an iWork app name to a JXA-safe Application() argument. */
export function iworkAppId(appName: string): string {
  return IWORK_BUNDLE_IDS[appName] ?? appName;
}

/** JXA snippet: look up an open document by name, throw if not found. */
export function iworkDocLookup(appName: string, documentName: string): string {
  return `const docs = ${appName}.documents.whose({name: '${esc(documentName)}'})();
    if (docs.length === 0) throw new Error('Document not found: ${esc(documentName)}');`;
}

/** JXA script: list all open documents for an iWork app. */
export function iworkListDocumentsScript(appName: string): string {
  const bundleId = iworkAppId(appName);
  return `
    const ${appName} = Application('${bundleId}');
    const docs = ${appName}.documents();
    const result = docs.map(d => ({
      name: d.name(),
      path: d.file() ? d.file().toString() : null,
      modified: d.modified()
    }));
    JSON.stringify(result);
  `;
}

/** JXA script: create a new blank document for an iWork app. */
export function iworkCreateDocumentScript(appName: string): string {
  const bundleId = iworkAppId(appName);
  return `
    const ${appName} = Application('${bundleId}');
    ${appName}.activate();
    const doc = ${appName}.Document();
    ${appName}.documents.push(doc);
    JSON.stringify({name: doc.name()});
  `;
}

/** JXA script: export a document to PDF for any iWork app. */
export function iworkExportPdfScript(appName: string, documentName: string, outputPath: string): string {
  const bundleId = iworkAppId(appName);
  return `
    const ${appName} = Application('${bundleId}');
    ${iworkDocLookup(appName, documentName)}
    ${appName}.export(docs[0], {to: Path('${esc(outputPath)}'), as: 'PDF'});
    JSON.stringify({exported: true, path: '${esc(outputPath)}'});
  `;
}

/** JXA script: close a document for any iWork app. */
export function iworkCloseDocumentScript(appName: string, documentName: string, saving: boolean): string {
  const bundleId = iworkAppId(appName);
  return `
    const ${appName} = Application('${bundleId}');
    ${iworkDocLookup(appName, documentName)}
    ${appName}.close(docs[0], {saving: '${saving ? "yes" : "no"}'});
    JSON.stringify({closed: true, name: '${esc(documentName)}'});
  `;
}
