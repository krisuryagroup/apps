import { Injectable } from '@angular/core';

const KEY_PREFIX = 'zitro_cache_';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * TTL-based localStorage cache used by all API services.
 *
 * Key format: `zitro_cache_{key}` — easy to identify and bulk-clear.
 * Each entry is stored as JSON: { data, expiresAt (epoch ms) }.
 *
 * Usage:
 *   const cached = this.cache.get<Product[]>('products:hunger_point');
 *   if (!cached) {
 *     this.cache.set('products:hunger_point', products, { ttlHours: 1 });
 *   }
 */
@Injectable({ providedIn: 'root' })
export class CacheService {
  /**
   * Returns the cached value for `key`, or null if missing / expired / corrupted.
   * Removes the entry from localStorage if it has expired.
   */
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return null;

    let entry: CacheEntry<T>;
    try {
      entry = JSON.parse(raw) as CacheEntry<T>;
    } catch {
      localStorage.removeItem(KEY_PREFIX + key);
      return null;
    }

    if (typeof entry.expiresAt !== 'number') {
      localStorage.removeItem(KEY_PREFIX + key);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(KEY_PREFIX + key);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores `data` under `key` with the given TTL.
   * Overwrites any existing entry (including its TTL).
   */
  set<T>(key: string, data: T, options: { ttlHours: number }): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + options.ttlHours * 3_600_000,
    };
    try {
      localStorage.setItem(KEY_PREFIX + key, JSON.stringify(entry));
    } catch {
      // Storage quota exceeded or private browsing — silently no-op
    }
  }

  /**
   * Removes the exact cache entry for `key`.
   * No-op if the key does not exist.
   */
  invalidate(key: string): void {
    localStorage.removeItem(KEY_PREFIX + key);
  }

  /**
   * Removes all entries whose key starts with `prefix`.
   * Example: `invalidatePattern('products:')` removes products:hp, products:efc.
   */
  invalidatePattern(prefix: string): void {
    const fullPrefix = KEY_PREFIX + prefix;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  /**
   * Removes ALL `zitro_cache_*` entries. Non-cache keys are left untouched.
   */
  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  // ---------------------------------------------------------------------------
  // Legacy shims — used by MT-migrated Firebase services (cart, favorites,
  // categories, cache-manager). Removed once each service is replaced by a
  // T010 API service. Do NOT use in new code.
  // ---------------------------------------------------------------------------

  /** @deprecated Use get() with ttlHours instead. */
  getCachedData<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null') as T;
    } catch {
      return null;
    }
  }

  /** @deprecated Use set() with ttlHours instead. */
  setCachedData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch { /* quota exceeded — silently no-op */ }
  }

  /** @deprecated Use set() — TTL is embedded in the entry. */
  setCacheTimestamp(key: string): void {
    localStorage.setItem(key, String(Date.now()));
  }

  /** @deprecated Use get() — it returns null when expired. */
  isCacheExpired(tsKey: string, durationMs: number): boolean {
    const ts = Number(localStorage.getItem(tsKey) ?? '0');
    return Date.now() - ts > durationMs;
  }

  /** @deprecated Use invalidate() instead. */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /** @deprecated Use invalidatePattern() instead. */
  clearCacheByPrefix(prefix: string): void {
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  /**
   * @deprecated Belongs in BusinessContextService — reads the legacy restaurant
   * selection key written by the old MT-migrated app shell.
   */
  getCurrentRestaurantId(): string {
    return localStorage.getItem('SELECTED_RESTAURANT_ID') ?? '';
  }
}
