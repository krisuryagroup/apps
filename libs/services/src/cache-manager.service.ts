import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  CacheType, 
  CacheManagementConfig, 
  DEFAULT_CACHE_CONFIG,
  DEFAULT_CACHE_DURATIONS 
} from '@zitro/models';
import { CacheService } from './cache.service';

/**
 * Centralized Cache Manager Service
 * 
 * Manages all application caching with Firebase-controlled configuration.
 * Provides dynamic cache control, force refresh capabilities, and cache
 * duration management from Firebase appSettings.
 * 
 * Features:
 * - Global cache enable/disable
 * - Individual cache type control
 * - Dynamic cache durations from Firebase
 * - Force refresh for specific caches or all caches
 * - Cache validation based on timestamps
 * - localStorage-based cache storage
 */
@Injectable({
  providedIn: 'root'
})
export class CacheManagerService {
  private cacheConfig$ = new BehaviorSubject<CacheManagementConfig>(DEFAULT_CACHE_CONFIG);
  private lastForceRefreshCheck: { [key: string]: number } = {};

  constructor(private cacheService: CacheService) {
    this.initializeForceRefreshTracking();
  }

  /**
   * Initialize force refresh tracking from localStorage
   */
  private initializeForceRefreshTracking(): void {
    const stored = localStorage.getItem('cache_force_refresh_tracking');
    if (stored) {
      try {
        this.lastForceRefreshCheck = JSON.parse(stored);
      } catch (error) {
        console.warn('Failed to parse force refresh tracking:', error);
      }
    }
  }

  /**
   * Save force refresh tracking to localStorage
   */
  private saveForceRefreshTracking(): void {
    try {
      localStorage.setItem('cache_force_refresh_tracking', JSON.stringify(this.lastForceRefreshCheck));
    } catch (error) {
      console.warn('Failed to save force refresh tracking:', error);
    }
  }

  /**
   * Update cache configuration from Firebase
   * @param config New cache configuration from Firebase
   */
  public updateCacheConfig(config: Partial<CacheManagementConfig>): void {
    // Merge with current configuration
    const currentConfig = this.cacheConfig$.value;
    const mergedConfig: CacheManagementConfig = {
      cacheDurations: { ...currentConfig.cacheDurations, ...config.cacheDurations },
      enableCache: { ...currentConfig.enableCache, ...config.enableCache },
      forceRefresh: { ...currentConfig.forceRefresh, ...config.forceRefresh },
      lastCacheRefreshTimestamp: config.lastCacheRefreshTimestamp
    };
    
    this.cacheConfig$.next(mergedConfig);
    console.log('Cache configuration updated from Firebase', mergedConfig);
  }

  /**
   * Get current cache configuration
   */
  public getCacheConfig(): CacheManagementConfig {
    return this.cacheConfig$.value;
  }

  /**
   * Get cache configuration as observable
   */
  public getCacheConfig$(): Observable<CacheManagementConfig> {
    return this.cacheConfig$.asObservable();
  }

  /**
   * Check if caching is enabled for a specific cache type
   * @param cacheType Type of cache to check
   */
  public isCacheEnabled(cacheType: CacheType): boolean {
    const config = this.cacheConfig$.value;
    return config.enableCache?.[cacheType] ?? true;
  }

  /**
   * Get cache duration for a specific cache type
   * @param cacheType Type of cache
   * @returns Duration in milliseconds
   */
  public getCacheDuration(cacheType: CacheType): number {
    const config = this.cacheConfig$.value;
    const durationHours = config.cacheDurations?.[cacheType] || DEFAULT_CACHE_DURATIONS[cacheType] || 24;
    return durationHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  /**
   * Check if cached data is still valid
   * @param cacheType Type of cache
   * @param timestampKey localStorage key for the timestamp
   * @returns true if cache is valid, false otherwise
   */
  public isCacheValid(cacheType: CacheType, timestampKey: string): boolean {
    // Check if caching is enabled
    if (!this.isCacheEnabled(cacheType)) {
      return false;
    }
    
    // Get cache duration
    const duration = this.getCacheDuration(cacheType);
    
    // Check timestamp using CacheService
    return !this.cacheService.isCacheExpired(timestampKey, duration);
  }

  /**
   * Get cached data if valid
   * @param cacheType Type of cache
   * @param cacheKey localStorage key for the cached data
   * @param timestampKey localStorage key for the timestamp
   * @returns Cached data or null if invalid/not found
   */
  public getCachedData<T>(cacheType: CacheType, cacheKey: string, timestampKey: string): T | null {
    const config = this.cacheConfig$.value;
    
    // Check if caching is enabled for this cache type
    if (!config.enableCache?.[cacheType]) {
      return null;
    }
    
    // Check global clearAll flag first
    if (config.forceRefresh?.clearAll) {
      const lastClearAllTime = this.lastForceRefreshCheck['clearAll'] || 0;
      const firebaseTimestamp = config.lastCacheRefreshTimestamp ? 
        new Date(config.lastCacheRefreshTimestamp).getTime() : Date.now();
      
      // If Firebase timestamp is newer than our last clear, clear everything
      if (firebaseTimestamp > lastClearAllTime) {
        console.log(`🗑️ Global Clear All enabled - clearing ALL cache`);
        
        const keysToPreserve = ['SELECTED_RESTAURANT_ID', 'cache_force_refresh_tracking'];
        const allKeys = Object.keys(localStorage);
        let clearedCount = 0;
        
        allKeys.forEach(key => {
          if (!keysToPreserve.some(preserve => key.includes(preserve))) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        });
        
        this.lastForceRefreshCheck['clearAll'] = Date.now();
        this.saveForceRefreshTracking();
        
        console.log(`✅ Global Clear All completed - ${clearedCount} items cleared`);
        return null;
      }
    }
    
    // Check individual force refresh for this cache type
    if (config.forceRefresh?.[cacheType]) {
      const lastRefreshTime = this.lastForceRefreshCheck[cacheType] || 0;
      const firebaseTimestamp = config.lastCacheRefreshTimestamp ? 
        new Date(config.lastCacheRefreshTimestamp).getTime() : Date.now();
      
      // If Firebase timestamp is newer than our last refresh, clear this cache
      if (firebaseTimestamp > lastRefreshTime) {
        console.log(`🔄 Force refresh enabled for ${cacheType} - clearing cache`);
        
        this.clearCache(cacheType, cacheKey, timestampKey);
        this.clearCacheByType(cacheType);
        
        this.lastForceRefreshCheck[cacheType] = Date.now();
        this.saveForceRefreshTracking();
        
        console.log(`✅ Force refresh completed for ${cacheType}`);
        return null;
      }
    }
    
    // Check if cache is expired based on duration
    const duration = this.getCacheDuration(cacheType);
    if (this.cacheService.isCacheExpired(timestampKey, duration)) {
      return null;
    }
    
    try {
      return this.cacheService.getCachedData<T>(cacheKey);
    } catch (error) {
      console.error(`Failed to get cached data for ${cacheType}:`, error);
      return null;
    }
  }

  /**
   * Clear cache by type
   */
  private clearCacheByType(cacheType: CacheType): void {
    switch (cacheType) {
      case CacheType.PRODUCTS:
        this.clearCacheByPrefix('products');
        break;
      case CacheType.CATEGORIES:
        this.clearCacheByPrefix('categories');
        break;
      case CacheType.COUPONS:
        this.clearCacheByPrefix('COUPON');
        break;
      case CacheType.ORDER_HISTORY:
        this.clearCacheByPrefix('ORDER_HISTORY_CACHE');
        break;
      case CacheType.USER_PROFILES:
        this.clearCacheByPrefix('USER_PROFILE_CACHE');
        break;
      case CacheType.BANNER_IMAGES:
        this.clearCacheByPrefix('BANNER');
        break;
      case CacheType.IMAGES:
        this.clearCacheByPrefix('IMAGE');
        break;
    }
  }

  /**
   * Set cached data with timestamp
   * @param cacheType Type of cache
   * @param cacheKey localStorage key for the cached data
   * @param timestampKey localStorage key for the timestamp
   * @param data Data to cache
   */
  public setCachedData<T>(cacheType: CacheType, cacheKey: string, timestampKey: string, data: T): void {
    if (!this.isCacheEnabled(cacheType)) {
      return;
    }
    
    try {
      this.cacheService.setCachedData(cacheKey, data);
      this.cacheService.setCacheTimestamp(timestampKey);
    } catch (error) {
      console.error(`Failed to cache data for ${cacheType}:`, error);
    }
  }

  /**
   * Clear cache for a specific cache type
   * @param cacheType Type of cache to clear
   * @param cacheKey localStorage key for the cached data
   * @param timestampKey localStorage key for the timestamp
   */
  public clearCache(cacheType: CacheType, cacheKey: string, timestampKey: string): void {
    try {
      this.cacheService.removeItem(cacheKey);
      this.cacheService.removeItem(timestampKey);
      console.log(`Cache cleared for ${cacheType}`);
    } catch (error) {
      console.error(`Failed to clear cache for ${cacheType}:`, error);
    }
  }

  /**
   * Clear multiple cache entries (for user-specific caches)
   * @param keyPrefix Prefix pattern to match (e.g., 'USER_PROFILE_CACHE')
   */
  public clearCacheByPrefix(keyPrefix: string): void {
    this.cacheService.clearCacheByPrefix(keyPrefix);
  }

  /**
   * Clear all application caches
   */
  public clearAllCaches(): void {
    const cacheKeys = [
      'COUPONS_CACHE',
      'COUPONS_CACHE_TIMESTAMP',
      'cache_force_refresh_tracking'
    ];
    
    // Clear specific cache keys
    try {
      cacheKeys.forEach(key => this.cacheService.removeItem(key));
      
      // Clear user-specific caches by prefix
      const userCachePrefixes = [
        'USER_PROFILE_CACHE',
        'ORDER_HISTORY_CACHE'
      ];
      
      userCachePrefixes.forEach(prefix => {
        this.cacheService.clearCacheByPrefix(prefix);
      });
      
      // Reset force refresh tracking
      this.lastForceRefreshCheck = {};
      this.saveForceRefreshTracking();
      
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }



  /**
   * Get cache statistics for debugging/monitoring
   */
  public getCacheStats(): any {
    const config = this.cacheConfig$.value;
    const stats: any = {
      caches: {},
      lastCacheRefreshTimestamp: config.lastCacheRefreshTimestamp
    };
    
    Object.values(CacheType).forEach(cacheType => {
      stats.caches[cacheType] = {
        enabled: config.enableCache?.[cacheType] ?? false,
        duration: config.cacheDurations?.[cacheType] || DEFAULT_CACHE_DURATIONS[cacheType],
        forceRefresh: config.forceRefresh?.[cacheType] ?? false,
        lastForceRefreshCheck: this.lastForceRefreshCheck[cacheType]
      };
    });
    
    return stats;
  }

  /**
   * Manually trigger cache refresh for a specific type
   * @param cacheType Type of cache to refresh
   */
  public refreshCache(cacheType: CacheType): void {
    this.clearCacheByType(cacheType);
    this.lastForceRefreshCheck[cacheType] = Date.now();
    this.saveForceRefreshTracking();
    console.log(`Manual cache refresh triggered for ${cacheType}`);
  }
}
