import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BannerComponent } from './banner.component';
import { Router } from '@angular/router';

describe('BannerComponent', () => {
  let component: BannerComponent;
  let mockBannerService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockBannerService = {
      getBanners: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    component = new BannerComponent(mockBannerService, mockRouter);
    
    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.autoScroll).toBe(true);
      expect(component.scrollInterval).toBe(4000);
      expect(component.banners).toEqual([]);
      expect(component.currentBanner).toBe(0);
      expect(component.isLoading).toBe(true);
      expect(component.hasError).toBe(false);
    });

    it.each([
      { autoScroll: true, scrollInterval: 3000 },
      { autoScroll: false, scrollInterval: 5000 },
      { autoScroll: true, scrollInterval: 2000 }
    ])('should accept custom input values', ({ autoScroll, scrollInterval }) => {
      component.autoScroll = autoScroll;
      component.scrollInterval = scrollInterval;

      expect(component.autoScroll).toBe(autoScroll);
      expect(component.scrollInterval).toBe(scrollInterval);
    });
  });

  describe('Banner Loading', () => {
    it('should load banners successfully', async () => {
      const mockBanners = [
        { id: '1', imageUrl: 'banner1.jpg', title: 'Banner 1', targetUrl: '/home' },
        { id: '2', imageUrl: 'banner2.jpg', title: 'Banner 2', targetUrl: '/products' }
      ];
      mockBannerService.getBanners.mockResolvedValue(mockBanners);

      await component.loadBanners();

      expect(mockBannerService.getBanners).toHaveBeenCalled();
      expect(component.banners).toEqual(mockBanners);
      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(false);
    });

    it('should handle empty banner list', async () => {
      mockBannerService.getBanners.mockResolvedValue([]);

      await component.loadBanners();

      expect(component.banners).toEqual([]);
      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(false);
    });

    it('should handle banner loading error', async () => {
      mockBannerService.getBanners.mockRejectedValue(new Error('Load failed'));

      await component.loadBanners();

      expect(component.hasError).toBe(true);
      expect(component.banners).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should prevent multiple simultaneous loads', async () => {
      mockBannerService.getBanners.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const promise1 = component.loadBanners();
      const promise2 = component.loadBanners();

      await Promise.all([promise1, promise2]);

      expect(mockBannerService.getBanners).toHaveBeenCalledTimes(1);
    });

    it.each([
      { count: 1, description: 'single banner' },
      { count: 3, description: 'multiple banners' },
      { count: 10, description: 'many banners' }
    ])('should handle $description', async ({ count }) => {
      const mockBanners = Array.from({ length: count }, (_, i) => ({
        id: `${i + 1}`,
        imageUrl: `banner${i + 1}.jpg`,
        title: `Banner ${i + 1}`,
        targetUrl: `/page${i + 1}`
      }));
      mockBannerService.getBanners.mockResolvedValue(mockBanners);

      await component.loadBanners();

      expect(component.banners.length).toBe(count);
    });
  });

  describe('Banner Navigation', () => {
    beforeEach(() => {
      component.banners = [
        { id: '1', imageURL: 'banner1.jpg', title: 'Banner 1', description: 'Banner 1 Description', targetUrl: '/home', isActive: true, displayOrder: 1, created_at: new Date(), updated_at: new Date() },
        { id: '2', imageURL: 'banner2.jpg', title: 'Banner 2', description: 'Banner 2 Description', targetUrl: '/products', isActive: true, displayOrder: 2, created_at: new Date(), updated_at: new Date() },
        { id: '3', imageURL: 'banner3.jpg', title: 'Banner 3', description: 'Banner 3 Description', targetUrl: '/about', isActive: true, displayOrder: 3, created_at: new Date(), updated_at: new Date() }
      ];
      component.currentBanner = 0;
    });

    it('should move to next banner', () => {
      component.nextBanner();
      expect(component.currentBanner).toBe(1);

      component.nextBanner();
      expect(component.currentBanner).toBe(2);
    });

    it('should wrap to first banner after last', () => {
      component.currentBanner = 2;

      component.nextBanner();

      expect(component.currentBanner).toBe(0);
    });

    it('should move to previous banner', () => {
      component.currentBanner = 2;

      component.prevBanner();
      expect(component.currentBanner).toBe(1);

      component.prevBanner();
      expect(component.currentBanner).toBe(0);
    });

    it('should wrap to last banner when going back from first', () => {
      component.currentBanner = 0;

      component.prevBanner();

      expect(component.currentBanner).toBe(2);
    });

    it('should handle nextBanner with empty banners', () => {
      component.banners = [];
      component.currentBanner = 0;

      component.nextBanner();

      expect(component.currentBanner).toBe(0);
    });

    it('should handle prevBanner with empty banners', () => {
      component.banners = [];
      component.currentBanner = 0;

      component.prevBanner();

      expect(component.currentBanner).toBe(0);
    });

    it.each([
      { index: 0, expected: 0 },
      { index: 1, expected: 1 },
      { index: 2, expected: 2 }
    ])('should go to banner at index $index', ({ index, expected }) => {
      component.goToBanner(index);

      expect(component.currentBanner).toBe(expected);
    });

    it('should not navigate to invalid banner index', () => {
      component.currentBanner = 1;

      component.goToBanner(-1);
      expect(component.currentBanner).toBe(1);

      component.goToBanner(10);
      expect(component.currentBanner).toBe(1);
    });
  });

  describe('Auto-scroll Functionality', () => {
    beforeEach(() => {
      component.banners = [
        { id: '1', imageURL: 'banner1.jpg', title: 'Banner 1', description: 'Banner 1 Description', targetUrl: '/home', isActive: true, displayOrder: 1, created_at: new Date(), updated_at: new Date() },
        { id: '2', imageURL: 'banner2.jpg', title: 'Banner 2', description: 'Banner 2 Description', targetUrl: '/products', isActive: true, displayOrder: 2, created_at: new Date(), updated_at: new Date() }
      ];
      component.currentBanner = 0;
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start auto-scroll with multiple banners', () => {
      component.startBannerAutoScroll();

      expect(component.bannerInterval).not.toBeNull();
    });

    it('should not start auto-scroll with single banner', () => {
      component.banners = [{ id: '1', imageURL: 'banner1.jpg', title: 'Banner 1', description: 'Banner 1 Description', targetUrl: '/home', isActive: true, displayOrder: 1, created_at: new Date(), updated_at: new Date() }];

      component.startBannerAutoScroll();

      expect(component.bannerInterval).toBeUndefined();
    });

    it('should auto-advance banner after interval', () => {
      component.scrollInterval = 4000;
      component.startBannerAutoScroll();

      vi.advanceTimersByTime(4000);

      expect(component.currentBanner).toBe(1);
    });

    it('should stop auto-scroll', () => {
      component.startBannerAutoScroll();
      const intervalId = component.bannerInterval;

      component.stopBannerAutoScroll();

      expect(component.bannerInterval).toBeNull();
      expect(intervalId).not.toBeNull();
    });

    it('should restart auto-scroll when manually navigating', () => {
      component.autoScroll = true;
      component.startBannerAutoScroll();
      const firstInterval = component.bannerInterval;

      component.goToBanner(1);

      expect(component.bannerInterval).not.toBeNull();
      expect(component.bannerInterval).not.toBe(firstInterval);
    });

    it('should not restart auto-scroll when autoScroll is false', () => {
      component.autoScroll = false;
      component.bannerInterval = null;

      component.goToBanner(1);

      expect(component.bannerInterval).toBeNull();
    });
  });

  describe('Banner Click Handling', () => {
    it('should navigate to internal route', () => {
      const banner = {
        id: '1',
        imageURL: 'banner1.jpg',
        title: 'Banner 1',
        description: 'Banner 1 Description',
        targetUrl: '/products',
        isActive: true,
        displayOrder: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      component.onBannerClick(banner);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
    });

    it.each([
      { url: 'https://example.com', description: 'https URL' },
      { url: 'http://test.com', description: 'http URL' }
    ])('should open $description in new tab', ({ url }) => {
      const banner = {
        id: '1',
        imageURL: 'banner1.jpg',
        title: 'Banner 1',
        description: 'Banner 1 Description',
        targetUrl: url,
        isActive: true,
        displayOrder: 1,
        created_at: new Date(),
        updated_at: new Date()
      };
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      component.onBannerClick(banner);

      expect(windowOpenSpy).toHaveBeenCalledWith(url, '_blank');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle banner without targetUrl', () => {
      const banner = {
        id: '1',
        imageURL: 'banner1.jpg',
        title: 'Banner 1',
        description: 'Banner 1 Description',
        targetUrl: '',
        isActive: true,
        displayOrder: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      component.onBannerClick(banner);

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle banner with null targetUrl', () => {
      const banner = {
        id: '1',
        imageURL: 'banner1.jpg',
        title: 'Banner 1',
        description: 'Banner 1 Description',
        targetUrl: null as any,
        isActive: true,
        displayOrder: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      component.onBannerClick(banner);

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });


  describe('Lifecycle Management', () => {
    it('should stop auto-scroll on destroy', () => {
      component.banners = [
        { id: '1', imageURL: 'banner1.jpg', title: 'Banner 1', description: 'Banner 1 Description', targetUrl: '/home', isActive: true, displayOrder: 1, created_at: new Date(), updated_at: new Date() },
        { id: '2', imageURL: 'banner2.jpg', title: 'Banner 2', description: 'Banner 2 Description', targetUrl: '/products', isActive: true, displayOrder: 2, created_at: new Date(), updated_at: new Date() }
      ];
      component.startBannerAutoScroll();

      component.ngOnDestroy();

      expect(component.bannerInterval).toBeNull();
    });

    it('should handle destroy when auto-scroll not started', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      component.banners = [
        { id: '1', imageURL: 'banner1.jpg', title: 'Banner 1', description: 'Banner 1 Description', targetUrl: '/home', isActive: true, displayOrder: 1, created_at: new Date(), updated_at: new Date() },
        { id: '2', imageURL: 'banner2.jpg', title: 'Banner 2', description: 'Banner 2 Description', targetUrl: '/products', isActive: true, displayOrder: 2, created_at: new Date(), updated_at: new Date() }
      ];
      component.startBannerAutoScroll();

      component.ngOnDestroy();
      component.ngOnDestroy();

      expect(component.bannerInterval).toBeNull();
    });
  });

  describe('Loading State Management', () => {
    it.each([
      { loading: true, hasError: false, description: 'loading state' },
      { loading: false, hasError: false, description: 'loaded state' },
      { loading: false, hasError: true, description: 'error state' }
    ])('should handle $description correctly', async ({ loading, hasError }) => {
      if (hasError) {
        mockBannerService.getBanners.mockRejectedValue(new Error('Failed'));
      } else if (loading) {
        mockBannerService.getBanners.mockImplementation(() => 
          new Promise(() => {}) // Never resolves
        );
        const promise = component.loadBanners();
        expect(component.isLoading).toBe(true);
        return; // Skip completion check
      } else {
        mockBannerService.getBanners.mockResolvedValue([]);
      }

      await component.loadBanners();

      expect(component.isLoading).toBe(false);
      expect(component.hasError).toBe(hasError);
    });
  });
});
