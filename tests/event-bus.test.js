import { describe, test, expect, beforeEach } from '@jest/globals';
import { eventBus } from '../dist/shared/event-bus.js';

describe('EventBus', () => {
  beforeEach(() => {
    eventBus.stop(); // clears listeners and sets running = false
  });

  test('starts and stops correctly', () => {
    expect(eventBus.isRunning).toBe(false);
    eventBus.start();
    expect(eventBus.isRunning).toBe(true);
    eventBus.stop();
    expect(eventBus.isRunning).toBe(false);
  });

  test('processLine emits valid calendar_changed event', (done) => {
    eventBus.on('calendar_changed', (event) => {
      expect(event.type).toBe('calendar_changed');
      expect(event.data).toEqual({ id: '123' });
      expect(event.timestamp).toBe('2026-03-25T00:00:00Z');
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'calendar_changed',
      data: { id: '123' },
      timestamp: '2026-03-25T00:00:00Z',
    }));
  });

  test('processLine emits valid reminders_changed event', (done) => {
    eventBus.on('reminders_changed', (event) => {
      expect(event.type).toBe('reminders_changed');
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'reminders_changed',
      data: {},
      timestamp: '2026-03-25T00:00:00Z',
    }));
  });

  test('processLine emits valid pasteboard_changed event', (done) => {
    eventBus.on('pasteboard_changed', (event) => {
      expect(event.type).toBe('pasteboard_changed');
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'pasteboard_changed',
    }));
  });

  test('processLine also emits generic "event"', (done) => {
    eventBus.on('event', (event) => {
      expect(event.type).toBe('calendar_changed');
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'calendar_changed',
      data: {},
      timestamp: '2026-03-25T00:00:00Z',
    }));
  });

  test('processLine provides default timestamp if missing', (done) => {
    eventBus.on('event', (event) => {
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('string');
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'calendar_changed',
    }));
  });

  test('processLine provides default data if missing', (done) => {
    eventBus.on('event', (event) => {
      expect(event.data).toEqual({});
      done();
    });

    eventBus.processLine(JSON.stringify({
      event: 'reminders_changed',
    }));
  });

  test('processLine ignores invalid event types', () => {
    let emitted = false;
    eventBus.on('event', () => { emitted = true; });

    eventBus.processLine(JSON.stringify({
      event: 'invalid_event_type',
      data: {},
    }));

    expect(emitted).toBe(false);
  });

  test('processLine ignores non-JSON lines', () => {
    let emitted = false;
    eventBus.on('event', () => { emitted = true; });

    eventBus.processLine('this is not json');
    eventBus.processLine('');
    eventBus.processLine('{broken json');

    expect(emitted).toBe(false);
  });

  test('processLine ignores lines without event field', () => {
    let emitted = false;
    eventBus.on('event', () => { emitted = true; });

    eventBus.processLine(JSON.stringify({ data: 'no event field' }));

    expect(emitted).toBe(false);
  });

  test('stop removes all listeners', () => {
    eventBus.on('event', () => {});
    eventBus.on('calendar_changed', () => {});
    eventBus.start();
    eventBus.stop();

    expect(eventBus.isRunning).toBe(false);
    expect(eventBus.listenerCount('event')).toBe(0);
    expect(eventBus.listenerCount('calendar_changed')).toBe(0);
  });
});
