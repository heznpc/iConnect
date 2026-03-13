import { describe, test, expect } from '@jest/globals';
import { cosineSimilarity } from '../dist/semantic/embeddings.js';

describe('cosineSimilarity', () => {
  test('identical vectors return 1', () => {
    const v = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  test('opposite vectors return -1', () => {
    const a = [1, 0, 0];
    const b = [-1, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  test('orthogonal vectors return 0', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  test('similar vectors return high similarity', () => {
    const a = [1, 2, 3];
    const b = [1.1, 2.1, 3.1];
    expect(cosineSimilarity(a, b)).toBeGreaterThan(0.99);
  });

  test('zero vector returns 0', () => {
    const a = [1, 2, 3];
    const b = [0, 0, 0];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test('handles high-dimensional vectors', () => {
    const dim = 512;
    const a = Array.from({ length: dim }, (_, i) => Math.sin(i));
    const b = Array.from({ length: dim }, (_, i) => Math.sin(i + 0.1));
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.9);
    expect(sim).toBeLessThanOrEqual(1.0);
  });
});

// Test the store search logic
import { search } from '../dist/semantic/store.js';

describe('vector store search', () => {
  const mockStore = {
    version: 1,
    entries: {
      'note:1': {
        id: 'note:1',
        source: 'notes',
        title: 'Meeting notes',
        text: 'Meeting notes for project X',
        vector: [1, 0, 0, 0],
        updatedAt: '2026-03-13T00:00:00Z',
      },
      'event:1': {
        id: 'event:1',
        source: 'calendar',
        title: 'Project X kickoff',
        text: 'Project X kickoff meeting',
        vector: [0.9, 0.1, 0, 0],
        updatedAt: '2026-03-13T00:00:00Z',
      },
      'reminder:1': {
        id: 'reminder:1',
        source: 'reminders',
        title: 'Buy groceries',
        text: 'Buy groceries milk eggs',
        vector: [0, 0, 1, 0],
        updatedAt: '2026-03-13T00:00:00Z',
      },
    },
  };

  test('returns results sorted by similarity', () => {
    const query = [1, 0, 0, 0]; // identical to note:1
    const results = search(mockStore, query);
    expect(results[0].id).toBe('note:1');
    expect(results[0].similarity).toBe(1);
    expect(results[1].id).toBe('event:1');
  });

  test('filters by source', () => {
    const query = [1, 0, 0, 0];
    const results = search(mockStore, query, { sources: ['calendar'] });
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('calendar');
  });

  test('respects threshold', () => {
    const query = [1, 0, 0, 0];
    const results = search(mockStore, query, { threshold: 0.999 });
    expect(results).toHaveLength(1); // only note:1 at similarity 1.0
  });

  test('respects topK', () => {
    const query = [0.5, 0.5, 0.5, 0.5];
    const results = search(mockStore, query, { topK: 1 });
    expect(results).toHaveLength(1);
  });

  test('returns empty for no matches above threshold', () => {
    const query = [0, 0, 0, 1]; // orthogonal to most entries
    const results = search(mockStore, query, { threshold: 0.9 });
    expect(results).toHaveLength(0);
  });
});
