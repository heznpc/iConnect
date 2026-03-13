import { describe, test, expect } from '@jest/globals';
import {
  listAlbumsScript,
  listPhotosScript,
  searchPhotosScript,
} from '../dist/photos/scripts.js';

describe('photos script generators', () => {
  test('listAlbumsScript lists all albums', () => {
    const script = listAlbumsScript();
    expect(script).toContain("Application('Photos')");
    expect(script).toContain('albums.id()');
    expect(script).toContain('albums.name()');
  });

  test('listPhotosScript lists photos in album with pagination', () => {
    const script = listPhotosScript('Vacation', 20, 10);
    expect(script).toContain("'Vacation'");
    expect(script).toContain('20');
    expect(script).toContain('10');
    expect(script).toContain('mediaItems');
  });

  test('searchPhotosScript searches by keyword', () => {
    const script = searchPhotosScript('sunset', 50);
    expect(script).toContain("'sunset'");
    expect(script).toContain('50');
    expect(script).toContain('filename');
  });
});

describe('photos esc() injection prevention', () => {
  test('escapes single quotes in album name', () => {
    const script = listPhotosScript("Mom's Birthday", 10, 0);
    expect(script).toContain("Mom\\'s Birthday");
  });

  test('escapes single quotes in search query', () => {
    const script = searchPhotosScript("it's sunny", 10);
    expect(script).toContain("it\\'s sunny");
  });
});
