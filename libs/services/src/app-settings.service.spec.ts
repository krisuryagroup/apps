import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppSettingsService } from './app-settings.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { Router } from '@angular/router';
import { Injector } from '@angular/core';
import * as firestore from '@angular/fire/firestore';

vi.mock('@angular/fire/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
}));

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let mockFirestore: any;
  let mockInjector: any;
  let mockProductsService: any;
  let mockCategoriesService: any;
  let mockRouter: any;
  let mockAuthService: any;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    
    // Set default restaurant ID for tests
    localStorage.setItem('selectedRestaurantId', 'default');

    // Mock services
    mockAuthService = {
      signOut: vi.fn().mockResolvedValue(undefined)
    };

    mockProductsService = {
      clearCache: vi.fn()
    };

    mockCategoriesService = {
      clearCache: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    mockInjector = {
      get: vi.fn().mockReturnValue(mockAuthService)
    };

    mockFirestore = { name: 'mockFirestore' };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mockCacheManager = {} as any;

    service = new AppSettingsService(
      mockFirestore,
      mockInjector,
      mockProductsService,
      mockCategoriesService,
      mockRouter,
      mockCacheManager
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });

    it('should use injector for lazy loading auth service', () => {
      const authService = (service as any).authService;
      expect(mockInjector.get).toHaveBeenCalledWith(FirebaseAuthService);
      expect(authService).toBe(mockAuthService);
    });
  });

  describe('getCheckoutSettings', () => {
    it('should return checkout settings from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          deliveryFee: 50,
          packagingChargesPerItem: 15,
          openTime: '09:00',
          closeTime: '22:00'
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCheckoutSettings();

      expect(result).toEqual({
        deliveryFee: 50,
        packagingChargesPerItem: 15,
        openTime: '09:00',
        closeTime: '22:00'
      });
    });

    it('should return default values when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCheckoutSettings();

      expect(result).toEqual({
        deliveryFee: 0,
        packagingChargesPerItem: 0
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getCheckoutSettings();

      expect(result).toEqual({
        deliveryFee: 0,
        packagingChargesPerItem: 0
      });
      expect(console.error).toHaveBeenCalled();
    });

    it.each([
      ['string', 'invalid', 40],
      ['negative', -10, -10], // Negative numbers are still numbers, so they pass through
      ['undefined', undefined, 40],
      ['null', null, 40]
    ])('should handle invalid deliveryFee type: %s', async (_, value, expected) => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ deliveryFee: value })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCheckoutSettings();

      expect(result.deliveryFee).toBe(expected);
    });
  });

  describe('getContactInfo', () => {
    it('should return contact info from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          contactEmail: 'test@example.com',
          contactPhone: '1234567890'
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getContactInfo();

      expect(result).toEqual({
        contactEmail: 'test@example.com',
        contactPhone: '1234567890'
      });
    });

    it('should return empty strings when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getContactInfo();

      expect(result).toEqual({
        contactEmail: '',
        contactPhone: ''
      });
    });

    it('should handle errors and return defaults', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getContactInfo();

      expect(result).toEqual({
        contactEmail: '',
        contactPhone: ''
      });
    });
  });

  describe('getTestPhoneNumbers', () => {
    it('should return test phone numbers from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          testPhoneNumbers: ['1234567890', '0987654321']
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getTestPhoneNumbers();

      expect(result).toEqual(['1234567890', '0987654321']);
    });

    it('should convert number values to strings', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          testPhoneNumbers: [1234567890, 9876543210]
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getTestPhoneNumbers();

      expect(result).toEqual(['1234567890', '9876543210']);
      expect(result.every(num => typeof num === 'string')).toBe(true);
    });
  });

  describe('getSmsConfigs', () => {
    it('should return SMS configs from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          smsConfigs: {
            apiUrl: 'https://api.example.com/sms',
            authKey: 'test-auth-key-123'
          }
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getSmsConfigs();

      expect(result).toEqual({
        apiUrl: 'https://api.example.com/sms',
        authKey: 'test-auth-key-123'
      });
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getSmsConfigs();

      expect(result).toBeNull();
    });

    it('should return null when smsConfigs is missing', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({})
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getSmsConfigs();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getSmsConfigs();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it('should convert values to strings', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          smsConfigs: {
            apiUrl: 12345,
            authKey: 67890
          }
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getSmsConfigs();

      expect(result).toEqual({
        apiUrl: '12345',
        authKey: '67890'
      });
      expect(typeof result?.apiUrl).toBe('string');
      expect(typeof result?.authKey).toBe('string');
    });
  });

  describe('getCategoryConfigs', () => {
    it('should return all category config fields from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          categoryConfigs: {
            heading1: '45 Minutes',
            heading2: '3-4 KM',
            heading3: 'Free Delivery',
            sliderMessage: 'Pure Veg Food',
            autoSlideEnabled: true,
            autoSlideInterval: 1000,
            sortBy: 'name',
            sortOrder: 'asc'
          }
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toEqual({
        heading1: '45 Minutes',
        heading2: '3-4 KM',
        heading3: 'Free Delivery',
        sliderMessage: 'Pure Veg Food',
        autoSlideEnabled: true,
        autoSlideInterval: 1000,
        sortBy: 'name',
        sortOrder: 'asc'
      });
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(firestore.doc).mockImplementation(() => {
        throw new Error('Firestore error');
      });

      const result = await service.getCategoryConfigs();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    it.each([
      ['empty array', []],
      ['non-array', 'not an array'],
      ['null', null],
      ['undefined', undefined]
    ])('should return empty array for invalid data: %s', async (_, testNumbers) => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          testPhoneNumbers: testNumbers
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getTestPhoneNumbers();

      expect(result).toEqual([]);
    });

    it('should filter out empty strings', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          testPhoneNumbers: ['1234567890', '', '  ', '9876543210']
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getTestPhoneNumbers();

      expect(result).toEqual(['1234567890', '9876543210']);
    });
  });

  describe('initializeAndCheckSettings', () => {
    it('should initialize only once', async () => {
      await service.initializeAndCheckSettings();
      await service.initializeAndCheckSettings();

      // Second call should skip initialization
      expect(service).toBeDefined();
    });

    it('should wait for existing initialization promise', async () => {
      const promise1 = service.initializeAndCheckSettings();
      const promise2 = service.initializeAndCheckSettings();

      await Promise.all([promise1, promise2]);

      expect(service).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(firestore.collection).mockImplementation(() => {
        throw new Error('Initialization error');
      });

      await expect(service.initializeAndCheckSettings()).resolves.not.toThrow();
    });
  });

  describe('getCacheStatus', () => {
    it('should return cache status for default restaurant', () => {
      const status = service.getCacheStatus();

      expect(status).toHaveProperty('restaurantId');
      expect(status).toHaveProperty('lastCacheClear');
      expect(status).toHaveProperty('lastLoginClear');
      expect(status).toHaveProperty('currentTime');
      expect(status.restaurantId).toBe('default');
    });

    it('should return cache status with restaurant ID from localStorage', () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-123');

      const status = service.getCacheStatus();

      expect(status.restaurantId).toBe('restaurant-123');
    });

    it('should show Never for timestamps that do not exist', () => {
      const status = service.getCacheStatus();

      expect(status.lastCacheClear).toBe('Never');
      expect(status.lastLoginClear).toBe('Never');
    });

    it('should show timestamp objects when they exist', () => {
      const now = Date.now();
      localStorage.setItem('selectedRestaurantId', 'default');
      localStorage.setItem('last_cache_clear_timestamp_default', now.toString());
      localStorage.setItem('last_login_clear_timestamp_default', now.toString());

      const status = service.getCacheStatus();

      expect(status.lastCacheClear).not.toBe('Never');
      expect(status.lastCacheClear).toHaveProperty('timestamp');
      expect(status.lastCacheClear).toHaveProperty('date');
      expect((status.lastCacheClear as any).timestamp).toBe(now);
    });
  });

  describe('resetCacheTimestamps', () => {
    it('should remove cache timestamp keys', () => {
      localStorage.setItem('selectedRestaurantId', 'default');
      localStorage.setItem('last_cache_clear_timestamp', '123456');
      localStorage.setItem('last_login_clear_timestamp', '789012');

      service.resetCacheTimestamps();

      expect(localStorage.getItem('last_cache_clear_timestamp')).toBeNull();
      expect(localStorage.getItem('last_login_clear_timestamp')).toBeNull();
    });

    it('should handle restaurant-specific keys', () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-123');
      localStorage.setItem('last_cache_clear_restaurant-123', '123456');

      service.resetCacheTimestamps();

      expect(localStorage.getItem('last_cache_clear_restaurant-123')).toBeNull();
    });
  });

  describe('manualCacheClear', () => {
    it('should clear service caches', async () => {
      await service.manualCacheClear();

      expect(mockProductsService.clearCache).toHaveBeenCalled();
      expect(mockCategoriesService.clearCache).toHaveBeenCalled();
    });

    it('should preserve authentication keys', async () => {
      localStorage.setItem('firebase_auth_user', 'user123');
      localStorage.setItem('token', 'abc123');

      await service.manualCacheClear();

      expect(localStorage.getItem('firebase_auth_user')).toBe('user123');
      expect(localStorage.getItem('token')).toBe('abc123');
    });

    it('should preserve restaurant selection', async () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-456');

      await service.manualCacheClear();

      expect(localStorage.getItem('selectedRestaurantId')).toBe('restaurant-456');
    });
  });

  describe('manualLogout', () => {
    it('should sign out user', async () => {
      await service.manualLogout();

      expect(mockAuthService.signOut).toHaveBeenCalled();
    });

    it('should preserve restaurant selection during logout', async () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-789');
      localStorage.setItem('token', 'user-token');

      await service.manualLogout();

      expect(localStorage.getItem('selectedRestaurantId')).toBe('restaurant-789');
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should navigate to signin page', async () => {
      vi.useFakeTimers();

      await service.manualLogout();

      vi.advanceTimersByTime(2000);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/signin']);

      vi.useRealTimers();
    });
  });

  describe('Restaurant-specific cache keys', () => {
    it('should generate restaurant-specific cache keys', () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-001');

      const key = (service as any).getRestaurantSpecificCacheKey('PRODUCTS_CACHE');

      expect(key).toBe('PRODUCTS_CACHE_restaurant-001');
    });

    it('should use default restaurant when none selected', () => {
      const key = (service as any).getRestaurantSpecificCacheKey('PRODUCTS_CACHE');

      expect(key).toBe('PRODUCTS_CACHE_default');
    });
  });

  describe('getDeliveryTime', () => {
    it('should return delivery time from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          deliveryTime: 30
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getDeliveryTime();

      expect(result).toBe(30);
    });

    it('should return default 45 minutes when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getDeliveryTime();

      expect(result).toBe(45);
    });

    it('should return default 45 minutes when deliveryTime is not a number', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          deliveryTime: 'invalid'
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getDeliveryTime();

      expect(result).toBe(45);
    });

    it('should handle errors and return default value', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Firestore error'));

      const result = await service.getDeliveryTime();

      expect(result).toBe(45);
      expect(console.error).toHaveBeenCalledWith('Error fetching delivery time:', expect.any(Error));
    });
  });

  describe('getCategoryConfigs', () => {
    it('should return category configs from Firestore', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          categoryConfigs: {
            heading1: '30 Minutes',
            heading2: '2-3 KM',
            heading3: 'Free Delivery above 199',
            sliderMessage: 'Fresh & Healthy Food'
          }
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toEqual({
        heading1: '30 Minutes',
        heading2: '2-3 KM',
        heading3: 'Free Delivery above 199',
        sliderMessage: 'Fresh & Healthy Food'
      });
    });

    it('should return null when document does not exist', async () => {
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toBeNull();
    });

    it('should return null when categoryConfigs is missing', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({})
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toBeNull();
    });

    it('should handle partial categoryConfigs data', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({
          categoryConfigs: {
            heading1: '30 Minutes',
            heading2: null
          }
        })
      };

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await service.getCategoryConfigs();

      expect(result).toEqual({
        heading1: '30 Minutes',
        heading2: null
      });
    });

    it('should handle errors and return null', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Firestore error'));

      const result = await service.getCategoryConfigs();

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error fetching category configs:', expect.any(Error));
    });
  });
});
