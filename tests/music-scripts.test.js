import { describe, test, expect } from '@jest/globals';
import {
  listPlaylistsScript,
  listTracksScript,
  nowPlayingScript,
  playbackControlScript,
  searchTracksScript,
} from '../dist/music/scripts.js';

describe('music script generators', () => {
  test('listPlaylistsScript', () => {
    const script = listPlaylistsScript();
    expect(script).toContain("Application('Music')");
    expect(script).toContain('Music.playlists.name()');
  });

  test('listTracksScript with playlist', () => {
    const script = listTracksScript('Favorites', 50);
    expect(script).toContain("whose({name: 'Favorites'})");
    expect(script).toContain('50');
  });

  test('nowPlayingScript', () => {
    const script = nowPlayingScript();
    expect(script).toContain('Music.playerState()');
    expect(script).toContain('Music.currentTrack');
  });

  test('playbackControlScript play', () => {
    const script = playbackControlScript('play');
    expect(script).toContain('Music.play()');
  });

  test('playbackControlScript pause', () => {
    const script = playbackControlScript('pause');
    expect(script).toContain('Music.pause()');
  });

  test('playbackControlScript nextTrack', () => {
    const script = playbackControlScript('nextTrack');
    expect(script).toContain('Music.nextTrack()');
  });

  test('searchTracksScript', () => {
    const script = searchTracksScript('Beatles', 20);
    expect(script).toContain("'Beatles'");
    expect(script).toContain('20');
  });
});

describe('music esc() injection prevention', () => {
  test('escapes single quotes in playlist name', () => {
    const script = listTracksScript("80's Hits", 10);
    expect(script).toContain("80\\'s Hits");
  });
});
