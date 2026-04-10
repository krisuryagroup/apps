import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManagerService } from './cache-manager.service';
import { CacheService } from './cache.service';
import { CacheType, CacheManagementConfig, DEFAULT_CACHE_CONFIG } from '@zitro/models';

describe('CacheManagerService', () => {
  let service: CacheManagerService;
  let mockCacheService: any;

  beforeEach(() => {
    mockCacheService = {
      getCachedData: vi.fn(),
      setCachedData: vi.fn(),
      getCacheTimestamp: vi.fn(),
      setCacheTimestamp: vi.fn(),
      isCacheExpired: vi.fn(() => true), // Default to expired cache
      removeItem: vi.fn(),
      clearCacheByPrefix: vi.fn(),
      getCurrentRestaurantId: vi.fn(() => 'test-restaurant')
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    service = new CacheManagerService(mockCacheService);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(service.isCacheEnabled(CacheType.PRODUCTS)).toBe(true);
      expect(service.getCacheDuration(CacheType.PRODUCTS)).toBe(DEFAULT_CACHE_CONFIG[CacheType.PRODUCTS]?.duration);
    });
  });

  describe('updateCacheConfig', () => {
    it('should update cache configuration from Firebase', () => {
      const newConfig: Partial<CacheManagementConfig> = {
        enableCache: {
          products: false
        },
        cacheDurations: {
          products: 1 // 1 hour in config format
        }
      };

      service.updateCacheConfig(newConfig);

      expect(service.isCacheEnabled(CacheType.PRODUCTS)).toBe(false);
      expect(service.getCacheDuration(CacheType.PRODUCTS)).toBe(3600000); // 1 hour in milliseconds
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache configuration updated')
      );
    });

    it('should handle partial configuration updates', () => {
      const partialConfig: Partial<CacheManagementConfig> = {
        enableCache: {
          coupons: true
        },
        cacheDurations: {
          coupons: 2 // 2 hours
        }
      };

      service.updateCacheConfig(partialConfig);

      expect(service.isCacheEnabled(CacheType.COUPONS)).toBe(true);
      expect(service.getCacheDuration(CacheType.COUPONS)).toBe(7200000); // 2 hours in ms
      // Other cache types should still use defaults
      expect(service.isCacheEnabled(CacheType.PRODUCTS)).toBe(true);
    });

    it('should process forceRefresh flags', () => {
      const config: Partial<CacheManagementConfig> = {
        forceRefresh: {
          products: true
        },
        lastCacheRefreshTimestamp: new Date().toISOString()
      };

      service.updateCacheConfig(config);

      // Force refresh is triggered when getCachedData is called
      service.getCachedData(CacheType.PRODUCTS, 'products_cache', 'products_cache_timestamp');
      
      expect(mockCacheService.clearCacheByPrefix).toHaveBeenCalled();
      // Check that console.log was called with a message containing "Force refresh"
      expect(console.log).toHaveBeenCalled();
      const calls = (console.log as any).mock.calls;
      const hasForceRefreshLog = calls.some((call: any[]) => 
        call.some((arg: any) => typeof arg === 'string' && arg.includes('Force refresh'))
      );
      expect(hasForceRefreshLog).toBe(true);
    });
  });

  describe('isCacheEnabled', () => {
    it('should return true for enabled cache type', () => {
      expect(service.isCacheEnabled(CacheType.PRODUCTS)).toBe(true);
    });

    it('should return false for disabled cache type', () => {
      service.updateCacheConfig({
        enableCache: { products: false }
      });

      expect(service.isCacheEnabled(CacheType.PRODUCTS)).toBe(false);
    });

    it('should return true if cache type not in config (default)', () => {
      expect(service.isCacheEnabled(CacheType.IMAGES)).toBe(true);
    });
  });

  describe('getCacheDuration', () => {
    it('should return configured duration', () => {
      const customDurationHours = 0.5; // 30 minutes in hours
      service.updateCacheConfig({
        cacheDurations: { userProfiles: customDurationHours }
      });

      expect(service.getCacheDuration(CacheType.USER_PROFILES)).toBe(1800000); // 30 minutes in ms
    });

    it('should return default duration if not configured', () => {
      expect(service.getCacheDuration(CacheType.PRODUCTS)).toBe(DEFAULT_CACHE_CONFIG[CacheType.PRODUCTS]?.duration);
    });
  });

  describe('getCachedData', () => {
    it('should return null if cache is disabled', () => {
      service.updateCacheConfig({
        enableCache: { products: false }
      });

      const result = service.getCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp'
      );

      expect(result).toBeNull();
      expect(mockCacheService.getCachedData).not.toHaveBeenCalled();
    });

    it('should return null if cache is expired', () => {
      mockCacheService.isCacheExpired.mockReturnValue(true);

      const result = service.getCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp'
      );

      expect(result).toBeNull();
    });

    it('should return cached data if valid', () => {
      const cachedData = [{ id: '1', name: 'Product 1' }];
      mockCacheService.isCacheExpired.mockReturnValue(false);
      mockCacheService.getCachedData.mockReturnValue(cachedData);

      const result = service.getCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp'
      );

      expect(result).toEqual(cachedData);
      expect(mockCacheService.getCachedData).toHaveBeenCalledWith('products_cache');
    });

    it('should handle cache read errors gracefully', () => {
      mockCacheService.isCacheExpired.mockReturnValue(false);
      mockCacheService.getCachedData.mockImplementation(() => {
        throw new Error('Cache read error');
      });

      const result = service.getCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp'
      );

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setCachedData', () => {
    it('should not cache if cache is disabled', () => {
      service.updateCacheConfig({
        enableCache: { products: false }
      });

      service.setCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp',
        [{ id: '1' }]
      );

      expect(mockCacheService.setCachedData).not.toHaveBeenCalled();
    });

    it('should cache data if enabled', () => {
      const data = [{ id: '1', name: 'Product 1' }];

      service.setCachedData(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp',
        data
      );

      expect(mockCacheService.setCachedData).toHaveBeenCalledWith('products_cache', data);
      expect(mockCacheService.setCacheTimestamp).toHaveBeenCalledWith('products_cache_timestamp');
    });

    it('should handle cache write errors gracefully', () => {
      mockCacheService.setCachedData.mockImplementation(() => {
        throw new Error('Cache write error');
      });

      expect(() => {
        service.setCachedData(
          CacheType.PRODUCTS,
          'products_cache',
          'products_cache_timestamp',
          [{ id: '1' }]
        );
      }).not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear both cache and timestamp', () => {
      service.clearCache(
        CacheType.PRODUCTS,
        'products_cache',
        'products_cache_timestamp'
      );

      expect(mockCacheService.removeItem).toHaveBeenCalledWith('products_cache');
      expect(mockCacheService.removeItem).toHaveBeenCalledWith('products_cache_timestamp');
    });

    it('should handle clear errors gracefully', () => {
      mockCacheService.removeItem.mockImplementation(() => {
        throw new Error('Clear error');
      });

      expect(() => {
        service.clearCache(CacheType.PRODUCTS, 'products_cache', 'products_cache_timestamp');
      }).not.toThrow();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearCacheByPrefix', () => {
    it('should call cacheService clearCacheByPrefix', () => {
      service.clearCacheByPrefix('USER_PROFILE');

      expect(mockCacheService.clearCacheByPrefix).toHaveBeenCalledWith('USER_PROFILE');
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all cache types', () => {
      service.clearAllCaches();

      // Should call removeItem for multiple cache keys
      expect(mockCacheService.removeItem).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('All caches cleared')
      );
    });
  });

  describe('Integration with different cache types', () => {
    it('should handle BANNER_IMAGES cache', () => {
      const result = service.getCachedData(
        CacheType.BANNER_IMAGES,
        'banner_cache',
        'banner_timestamp'
      );
      expect(result == null).toBe(true); // Should be null or undefined when cache doesn't exist
    });

    it('should handle COUPONS cache', () => {
      service.setCachedData(
        CacheType.COUPONS,
        'coupons_cache',
        'coupons_timestamp',
        []
      );
      expect(mockCacheService.setCachedData).toHaveBeenCalled();
    });

    it('should handle ORDER_HISTORY cache', () => {
      service.clearCache(
        CacheType.ORDER_HISTORY,
        'order_history',
        'order_history_timestamp'
      );
      expect(mockCacheService.removeItem).toHaveBeenCalled();
    });
  });
});
