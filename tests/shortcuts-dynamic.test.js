import { describe, test, expect } from '@jest/globals';
import { sanitizeToolName } from '../dist/shortcuts/tools.js';

describe('sanitizeToolName', () => {
  test('basic name with spaces', () => {
    expect(sanitizeToolName('My Shortcut')).toBe('shortcut_my_shortcut');
  });

  test('name with spaces and numbers', () => {
    expect(sanitizeToolName('Hello World 123')).toBe('shortcut_hello_world_123');
  });

  test('non-latin characters produce empty sanitized part', () => {
    const result = sanitizeToolName('한국어 단축어');
    // Non-latin chars are stripped; result is empty or underscore-only -> empty
    expect(result).toBe('');
  });

  test('special characters are stripped', () => {
    expect(sanitizeToolName('---Special!!!---')).toBe('shortcut_special');
  });

  test('empty string returns empty', () => {
    expect(sanitizeToolName('')).toBe('');
  });

  test('whitespace only returns empty', () => {
    expect(sanitizeToolName('   ')).toBe('');
  });

  test('mixed alphanumeric and special chars', () => {
    expect(sanitizeToolName('My App (v2.0)')).toBe('shortcut_my_app_v2_0');
  });

  test('leading and trailing underscores are removed', () => {
    expect(sanitizeToolName('__test__')).toBe('shortcut_test');
  });

  test('consecutive special chars collapse to single underscore', () => {
    expect(sanitizeToolName('a---b___c...d')).toBe('shortcut_a_b_c_d');
  });

  test('single word', () => {
    expect(sanitizeToolName('Timer')).toBe('shortcut_timer');
  });

  test('emoji-only name returns empty', () => {
    expect(sanitizeToolName('🎵🎶')).toBe('');
  });

  test('mixed emoji and text', () => {
    expect(sanitizeToolName('🎵 Play Music')).toBe('shortcut_play_music');
  });

  test('uppercase is lowercased', () => {
    expect(sanitizeToolName('RUN FAST')).toBe('shortcut_run_fast');
  });
});
