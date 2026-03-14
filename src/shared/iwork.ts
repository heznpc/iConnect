import { esc } from "./esc.js";

/** JXA snippet: look up an open document by name, throw if not found. */
export function iworkDocLookup(appName: string, documentName: string): string {
  return `const docs = ${appName}.documents.whose({name: '${esc(documentName)}'})();
    if (docs.length === 0) throw new Error('Document not found: ${esc(documentName)}');`;
}

/** JXA script: list all open documents for an iWork app. */
export function iworkListDocumentsScript(appName: string): string {
  return `
    const ${appName} = Application('${appName}');
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
  return `
    const ${appName} = Application('${appName}');
    ${appName}.activate();
    const doc = ${appName}.Document();
    ${appName}.documents.push(doc);
    JSON.stringify({name: doc.name()});
  `;
}

/** JXA script: export a document to PDF for any iWork app. */
export function iworkExportPdfScript(appName: string, documentName: string, outputPath: string): string {
  return `
    const ${appName} = Application('${appName}');
    ${iworkDocLookup(appName, documentName)}
    ${appName}.export(docs[0], {to: Path('${esc(outputPath)}'), as: 'PDF'});
    JSON.stringify({exported: true, path: '${esc(outputPath)}'});
  `;
}

/** JXA script: close a document for any iWork app. */
export function iworkCloseDocumentScript(appName: string, documentName: string, saving: boolean): string {
  return `
    const ${appName} = Application('${appName}');
    ${iworkDocLookup(appName, documentName)}
    ${appName}.close(docs[0], {saving: '${saving ? "yes" : "no"}'});
    JSON.stringify({closed: true, name: '${esc(documentName)}'});
  `;
}
