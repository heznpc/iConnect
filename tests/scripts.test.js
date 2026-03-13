import { describe, test, expect } from '@jest/globals';
import {
  listNotesScript,
  searchNotesScript,
  readNoteScript,
  createNoteScript,
  createFolderScript,
  scanNotesScript,
  compareNotesScript,
  moveNoteScript,
  bulkMoveNotesScript,
} from '../dist/notes/scripts.js';

describe('script generators', () => {
  test('listNotesScript without folder', () => {
    const script = listNotesScript();
    expect(script).toContain("Notes.notes.name()");
    expect(script).toContain("JSON.stringify");
  });

  test('listNotesScript with folder', () => {
    const script = listNotesScript('Work');
    expect(script).toContain("whose({name: 'Work'})");
  });

  test('searchNotesScript includes limit', () => {
    const script = searchNotesScript('test', 50);
    expect(script).toContain("result.length < 50");
    expect(script).toContain("'test'");
  });

  test('readNoteScript uses byId', () => {
    const script = readNoteScript('x-coredata://123');
    expect(script).toContain("byId('x-coredata://123')");
  });

  test('createNoteScript without folder uses defaultAccount', () => {
    const script = createNoteScript('<h1>Test</h1>');
    expect(script).toContain('defaultAccount');
  });

  test('createNoteScript with folder targets folder', () => {
    const script = createNoteScript('<h1>Test</h1>', 'Work');
    expect(script).toContain("whose({name: 'Work'})");
  });

  test('createFolderScript returns existing folder if found', () => {
    const script = createFolderScript('Recipes');
    expect(script).toContain("existing: true");
    expect(script).toContain("existing: false");
  });

  test('scanNotesScript supports folder filter and offset', () => {
    const script = scanNotesScript(100, 300, 50, 'Work');
    expect(script).toContain("whose({name: 'Work'})");
    expect(script).toContain('50');
  });

  test('scanNotesScript without folder scans all', () => {
    const script = scanNotesScript(100, 300, 0);
    expect(script).toContain("Notes.notes.name()");
    expect(script).not.toContain("whose");
  });

  test('compareNotesScript handles multiple IDs', () => {
    const script = compareNotesScript(['id1', 'id2', 'id3']);
    expect(script).toContain("'id1','id2','id3'");
  });

  test('moveNoteScript verifies new note before delete', () => {
    const script = moveNoteScript('id1', 'Archive');
    expect(script).toContain("if (!newId)");
    expect(script).toContain("Notes.delete(note)");
  });

  test('bulkMoveNotesScript has per-note error handling', () => {
    const script = bulkMoveNotesScript(['id1', 'id2'], 'Archive');
    expect(script).toContain("try {");
    expect(script).toContain("catch(e)");
    expect(script).toContain("success: true");
    expect(script).toContain("success: false");
  });
});

describe('esc() injection prevention', () => {
  test('escapes single quotes in folder name', () => {
    const script = listNotesScript("it's a test");
    expect(script).toContain("it\\'s a test");
    expect(script).not.toContain("it's a test");
  });

  test('escapes backslashes', () => {
    const script = createNoteScript('path\\to\\file');
    expect(script).toContain('path\\\\to\\\\file');
  });

  test('escapes newlines', () => {
    const script = createNoteScript('line1\nline2');
    expect(script).toContain('line1\\nline2');
  });

  test('handles unicode content', () => {
    const script = searchNotesScript('한국어 메모', 50);
    expect(script).toContain('한국어 메모');
  });
});
