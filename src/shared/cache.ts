/**
 * Generic TTL cache — stores values with per-key expiration.
 * Supports optional max entry limit and automatic periodic pruning.
 */
export class TtlCache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private inflight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: { maxEntries?: number; autoPruneMs?: number }) {
    this.maxEntries = options?.maxEntries ?? 500;
    const autoPruneMs = options?.autoPruneMs ?? 5 * 60_000; // default: 5 min
    if (autoPruneMs > 0) {
      this.pruneTimer = setInterval(() => this.prune(), autoPruneMs);
      if (this.pruneTimer.unref) this.pruneTimer.unref();
    }
  }

  /** Get a cached value, or undefined if missing/expired. */
  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /** Store a value with TTL in milliseconds. */
  set(key: string, value: unknown, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.evictIfNeeded();
  }

  /** Get cached value or compute it, caching the result. Coalesces concurrent calls for the same key. */
  async getOrSet<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = compute()
      .then((value) => {
        this.set(key, value, ttlMs);
        this.inflight.delete(key);
        return value;
      })
      .catch((err) => {
        this.inflight.delete(key);
        throw err;
      });
    this.inflight.set(key, promise);
    return promise;
  }

  /** Remove a specific key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove all expired entries. */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /** Number of entries (including expired). */
  get size(): number {
    return this.store.size;
  }

  /** Clear all entries and stop auto-prune timer. */
  clear(): void {
    this.store.clear();
  }

  /** Stop the auto-prune timer. */
  destroy(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
  }

  /** Evict oldest entries when cache exceeds maxEntries. */
  private evictIfNeeded(): void {
    if (this.store.size <= this.maxEntries) return;
    // First pass: remove expired
    this.prune();
    if (this.store.size <= this.maxEntries) return;
    // Second pass: evict by earliest expiration (LRU-like)
    const entries = [...this.store.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const toRemove = entries.length - this.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      this.store.delete(entries[i]![0]);
    }
  }
}

/** Singleton cache instance for resource data. */
export const resourceCache = new TtlCache();
