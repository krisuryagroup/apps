/**
 * Cache Configuration Models for Firebase-controlled cache management
 * 
 * This file defines the structure for cache configuration that can be
 * controlled from Firebase appSettings. It supports:
 * - Global cache enable/disable
 * - Individual cache type control
 * - Dynamic cache durations
 * - Force refresh capabilities
 * - Granular cache management
 */

/**
 * Enum defining all available cache types in the application
 */
export enum CacheType {
  BANNER_IMAGES = 'banners',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  COUPONS = 'coupons',
  ORDER_HISTORY = 'orderHistory',
  USER_PROFILES = 'userProfiles',
  IMAGES = 'images'
}

/**
 * Cache durations configuration - duration in hours for each cache type
 */
export interface CacheDurations {
  banners?: number;
  categories?: number;
  coupons?: number;
  images?: number;
  orderHistory?: number;
  products?: number;
  userProfiles?: number;
}

/**
 * Enable cache configuration - boolean flags for each cache type
 */
export interface EnableCache {
  banners?: boolean;
  categories?: boolean;
  clearAll?: boolean;  // Global flag to clear all cache
  coupons?: boolean;
  images?: boolean;
  orderHistory?: boolean;
  products?: boolean;
  userProfiles?: boolean;
}

/**
 * Force refresh configuration - boolean flags for each cache type
 */
export interface ForceRefresh {
  banners?: boolean;
  categories?: boolean;
  clearAll?: boolean;  // Global flag to clear all cache
  coupons?: boolean;
  images?: boolean;
  orderHistory?: boolean;
  products?: boolean;
  userProfiles?: boolean;
}

/**
 * Complete cache management configuration structure matching Firebase
 */
export interface CacheManagementConfig {
  cacheDurations?: CacheDurations;
  enableCache?: EnableCache;
  forceRefresh?: ForceRefresh;
  lastCacheRefreshTimestamp?: any;  // Firestore Timestamp
}

/**
 * Complete app settings cache configuration including legacy flags
 */
export interface AppSettingsCacheConfig {
  /** Legacy flag: Clear cache on new online order creation */
  isClearCacheMandatoryForOnlineOrder: boolean;
  
  /** Legacy flag: Clear cache on user login */
  isLoginClearCacheMandatoryForOnlineOrder: boolean;
  
  /** Last update timestamp for settings (Firestore Timestamp) */
  lastUpdated?: any;
  
  /** New comprehensive cache management structure */
  cacheManagement: CacheManagementConfig;
}

/**
 * Default cache durations (in hours, matching Firebase format)
 */
export const DEFAULT_CACHE_DURATIONS: CacheDurations = {
  banners: 1,      // 1 hour
  categories: 1,  // 1 hour
  products: 1,    // 1 hour
  coupons: 1,       // 1 hour
  orderHistory: 1, // 1 hour
  userProfiles: 1,  // 1 hour
  images: 4320       // 180 days
};

/**
 * Default cache configuration (fallback when Firebase config is unavailable)
 */
export const DEFAULT_CACHE_CONFIG: CacheManagementConfig = {
  cacheDurations: DEFAULT_CACHE_DURATIONS,
  enableCache: {
    banners: true,
    categories: true,
    products: true,
    coupons: true,
    orderHistory: true,
    userProfiles: true,
    images: true,
    clearAll: false
  },
  forceRefresh: {
    banners: false,
    categories: false,
    products: false,
    coupons: false,
    orderHistory: false,
    userProfiles: false,
    images: false,
    clearAll: false
  }
};
