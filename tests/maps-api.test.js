import { describe, test, expect, jest, beforeEach } from '@jest/globals';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const { fetchGeocode, fetchReverseGeocode } = await import('../dist/maps/api.js');

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchGeocode', () => {
  test('returns parsed results from Open-Meteo', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            name: 'Seoul',
            latitude: 37.5665,
            longitude: 126.978,
            country: 'South Korea',
            country_code: 'KR',
            admin1: 'Seoul',
            elevation: 38,
            timezone: 'Asia/Seoul',
            population: 10349312,
          },
        ],
      }),
    });

    const result = await fetchGeocode('Seoul');
    expect(result.total).toBe(1);
    expect(result.results[0].name).toBe('Seoul');
    expect(result.results[0].latitude).toBe(37.5665);
    expect(result.results[0].countryCode).toBe('KR');
    expect(result.results[0].timezone).toBe('Asia/Seoul');
  });

  test('passes count parameter', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await fetchGeocode('test', 3);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('count=3');
  });

  test('returns empty results when no matches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetchGeocode('xyznonexistent');
    expect(result.total).toBe(0);
    expect(result.results).toEqual([]);
  });

  test('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchGeocode('Seoul')).rejects.toThrow('Geocoding API error: 500');
  });

  test('calls correct URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await fetchGeocode('Tokyo');
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('geocoding-api.open-meteo.com/v1/search');
    expect(url).toContain('name=Tokyo');
    expect(url).toContain('format=json');
  });

  test('handles null optional fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ name: 'Test', latitude: 0, longitude: 0, country: 'X', country_code: 'XX' }],
      }),
    });

    const result = await fetchGeocode('Test');
    expect(result.results[0].admin1).toBeNull();
    expect(result.results[0].elevation).toBeNull();
    expect(result.results[0].timezone).toBeNull();
    expect(result.results[0].population).toBeNull();
  });
});

describe('fetchReverseGeocode', () => {
  test('returns parsed address from Nominatim', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Gangnam Station',
        display_name: 'Gangnam Station, Gangnam-gu, Seoul, South Korea',
        lat: '37.4979',
        lon: '127.0276',
        address: {
          road: 'Gangnam-daero',
          city: 'Seoul',
          state: 'Seoul',
          country: 'South Korea',
          postcode: '06236',
        },
      }),
    });

    const result = await fetchReverseGeocode(37.4979, 127.0276);
    expect(result.name).toBe('Gangnam Station');
    expect(result.latitude).toBe(37.4979);
    expect(result.longitude).toBe(127.0276);
    expect(result.address.city).toBe('Seoul');
    expect(result.address.road).toBe('Gangnam-daero');
  });

  test('sends User-Agent header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ lat: '0', lon: '0', address: {} }),
    });

    await fetchReverseGeocode(0, 0);
    const opts = mockFetch.mock.calls[0][1];
    expect(opts.headers['User-Agent']).toContain('AirMCP');
  });

  test('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(fetchReverseGeocode(0, 0)).rejects.toThrow('Reverse geocoding error: 429');
  });

  test('throws on Nominatim error response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'Unable to geocode' }),
    });

    await expect(fetchReverseGeocode(0, 0)).rejects.toThrow('Unable to geocode');
  });

  test('falls back town/village for city', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: '35.0',
        lon: '129.0',
        address: { town: 'Haeundae', state: 'Busan', country: 'South Korea' },
      }),
    });

    const result = await fetchReverseGeocode(35.0, 129.0);
    expect(result.address.city).toBe('Haeundae');
  });

  test('handles missing optional fields', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ lat: '0', lon: '0', address: {} }),
    });

    const result = await fetchReverseGeocode(0, 0);
    expect(result.name).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.address.road).toBeNull();
    expect(result.address.city).toBeNull();
  });

  test('calls correct URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ lat: '37.5', lon: '127.0', address: {} }),
    });

    await fetchReverseGeocode(37.5, 127.0);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('nominatim.openstreetmap.org/reverse');
    expect(url).toContain('lat=37.5');
    expect(url).toContain('lon=127');
  });
});
