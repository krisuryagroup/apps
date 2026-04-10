import { Injectable } from '@angular/core';
import { APP_SETTINGS_CACHE } from '@zitro/utils';

/**
 * Cache Service - Manages restaurant-specific caching
 * This service ensures all cache keys are specific to the current restaurant
 */
@Injectable({
  providedIn: 'root'
})
export class CacheService {
  
  constructor() {}

  /**
   * Generate restaurant-specific cache key by prepending restaurant ID
   */
  getRestaurantSpecificKey(baseKey: string): string {
    const restaurantId = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) || 'default';
    return `${restaurantId}_${baseKey}`;
  }

  /**
   * Get item from localStorage with restaurant-specific key
   */
  getItem(baseKey: string): string | null {
    return localStorage.getItem(this.getRestaurantSpecificKey(baseKey));
  }

  /**
   * Set item in localStorage with restaurant-specific key
   */
  setItem(baseKey: string, value: string): void {
    localStorage.setItem(this.getRestaurantSpecificKey(baseKey), value);
  }

  /**
   * Remove item from localStorage with restaurant-specific key
   */
  removeItem(baseKey: string): void {
    localStorage.removeItem(this.getRestaurantSpecificKey(baseKey));
  }

  /**
   * Clear all restaurant-specific cache except specified keys
   */
  clearRestaurantCache(preserveKeys: string[] = []): void {
    const restaurantId = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) || 'default';
    const allKeys = Object.keys(localStorage);
    
    // Find all keys that belong to current restaurant
    const restaurantKeys = allKeys.filter(key => 
      key.startsWith(`${restaurantId}_`) && 
      !preserveKeys.some(preserveKey => key === this.getRestaurantSpecificKey(preserveKey))
    );

    console.log('🧹 CacheService: Clearing restaurant-specific cache keys:', restaurantKeys.length, 'keys for restaurant:', restaurantId);
    
    restaurantKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Get current restaurant ID
   */
  getCurrentRestaurantId(): string {
    return localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) || 'default';
  }

  /**
   * Check if cache exists for current restaurant
   */
  hasCache(baseKey: string): boolean {
    return this.getItem(baseKey) !== null;
  }

  /**
   * Get cached data as JSON object
   */
  getCachedData<T>(baseKey: string): T | null {
    const cached = this.getItem(baseKey);
    if (!cached) return null;
    
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('CacheService: Error parsing cached data for key:', baseKey, error);
      this.removeItem(baseKey); // Remove corrupted cache
      return null;
    }
  }

  /**
   * Set cached data as JSON string
   */
  setCachedData<T>(baseKey: string, data: T): void {
    try {
      this.setItem(baseKey, JSON.stringify(data));
    } catch (error) {
      console.error('CacheService: Error caching data for key:', baseKey, error);
    }
  }

  /**
   * Get cache timestamp
   */
  getCacheTimestamp(baseKey: string): number {
    const timestamp = this.getItem(baseKey);
    return timestamp ? parseInt(timestamp) : 0;
  }

  /**
   * Set cache timestamp
   */
  setCacheTimestamp(baseKey: string, timestamp?: number): void {
    this.setItem(baseKey, (timestamp || Date.now()).toString());
  }

  /**
   * Check if cache is expired
   */
  isCacheExpired(baseKey: string, maxAge: number): boolean {
    const timestamp = this.getCacheTimestamp(baseKey);
    if (!timestamp) return true;
    
    return Date.now() - timestamp > maxAge;
  }

  /**
   * Clear all cache entries that start with the given prefix
   * @param prefix The prefix to match cache keys against (e.g., 'USER_PROFILE_CACHE')
   */
  clearCacheByPrefix(prefix: string): void {
    try {
      const restaurantId = this.getCurrentRestaurantId();
      const fullPrefix = `${restaurantId}_${prefix}`;
      const allKeys = Object.keys(localStorage);
      
      const keysToRemove = allKeys.filter(key => key.startsWith(fullPrefix));
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log(`🗑️ Cleared ${keysToRemove.length} cache entries with prefix: ${prefix}`);
      }
    } catch (error) {
      console.error('Error clearing cache by prefix:', error);
    }
  }
}
