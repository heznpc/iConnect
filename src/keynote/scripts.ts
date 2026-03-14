import { esc } from "../shared/esc.js";
import {
  iworkDocLookup,
  iworkListDocumentsScript,
  iworkCreateDocumentScript,
  iworkExportPdfScript,
  iworkCloseDocumentScript,
} from "../shared/iwork.js";

export function listDocumentsScript(): string {
  return iworkListDocumentsScript("Keynote");
}

export function createDocumentScript(): string {
  return iworkCreateDocumentScript("Keynote");
}

export function listSlidesScript(documentName: string): string {
  return `
    const Keynote = Application('com.apple.Keynote');
    ${iworkDocLookup("Keynote", documentName)}
    const slides = docs[0].slides();
    const result = slides.map((s, i) => ({
      number: i + 1,
      skipped: s.skipped(),
      title: (function() { try { return s.defaultTitleItem().objectText(); } catch(e) { return null; } })(),
      body: (function() { try { return s.defaultBodyItem().objectText(); } catch(e) { return null; } })(),
      presenterNotes: s.presenterNotes()
    }));
    JSON.stringify({total: result.length, slides: result});
  `;
}

export function getSlideScript(documentName: string, slideNumber: number): string {
  const idx = slideNumber - 1;
  return `
    const Keynote = Application('com.apple.Keynote');
    ${iworkDocLookup("Keynote", documentName)}
    const slide = docs[0].slides[${idx}];
    if (!slide) throw new Error('Slide ${slideNumber} not found');
    const textItems = slide.textItems();
    const texts = textItems.map(t => ({objectText: t.objectText()}));
    JSON.stringify({
      number: ${slideNumber},
      skipped: slide.skipped(),
      presenterNotes: slide.presenterNotes(),
      textItems: texts
    });
  `;
}

export function addSlideScript(documentName: string): string {
  return `
    const Keynote = Application('com.apple.Keynote');
    ${iworkDocLookup("Keynote", documentName)}
    const slide = Keynote.Slide();
    docs[0].slides.push(slide);
    const total = docs[0].slides.length;
    JSON.stringify({added: true, slideNumber: total});
  `;
}

export function setPresenterNotesScript(documentName: string, slideNumber: number, notes: string): string {
  const idx = slideNumber - 1;
  return `
    const Keynote = Application('com.apple.Keynote');
    ${iworkDocLookup("Keynote", documentName)}
    const slide = docs[0].slides[${idx}];
    if (!slide) throw new Error('Slide ${slideNumber} not found');
    slide.presenterNotes = '${esc(notes)}';
    JSON.stringify({updated: true, slideNumber: ${slideNumber}});
  `;
}

export function exportPdfScript(documentName: string, outputPath: string): string {
  return iworkExportPdfScript("Keynote", documentName, outputPath);
}

export function startSlideshowScript(documentName: string, fromSlide: number): string {
  const idx = fromSlide - 1;
  return `
    const Keynote = Application('com.apple.Keynote');
    ${iworkDocLookup("Keynote", documentName)}
    Keynote.start(docs[0], {from: docs[0].slides[${idx}]});
    JSON.stringify({started: true, fromSlide: ${fromSlide}});
  `;
}

export function closeDocumentScript(documentName: string, saving: boolean): string {
  return iworkCloseDocumentScript("Keynote", documentName, saving);
}
