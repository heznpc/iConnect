import { describe, test, expect } from '@jest/globals';
import {
  searchLocationScript,
  getDirectionsScript,
  dropPinScript,
  openInMapsScript,
  searchNearbyScript,
  shareLocationScript,
} from '../dist/maps/scripts.js';

describe('maps script generators', () => {
  test('searchLocationScript opens Maps with query', () => {
    const script = searchLocationScript('Central Park');
    expect(script).toContain('app.includeStandardAdditions = true');
    expect(script).toContain("'Central Park'");
    expect(script).toContain('openLocation');
    expect(script).toContain('maps://?q=');
    expect(script).toContain('encodeURIComponent(query)');
  });

  test('getDirectionsScript opens Maps with from/to', () => {
    const script = getDirectionsScript('New York', 'Boston');
    expect(script).toContain('app.includeStandardAdditions = true');
    expect(script).toContain("'New York'");
    expect(script).toContain("'Boston'");
    expect(script).toContain('openLocation');
    expect(script).toContain('saddr=');
    expect(script).toContain('daddr=');
  });

  test('getDirectionsScript defaults to driving', () => {
    const script = getDirectionsScript('A', 'B');
    expect(script).toContain("dirflg = 'd'");
    expect(script).toContain("'driving'");
  });

  test('getDirectionsScript maps walking to w', () => {
    const script = getDirectionsScript('A', 'B', 'walking');
    expect(script).toContain("dirflg = 'w'");
    expect(script).toContain("'walking'");
  });

  test('getDirectionsScript maps transit to r', () => {
    const script = getDirectionsScript('A', 'B', 'transit');
    expect(script).toContain("dirflg = 'r'");
    expect(script).toContain("'transit'");
  });

  test('dropPinScript opens Maps with coordinates', () => {
    const script = dropPinScript(40.7829, -73.9654);
    expect(script).toContain('app.includeStandardAdditions = true');
    expect(script).toContain('openLocation');
    expect(script).toContain('ll=40.7829,-73.9654');
  });

  test('dropPinScript includes label when provided', () => {
    const script = dropPinScript(40.7829, -73.9654, 'Central Park');
    expect(script).toContain('ll=40.7829,-73.9654');
    expect(script).toContain("encodeURIComponent('Central Park')");
    expect(script).toContain("label: 'Central Park'");
  });

  test('dropPinScript omits label when not provided', () => {
    const script = dropPinScript(40.7829, -73.9654);
    expect(script).not.toContain('label');
    expect(script).not.toContain('&q=');
  });

  test('openInMapsScript opens Maps with address', () => {
    const script = openInMapsScript('1600 Pennsylvania Ave NW');
    expect(script).toContain('app.includeStandardAdditions = true');
    expect(script).toContain("'1600 Pennsylvania Ave NW'");
    expect(script).toContain('openLocation');
    expect(script).toContain('maps://?address=');
    expect(script).toContain('encodeURIComponent(addr)');
  });

  test('searchNearbyScript searches with query only', () => {
    const script = searchNearbyScript('coffee shops');
    expect(script).toContain('app.includeStandardAdditions = true');
    expect(script).toContain("'coffee shops'");
    expect(script).toContain('openLocation');
    expect(script).toContain('maps://?q=');
    expect(script).not.toContain('near=');
  });

  test('searchNearbyScript includes coordinates when provided', () => {
    const script = searchNearbyScript('gas stations', 40.7829, -73.9654);
    expect(script).toContain("'gas stations'");
    expect(script).toContain('40.7829,-73.9654');
    expect(script).toContain('near=');
  });

  test('shareLocationScript generates Apple Maps URL', () => {
    const script = shareLocationScript(40.7829, -73.9654);
    expect(script).toContain('https://maps.apple.com/?ll=40.7829,-73.9654');
  });

  test('shareLocationScript includes label in URL', () => {
    const script = shareLocationScript(40.7829, -73.9654, 'Central Park');
    expect(script).toContain('https://maps.apple.com/?ll=40.7829,-73.9654');
    expect(script).toContain('Central%20Park');
  });

  test('shareLocationScript omits label param when not provided', () => {
    const script = shareLocationScript(40.7829, -73.9654);
    expect(script).not.toContain('&q=');
  });
});

describe('maps URL encoding', () => {
  test('searchLocationScript encodes query via encodeURIComponent', () => {
    const script = searchLocationScript('New York & Los Angeles');
    expect(script).toContain("'New York & Los Angeles'");
    expect(script).toContain('encodeURIComponent(query)');
  });

  test('getDirectionsScript encodes from/to via encodeURIComponent', () => {
    const script = getDirectionsScript('San José', 'São Paulo');
    expect(script).toContain('encodeURIComponent(saddr)');
    expect(script).toContain('encodeURIComponent(daddr)');
  });

  test('openInMapsScript encodes address via encodeURIComponent', () => {
    const script = openInMapsScript('123 Main St, Suite #5');
    expect(script).toContain('encodeURIComponent(addr)');
  });
});

describe('maps esc() injection prevention', () => {
  test('escapes single quotes in search query', () => {
    const script = searchLocationScript("Joe's Pizza");
    expect(script).toContain("Joe\\'s Pizza");
  });

  test('escapes single quotes in directions from', () => {
    const script = getDirectionsScript("O'Hare Airport", 'Downtown');
    expect(script).toContain("O\\'Hare Airport");
  });

  test('escapes single quotes in directions to', () => {
    const script = getDirectionsScript('Home', "Macy's");
    expect(script).toContain("Macy\\'s");
  });

  test('escapes single quotes in address', () => {
    const script = openInMapsScript("1 King's Road");
    expect(script).toContain("1 King\\'s Road");
  });

  test('escapes single quotes in drop pin label', () => {
    const script = dropPinScript(40.0, -74.0, "Tom's Restaurant");
    expect(script).toContain("Tom\\'s Restaurant");
  });

  test('escapes single quotes in nearby query', () => {
    const script = searchNearbyScript("McDonald's");
    expect(script).toContain("McDonald\\'s");
  });

  test('escapes backslashes in search query', () => {
    const script = searchLocationScript('back\\slash');
    expect(script).toContain('back\\\\slash');
  });

  test('escapes backslashes in address', () => {
    const script = openInMapsScript('path\\to\\place');
    expect(script).toContain('path\\\\to\\\\place');
  });

  test('escapes backslashes in directions', () => {
    const script = getDirectionsScript('a\\b', 'c\\d');
    expect(script).toContain('a\\\\b');
    expect(script).toContain('c\\\\d');
  });
});

describe('maps optional parameter handling', () => {
  test('getDirectionsScript without transportType defaults to driving', () => {
    const script = getDirectionsScript('A', 'B');
    expect(script).toContain("dirflg = 'd'");
  });

  test('getDirectionsScript with undefined transportType defaults to driving', () => {
    const script = getDirectionsScript('A', 'B', undefined);
    expect(script).toContain("dirflg = 'd'");
  });

  test('dropPinScript without label', () => {
    const script = dropPinScript(0, 0);
    expect(script).toContain('ll=0,0');
    expect(script).not.toContain('&q=');
    expect(script).not.toContain('label');
  });

  test('searchNearbyScript without coordinates', () => {
    const script = searchNearbyScript('restaurants');
    expect(script).not.toContain('near=');
    expect(script).not.toContain('latitude');
    expect(script).not.toContain('longitude');
  });

  test('searchNearbyScript with coordinates', () => {
    const script = searchNearbyScript('restaurants', 51.5074, -0.1278);
    expect(script).toContain('near=');
    expect(script).toContain('51.5074,-0.1278');
  });

  test('shareLocationScript without label', () => {
    const script = shareLocationScript(48.8566, 2.3522);
    expect(script).toContain('ll=48.8566,2.3522');
    expect(script).not.toContain('&q=');
  });

  test('shareLocationScript with label', () => {
    const script = shareLocationScript(48.8566, 2.3522, 'Eiffel Tower');
    expect(script).toContain('ll=48.8566,2.3522');
    expect(script).toContain('Eiffel%20Tower');
  });
});
