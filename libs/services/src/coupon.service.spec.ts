import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CouponService } from './coupon.service';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { CacheType } from '@zitro/models';
import { firstValueFrom } from 'rxjs';
import * as firestore from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

describe('CouponService', () => {
  let service: CouponService;
  let mockDb: any;
  let mockCacheService: any;
  let mockCacheManager: any;

  const createMockCoupon = (overrides: any = {}) => ({
    id: 'coupon-1',
    code: 'SAVE20',
    title: '20% Off',
    description: 'Get 20% off on orders',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 100,
    minOrderAmount: 200,
    isActive: true,
    isDisplayedForOnlineOrders: true,
    validFrom: new Date(Date.now() - 86400000), // Yesterday
    validTo: new Date(Date.now() + 86400000), // Tomorrow
    usageLimit: 100,
    usedCount: 10,
    termsAndConditions: 'Terms apply',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    ...overrides
  });

  beforeEach(() => {
    mockDb = { name: 'mockFirestore' };
    vi.mocked(firestore.getFirestore).mockReturnValue(mockDb);

    // Mock CacheService
    mockCacheService = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      getCachedData: vi.fn(),
      setCachedData: vi.fn(),
      getCacheTimestamp: vi.fn(),
      setCacheTimestamp: vi.fn(),
      getCurrentRestaurantId: vi.fn(() => 'test-restaurant'),
      clearCacheByPrefix: vi.fn()
    };

    // Mock CacheManagerService
    mockCacheManager = {
      isCacheEnabled: vi.fn(() => true),
      getCacheDuration: vi.fn(() => 86400000), // 24 hours
      getCachedData: vi.fn(() => null),
      setCachedData: vi.fn(),
      clearCache: vi.fn(),
      clearCacheByPrefix: vi.fn(),
      updateCacheConfig: vi.fn()
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    service = new CouponService(mockCacheService, mockCacheManager);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize Firestore on construction', () => {
      expect(firestore.getFirestore).toHaveBeenCalled();
    });
  });

  describe('getActiveCoupons', () => {
    it('should return cached coupons when available', async () => {
      const mockCoupons = [createMockCoupon()];
      mockCacheManager.getCachedData.mockReturnValue(mockCoupons);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(mockCacheManager.getCachedData).toHaveBeenCalledWith(
        CacheType.COUPONS,
        expect.any(String),
        expect.any(String)
      );
      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SAVE20');
      expect(console.log).toHaveBeenCalledWith('📦 Using cached coupons');
    });

    it('should fetch and return active coupons when cache is empty', async () => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupons = [createMockCoupon()];
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          mockCoupons.forEach(coupon => {
            callback({ id: coupon.id, data: () => coupon });
          });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SAVE20');
      expect(mockCacheManager.setCachedData).toHaveBeenCalledWith(
        CacheType.COUPONS,
        expect.any(String),
        expect.any(String),
        mockCoupons
      );
    });

    it('should filter inactive coupons', async () => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupons = [
        createMockCoupon({ id: 'c1', code: 'ACTIVE', isActive: true }),
        createMockCoupon({ id: 'c2', code: 'INACTIVE', isActive: false })
      ];
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          mockCoupons.forEach(coupon => callback({ id: coupon.id, data: () => coupon }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('ACTIVE');
    });

    it.each([
      // Test date filtering
      ['expired coupon', { validTo: new Date(Date.now() - 86400000) }],
      ['future coupon', { validFrom: new Date(Date.now() + 86400000) }],
      ['not displayed for online orders', { isDisplayedForOnlineOrders: false }],
    ])('should filter out: %s', async (_, overrides) => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupons = [
        createMockCoupon({ id: 'c1', code: 'VALID' }),
        createMockCoupon({ id: 'c2', code: 'INVALID', ...overrides })
      ];
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          mockCoupons.forEach(coupon => callback({ id: coupon.id, data: () => coupon }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result.some(c => c.code === 'INVALID')).toBe(false);
    });

    it('should include non-displayed coupons when manualSearch is true', async () => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupons = [
        createMockCoupon({ code: 'HIDDEN', isDisplayedForOnlineOrders: false })
      ];
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          mockCoupons.forEach(coupon => callback({ id: coupon.id, data: () => coupon }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons(true));

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('HIDDEN');
    });

    it('should return empty array on Firebase error', async () => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Firebase error'));

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should return empty array when snapshot is empty', async () => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockSnapshot = {
        empty: true,
        forEach: vi.fn()
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result).toEqual([]);
    });

    it('should respect cache enabled flag', async () => {
      mockCacheManager.isCacheEnabled.mockReturnValue(false);
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupons = [createMockCoupon()];
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          mockCoupons.forEach(coupon => {
            callback({ id: coupon.id, data: () => coupon });
          });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getActiveCoupons());

      expect(result).toHaveLength(1);
      expect(mockCacheManager.getCachedData).toHaveBeenCalled();
    });
  });

  describe('validateCoupon', () => {
    beforeEach(() => {
      mockCacheManager.getCachedData.mockReturnValue(null);
      const mockCoupon = createMockCoupon();
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: mockCoupon.id, data: () => mockCoupon });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);
    });

    it('should validate coupon successfully with percentage discount', async () => {
      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 500)
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(100); // 20% of 500 = 100
      expect(result.finalAmount).toBe(400);
    });

    it('should return error for invalid coupon code', async () => {
      const result = await firstValueFrom(
        service.validateCoupon('INVALID', 500)
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid coupon code');
      expect(result.discountAmount).toBe(0);
    });

    it('should return error for expired coupon', async () => {
      const expiredCoupon = createMockCoupon({
        code: 'EXPIRED',
        isActive: true,
        validFrom: new Date(Date.now() - 86400000 * 2), // 2 days ago
        validTo: new Date(Date.now() - 86400000) // Yesterday (expired)
      });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: expiredCoupon.id, data: () => expiredCoupon });
        }
      };

      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(
        service.validateCoupon('EXPIRED', 500)
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid coupon code');
    });

    it.each([
      // Test minimum order validation
      ['below minimum', 100, false, 'Minimum order amount'],
      ['at minimum', 200, true, 'Coupon applied'],
      ['above minimum', 500, true, 'Coupon applied'],
    ])('should validate minimum order amount: %s', async (_, orderAmount, isValid, messageFragment) => {
      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', orderAmount)
      );

      expect(result.isValid).toBe(isValid);
      expect(result.message).toContain(messageFragment);
    });

    it('should respect max discount limit for percentage coupons', async () => {
      // 20% of 1000 = 200, but maxDiscount is 100
      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 1000)
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(100); // Capped at maxDiscount
      expect(result.finalAmount).toBe(900);
    });

    it('should apply flat discount correctly', async () => {
      const flatCoupon = createMockCoupon({
        code: 'FLAT50',
        discountType: 'flat',
        discountValue: 50,
        minOrderAmount: 100
      });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: flatCoupon.id, data: () => flatCoupon });
        }
      };

      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(
        service.validateCoupon('FLAT50', 200)
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(50);
      expect(result.finalAmount).toBe(150);
    });

    it('should check usage limit', async () => {
      const exhaustedCoupon = createMockCoupon({
        usageLimit: 10,
        usedCount: 10
      });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: exhaustedCoupon.id, data: () => exhaustedCoupon });
        }
      };

      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 500)
      );

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Coupon usage limit exceeded');
    });

    it('should exclude items with isOfferDisabled from discount calculation', async () => {
      const cartItems = [
        { name: 'Item 1', price: 100, qty: 2, isOfferDisabled: false }, // 200
        { name: 'Item 2', price: 100, qty: 1, isOfferDisabled: true },  // 100 (excluded)
      ];

      // Eligible amount = 200, discount = 20% of 200 = 40
      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 300, cartItems)
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(40); // 20% of 200 (eligible amount)
    });

    it('should validate minimum order against eligible items only', async () => {
      const cartItems = [
        { name: 'Item 1', price: 100, qty: 1, isOfferDisabled: true },  // 100 (excluded)
        { name: 'Item 2', price: 50, qty: 1, isOfferDisabled: false },  // 50 (eligible)
      ];

      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 150, cartItems)
      );

      // Eligible amount (50) is below minimum (200)
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Minimum order amount');
    });

    it('should handle cart items without isOfferDisabled flag', async () => {
      const cartItems = [
        { name: 'Item 1', price: 300, qty: 1 }
      ];

      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 300, cartItems)
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(60); // 20% of 300
    });
  });

  describe('getCouponByCode', () => {
    it('should find coupon by code', async () => {
      const mockCoupon = createMockCoupon({ code: 'TESTCODE' });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: mockCoupon.id, data: () => mockCoupon });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getCouponByCode('TESTCODE'));

      expect(result).not.toBeNull();
      expect(result?.code).toBe('TESTCODE');
    });

    it('should be case-insensitive', async () => {
      const mockCoupon = createMockCoupon({ code: 'TESTCODE' });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: mockCoupon.id, data: () => mockCoupon });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getCouponByCode('testcode'));

      expect(result).not.toBeNull();
      expect(result?.code).toBe('TESTCODE');
    });

    it('should return null for non-existent coupon', async () => {
      const mockSnapshot = {
        empty: true,
        forEach: vi.fn()
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(service.getCouponByCode('NOTFOUND'));

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle price as string with currency symbol', async () => {
      const mockCoupon = createMockCoupon({ minOrderAmount: 100 });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: mockCoupon.id, data: () => mockCoupon });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const cartItems = [
        { name: 'Item', price: 'Rs 200', qty: 1 }
      ];

      const result = await firstValueFrom(
        service.validateCoupon('SAVE20', 200, cartItems)
      );

      expect(result.isValid).toBe(true);
    });

    it('should not allow negative final amounts', async () => {
      const hugeCoupon = createMockCoupon({
        code: 'HUGE',
        discountType: 'flat',
        discountValue: 1000,
        minOrderAmount: 50
      });
      const mockSnapshot = {
        empty: false,
        forEach: (callback: any) => {
          callback({ id: hugeCoupon.id, data: () => hugeCoupon });
        }
      };

      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await firstValueFrom(
        service.validateCoupon('HUGE', 100)
      );

      expect(result.finalAmount).toBeGreaterThanOrEqual(0);
    });
  });
});
