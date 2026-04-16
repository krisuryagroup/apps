import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new CacheService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    jest.useRealTimers();
  });

  describe('set / get', () => {
    it('returns stored value within TTL', () => {
      service.set('products:hp', [{ id: '1' }], { ttlHours: 1 });
      expect(service.get('products:hp')).toEqual([{ id: '1' }]);
    });

    it('returns null for a key that was never set', () => {
      expect(service.get('missing')).toBeNull();
    });

    it('returns null after TTL has elapsed', () => {
      service.set('key', 'value', { ttlHours: 1 });
      jest.advanceTimersByTime(3_601_000);
      expect(service.get('key')).toBeNull();
    });

    it('removes the entry from localStorage when expired', () => {
      service.set('expired', 42, { ttlHours: 0.001 });
      jest.advanceTimersByTime(10_000);
      service.get('expired');
      expect(localStorage.getItem('zitro_cache_expired')).toBeNull();
    });

    it('returns null and removes a corrupted entry', () => {
      localStorage.setItem('zitro_cache_bad', 'not-json{{{');
      expect(service.get('bad')).toBeNull();
      expect(localStorage.getItem('zitro_cache_bad')).toBeNull();
    });

    it('returns null for an entry with no expiresAt field', () => {
      localStorage.setItem('zitro_cache_malformed', JSON.stringify({ data: 'x' }));
      expect(service.get('malformed')).toBeNull();
    });

    it('overwrites an existing entry', () => {
      service.set('k', 'first', { ttlHours: 1 });
      service.set('k', 'second', { ttlHours: 1 });
      expect(service.get('k')).toBe('second');
    });

    it('does not throw on storage quota error', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => service.set('k', 'v', { ttlHours: 1 })).not.toThrow();
    });

    it('uses zitro_cache_ prefix for all keys', () => {
      service.set('mykey', 'val', { ttlHours: 1 });
      expect(localStorage.getItem('zitro_cache_mykey')).not.toBeNull();
      expect(localStorage.getItem('mykey')).toBeNull();
    });

    it('stores typed objects and retrieves them correctly', () => {
      const obj = { name: 'Paneer Butter Masala', price: 180 };
      service.set<typeof obj>('product', obj, { ttlHours: 2 });
      expect(service.get<typeof obj>('product')).toEqual(obj);
    });
  });

  describe('invalidate', () => {
    it('removes the exact entry', () => {
      service.set('a', 1, { ttlHours: 1 });
      service.invalidate('a');
      expect(service.get('a')).toBeNull();
    });

    it('is a no-op for a key that does not exist', () => {
      expect(() => service.invalidate('nonexistent')).not.toThrow();
    });

    it('only removes the specified key, not others', () => {
      service.set('a', 1, { ttlHours: 1 });
      service.set('b', 2, { ttlHours: 1 });
      service.invalidate('a');
      expect(service.get('b')).toBe(2);
    });
  });

  describe('invalidatePattern', () => {
    it('removes all keys matching the prefix', () => {
      service.set('products:hp', [1], { ttlHours: 1 });
      service.set('products:efc', [2], { ttlHours: 1 });
      service.set('coupons:hp', [3], { ttlHours: 1 });
      service.invalidatePattern('products:');
      expect(service.get('products:hp')).toBeNull();
      expect(service.get('products:efc')).toBeNull();
      expect(service.get('coupons:hp')).toBe(3);
    });

    it('is a no-op when no keys match', () => {
      service.set('a', 1, { ttlHours: 1 });
      expect(() => service.invalidatePattern('xyz')).not.toThrow();
      expect(service.get('a')).toBe(1);
    });
  });

  describe('clear', () => {
    it('removes all zitro_cache_* entries', () => {
      service.set('a', 1, { ttlHours: 1 });
      service.set('b', 2, { ttlHours: 1 });
      service.clear();
      expect(service.get('a')).toBeNull();
      expect(service.get('b')).toBeNull();
    });

    it('does not remove non-cache keys', () => {
      localStorage.setItem('user_pref', 'dark');
      service.set('a', 1, { ttlHours: 1 });
      service.clear();
      expect(localStorage.getItem('user_pref')).toBe('dark');
    });
  });

  describe('legacy shims', () => {
    it('getCachedData returns stored JSON value', () => {
      localStorage.setItem('legacy_key', JSON.stringify({ x: 1 }));
      expect(service.getCachedData<{ x: number }>('legacy_key')).toEqual({ x: 1 });
    });

    it('getCachedData returns null for missing key', () => {
      expect(service.getCachedData('missing')).toBeNull();
    });

    it('setCachedData writes raw JSON to localStorage', () => {
      service.setCachedData('k', { y: 2 });
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ y: 2 });
    });

    it('setCacheTimestamp writes current epoch ms', () => {
      const now = new Date('2025-01-01T00:00:00Z').getTime();
      jest.setSystemTime(now);
      service.setCacheTimestamp('ts_key');
      expect(localStorage.getItem('ts_key')).toBe(String(now));
    });

    it('isCacheExpired returns false for a fresh timestamp', () => {
      service.setCacheTimestamp('ts');
      expect(service.isCacheExpired('ts', 60_000)).toBe(false);
    });

    it('isCacheExpired returns true after duration has passed', () => {
      service.setCacheTimestamp('ts');
      jest.advanceTimersByTime(61_000);
      expect(service.isCacheExpired('ts', 60_000)).toBe(true);
    });

    it('removeItem deletes the key from localStorage', () => {
      localStorage.setItem('raw', 'val');
      service.removeItem('raw');
      expect(localStorage.getItem('raw')).toBeNull();
    });

    it('clearCacheByPrefix removes all matching keys', () => {
      localStorage.setItem('COUPON_123', 'a');
      localStorage.setItem('COUPON_456', 'b');
      localStorage.setItem('BANNER_1', 'c');
      service.clearCacheByPrefix('COUPON_');
      expect(localStorage.getItem('COUPON_123')).toBeNull();
      expect(localStorage.getItem('COUPON_456')).toBeNull();
      expect(localStorage.getItem('BANNER_1')).toBe('c');
    });

    it('getCurrentRestaurantId returns empty string when not set', () => {
      expect(service.getCurrentRestaurantId()).toBe('');
    });

    it('getCurrentRestaurantId returns the stored restaurant ID', () => {
      localStorage.setItem('SELECTED_RESTAURANT_ID', 'hunger_point');
      expect(service.getCurrentRestaurantId()).toBe('hunger_point');
    });
  });
});
