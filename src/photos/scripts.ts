// JXA scripts for Apple Photos automation.

import { esc } from "../shared/esc.js";

export function listAlbumsScript(): string {
  return `
    const Photos = Application('Photos');
    const ids = Photos.albums.id();
    const names = Photos.albums.name();
    const result = ids.map((id, i) => ({
      id: id,
      name: names[i],
      count: Photos.albums[i].mediaItems.length
    }));
    JSON.stringify(result);
  `;
}

export function listPhotosScript(album: string, limit: number, offset: number): string {
  return `
    const Photos = Application('Photos');
    const albums = Photos.albums.whose({name: '${esc(album)}'})();
    if (albums.length === 0) throw new Error('Album not found: ${esc(album)}');
    const a = albums[0];
    const total = a.mediaItems.length;
    const s = Math.min(${offset}, total);
    const e = Math.min(s + ${limit}, total);
    const result = [];
    for (let i = s; i < e; i++) {
      const item = a.mediaItems[i];
      const d = item.date();
      result.push({
        id: item.id(),
        filename: item.filename(),
        name: item.name(),
        date: d ? d.toISOString() : null,
        width: item.width(),
        height: item.height(),
        favorite: item.favorite()
      });
    }
    JSON.stringify({total: total, offset: s, returned: result.length, photos: result});
  `;
}

export function searchPhotosScript(query: string, limit: number): string {
  return `
    const Photos = Application('Photos');
    const allNames = Photos.mediaItems.name();
    const allFilenames = Photos.mediaItems.filename();
    const allDescs = Photos.mediaItems.description();
    const q = '${esc(query)}'.toLowerCase();
    const matches = [];
    for (let i = 0; i < allNames.length && matches.length < ${limit}; i++) {
      const name = allNames[i] || '';
      const filename = allFilenames[i] || '';
      const desc = allDescs[i] || '';
      if (name.toLowerCase().includes(q) || filename.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        matches.push(i);
      }
    }
    const result = matches.map(i => {
      const item = Photos.mediaItems[i];
      const d = item.date();
      return {
        id: item.id(),
        filename: allFilenames[i] || '',
        name: allNames[i] || '',
        date: d ? d.toISOString() : null,
        favorite: item.favorite(),
        description: allDescs[i] || ''
      };
    });
    JSON.stringify({total: result.length, photos: result});
  `;
}

export function getPhotoInfoScript(id: string): string {
  return `
    const Photos = Application('Photos');
    const items = Photos.mediaItems.whose({id: '${esc(id)}'})();
    if (items.length === 0) throw new Error('Photo not found: ${esc(id)}');
    const item = items[0];
    const d = item.date();
    JSON.stringify({
      id: item.id(),
      filename: item.filename(),
      name: item.name(),
      description: item.description(),
      date: d ? d.toISOString() : null,
      width: item.width(),
      height: item.height(),
      altitude: item.altitude(),
      location: item.location(),
      favorite: item.favorite(),
      keywords: item.keywords()
    });
  `;
}

export function listFavoritesScript(limit: number): string {
  return `
    const Photos = Application('Photos');
    const favs = Photos.mediaItems.whose({favorite: true})();
    const count = Math.min(favs.length, ${limit});
    const result = [];
    for (let i = 0; i < count; i++) {
      const item = favs[i];
      const d = item.date();
      result.push({
        id: item.id(),
        filename: item.filename(),
        name: item.name(),
        date: d ? d.toISOString() : null,
        width: item.width(),
        height: item.height()
      });
    }
    JSON.stringify({total: favs.length, returned: result.length, photos: result});
  `;
}

export function createAlbumScript(name: string): string {
  return `
    const Photos = Application('Photos');
    Photos.make({new: 'album', named: '${esc(name)}'});
    const albums = Photos.albums.whose({name: '${esc(name)}'})();
    if (albums.length === 0) throw new Error('Failed to create album');
    JSON.stringify({id: albums[0].id(), name: albums[0].name()});
  `;
}

export function addToAlbumScript(photoIds: string[], albumName: string): string {
  const idArray = photoIds.map(id => `'${esc(id)}'`).join(', ');
  return `
    const Photos = Application('Photos');
    const albums = Photos.albums.whose({name: '${esc(albumName)}'})();
    if (albums.length === 0) throw new Error('Album not found: ${esc(albumName)}');
    const ids = [${idArray}];
    const items = [];
    for (const id of ids) {
      const found = Photos.mediaItems.whose({id: id})();
      if (found.length > 0) items.push(found[0]);
    }
    if (items.length === 0) throw new Error('No matching photos found');
    Photos.add(items, {to: albums[0]});
    JSON.stringify({added: items.length, album: '${esc(albumName)}'});
  `;
}
