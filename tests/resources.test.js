import { describe, test, expect, jest } from '@jest/globals';

// Mock runJxa before importing
const mockRunJxa = jest.fn();
jest.unstable_mockModule('../dist/shared/jxa.js', () => ({
  runJxa: mockRunJxa,
}));

const { buildSnapshot } = await import('../dist/shared/resources.js');

describe('buildSnapshot', () => {
  beforeEach(() => {
    mockRunJxa.mockReset();
  });

  test('returns valid JSON with timestamp and depth', async () => {
    const enabled = () => false; // no modules
    const result = await buildSnapshot(enabled, 'standard');
    const parsed = JSON.parse(result);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.depth).toBe('standard');
  });

  test('accepts string depth names', async () => {
    const enabled = () => false;

    const brief = JSON.parse(await buildSnapshot(enabled, 'brief'));
    expect(brief.depth).toBe('brief');

    const full = JSON.parse(await buildSnapshot(enabled, 'full'));
    expect(full.depth).toBe('full');
  });

  test('defaults to standard for unknown depth string', async () => {
    const enabled = () => false;
    const result = JSON.parse(await buildSnapshot(enabled, 'nonexistent'));
    expect(result.depth).toBe('standard');
  });

  test('only fetches enabled modules', async () => {
    const enabled = (mod) => mod === 'mail';
    mockRunJxa.mockResolvedValue({ totalUnread: 5 });

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.mail).toBeDefined();
    expect(result.calendar).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.reminders).toBeUndefined();
    expect(result.music).toBeUndefined();
    expect(result.system).toBeUndefined();
  });

  test('includes calendar when enabled', async () => {
    const enabled = (mod) => mod === 'calendar';
    mockRunJxa.mockResolvedValue({ events: [{ title: 'Meeting' }] });

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.calendar).toBeDefined();
    expect(result.calendar.todayCount).toBe(1);
    expect(result.calendar.events).toHaveLength(1);
  });

  test('includes reminders when enabled', async () => {
    const enabled = (mod) => mod === 'reminders';
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000).toISOString();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();

    mockRunJxa.mockResolvedValue([
      { completed: false, dueDate: yesterday, name: 'Overdue task' },
      { completed: false, dueDate: todayDate, name: 'Today task' },
      { completed: false, dueDate: null, name: 'No date task' },
    ]);

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.reminders).toBeDefined();
    expect(result.reminders.overdueCount).toBe(1);
    expect(result.reminders.dueTodayCount).toBe(1);
    expect(result.reminders.totalIncomplete).toBe(3);
  });

  test('handles module errors gracefully', async () => {
    const enabled = (mod) => mod === 'music';
    mockRunJxa.mockRejectedValue(new Error('Music not running'));

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.music).toEqual({ playerState: 'unavailable' });
  });

  test('fetches multiple modules in parallel', async () => {
    const enabled = (mod) => ['mail', 'music'].includes(mod);
    mockRunJxa
      .mockResolvedValueOnce({ totalUnread: 3 }) // mail
      .mockResolvedValueOnce({ playerState: 'playing', name: 'Song' }); // music

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.mail).toBeDefined();
    expect(result.music).toBeDefined();
  });

  test('empty snapshot when no modules enabled', async () => {
    const enabled = () => false;
    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    const keys = Object.keys(result);
    expect(keys).toEqual(['timestamp', 'depth']);
  });

  test('system module fetches clipboard and frontmost app', async () => {
    const enabled = (mod) => mod === 'system';
    mockRunJxa
      .mockResolvedValueOnce('clipboard text')
      .mockResolvedValueOnce({ name: 'Safari', bundleId: 'com.apple.Safari' });

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.system).toBeDefined();
    expect(result.system.clipboard).toBe('clipboard text');
    expect(result.system.frontmostApp).toBeDefined();
  });

  test('system module handles partial failures', async () => {
    const enabled = (mod) => mod === 'system';
    mockRunJxa
      .mockRejectedValueOnce(new Error('no clipboard'))
      .mockResolvedValueOnce({ name: 'Finder' });

    const result = JSON.parse(await buildSnapshot(enabled, 'standard'));
    expect(result.system.clipboard).toBeNull();
    expect(result.system.frontmostApp).toEqual({ name: 'Finder' });
  });
});
