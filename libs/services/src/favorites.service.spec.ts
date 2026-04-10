import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FavoritesService } from './favorites.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { DialogService } from './dialog.service';
import { CacheService } from './cache.service';
import * as firestore from '@angular/fire/firestore';
import * as firebaseAuth from 'firebase/auth';

vi.mock('@angular/fire/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ name: 'mockAuth' })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    // Return unsubscribe function
    return vi.fn();
  })
}));

describe('FavoritesService', () => {
  let service: FavoritesService;
  let mockFirestore: any;
  let mockAuthService: FirebaseAuthService;
  let mockDialogService: DialogService;
  let mockCacheService: CacheService;

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    price: 199,
    category: 'Test',
    imageURL: 'test.jpg',
    status: true,
    stock: 10,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
    popularity: 5,
    isRecommended: true,
    isEnabledForOnlineOrders: true
  };

  beforeEach(() => {
    localStorage.clear();
    
    mockFirestore = { name: 'mockFirestore' };
    
    mockAuthService = {
      isGuestMode: vi.fn().mockReturnValue(false)
    } as any;

    mockDialogService = {
      showConfirmation: vi.fn().mockResolvedValue(false),
      showInfo: vi.fn().mockResolvedValue(undefined)
    } as any;

    mockCacheService = {
      getCachedData: vi.fn().mockReturnValue(null),
      setCachedData: vi.fn(),
      removeItem: vi.fn(),
      isCacheExpired: vi.fn().mockReturnValue(false),
      setCacheTimestamp: vi.fn(),
      getCurrentRestaurantId: vi.fn().mockReturnValue('default')
    } as any;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new FavoritesService(
      mockFirestore,
      mockAuthService,
      mockDialogService,
      mockCacheService
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should load guest favorites when in guest mode', () => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(true);
      
      new FavoritesService(mockFirestore, mockAuthService, mockDialogService, mockCacheService);

      expect(mockCacheService.getCachedData).toHaveBeenCalled();
    });
  });

  describe('getFavorites - Authenticated user', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should return cached favorites when available', async () => {
      const mockFavorites = [
        { id: 'fav-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);

      const result = await service.getFavorites();

      expect(result).toEqual(mockFavorites);
      expect(firestore.getDocs).not.toHaveBeenCalled();
    });

    it('should fetch from Firebase when cache is empty', async () => {
      mockCacheService.getCachedData = vi.fn().mockReturnValue(null);
      
      const mockSnapshot = {
        forEach: (callback: any) => {
          callback({
            id: 'prod-1',
            data: () => ({
              productId: 'prod-1',
              productData: mockProduct,
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01'
            })
          });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getFavorites();

      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe('prod-1');
      expect(mockCacheService.setCachedData).toHaveBeenCalled();
    });

    it('should return empty array when user phone is not set', async () => {
      localStorage.clear();
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(false);

      const result = await service.getFavorites();

      expect(result).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getFavorites - Guest user', () => {
    beforeEach(() => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(true);
      service = new FavoritesService(mockFirestore, mockAuthService, mockDialogService, mockCacheService);
    });

    it('should return guest favorites from cache', async () => {
      const mockGuestFavorites = [
        { id: 'fav-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockGuestFavorites);

      const result = await service.getFavorites();

      expect(result).toEqual(mockGuestFavorites);
    });
  });

  describe('addToFavorites', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should add product to Firebase favorites', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      mockCacheService.getCachedData = vi.fn().mockReturnValue([]);

      const result = await service.addToFavorites(mockProduct);

      expect(result).toBe(true);
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should handle Firebase errors gracefully', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockRejectedValue(new Error('Firebase error'));

      const result = await service.addToFavorites(mockProduct);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should add to guest favorites when in guest mode', async () => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(true);
      service = new FavoritesService(mockFirestore, mockAuthService, mockDialogService, mockCacheService);
      mockCacheService.getCachedData = vi.fn().mockReturnValue([]);

      const result = await service.addToFavorites(mockProduct);

      expect(result).toBe(true);
      expect(mockCacheService.setCachedData).toHaveBeenCalled();
    });
  });

  describe('removeFromFavorites', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should remove product from Firebase favorites', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);
      mockCacheService.getCachedData = vi.fn().mockReturnValue([]);

      const result = await service.removeFromFavorites('prod-1');

      expect(result).toBe(true);
      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('should handle Firebase deletion errors', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.deleteDoc).mockRejectedValue(new Error('Delete error'));

      const result = await service.removeFromFavorites('prod-1');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('toggleFavorite', () => {
    beforeEach(() => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      localStorage.setItem('token', 'test-token');
    });

    it('should add favorite when not already favorite', async () => {
      mockCacheService.getCachedData = vi.fn().mockReturnValue([]);
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);
      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue({ forEach: vi.fn() } as any);

      const result = await service.toggleFavorite(mockProduct);

      expect(result).toBe(true);
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should remove favorite when already favorite', async () => {
      const mockFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined);

      const result = await service.toggleFavorite(mockProduct);

      expect(result).toBe(true);
      expect(firestore.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('isFavorite', () => {
    it('should return true when product is in favorites', async () => {
      const mockFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service

      const result = await service.isFavorite('prod-1');

      expect(result).toBe(true);
    });

    it('should return false when product is not in favorites', async () => {
      mockCacheService.getCachedData = vi.fn().mockReturnValue([]);
      localStorage.setItem('currentUserPhone', '+911234567890');

      const result = await service.isFavorite('prod-999');

      expect(result).toBe(false);
    });
  });

  describe('isFavoriteSync', () => {
    it('should synchronously check if product is favorite', () => {
      const service = new FavoritesService(mockFirestore, mockAuthService, mockDialogService, mockCacheService);
      (service as any).cachedFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];

      expect(service.isFavoriteSync('prod-1')).toBe(true);
      expect(service.isFavoriteSync('prod-999')).toBe(false);
    });
  });

  describe('getFavoriteProducts', () => {
    it('should return array of product data', async () => {
      const mockFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service

      const result = await service.getFavoriteProducts();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProduct);
    });
  });

  describe('getFavoriteProductsFromList', () => {
    it('should filter products to return only favorites', async () => {
      const mockFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      const products = [
        mockProduct,
        { ...mockProduct, id: 'prod-2', name: 'Not Favorite' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service

      const result = await service.getFavoriteProductsFromList(products);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', () => {
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service
      (service as any).cachedFavorites = [{ id: 'test' }];

      service.clearCache();

      expect(mockCacheService.removeItem).toHaveBeenCalled();
      expect((service as any).cachedFavorites).toEqual([]);
      expect(localStorage.getItem('currentUserPhone')).toBeNull();
    });
  });

  describe('getFavoritesCount', () => {
    it('should return count of favorites', async () => {
      const mockFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        { id: 'prod-2', productId: 'prod-2', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockFavorites);
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service

      const count = await service.getFavoritesCount();

      expect(count).toBe(2);
    });
  });

  describe('getFavoritesCountSync', () => {
    it('should return sync count from cache', () => {
      (service as any).cachedFavorites = [
        { id: 'prod-1' },
        { id: 'prod-2' }
      ];

      const count = service.getFavoritesCountSync();

      expect(count).toBe(2);
    });
  });

  describe('Guest favorites migration', () => {
    it('should offer migration when user logs in with guest favorites', async () => {
      mockAuthService.isGuestMode = vi.fn().mockReturnValue(false);
      localStorage.setItem('currentUserPhone', '+911234567890');
      service.setCurrentUser('+911234567890'); // Set user on service
      
      const mockGuestFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockGuestFavorites);
      mockDialogService.showConfirmation = vi.fn().mockResolvedValue(true);
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined);

      await service.checkAndOfferFavoritesMigration();

      expect(mockDialogService.showConfirmation).toHaveBeenCalled();
      expect(mockDialogService.showInfo).toHaveBeenCalled();
    });

    it('should clear guest favorites when user declines migration', async () => {
      const mockGuestFavorites = [
        { id: 'prod-1', productId: 'prod-1', productData: mockProduct, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ];
      
      mockCacheService.getCachedData = vi.fn().mockReturnValue(mockGuestFavorites);
      mockDialogService.showConfirmation = vi.fn().mockResolvedValue(false);

      await service.checkAndOfferFavoritesMigration();

      expect(mockCacheService.removeItem).toHaveBeenCalled();
    });
  });

  describe('setCurrentUser', () => {
    it('should set current user phone and load favorites', () => {
      service.setCurrentUser('+911234567890');

      expect((service as any).currentUserPhone).toBe('+911234567890');
    });
  });

  describe('getCurrentUserPhone', () => {
    it('should return current user phone', () => {
      (service as any).currentUserPhone = '+911234567890';

      const phone = service.getCurrentUserPhone();

      expect(phone).toBe('+911234567890');
    });
  });

  describe('debugStatus', () => {
    it('should return debug information', () => {
      (service as any).currentUserPhone = '+911234567890';
      (service as any).cachedFavorites = [{ id: 'test' }];

      const status = service.debugStatus();

      expect(status).toEqual({
        userPhone: '+911234567890',
        favoritesCount: 1,
        cachedCount: 1
      });
    });
  });
});
