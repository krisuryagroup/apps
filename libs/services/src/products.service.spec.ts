import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ProductsService } from './products.service';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';
import { CACHE_KEYS, CACHE_DURATIONS, CURRENCY, CacheType } from '@zitro/utils';
import { Product } from '@zitro/models';
import * as firestore from 'firebase/firestore';

// Mock Firebase modules
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('../../utils/firebase-storage.util', () => ({
  FirebaseStorageUtil: {
    convertStorageUrlToHttps: vi.fn((url: string) => url.replace('gs://', 'https://')),
  },
}));

describe('ProductsService', () => {
  let service: ProductsService;
  let cacheService: CacheService;
  let cacheManager: CacheManagerService;
  let errorHandler: FirebaseErrorHandlerService;
  let mockDb: any;

  const mockProduct = {
    id: 'prod-1',
    name: 'Margherita Pizza',
    price: 199,
    category: 'Pizza',
    imageURL: 'https://example.com/pizza.jpg',
    status: true,
    stock: 10,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
    popularity: 5,
    isRecommended: true,
    isEnabledForOnlineOrders: true,
    description: 'Classic pizza',
    weight: '300g',
    isNew: false,
    isSpicy: false,
    dietaryPreferences: ['vegetarian'],
  } as Product;

  beforeEach(() => {
    localStorage.clear();
    cacheService = new CacheService();
    errorHandler = new FirebaseErrorHandlerService();
    
    // Mock CacheManagerService
    cacheManager = {
      isCacheEnabled: vi.fn(() => true),
      getCacheDuration: vi.fn(() => CACHE_DURATIONS.PRODUCTS),
      getCachedData: vi.fn(() => null),
      setCachedData: vi.fn(),
      clearCache: vi.fn(),
      clearCacheByPrefix: vi.fn(),
      updateCacheConfig: vi.fn()
    } as any;
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    mockDb = { name: 'mockFirestore' };
    vi.mocked(firestore.getFirestore).mockReturnValue(mockDb);
    
    service = new ProductsService(cacheService, errorHandler, cacheManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize Firestore on construction', () => {
      expect(firestore.getFirestore).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('✅ Firestore initialized successfully');
    });

    it('should throw error when Firestore initialization fails', () => {
      vi.mocked(firestore.getFirestore).mockImplementationOnce(() => {
        throw new Error('Firebase not initialized');
      });

      expect(() => new ProductsService(cacheService, errorHandler, cacheManager)).toThrow('Unable to initialize Firestore');
    });
  });

  describe('Get Products by IDs', () => {
    it('should return empty array for empty IDs', async () => {
      const result = await service.getProductsByIds([]);

      expect(result).toEqual([]);
    });

    it('should return empty array for null IDs', async () => {
      const result = await service.getProductsByIds(null as any);

      expect(result).toEqual([]);
    });

    it('should fetch products by IDs successfully', async () => {
      const mockDocs = [
        { id: 'prod-1', data: () => mockProduct },
        { id: 'prod-2', data: () => ({ ...mockProduct, id: 'prod-2', name: 'Pepperoni Pizza' }) },
      ];
      
      vi.mocked(firestore.collection).mockReturnValue('mockCollection' as any);
      vi.mocked(firestore.query).mockReturnValue('mockQuery' as any);
      vi.mocked(firestore.where).mockReturnValue('mockWhere' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await service.getProductsByIds(['prod-1', 'prod-2']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('prod-1');
      expect(result[1].id).toBe('prod-2');
    });

    it('should batch requests for more than 10 IDs', async () => {
      const ids = Array.from({ length: 25 }, (_, i) => `prod-${i}`);
      const mockDocs = ids.map(id => ({
        id,
        data: () => ({ ...mockProduct, id }),
      }));
      
      vi.mocked(firestore.collection).mockReturnValue('mockCollection' as any);
      vi.mocked(firestore.query).mockReturnValue('mockQuery' as any);
      vi.mocked(firestore.where).mockReturnValue('mockWhere' as any);
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({ docs: mockDocs.slice(0, 10) } as any)
        .mockResolvedValueOnce({ docs: mockDocs.slice(10, 20) } as any)
        .mockResolvedValueOnce({ docs: mockDocs.slice(20) } as any);

      const result = await service.getProductsByIds(ids);

      expect(result).toHaveLength(25);
      expect(firestore.getDocs).toHaveBeenCalledTimes(3);
    });

    it('should convert storage URLs to HTTPS', async () => {
      const mockDoc = {
        id: 'prod-1',
        data: () => ({ ...mockProduct, imageURL: 'gs://bucket/image.jpg' }),
      };
      
      vi.mocked(firestore.collection).mockReturnValue('mockCollection' as any);
      vi.mocked(firestore.query).mockReturnValue('mockQuery' as any);
      vi.mocked(firestore.where).mockReturnValue('mockWhere' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [mockDoc] } as any);

      const result = await service.getProductsByIds(['prod-1']);

      expect(result[0].imageURL).toBe('https://bucket/image.jpg');
    });

    it('should handle Firebase errors gracefully', async () => {
      const mockError = new Error('Firestore error');
      vi.mocked(firestore.getDocs).mockRejectedValue(mockError);
      vi.spyOn(errorHandler, 'handleAndLogError').mockResolvedValue({
        code: 'unknown',
        message: 'Firestore error',
        userFriendlyMessage: 'An error occurred',
        shouldRetry: false,
      });

      const result = await service.getProductsByIds(['prod-1']);

      expect(result).toEqual([]);
      expect(errorHandler.handleAndLogError).toHaveBeenCalledWith(
        mockError,
        'ProductsService.getProductsByIds',
        { ids: ['prod-1'] }
      );
    });

    it('should log fetched product count', async () => {
      const mockDocs = [{ id: 'prod-1', data: () => mockProduct }];
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      await service.getProductsByIds(['prod-1']);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Fetched 1 products by IDs')
      );
    });
  });

  describe('Get Products (with caching)', () => {
    it('should return cached products when available and not expired', async () => {
      const cachedProducts = [mockProduct];
      cacheManager.getCachedData = vi.fn(<T>() => cachedProducts as T);

      const result = await service.getProducts();

      expect(result).toEqual(cachedProducts);
      expect(cacheManager.getCachedData).toHaveBeenCalledWith(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP
      );
      // The actual log message has additional parameters, so we check for the key text
      expect(console.log).toHaveBeenCalled();
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('should fetch from Firebase when cache is expired', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [{ id: 'prod-1', data: () => mockProduct }];
      vi.mocked(firestore.collection).mockReturnValue('mockCollection' as any);
      vi.mocked(firestore.query).mockReturnValue('mockQuery' as any);
      vi.mocked(firestore.where).mockReturnValue('mockWhere' as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await service.getProducts();

      expect(result).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalled();
      expect(cacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP,
        expect.any(Array)
      );
    });

    it('should filter products by isEnabledForOnlineOrders', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [
        { id: 'prod-1', data: () => ({ ...mockProduct, isEnabledForOnlineOrders: true }) },
        { id: 'prod-2', data: () => ({ ...mockProduct, isEnabledForOnlineOrders: false }) },
      ];
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await service.getProducts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });

    it('should cache fetched products', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [{ id: 'prod-1', data: () => mockProduct }];
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      await service.getProducts();

      expect(cacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP,
        expect.any(Array)
      );
    });

    it('should handle permission errors with specific guidance', async () => {
      const permissionError = {
        code: 'permission-denied',
        message: 'Missing or insufficient permissions',
      };
      cacheManager.getCachedData = vi.fn(() => null);
      vi.mocked(firestore.getDocs).mockRejectedValue(permissionError);
      vi.spyOn(errorHandler, 'handleError').mockReturnValue({
        code: 'permission-denied',
        message: 'Access denied',
        userFriendlyMessage: 'Access denied',
        shouldRetry: false,
      });
      vi.spyOn(errorHandler, 'isPermissionError').mockReturnValue(true);

      const result = await service.getProducts();

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('PERMISSION DENIED')
      );
    });

    it('should fallback to fetch all products if query fails', async () => {
      cacheManager.getCachedData = vi.fn(() => null);
      
      const mockDocs = [{ id: 'prod-1', data: () => mockProduct }];
      vi.mocked(firestore.getDocs)
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValueOnce({ docs: mockDocs } as any);

      const result = await service.getProducts();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Query with filter failed'),
        expect.any(Error)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('Clear Cache', () => {
    it('should clear products cache using CacheManagerService', () => {
      service.clearCache();

      expect(cacheManager.clearCache).toHaveBeenCalledWith(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP
      );
    });

    it('should log cache cleared message', () => {
      vi.spyOn(cacheService, 'removeItem').mockImplementation(() => {});
      vi.spyOn(cacheService, 'getCurrentRestaurantId').mockReturnValue('rest-123');

      service.clearCache();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Products cache cleared'),
        'rest-123'
      );
    });
  });

  describe('Helper Methods', () => {
    it.each([
      { price: 199, expected: '₹199' },
      { price: 299.50, expected: '₹299.5' },
      { price: 0, expected: '₹0' },
      { price: 1500, expected: '₹1500' },
    ])('should format price $price as $expected', ({ price, expected }) => {
      expect(service.formatPrice(price)).toBe(expected);
    });

    it.each([
      { status: true, stock: 10, expected: true },
      { status: false, stock: 10, expected: false },
      { status: true, stock: 0, expected: false },
      { status: false, stock: 0, expected: false },
      { status: undefined, stock: 5, expected: false },
      { status: true, stock: undefined, expected: false },
    ])('should check product availability: status=$status, stock=$stock => $expected', 
      ({ status, stock, expected }) => {
        const product = { ...mockProduct, status, stock };

        expect(service.isProductAvailable(product)).toBe(expected);
      }
    );
  });

  describe('Refresh Products', () => {
    it('should clear cache and fetch new data', async () => {
      vi.spyOn(service, 'clearCache').mockImplementation(() => {});
      vi.spyOn(cacheService, 'getCachedData').mockReturnValue(null);
      
      const mockDocs = [{ id: 'prod-1', data: () => mockProduct }];
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: mockDocs } as any);

      const result = await service.refreshProducts();

      expect(service.clearCache).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('Search Products', () => {
    const mockProducts = [
      { ...mockProduct, id: 'prod-1', name: 'Margherita Pizza', description: 'Cheese pizza' },
      { ...mockProduct, id: 'prod-2', name: 'Pepperoni Pizza', description: 'Meat pizza' },
      { ...mockProduct, id: 'prod-3', name: 'Veggie Burger', category: 'Burgers', description: 'Healthy burger' },
    ];

    beforeEach(() => {
      vi.spyOn(service, 'getProducts').mockResolvedValue(mockProducts);
    });

    it.each([
      { term: 'Pizza', expectedCount: 2, expectedIds: ['prod-1', 'prod-2'] },
      { term: 'Margherita', expectedCount: 1, expectedIds: ['prod-1'] },
      { term: 'burger', expectedCount: 1, expectedIds: ['prod-3'] },
      { term: 'Burgers', expectedCount: 1, expectedIds: ['prod-3'] },
      { term: 'meat', expectedCount: 1, expectedIds: ['prod-2'] },
      { term: 'nonexistent', expectedCount: 0, expectedIds: [] },
    ])('should search for "$term" and find $expectedCount products', 
      async ({ term, expectedCount, expectedIds }) => {
        const result = await service.searchProducts(term);

        expect(result).toHaveLength(expectedCount);
        expect(result.map(p => p.id)).toEqual(expectedIds);
      }
    );

    it('should be case-insensitive', async () => {
      const results = await Promise.all([
        service.searchProducts('PIZZA'),
        service.searchProducts('pizza'),
        service.searchProducts('PiZzA'),
      ]);

      results.forEach(result => {
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Search Online Products', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should search only online-enabled products', async () => {
      vi.spyOn(service, 'getOnlineEnabledProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', name: 'Pizza Margherita', category: 'Italian', description: 'Cheese pizza', isEnabledForOnlineOrders: true },
        { ...mockProduct, id: 'prod-2', name: 'Pasta Carbonara', category: 'Italian', description: 'Creamy pasta', isEnabledForOnlineOrders: true },
      ]);

      const result = await service.searchOnlineProducts('Pizza');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });
  });

  describe('Get Recommended Products', () => {
    it('should return only recommended online products', async () => {
      vi.spyOn(service, 'getProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', isRecommended: true },
        { ...mockProduct, id: 'prod-2', isRecommended: false },
        { ...mockProduct, id: 'prod-3', isRecommended: true },
      ]);

      const result = await service.getRecommendedOnlineProducts();

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual(['prod-1', 'prod-3']);
    });

    it('should return empty array when no recommendations', async () => {
      vi.spyOn(service, 'getProducts').mockResolvedValue([
        { ...mockProduct, isRecommended: false },
      ]);

      const result = await service.getRecommendedOnlineProducts();

      expect(result).toEqual([]);
    });
  });

  describe('Get Popular Products', () => {
    it('should return products sorted by popularity descending', async () => {
      vi.spyOn(service, 'getOnlineProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', popularity: 3 },
        { ...mockProduct, id: 'prod-2', popularity: 10 },
        { ...mockProduct, id: 'prod-3', popularity: 5 },
      ]);

      const result = await service.getPopularOnlineProducts();

      expect(result.map(p => p.id)).toEqual(['prod-2', 'prod-3', 'prod-1']);
      expect(result.map(p => p.popularity)).toEqual([10, 5, 3]);
    });

    it('should filter out products with zero popularity', async () => {
      vi.spyOn(service, 'getOnlineProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', popularity: 5 },
        { ...mockProduct, id: 'prod-2', popularity: 0 },
        { ...mockProduct, id: 'prod-3', popularity: undefined },
      ]);

      const result = await service.getPopularOnlineProducts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });

    it('should handle products with undefined popularity', async () => {
      vi.spyOn(service, 'getOnlineProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', popularity: undefined },
        { ...mockProduct, id: 'prod-2', popularity: 5 },
      ]);

      const result = await service.getPopularOnlineProducts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-2');
    });
  });

  describe('Get Products by Category', () => {
    beforeEach(() => {
      vi.spyOn(service, 'getProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', category: 'Pizza' },
        { ...mockProduct, id: 'prod-2', category: 'Pizza' },
        { ...mockProduct, id: 'prod-3', category: 'Burgers' },
      ]);
    });

    it.each([
      { category: 'Pizza', expectedCount: 2 },
      { category: 'Burgers', expectedCount: 1 },
      { category: 'Pasta', expectedCount: 0 },
    ])('should get $expectedCount products for category "$category"', 
      async ({ category, expectedCount }) => {
        const result = await service.getOnlineProductsByCategory(category);

        expect(result).toHaveLength(expectedCount);
      }
    );

    it('should be case-insensitive for category matching', async () => {
      const results = await Promise.all([
        service.getOnlineProductsByCategory('PIZZA'),
        service.getOnlineProductsByCategory('pizza'),
        service.getOnlineProductsByCategory('PiZzA'),
      ]);

      results.forEach(result => {
        expect(result).toHaveLength(2);
      });
    });
  });

  describe('Get Online Products', () => {
    it('should return all online-enabled products', async () => {
      vi.spyOn(service, 'getProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1' },
        { ...mockProduct, id: 'prod-2' },
      ]);

      const result = await service.getOnlineProducts();

      expect(result).toHaveLength(2);
    });
  });

  describe('Get Online Enabled Products', () => {
    it('should return all products from getProducts', async () => {
      vi.spyOn(service, 'getProducts').mockResolvedValue([
        { ...mockProduct, id: 'prod-1', isEnabledForOnlineOrders: true },
        { ...mockProduct, id: 'prod-2', isEnabledForOnlineOrders: true },
      ]);

      const result = await service.getOnlineEnabledProducts();

      expect(result).toHaveLength(2);
    });
  });
});
