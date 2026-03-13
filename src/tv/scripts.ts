// JXA scripts for Apple TV app automation.

import { esc } from "../shared/esc.js";

export function listPlaylistsScript(): string {
  return `
    const TV = Application('TV');
    const playlists = TV.playlists();
    const result = [];
    for (let i = 0; i < playlists.length; i++) {
      try {
        result.push({
          id: playlists[i].id(),
          name: playlists[i].name(),
          duration: playlists[i].duration(),
          trackCount: playlists[i].tracks.length
        });
      } catch(e) {}
    }
    JSON.stringify(result);
  `;
}

export function listTracksScript(playlist: string, limit: number): string {
  return `
    const TV = Application('TV');
    const pls = TV.playlists.whose({name: '${esc(playlist)}'})();
    if (pls.length === 0) throw new Error('Playlist not found: ${esc(playlist)}');
    const tracks = pls[0].tracks();
    const count = Math.min(tracks.length, ${limit});
    const result = [];
    for (let i = 0; i < count; i++) {
      try {
        const t = tracks[i];
        result.push({
          id: t.id(),
          name: t.name(),
          artist: t.artist(),
          album: t.album(),
          duration: t.duration(),
          genre: t.genre(),
          year: t.year()
        });
      } catch(e) {}
    }
    JSON.stringify({total: tracks.length, returned: result.length, tracks: result});
  `;
}

export function nowPlayingScript(): string {
  return `
    const TV = Application('TV');
    const state = TV.playerState();
    if (state === 'stopped') {
      JSON.stringify({playerState: 'stopped', track: null});
    } else {
      const t = TV.currentTrack;
      JSON.stringify({
        playerState: state,
        track: {
          name: t.name(),
          show: t.show(),
          seasonNumber: t.seasonNumber(),
          episodeNumber: t.episodeNumber(),
          duration: t.duration(),
          playerPosition: TV.playerPosition()
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
    const TV = Application('TV');
    TV.${action}();
    const state = TV.playerState();
    JSON.stringify({action: '${action}', playerState: state});
  `;
}

export function searchTracksScript(query: string, limit: number): string {
  return `
    const TV = Application('TV');
    const lib = TV.playlists.whose({name: 'Library'})();
    if (lib.length === 0) {
      JSON.stringify({returned: 0, tracks: []});
    } else {
      const tracks = lib[0].tracks();
      const q = '${esc(query)}'.toLowerCase();
      const result = [];
      for (let i = 0; i < tracks.length && result.length < ${limit}; i++) {
        try {
          const name = tracks[i].name() || '';
          const show = tracks[i].show() || '';
          if (name.toLowerCase().includes(q) || show.toLowerCase().includes(q)) {
            result.push({
              id: tracks[i].id(),
              name: name,
              show: show,
              seasonNumber: tracks[i].seasonNumber(),
              episodeNumber: tracks[i].episodeNumber(),
              duration: tracks[i].duration()
            });
          }
        } catch(e) {}
      }
      JSON.stringify({returned: result.length, tracks: result});
    }
  `;
}

export function playTrackScript(trackName: string): string {
  return `
    const TV = Application('TV');
    const lib = TV.playlists.whose({name: 'Library'})();
    if (lib.length === 0) throw new Error('Library not found');
    const tracks = lib[0].tracks.whose({name: '${esc(trackName)}'})();
    if (tracks.length === 0) throw new Error('Track not found: ${esc(trackName)}');
    tracks[0].play();
    JSON.stringify({playing: true, track: tracks[0].name()});
  `;
}
