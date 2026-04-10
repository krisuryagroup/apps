import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheService } from './cache.service';
import { APP_SETTINGS_CACHE } from '@zitro/utils';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    localStorage.clear();
    service = new CacheService();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Restaurant-Specific Keys', () => {
    it('should generate key with default restaurant when none selected', () => {
      const key = service.getRestaurantSpecificKey('cart');

      expect(key).toBe('default_cart');
    });

    it('should generate key with selected restaurant ID', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');

      const key = service.getRestaurantSpecificKey('products');

      expect(key).toBe('rest-123_products');
    });

    it.each([
      { restaurantId: 'rest-1', baseKey: 'cart', expected: 'rest-1_cart' },
      { restaurantId: 'store-abc', baseKey: 'favorites', expected: 'store-abc_favorites' },
      { restaurantId: '123', baseKey: 'orders', expected: '123_orders' }
    ])('should generate $expected for restaurant=$restaurantId and key=$baseKey', ({ restaurantId, baseKey, expected }) => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, restaurantId);

      const result = service.getRestaurantSpecificKey(baseKey);

      expect(result).toBe(expected);
    });
  });

  describe('Get/Set/Remove Item', () => {
    it('should set and get item with restaurant-specific key', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');

      service.setItem('testKey', 'testValue');
      const result = service.getItem('testKey');

      expect(result).toBe('testValue');
      expect(localStorage.getItem('rest-123_testKey')).toBe('testValue');
    });

    it('should return null for non-existent key', () => {
      const result = service.getItem('nonExistent');

      expect(result).toBeNull();
    });

    it('should remove item with restaurant-specific key', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');
      service.setItem('testKey', 'value');

      service.removeItem('testKey');

      expect(service.getItem('testKey')).toBeNull();
      expect(localStorage.getItem('rest-123_testKey')).toBeNull();
    });

    it.each([
      { value: 'simple string' },
      { value: '{"json": "object"}' },
      { value: '12345' }
    ])('should handle value: $value', ({ value }) => {
      service.setItem('key', value);

      expect(service.getItem('key')).toBe(value);
    });
  });

  describe('Get Current Restaurant ID', () => {
    it('should return default when no restaurant selected', () => {
      const id = service.getCurrentRestaurantId();

      expect(id).toBe('default');
    });

    it('should return selected restaurant ID', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-456');

      const id = service.getCurrentRestaurantId();

      expect(id).toBe('rest-456');
    });
  });

  describe('Has Cache', () => {
    it('should return false for non-existent cache', () => {
      const result = service.hasCache('nonExistent');

      expect(result).toBe(false);
    });

    it('should return true for existing cache', () => {
      service.setItem('existingKey', 'value');

      const result = service.hasCache('existingKey');

      expect(result).toBe(true);
    });

    it('should return false after removing item', () => {
      service.setItem('key', 'value');
      service.removeItem('key');

      expect(service.hasCache('key')).toBe(false);
    });
  });

  describe('Get/Set Cached Data (JSON)', () => {
    it('should store and retrieve JSON object', () => {
      const data = { name: 'Pizza', price: 10.99 };

      service.setCachedData('product', data);
      const result = service.getCachedData<typeof data>('product');

      expect(result).toEqual(data);
    });

    it('should return null for non-existent data', () => {
      const result = service.getCachedData('nonExistent');

      expect(result).toBeNull();
    });

    it.each([
      { data: { items: [1, 2, 3] }, description: 'array in object' },
      { data: [{ id: 1 }, { id: 2 }], description: 'array of objects' },
      { data: { nested: { deep: { value: 'test' } } }, description: 'deeply nested' },
      { data: { number: 123, bool: true, str: 'text' }, description: 'mixed types' }
    ])('should handle $description', ({ data }) => {
      service.setCachedData('test', data);

      const result = service.getCachedData('test');

      expect(result).toEqual(data);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');
      localStorage.setItem('rest-123_corrupted', 'invalid{json');

      const result = service.getCachedData('corrupted');

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
      expect(service.hasCache('corrupted')).toBe(false);
    });

    it('should remove corrupted cache', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');
      localStorage.setItem('rest-123_bad', '{invalid}');

      service.getCachedData('bad');

      expect(localStorage.getItem('rest-123_bad')).toBeNull();
    });
  });

  describe('Clear Restaurant Cache', () => {
    beforeEach(() => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');
      service.setItem('cart', 'cart-data');
      service.setItem('products', 'products-data');
      service.setItem('orders', 'orders-data');
      
      // Mock Object.keys to return localStorage keys (JSDOM doesn't enumerate them properly)
      vi.spyOn(Object, 'keys').mockImplementation((obj) => {
        if (obj === localStorage) {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
          }
          return keys;
        }
        return Object.getOwnPropertyNames(obj);
      });
    });

    it('should clear all restaurant-specific cache', () => {
      service.clearRestaurantCache();

      expect(localStorage.getItem('rest-123_cart')).toBeNull();
      expect(localStorage.getItem('rest-123_products')).toBeNull();
      expect(localStorage.getItem('rest-123_orders')).toBeNull();
    });

    it('should preserve specified keys', () => {
      service.clearRestaurantCache(['cart']);

      expect(service.hasCache('cart')).toBe(true);
      expect(localStorage.getItem('rest-123_products')).toBeNull();
      expect(localStorage.getItem('rest-123_orders')).toBeNull();
    });

    it('should log number of cleared keys', () => {
      service.clearRestaurantCache();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Clearing restaurant-specific cache keys'),
        3,
        expect.any(String),
        'rest-123'
      );
    });

    it('should only clear keys for current restaurant', () => {
      localStorage.setItem('other-rest_cart', 'other-data');
      localStorage.setItem('global-key', 'global-data');

      service.clearRestaurantCache();

      expect(localStorage.getItem('other-rest_cart')).toBe('other-data');
      expect(localStorage.getItem('global-key')).toBe('global-data');
    });

    it('should preserve multiple specified keys', () => {
      service.clearRestaurantCache(['cart', 'products']);

      expect(service.hasCache('cart')).toBe(true);
      expect(service.hasCache('products')).toBe(true);
      expect(localStorage.getItem('rest-123_orders')).toBeNull();
    });
  });

  describe('Restaurant Isolation', () => {
    it('should isolate cache between different restaurants', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-1');
      service.setItem('cart', 'cart-rest-1');

      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-2');
      service.setItem('cart', 'cart-rest-2');

      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-1');
      expect(service.getItem('cart')).toBe('cart-rest-1');

      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-2');
      expect(service.getItem('cart')).toBe('cart-rest-2');
    });

    it('should not affect other restaurant cache on clear', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-1');
      service.setItem('data', 'value-1');

      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-2');
      service.setItem('data', 'value-2');
      service.clearRestaurantCache();

      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-1');
      expect(service.getItem('data')).toBe('value-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string as base key', () => {
      service.setItem('', 'value');

      expect(service.getItem('')).toBe('value');
    });

    it('should handle special characters in keys', () => {
      const data = { test: 'value' };

      service.setCachedData('key-with-dash', data);
      service.setCachedData('key_with_underscore', data);

      expect(service.getCachedData('key-with-dash')).toEqual(data);
      expect(service.getCachedData('key_with_underscore')).toEqual(data);
    });

    it('should handle empty object', () => {
      service.setCachedData('empty', {});

      expect(service.getCachedData('empty')).toEqual({});
    });

    it('should handle empty array', () => {
      service.setCachedData('emptyArray', []);

      expect(service.getCachedData('emptyArray')).toEqual([]);
    });
  });
});
