// JXA scripts for Apple Music automation.

import { esc } from "../shared/esc.js";

export function listPlaylistsScript(): string {
  return `
    const Music = Application('Music');
    const names = Music.playlists.name();
    const ids = Music.playlists.id();
    const durations = Music.playlists.duration();
    const result = names.map((name, i) => ({
      id: ids[i],
      name: name,
      duration: durations[i],
      trackCount: Music.playlists[i].tracks.length
    }));
    JSON.stringify(result);
  `;
}

export function listTracksScript(playlist: string, limit: number): string {
  return `
    const Music = Application('Music');
    const playlists = Music.playlists.whose({name: '${esc(playlist)}'})();
    if (playlists.length === 0) throw new Error('Playlist not found: ${esc(playlist)}');
    const pl = playlists[0];
    const total = pl.tracks.length;
    const count = Math.min(total, ${limit});
    const tIds = pl.tracks.id();
    const tNames = pl.tracks.name();
    const tArtists = pl.tracks.artist();
    const tAlbums = pl.tracks.album();
    const tDurations = pl.tracks.duration();
    const tNumbers = pl.tracks.trackNumber();
    const tGenres = pl.tracks.genre();
    const tYears = pl.tracks.year();
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: tIds[i],
        name: tNames[i],
        artist: tArtists[i],
        album: tAlbums[i],
        duration: tDurations[i],
        trackNumber: tNumbers[i],
        genre: tGenres[i],
        year: tYears[i]
      });
    }
    JSON.stringify({total: total, returned: count, tracks: result});
  `;
}

export function nowPlayingScript(): string {
  return `
    const Music = Application('Music');
    const state = Music.playerState();
    if (state === 'stopped') {
      JSON.stringify({playerState: 'stopped', track: null});
    } else {
      const t = Music.currentTrack;
      JSON.stringify({
        playerState: state,
        track: {
          name: t.name(),
          artist: t.artist(),
          album: t.album(),
          duration: t.duration(),
          playerPosition: Music.playerPosition()
        }
      });
    }
  `;
}

const ALLOWED_ACTIONS = new Set(["play", "pause", "nextTrack", "previousTrack"]);

export function playbackControlScript(action: string): string {
  if (!ALLOWED_ACTIONS.has(action)) {
    throw new Error(`Invalid playback action: ${action}`);
  }
  return `
    const Music = Application('Music');
    Music.${action}();
    const state = Music.playerState();
    JSON.stringify({action: '${action}', playerState: state});
  `;
}

export function searchTracksScript(query: string, limit: number): string {
  return `
    const Music = Application('Music');
    const lib = Music.playlists.whose({name: 'Library'})();
    if (lib.length === 0) {
      JSON.stringify({total: 0, returned: 0, tracks: []});
    } else {
      const tNames = lib[0].tracks.name();
      const tArtists = lib[0].tracks.artist();
      const tAlbums = lib[0].tracks.album();
      const tIds = lib[0].tracks.id();
      const tDurations = lib[0].tracks.duration();
      const q = '${esc(query)}'.toLowerCase();
      const result = [];
      for (let i = 0; i < tNames.length && result.length < ${limit}; i++) {
        const name = tNames[i] || '';
        const artist = tArtists[i] || '';
        const album = tAlbums[i] || '';
        if (name.toLowerCase().includes(q) || artist.toLowerCase().includes(q) || album.toLowerCase().includes(q)) {
          result.push({
            id: tIds[i],
            name: name,
            artist: artist,
            album: album,
            duration: tDurations[i]
          });
        }
      }
      JSON.stringify({total: tNames.length, returned: result.length, tracks: result});
    }
  `;
}

export function playTrackScript(trackName: string, playlist?: string): string {
  if (playlist) {
    return `
      const Music = Application('Music');
      const pls = Music.playlists.whose({name: '${esc(playlist)}'})();
      if (pls.length === 0) throw new Error('Playlist not found: ${esc(playlist)}');
      const tracks = pls[0].tracks.whose({name: '${esc(trackName)}'})();
      if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
      tracks[0].play();
      JSON.stringify({playing: true, track: tracks[0].name(), artist: tracks[0].artist()});
    `;
  }
  return `
    const Music = Application('Music');
    const lib = Music.playlists.whose({name: 'Library'})();
    if (lib.length === 0) throw new Error('Library not found');
    const tracks = lib[0].tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
    tracks[0].play();
    JSON.stringify({playing: true, track: tracks[0].name(), artist: tracks[0].artist()});
  `;
}

export function playPlaylistScript(name: string, shuffle?: boolean): string {
  return `
    const Music = Application('Music');
    const pls = Music.playlists.whose({name: '${esc(name)}'})();
    if (pls.length === 0) throw new Error('Playlist not found: ${esc(name)}');
    ${shuffle !== undefined ? `Music.shuffleEnabled = ${shuffle};` : ''}
    pls[0].play();
    JSON.stringify({playing: true, playlist: '${esc(name)}', shuffle: Music.shuffleEnabled()});
  `;
}

export function getTrackInfoScript(trackName: string): string {
  return `
    const Music = Application('Music');
    const lib = Music.playlists.whose({name: 'Library'})();
    if (lib.length === 0) throw new Error('Library not found');
    const tracks = lib[0].tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
    const t = tracks[0];
    JSON.stringify({
      id: t.id(),
      name: t.name(),
      artist: t.artist(),
      album: t.album(),
      albumArtist: t.albumArtist(),
      genre: t.genre(),
      year: t.year(),
      trackNumber: t.trackNumber(),
      discNumber: t.discNumber(),
      duration: t.duration(),
      playedCount: t.playedCount(),
      rating: t.rating(),
      favorited: t.favorited(),
      disliked: t.disliked(),
      dateAdded: t.dateAdded() ? t.dateAdded().toISOString() : null,
      sampleRate: t.sampleRate(),
      bitRate: t.bitRate(),
      size: t.size()
    });
  `;
}

export function setShuffleScript(shuffle?: boolean, songRepeat?: string): string {
  const lines: string[] = [];
  if (shuffle !== undefined) lines.push(`Music.shuffleEnabled = ${shuffle};`);
  if (songRepeat !== undefined) lines.push(`Music.songRepeat = '${esc(songRepeat)}';`);
  return `
    const Music = Application('Music');
    ${lines.join('\n    ')}
    JSON.stringify({
      shuffleEnabled: Music.shuffleEnabled(),
      songRepeat: Music.songRepeat()
    });
  `;
}

export function createPlaylistScript(name: string): string {
  return `
    const Music = Application('Music');
    const pl = Music.make({new: 'playlist', withProperties: {name: '${esc(name)}'}});
    JSON.stringify({name: pl.name(), id: pl.id()});
  `;
}

export function addToPlaylistScript(playlistName: string, trackName: string): string {
  return `
    const Music = Application('Music');
    const pls = Music.playlists.whose({name: '${esc(playlistName)}'})();
    if (pls.length === 0) throw new Error('Playlist not found: ${esc(playlistName)}');
    const tracks = Music.tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
    Music.duplicate(tracks[0], {to: pls[0]});
    JSON.stringify({added: true, track: '${esc(trackName)}', playlist: '${esc(playlistName)}'});
  `;
}

export function removeFromPlaylistScript(playlistName: string, trackName: string): string {
  return `
    const Music = Application('Music');
    const pls = Music.playlists.whose({name: '${esc(playlistName)}'})();
    if (pls.length === 0) throw new Error('Playlist not found: ${esc(playlistName)}');
    const tracks = pls[0].tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
    tracks[0].delete();
    JSON.stringify({removed: true, track: '${esc(trackName)}', playlist: '${esc(playlistName)}'});
  `;
}

export function deletePlaylistScript(name: string): string {
  return `
    const Music = Application('Music');
    const pls = Music.playlists.whose({name: '${esc(name)}'})();
    if (pls.length === 0) throw new Error('Playlist not found: ${esc(name)}');
    pls[0].delete();
    JSON.stringify({deleted: true, playlist: '${esc(name)}'});
  `;
}

/** JXA preamble: look up a track by name in the Library playlist. */
function trackLookup(trackName: string): string {
  return `const Music = Application('Music');
    const lib = Music.playlists.whose({name: 'Library'})();
    if (lib.length === 0) throw new Error('Library not found');
    const tracks = lib[0].tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');`;
}

export function getRatingScript(trackName: string): string {
  return `
    ${trackLookup(trackName)}
    const t = tracks[0];
    JSON.stringify({
      name: t.name(),
      artist: t.artist(),
      rating: t.rating(),
      favorited: t.favorited(),
      disliked: t.disliked()
    });
  `;
}

export function setRatingScript(trackName: string, rating: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(rating)));
  return `
    ${trackLookup(trackName)}
    tracks[0].rating = ${clamped};
    JSON.stringify({name: tracks[0].name(), rating: tracks[0].rating()});
  `;
}

export function setFavoritedScript(trackName: string, favorited: boolean): string {
  return `
    ${trackLookup(trackName)}
    tracks[0].favorited = ${favorited};
    JSON.stringify({name: tracks[0].name(), favorited: tracks[0].favorited()});
  `;
}

export function setDislikedScript(trackName: string, disliked: boolean): string {
  return `
    ${trackLookup(trackName)}
    tracks[0].disliked = ${disliked};
    JSON.stringify({name: tracks[0].name(), disliked: tracks[0].disliked()});
  `;
}
