import { esc } from "../shared/esc.js";
import {
  iworkDocLookup,
  iworkListDocumentsScript,
  iworkCreateDocumentScript,
  iworkExportPdfScript,
  iworkCloseDocumentScript,
} from "../shared/iwork.js";

/** Shared JXA snippet: look up a sheet and its first table within a document. */
function sheetTableLookup(sheet: string): string {
  return `const sheets = docs[0].sheets.whose({name: '${esc(sheet)}'})();
    if (sheets.length === 0) throw new Error('Sheet not found: ${esc(sheet)}');
    const table = sheets[0].tables[0];
    if (!table) throw new Error('No table found in sheet');`;
}

export function listDocumentsScript(): string {
  return iworkListDocumentsScript("Numbers");
}

export function createDocumentScript(): string {
  return iworkCreateDocumentScript("Numbers");
}

export function listSheetsScript(documentName: string): string {
  return `
    const Numbers = Application('com.apple.Numbers');
    ${iworkDocLookup("Numbers", documentName)}
    const sheets = docs[0].sheets();
    const result = sheets.map(s => ({
      name: s.name(),
      tableCount: s.tables.length
    }));
    JSON.stringify(result);
  `;
}

export function getCellScript(documentName: string, sheet: string, cell: string): string {
  return `
    const Numbers = Application('com.apple.Numbers');
    ${iworkDocLookup("Numbers", documentName)}
    ${sheetTableLookup(sheet)}
    const c = table.cells['${esc(cell)}'];
    JSON.stringify({address: '${esc(cell)}', value: c.value(), formattedValue: c.formattedValue()});
  `;
}

export function setCellScript(documentName: string, sheet: string, cell: string, value: string): string {
  return `
    const Numbers = Application('com.apple.Numbers');
    ${iworkDocLookup("Numbers", documentName)}
    ${sheetTableLookup(sheet)}
    table.cells['${esc(cell)}'].value = '${esc(value)}';
    JSON.stringify({written: true, address: '${esc(cell)}'});
  `;
}

export function readCellsScript(
  documentName: string,
  sheet: string,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): string {
  return `
    const Numbers = Application('com.apple.Numbers');
    ${iworkDocLookup("Numbers", documentName)}
    ${sheetTableLookup(sheet)}
    const colCount = table.columnCount();
    const allValues = table.cells.value();
    const rows = [];
    for (let r = ${startRow}; r <= ${endRow}; r++) {
      const row = [];
      for (let c = ${startCol}; c <= ${endCol}; c++) {
        try {
          row.push(allValues[r * colCount + c]);
        } catch(e) { row.push(null); }
      }
      rows.push(row);
    }
    JSON.stringify({rows: rows, startRow: ${startRow}, startCol: ${startCol}, endRow: ${endRow}, endCol: ${endCol}});
  `;
}

export function addSheetScript(documentName: string, sheetName: string): string {
  return `
    const Numbers = Application('com.apple.Numbers');
    ${iworkDocLookup("Numbers", documentName)}
    const sheet = Numbers.Sheet({name: '${esc(sheetName)}'});
    docs[0].sheets.push(sheet);
    JSON.stringify({created: true, name: '${esc(sheetName)}'});
  `;
}

export function exportPdfScript(documentName: string, outputPath: string): string {
  return iworkExportPdfScript("Numbers", documentName, outputPath);
}

export function closeDocumentScript(documentName: string, saving: boolean): string {
  return iworkCloseDocumentScript("Numbers", documentName, saving);
}
