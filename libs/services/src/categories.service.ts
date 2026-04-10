import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { FirebaseStorageUtil } from '@zitro/utils';
import { 
  FIREBASE_COLLECTIONS, 
  CACHE_KEYS, 
  CACHE_DURATIONS,
  FIREBASE_STORAGE,
  CacheType 
} from '@zitro/utils';

export interface Category {
  id: string;
  name: string;
  imageURL: string;
  status: boolean;
  isEnabledForOnlineOrders: boolean;
  created_at: string;
  updated_at: string;
  priority?: number; // Highest values will be at the top
}

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {

  constructor(
    private firestore: Firestore,
    private cacheService: CacheService,
    private cacheManager: CacheManagerService
  ) {}

  async getCategories(): Promise<Category[]> {
    // Check cache first
    // const cachedData = this.getCachedCategories();
    // if (cachedData && cachedData.length > 0) {
    //   return cachedData.filter(cat => cat.status === true && cat.isEnabledForOnlineOrders === true);
    // }

    try {
      // Fetch from Firebase
      const categoriesRef = collection(this.firestore, FIREBASE_COLLECTIONS.CATEGORIES);
      const snapshot = await getDocs(categoriesRef);
      
      const categories: Category[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        let imageURL = data['imageURL'] || '';
        
        // Convert Firebase Storage gs:// URLs to downloadable HTTPS URLs
        if (imageURL.startsWith('gs://')) {
          imageURL = FirebaseStorageUtil.convertStorageUrlToHttps(imageURL);
        }

        // Convert status from string to boolean
        // Firebase stores it as string, but we need boolean for the interface
        const statusValue = data['status'];
        let status = false;
        if (typeof statusValue === 'string') {
          status = statusValue.toLowerCase() === 'true';
        } else if (typeof statusValue === 'boolean') {
          status = statusValue;
        }

        // Convert isEnabledForOnlineOrders from string to boolean
        const isEnabledValue = data['isEnabledForOnlineOrders'];
        let isEnabledForOnlineOrders = false;
        if (typeof isEnabledValue === 'string') {
          isEnabledForOnlineOrders = isEnabledValue.toLowerCase() === 'true';
        } else if (typeof isEnabledValue === 'boolean') {
          isEnabledForOnlineOrders = isEnabledValue;
        }
        
        categories.push({
          id: doc.id,
          name: data['name'] || '',
          imageURL: imageURL,
          status: status,
          isEnabledForOnlineOrders: isEnabledForOnlineOrders,
          created_at: data['created_at'] || '',
          updated_at: data['updated_at'] || '',
          priority: typeof data['priority'] === 'number' ? data['priority'] : Number(data['priority']) || 0
        });
      });

      // Filter for active and enabled categories before sorting and caching
      const filteredCategories = categories.filter(cat => cat.status === true && cat.isEnabledForOnlineOrders === true);
      // Sort by priority descending (highest first) before caching
      const sortedCategories = filteredCategories.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      // Cache the sorted data
      this.setCachedCategories(sortedCategories);
      // Return the sorted, filtered categories
      return sortedCategories;
    } catch (error) {
      console.error('Error fetching categories from Firebase:', error);
      return [];
    }
  }

  private getCachedCategories(): Category[] | null {
    try {
      // Use CacheManagerService to get cached categories
      const cached = this.cacheManager.getCachedData<Category[]>(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp'
      );
      
      if (!cached) return null;

      // Convert any gs:// URLs in cached data to HTTPS URLs
      const categories = cached.map((cat: Category) => ({
        ...cat,
        imageURL: cat.imageURL.startsWith('gs://') ? FirebaseStorageUtil.convertStorageUrlToHttps(cat.imageURL) : cat.imageURL
      }));

      console.log('🚀 CategoriesService: Using cached categories for restaurant:', this.cacheService.getCurrentRestaurantId());
      return categories;
    } catch (error) {
      console.error('Error reading cached categories:', error);
      return null;
    }
  }

  private setCachedCategories(categories: Category[]): void {
    try {
      // Only cache if we have records
      if (!categories || categories.length === 0) {
        console.log('⚠️ CategoriesService: No categories to cache, skipping cache save');
        return;
      }
      
      // Get dynamic cache duration from CacheManagerService
      const duration = this.cacheManager.getCacheDuration(CacheType.CATEGORIES);
      
      // Cache both categories and timestamp using CacheManagerService
      this.cacheManager.setCachedData(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp',
        categories
      );
      
      console.log('💾 CategoriesService: Categories cached for restaurant:', this.cacheService.getCurrentRestaurantId(), 'Count:', categories.length, `(Duration: ${duration / (1000 * 60 * 60 * 24)} days)`);
    } catch (error) {
      console.error('Error caching categories:', error);
    }
  }

  /**
   * Clear cached categories data
   */
  clearCache(): void {
    this.cacheManager.clearCache(
      CacheType.CATEGORIES,
      CACHE_KEYS.CATEGORIES_CACHE,
      'categories_timestamp'
    );
  }

  /**
   * Force refresh categories from Firebase
   */
  async refreshCategories(): Promise<Category[]> {
    this.clearCache();
    return this.getCategories();
  }

  private convertStorageUrlToHttps(gsUrl: string): string {
    try {
      // Convert gs://bucket-name/path/to/file.jpg 
      // to https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile.jpg?alt=media
      
      if (!gsUrl.startsWith('gs://')) {
        return gsUrl; // Return as-is if not a gs:// URL
      }

      // Extract bucket and path from gs://bucket-name/path/to/file
      const withoutGs = gsUrl.substring(5); // Remove 'gs://'
      const firstSlashIndex = withoutGs.indexOf('/');
      
      if (firstSlashIndex === -1) {
        console.error('Invalid Firebase Storage URL:', gsUrl);
        return gsUrl;
      }

      const bucket = withoutGs.substring(0, firstSlashIndex);
      const filePath = withoutGs.substring(firstSlashIndex + 1);
      
      // Encode the file path for URL
      const encodedPath = encodeURIComponent(filePath);
      
      // Construct the downloadable HTTPS URL
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
    } catch (error) {
      console.error('Error converting Firebase Storage URL:', error, gsUrl);
      return gsUrl; // Return original URL if conversion fails
    }
  }
}
