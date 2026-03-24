import { describe, test, expect } from '@jest/globals';
import { getModuleNames, setModuleRegistry, MODULE_REGISTRY } from '../dist/shared/modules.js';

describe('modules', () => {
  test('getModuleNames returns all 27 module names', () => {
    const names = getModuleNames();
    expect(names.length).toBe(27);
    expect(names).toContain('notes');
    expect(names).toContain('reminders');
    expect(names).toContain('calendar');
    expect(names).toContain('contacts');
    expect(names).toContain('mail');
    expect(names).toContain('music');
    expect(names).toContain('finder');
    expect(names).toContain('safari');
    expect(names).toContain('system');
    expect(names).toContain('photos');
    expect(names).toContain('shortcuts');
    expect(names).toContain('messages');
    expect(names).toContain('intelligence');
    expect(names).toContain('tv');
    expect(names).toContain('ui');
    expect(names).toContain('screen');
    expect(names).toContain('maps');
    expect(names).toContain('podcasts');
    expect(names).toContain('weather');
    expect(names).toContain('pages');
    expect(names).toContain('numbers');
    expect(names).toContain('keynote');
    expect(names).toContain('location');
    expect(names).toContain('bluetooth');
    expect(names).toContain('google');
    expect(names).toContain('speech');
    expect(names).toContain('health');
  });

  test('getModuleNames returns consistent results', () => {
    const first = getModuleNames();
    const second = getModuleNames();
    expect(first).toEqual(second);
  });

  test('setModuleRegistry updates MODULE_REGISTRY', () => {
    const mockRegistry = [
      { name: 'test', tools: () => {} },
    ];
    setModuleRegistry(mockRegistry);
    expect(MODULE_REGISTRY).toEqual(mockRegistry);

    // Restore
    setModuleRegistry([]);
  });

  test('MODULE_REGISTRY is initially empty', () => {
    setModuleRegistry([]);
    expect(MODULE_REGISTRY).toEqual([]);
  });
});
