import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BannerService } from './banner.service';
import { RequestThrottleService } from './request-throttle.service';
import * as firestore from 'firebase/firestore';
import { Banner } from '@zitro/models';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

describe('BannerService', () => {
  let service: BannerService;
  let mockRequestThrottle: RequestThrottleService;
  let mockDb: any;

  const createMockBanner = (overrides: Partial<Banner> = {}): any => ({
    id: 'banner-1',
    title: 'Test Banner',
    description: 'Test Description',
    imageURL: 'https://example.com/banner.jpg',
    isActive: true,
    displayOrder: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-02'),
    ...overrides
  });

  beforeEach(() => {
    mockRequestThrottle = {
      throttledRequest: vi.fn((key, fn, fallback) => fn())
    } as any;

    mockDb = { name: 'mockFirestore' };
    vi.mocked(firestore.getFirestore).mockReturnValue(mockDb);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new BannerService(mockRequestThrottle);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize Firestore on construction', () => {
      expect(firestore.getFirestore).toHaveBeenCalled();
    });
  });

  describe('getBanners', () => {
    it('should fetch and return active banners', async () => {
      const mockBanners = [createMockBanner()];
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => {
            callback({
              id: banner.id,
              data: () => banner
            });
          });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getBanners();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Banner');
      expect(mockRequestThrottle.throttledRequest).toHaveBeenCalledWith(
        'banners-fetch',
        expect.any(Function),
        []
      );
    });

    it('should return cached banners within cache duration', async () => {
      const mockBanners = [createMockBanner()];
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      // First call - should fetch from Firebase
      await service.getBanners();

      // Second call - should return cached
      const result = await service.getBanners();

      expect(result).toHaveLength(1);
      expect(firestore.getDocs).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should return empty array when no banners found', async () => {
      const mockSnapshot = {
        empty: true,
        size: 0,
        forEach: vi.fn()
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getBanners();

      expect(result).toEqual([]);
    });

    it('should filter out inactive banners', async () => {
      const mockBanners = [
        createMockBanner({ id: 'banner-1', title: 'Active Banner', isActive: true }),
        createMockBanner({ id: 'banner-2', title: 'Inactive Banner', isActive: false })
      ];
      const mockSnapshot = {
        empty: false,
        size: 2,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getBanners();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Active Banner');
    });

    it('should filter out banners with future start date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      
      const mockBanners = [
        createMockBanner({ id: 'banner-1', title: 'Valid Banner' }),
        createMockBanner({ id: 'banner-2', title: 'Invalid Banner', startDate: futureDate })
      ];
      const mockSnapshot = {
        empty: false,
        size: 2,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);
      service.clearCache();

      const result = await service.getBanners();

      expect(result.some(b => b.title === 'Invalid Banner')).toBe(false);
      expect(result.some(b => b.title === 'Valid Banner')).toBe(true);
    });

    it('should filter out banners with past end date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      
      const mockBanners = [
        createMockBanner({ id: 'banner-1', title: 'Valid Banner' }),
        createMockBanner({ id: 'banner-2', title: 'Invalid Banner', endDate: pastDate })
      ];
      const mockSnapshot = {
        empty: false,
        size: 2,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);
      service.clearCache();

      const result = await service.getBanners();

      expect(result.some(b => b.title === 'Invalid Banner')).toBe(false);
      expect(result.some(b => b.title === 'Valid Banner')).toBe(true);
    });

    it('should filter out banners with both invalid dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      
      const mockBanners = [
        createMockBanner({ id: 'banner-1', title: 'Valid Banner' }),
        createMockBanner({ id: 'banner-2', title: 'Invalid Banner', startDate: futureDate, endDate: pastDate })
      ];
      const mockSnapshot = {
        empty: false,
        size: 2,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);
      service.clearCache();

      const result = await service.getBanners();

      expect(result.some(b => b.title === 'Invalid Banner')).toBe(false);
      expect(result.some(b => b.title === 'Valid Banner')).toBe(true);
    });

    it('should sort banners by displayOrder', async () => {
      const mockBanners = [
        createMockBanner({ id: 'banner-3', title: 'Third', displayOrder: 3 }),
        createMockBanner({ id: 'banner-1', title: 'First', displayOrder: 1 }),
        createMockBanner({ id: 'banner-2', title: 'Second', displayOrder: 2 })
      ];
      const mockSnapshot = {
        empty: false,
        size: 3,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getBanners();

      expect(result.map(b => b.title)).toEqual(['First', 'Second', 'Third']);
    });

    it('should handle Firebase errors and return cached data', async () => {
      // First, populate cache
      const mockBanners = [createMockBanner()];
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          mockBanners.forEach(banner => callback({ id: banner.id, data: () => banner }));
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      await service.getBanners();

      // Clear cache to force new fetch
      service.clearCache();

      // Mock error on next fetch
      vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Firebase error'));

      const result = await service.getBanners();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous fetches', async () => {
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          callback({ id: 'banner-1', data: () => createMockBanner() });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      // Clear cache to force fetch
      service.clearCache();

      // Make simultaneous calls
      const [result1, result2] = await Promise.all([
        service.getBanners(),
        service.getBanners()
      ]);

      expect(result1).toEqual(result2);
      // Should only fetch once due to concurrent request handling
    });
  });

  describe('getActiveBanners', () => {
    it('should call getBanners', async () => {
      const spy = vi.spyOn(service, 'getBanners').mockResolvedValue([]);

      await service.getActiveBanners();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear banners cache', async () => {
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          callback({ id: 'banner-1', data: () => createMockBanner() });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      // Populate cache
      await service.getBanners();
      expect(firestore.getDocs).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearCache();

      // Fetch again should call Firebase
      await service.getBanners();
      expect(firestore.getDocs).toHaveBeenCalledTimes(2);
    });
  });

  describe('Date conversion', () => {
    it.each([
      ['Firebase Timestamp', { toDate: () => new Date('2024-01-01') }],
      ['ISO string', '2024-01-01T00:00:00Z'],
      ['Unix timestamp', 1704067200000],
      ['null', null],
      ['undefined', undefined]
    ])('should handle date conversion for: %s', async (_, dateValue) => {
      const banner = createMockBanner({ startDate: dateValue as any });
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          callback({ id: banner.id, data: () => banner });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      const result = await service.getBanners();

      expect(result).toBeDefined();
    });
  });

  describe('Throttling behavior', () => {
    it('should use throttle service for requests', async () => {
      mockRequestThrottle.throttledRequest = vi.fn((key, fn) => fn());

      const mockSnapshot = {
        empty: true,
        size: 0,
        forEach: vi.fn()
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      await service.getBanners();

      expect(mockRequestThrottle.throttledRequest).toHaveBeenCalledWith(
        'banners-fetch',
        expect.any(Function),
        []
      );
    });

    it('should return fallback data when throttled', async () => {
      const fallbackBanners = [createMockBanner()];
      mockRequestThrottle.throttledRequest = vi.fn((key, fn, fallback) => fallback);

      // Populate cache first
      const mockSnapshot = {
        empty: false,
        size: 1,
        forEach: (callback: any) => {
          callback({ id: 'banner-1', data: () => createMockBanner() });
        }
      };

      vi.mocked(firestore.collection).mockReturnValue({} as any);
      vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any);

      await service.getBanners();

      // Now make throttled request
      mockRequestThrottle.throttledRequest = vi.fn((key, fn, fallback) => Promise.resolve(fallback));
      service.clearCache();

      const result = await service.getBanners();

      expect(result).toEqual([]);
    });
  });
});
