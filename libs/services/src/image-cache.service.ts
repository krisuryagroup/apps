import { Injectable } from '@angular/core';
import { CacheType } from '@zitro/utils';
import { CacheManagerService } from './cache-manager.service';

interface CachedImage {
  url: string;
  blob: Blob;
  timestamp: number;
  originalUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private readonly DB_NAME = 'food-delivery-images-cache';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'images';
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private cacheManager: CacheManagerService) {
    this.initPromise = this.initDB();
  }

  private async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ Image cache IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (db.objectStoreNames.contains(this.STORE_NAME)) {
          db.deleteObjectStore(this.STORE_NAME);
        }
        
        const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'url' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('originalUrl', 'originalUrl', { unique: false });
        
        console.log('📦 Image cache object store created');
      };
    });
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initPromise;
    }
  }

  async getCachedImage(url: string): Promise<string | null> {
    try {
      // Check if banner images cache is enabled
      if (!this.cacheManager.isCacheEnabled(CacheType.IMAGES)) {
        console.log('📵 Banner images cache is disabled');
        return null;
      }

      await this.ensureDB();
      if (!this.db) return null;

      // Get dynamic cache duration from CacheManagerService
      const cacheDuration = this.cacheManager.getCacheDuration(CacheType.IMAGES);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.get(url);

        request.onsuccess = () => {
          const result: CachedImage = request.result;
          
          if (!result) {
            resolve(null);
            return;
          }

          const now = Date.now();
          if (now - result.timestamp > cacheDuration) {
            console.log('🗑️ Cache expired for:', url);
            this.deleteCachedImage(url);
            resolve(null);
            return;
          }

          const blobUrl = URL.createObjectURL(result.blob);
          resolve(blobUrl);
        };

        request.onerror = () => {
          console.warn('Failed to get cached image:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async downloadAndCacheImage(url: string): Promise<string> {
    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          mode: 'cors',
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        await this.cacheImage(url, blob);

        const blobUrl = URL.createObjectURL(blob);
        console.log('✅ Image downloaded and cached:', url);
        return blobUrl;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Image download attempt ${attempt}/${maxRetries} failed for:`, url, error);
        if (attempt < maxRetries) {
          await this.sleep(500);
        }
      }
    }

    console.error('Failed to download image after 3 attempts:', url);
    throw lastError;
  }

  private async cacheImage(url: string, blob: Blob): Promise<void> {
    try {
      await this.ensureDB();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        
        const data: CachedImage = {
          url: url,
          blob: blob,
          timestamp: Date.now(),
          originalUrl: url
        };

        const request = objectStore.put(data);
        
        request.onsuccess = () => {
          console.log('💾 Image cached successfully');
          resolve();
        };
        
        request.onerror = () => {
          console.warn('Failed to cache image:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error caching image:', error);
    }
  }

  async getImage(url: string): Promise<string> {
    if (!url) {
      throw new Error('Image URL is required');
    }

    const cachedUrl = await this.getCachedImage(url);
    if (cachedUrl) {
      return cachedUrl;
    }

    return await this.downloadAndCacheImage(url);
  }

  async deleteCachedImage(url: string): Promise<void> {
    try {
      await this.ensureDB();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.delete(url);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error deleting cached image:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      await this.ensureDB();
      if (!this.db) return;

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.clear();
        
        request.onsuccess = () => {
          console.log('🗑️ All image cache cleared');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async cleanupExpiredCache(): Promise<number> {
    try {
      await this.ensureDB();
      if (!this.db) return 0;

      // Get dynamic cache duration from CacheManagerService
      const cacheDuration = this.cacheManager.getCacheDuration(CacheType.IMAGES);

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.openCursor();
        
        const now = Date.now();
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const value: CachedImage = cursor.value;
            if (now - value.timestamp > cacheDuration) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            if (deletedCount > 0) {
              console.log(`🗑️ Cleaned up ${deletedCount} expired images`);
            }
            resolve(deletedCount);
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      return 0;
    }
  }

  async getCacheStats(): Promise<{ count: number; totalSizeKB: number; oldestDate: Date | null }> {
    try {
      await this.ensureDB();
      if (!this.db) return { count: 0, totalSizeKB: 0, oldestDate: null };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(this.STORE_NAME);
        const request = objectStore.getAll();

        request.onsuccess = () => {
          const results: CachedImage[] = request.result;
          const count = results.length;
          const totalSizeKB = Math.round(
            results.reduce((total, item) => total + (item.blob?.size || 0), 0) / 1024
          );
          
          const oldestTimestamp = results.length > 0 
            ? Math.min(...results.map(r => r.timestamp))
            : null;
          
          const oldestDate = oldestTimestamp ? new Date(oldestTimestamp) : null;

          resolve({ count, totalSizeKB, oldestDate });
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { count: 0, totalSizeKB: 0, oldestDate: null };
    }
  }

  async preloadImages(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) return;
    
    console.log(`🔄 Preloading ${urls.length} images...`);
    
    const promises = urls.map(url => 
      this.getImage(url).catch(err => {
        console.warn('Failed to preload image:', url, err);
        return null;
      })
    );

    await Promise.all(promises);
    console.log('✅ Image preloading complete');
  }
}