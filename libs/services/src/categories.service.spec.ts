import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CategoriesService, Category } from './categories.service';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { CACHE_KEYS, CacheType } from '@zitro/utils';
import * as angularFire from '@angular/fire/firestore';

// Mock Firebase
vi.mock('@angular/fire/firestore', () => ({
  Firestore: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('../../utils/firebase-storage.util', () => ({
  FirebaseStorageUtil: {
    convertStorageUrlToHttps: vi.fn((url: string) => 
      url.startsWith('gs://') 
        ? url.replace('gs://', 'https://firebasestorage.googleapis.com/')
        : url
    ),
  },
}));

describe('CategoriesService', () => {
  let service: CategoriesService;
  let cacheService: CacheService;
  let cacheManager: CacheManagerService;
  let mockFirestore: any;

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Pizza',
    imageURL: 'https://example.com/pizza.jpg',
    status: true,
    isEnabledForOnlineOrders: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
  };

  beforeEach(() => {
    localStorage.clear();
    cacheService = new CacheService();
    mockFirestore = { name: 'mockFirestore' };
    
    // Mock CacheManagerService
    cacheManager = {
      isCacheEnabled: vi.fn(() => true),
      getCacheDuration: vi.fn(() => 7776000000), // 90 days
      getCachedData: vi.fn(() => null),
      setCachedData: vi.fn(),
      clearCache: vi.fn(),
      clearCacheByPrefix: vi.fn(),
      updateCacheConfig: vi.fn()
    } as any;
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    service = new CategoriesService(mockFirestore, cacheService, cacheManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Get Categories', () => {
    it('should return cached categories when available', async () => {
      const cachedCategories = [mockCategory];
      cacheManager.getCachedData = vi.fn(<T>() => cachedCategories as T);

      const result = await service.getCategories();

      expect(result).toEqual(cachedCategories);
      expect(cacheManager.getCachedData).toHaveBeenCalledWith(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp'
      );
      expect(angularFire.getDocs).not.toHaveBeenCalled();
    });

    it('should filter out inactive categories from cache', async () => {
      cacheManager.getCachedData = vi.fn(<T>() => [
        { ...mockCategory, id: 'cat-1', status: true },
        { ...mockCategory, id: 'cat-2', status: false },
        { ...mockCategory, id: 'cat-3', status: true },
      ] as T);

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toEqual(['cat-1', 'cat-3']);
    });

    it('should filter out categories not enabled for online orders', async () => {
      cacheManager.getCachedData = vi.fn(<T>() => [
        { ...mockCategory, id: 'cat-1', isEnabledForOnlineOrders: true },
        { ...mockCategory, id: 'cat-2', isEnabledForOnlineOrders: false },
      ]);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
    });

    it('should fetch from Firebase when cache is empty', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
      ];
      vi.mocked(angularFire.collection).mockReturnValue('mockCollection' as any);
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(angularFire.getDocs).toHaveBeenCalled();
    });

    it.each([
      { statusValue: 'true', expected: true },
      { statusValue: 'false', expected: false },
      { statusValue: true, expected: true },
      { statusValue: false, expected: false },
    ])('should convert status $statusValue to boolean $expected', async ({ statusValue, expected }) => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [
        { id: 'cat-1', data: () => ({ ...mockCategory, status: statusValue, isEnabledForOnlineOrders: true }) },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      expect(cacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp',
        expect.arrayContaining([
          expect.objectContaining({ status: expected })
        ])
      );
    });

    it.each([
      { value: 'true', expected: true },
      { value: 'false', expected: false },
      { value: true, expected: true },
      { value: false, expected: false },
    ])('should convert isEnabledForOnlineOrders $value to boolean $expected', 
      async ({ value, expected }) => {
        cacheManager.getCachedData = vi.fn(() => null);
        
        const mockDocs = [
          { id: 'cat-1', data: () => ({ ...mockCategory, isEnabledForOnlineOrders: value, status: true }) },
        ];
        vi.mocked(angularFire.getDocs).mockResolvedValue({ 
          forEach: (callback: any) => mockDocs.forEach(callback)
        } as any);

        await service.getCategories();

        expect(cacheManager.setCachedData).toHaveBeenCalledWith(
          CacheType.CATEGORIES,
          CACHE_KEYS.CATEGORIES_CACHE,
          'categories_timestamp',
          expect.arrayContaining([
            expect.objectContaining({ isEnabledForOnlineOrders: expected })
          ])
        );
      }
    );

    it('should convert gs:// URLs to HTTPS', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      cacheManager.setCachedData = vi.fn();
      
      const mockDocs = [
        { id: 'cat-1', data: () => ({ ...mockCategory, imageURL: 'gs://bucket/image.jpg' }) },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      expect(cacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp',
        expect.arrayContaining([
          expect.objectContaining({ 
            imageURL: expect.stringMatching(/^https:\/\//) 
          })
        ])
      );
    });

    it('should cache fetched categories', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      cacheManager.setCachedData = vi.fn();
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      expect(cacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp',
        expect.any(Array)
      );
    });

    it('should return empty array on Firebase error', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      vi.mocked(angularFire.getDocs).mockRejectedValue(new Error('Firebase error'));

      const result = await service.getCategories();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should log cached categories message', async () => {
      cacheManager.getCachedData = vi.fn(<T>() => [mockCategory] as T);
      vi.spyOn(cacheService, 'getCurrentRestaurantId').mockReturnValue('rest-123');

      await service.getCategories();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Using cached categories'),
        'rest-123'
      );
    });

    it('should log cached categories count', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      vi.spyOn(cacheService, 'getCurrentRestaurantId').mockReturnValue('rest-123');
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
        { id: 'cat-2', data: () => mockCategory },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Categories cached'),
        'rest-123',
        expect.stringContaining('Count'),
        2,
        expect.any(String)
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear categories cache using CacheManagerService', () => {
      service.clearCache();

      expect(cacheManager.clearCache).toHaveBeenCalledWith(
        CacheType.CATEGORIES,
        CACHE_KEYS.CATEGORIES_CACHE,
        'categories_timestamp'
      );
    });

    it('should handle cache read errors gracefully', async () => {
      cacheManager.getCachedData = vi.fn(() => {
        throw new Error('Cache error');
      });
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      const result = await service.getCategories();

      expect(console.error).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should convert gs:// URLs in cached data to HTTPS', async () => {
      cacheManager.getCachedData = vi.fn(<T>() => [
        { ...mockCategory, imageURL: 'gs://bucket/image.jpg' },
      ] as T);

      const result = await service.getCategories();

      expect(result[0].imageURL).toMatch(/^https:\/\//);
    });

    it('should remove expired cache', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      // When cache is expired, getCachedData returns null and we fetch from Firebase
      expect(angularFire.getDocs).toHaveBeenCalled();
    });
  });

  describe('Refresh Categories', () => {
    it('should clear cache and fetch new data', async () => {
      vi.spyOn(service, 'clearCache').mockImplementation(() => {});
      cacheManager.getCachedData = vi.fn(() => null);
      cacheManager.setCachedData = vi.fn();
      
      const mockDocs = [
        { id: 'cat-1', data: () => mockCategory },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      const result = await service.refreshCategories();

      expect(service.clearCache).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('Storage URL Conversion', () => {
    it.each([
      { input: 'https://example.com/image.jpg', expected: 'https://example.com/image.jpg' },
      { input: 'http://example.com/image.jpg', expected: 'http://example.com/image.jpg' },
      { input: 'gs://bucket/path/image.jpg', expected: 'https://firebasestorage.googleapis.com/bucket/path/image.jpg' },
    ])('should handle URL: $input', async ({ input, expected }) => {
      cacheManager.getCachedData = vi.fn(() => null);
      cacheManager.setCachedData = vi.fn();
      
      const mockDocs = [
        { id: 'cat-1', data: () => ({ ...mockCategory, imageURL: input, status: true, isEnabledForOnlineOrders: true }) },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      await service.getCategories();

      expect(cacheManager.setCachedData).toHaveBeenCalled();
    });
  });

  describe('Data Validation', () => {
    it('should handle missing fields gracefully', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      cacheManager.setCachedData = vi.fn();
      
      const mockDocs = [
        { id: 'cat-1', data: () => ({ status: true, isEnabledForOnlineOrders: true }) },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'cat-1',
        name: '',
        imageURL: '',
        status: true,
        isEnabledForOnlineOrders: true,
        created_at: '',
        updated_at: '',
      });
    });

    it('should only return categories matching both status and online filters', async () => {
      vi.spyOn(cacheService, 'getCachedData').mockReturnValue(null);
      vi.spyOn(cacheService, 'setCachedData').mockImplementation(() => {});
      vi.spyOn(cacheService, 'setCacheTimestamp').mockImplementation(() => {});
      
      const mockDocs = [
        { id: 'cat-1', data: () => ({ ...mockCategory, status: true, isEnabledForOnlineOrders: true }) },
        { id: 'cat-2', data: () => ({ ...mockCategory, status: false, isEnabledForOnlineOrders: true }) },
        { id: 'cat-3', data: () => ({ ...mockCategory, status: true, isEnabledForOnlineOrders: false }) },
        { id: 'cat-4', data: () => ({ ...mockCategory, status: false, isEnabledForOnlineOrders: false }) },
      ];
      vi.mocked(angularFire.getDocs).mockResolvedValue({ 
        forEach: (callback: any) => mockDocs.forEach(callback)
      } as any);

      const result = await service.getCategories();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-1');
    });
  });
});
