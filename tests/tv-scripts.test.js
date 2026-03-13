import { describe, test, expect } from '@jest/globals';
import {
  listPlaylistsScript,
  listTracksScript,
  nowPlayingScript,
  playbackControlScript,
  searchTracksScript,
  playTrackScript,
} from '../dist/tv/scripts.js';

describe('tv script generators', () => {
  test('listPlaylistsScript', () => {
    const script = listPlaylistsScript();
    expect(script).toContain("Application('TV')");
    expect(script).toContain('TV.playlists()');
    expect(script).toContain('JSON.stringify(result)');
  });

  test('listTracksScript with playlist', () => {
    const script = listTracksScript('Movies', 50);
    expect(script).toContain("Application('TV')");
    expect(script).toContain("whose({name: 'Movies'})");
    expect(script).toContain('50');
  });

  test('listTracksScript with limit', () => {
    const script = listTracksScript('Library', 10);
    expect(script).toContain('Math.min(tracks.length, 10)');
  });

  test('nowPlayingScript', () => {
    const script = nowPlayingScript();
    expect(script).toContain("Application('TV')");
    expect(script).toContain('TV.playerState()');
    expect(script).toContain('TV.currentTrack');
    expect(script).toContain('seasonNumber');
    expect(script).toContain('episodeNumber');
  });

  test('playbackControlScript play', () => {
    const script = playbackControlScript('play');
    expect(script).toContain('TV.play()');
  });

  test('playbackControlScript pause', () => {
    const script = playbackControlScript('pause');
    expect(script).toContain('TV.pause()');
  });

  test('playbackControlScript nextTrack', () => {
    const script = playbackControlScript('nextTrack');
    expect(script).toContain('TV.nextTrack()');
  });

  test('playbackControlScript previousTrack', () => {
    const script = playbackControlScript('previousTrack');
    expect(script).toContain('TV.previousTrack()');
  });

  test('playbackControlScript throws on invalid action', () => {
    expect(() => playbackControlScript('stop')).toThrow('Invalid playback action: stop');
    expect(() => playbackControlScript('rewind')).toThrow('Invalid playback action: rewind');
    expect(() => playbackControlScript('')).toThrow('Invalid playback action: ');
  });

  test('searchTracksScript', () => {
    const script = searchTracksScript('Breaking Bad', 20);
    expect(script).toContain("Application('TV')");
    expect(script).toContain("'Breaking Bad'");
    expect(script).toContain('toLowerCase()');
    expect(script).toContain('20');
  });

  test('playTrackScript', () => {
    const script = playTrackScript('Pilot');
    expect(script).toContain("Application('TV')");
    expect(script).toContain("whose({name: 'Pilot'})");
    expect(script).toContain('tracks[0].play()');
  });
});

describe('tv esc() injection prevention', () => {
  test('escapes single quotes in playlist name', () => {
    const script = listTracksScript("80's Classics", 10);
    expect(script).toContain("80\\'s Classics");
  });

  test('escapes single quotes in search query', () => {
    const script = searchTracksScript("it's a show", 10);
    expect(script).toContain("it\\'s a show");
  });

  test('escapes single quotes in track name', () => {
    const script = playTrackScript("Ocean's Eleven");
    expect(script).toContain("Ocean\\'s Eleven");
  });

  test('escapes backslashes in playlist name', () => {
    const script = listTracksScript('back\\slash', 10);
    expect(script).toContain('back\\\\slash');
  });

  test('escapes backslashes in search query', () => {
    const script = searchTracksScript('path\\to', 5);
    expect(script).toContain('path\\\\to');
  });

  test('escapes backslashes in track name', () => {
    const script = playTrackScript('file\\name');
    expect(script).toContain('file\\\\name');
  });
});
