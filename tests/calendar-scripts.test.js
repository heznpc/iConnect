import { describe, test, expect } from '@jest/globals';
import {
  listCalendarsScript,
  listEventsScript,
  readEventScript,
  createEventScript,
  updateEventScript,
  deleteEventScript,
  searchEventsScript,
} from '../dist/calendar/scripts.js';

describe('calendar script generators', () => {
  test('listCalendarsScript returns valid JXA', () => {
    const script = listCalendarsScript();
    expect(script).toContain("Application('Calendar')");
    expect(script).toContain("Calendar.calendars()");
    expect(script).toContain("JSON.stringify");
  });

  test('listEventsScript with date range', () => {
    const script = listEventsScript('2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 100, 0);
    expect(script).toContain("new Date('2026-03-01T00:00:00Z')");
    expect(script).toContain("new Date('2026-03-31T23:59:59Z')");
    expect(script).toContain("_greaterThanEquals");
    expect(script).toContain("_lessThanEquals");
  });

  test('listEventsScript with calendar filter', () => {
    const script = listEventsScript('2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 100, 0, 'Work');
    expect(script).toContain("whose({name: 'Work'})");
  });

  test('listEventsScript with offset and limit', () => {
    const script = listEventsScript('2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 50, 10);
    expect(script).toContain('50');
    expect(script).toContain('10');
  });

  test('readEventScript searches across calendars', () => {
    const script = readEventScript('event-uid-123');
    expect(script).toContain("whose({uid: 'event-uid-123'})");
    expect(script).toContain("ev.attendees()");
    expect(script).toContain("ev.recurrence()");
  });

  test('createEventScript with only required params', () => {
    const script = createEventScript('Meeting', '2026-03-15T10:00:00Z', '2026-03-15T11:00:00Z', {});
    expect(script).toContain("summary: 'Meeting'");
    expect(script).toContain("new Date('2026-03-15T10:00:00Z')");
    expect(script).toContain("writable: true");
  });

  test('createEventScript with all options', () => {
    const script = createEventScript('Lunch', '2026-03-15T12:00:00Z', '2026-03-15T13:00:00Z', {
      location: 'Restaurant',
      description: 'Team lunch',
      calendar: 'Personal',
      allDay: false,
    });
    expect(script).toContain("summary: 'Lunch'");
    expect(script).toContain("location: 'Restaurant'");
    expect(script).toContain("description: 'Team lunch'");
    expect(script).toContain("whose({name: 'Personal'})");
    expect(script).toContain("alldayEvent: false");
  });

  test('updateEventScript with partial updates', () => {
    const script = updateEventScript('uid-1', { summary: 'Updated', location: 'New Place' });
    expect(script).toContain("whose({uid: 'uid-1'})");
    expect(script).toContain("ev.summary = 'Updated'");
    expect(script).toContain("ev.location = 'New Place'");
  });

  test('updateEventScript with date change', () => {
    const script = updateEventScript('uid-1', { startDate: '2026-04-01T10:00:00Z' });
    expect(script).toContain("ev.startDate = new Date('2026-04-01T10:00:00Z')");
  });

  test('deleteEventScript deletes by uid', () => {
    const script = deleteEventScript('uid-1');
    expect(script).toContain("whose({uid: 'uid-1'})");
    expect(script).toContain("Calendar.delete(events[0])");
  });

  test('searchEventsScript filters by keyword and date range', () => {
    const script = searchEventsScript('standup', '2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 50);
    expect(script).toContain("'standup'");
    expect(script).toContain("toLowerCase()");
    expect(script).toContain("50");
  });
});

describe('calendar esc() injection prevention', () => {
  test('escapes single quotes in calendar name', () => {
    const script = listEventsScript('2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 100, 0, "it's mine");
    expect(script).toContain("it\\'s mine");
    expect(script).not.toContain("it's mine");
  });

  test('escapes backslashes in event summary', () => {
    const script = createEventScript('path\\file', '2026-03-15T10:00:00Z', '2026-03-15T11:00:00Z', {});
    expect(script).toContain('path\\\\file');
  });

  test('escapes newlines in description', () => {
    const script = createEventScript('Test', '2026-03-15T10:00:00Z', '2026-03-15T11:00:00Z', {
      description: 'line1\nline2',
    });
    expect(script).toContain('line1\\nline2');
  });

  test('handles unicode content', () => {
    const script = searchEventsScript('회의', '2026-03-01T00:00:00Z', '2026-03-31T23:59:59Z', 50);
    expect(script).toContain('회의');
  });
});
