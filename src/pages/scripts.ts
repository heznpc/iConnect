import { esc } from "../shared/esc.js";
import {
  iworkDocLookup,
  iworkListDocumentsScript,
  iworkCreateDocumentScript,
  iworkExportPdfScript,
  iworkCloseDocumentScript,
} from "../shared/iwork.js";

export function listDocumentsScript(): string {
  return iworkListDocumentsScript("Pages");
}

export function openDocumentScript(path: string): string {
  return `
    const Pages = Application('com.apple.Pages');
    Pages.open(Path('${esc(path)}'));
    const doc = Pages.documents[0];
    JSON.stringify({name: doc.name(), path: doc.file() ? doc.file().toString() : null});
  `;
}

export function createDocumentScript(): string {
  return iworkCreateDocumentScript("Pages");
}

export function getBodyTextScript(documentName: string): string {
  return `
    const Pages = Application('com.apple.Pages');
    ${iworkDocLookup("Pages", documentName)}
    const text = docs[0].bodyText();
    JSON.stringify({name: docs[0].name(), bodyText: text.substring(0, 10000)});
  `;
}

export function setBodyTextScript(documentName: string, text: string): string {
  return `
    const Pages = Application('com.apple.Pages');
    ${iworkDocLookup("Pages", documentName)}
    docs[0].bodyText = '${esc(text)}';
    JSON.stringify({updated: true, name: docs[0].name()});
  `;
}

export function exportPdfScript(documentName: string, outputPath: string): string {
  return iworkExportPdfScript("Pages", documentName, outputPath);
}

export function closeDocumentScript(documentName: string, saving: boolean): string {
  return iworkCloseDocumentScript("Pages", documentName, saving);
}
