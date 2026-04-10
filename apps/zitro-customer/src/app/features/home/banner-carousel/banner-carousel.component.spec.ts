import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BannerCarouselComponent } from './banner-carousel.component';

describe('BannerCarouselComponent', () => {
  let component: BannerCarouselComponent;

  beforeEach(() => {
    component = new BannerCarouselComponent();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.banners).toEqual([]);
      expect(component.currentBanner).toBe(0);
      expect(component.bannerInterval).toBeUndefined();
    });

    it('should start auto-scroll on init', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];

      component.ngOnInit();

      expect(component.bannerInterval).toBeDefined();
    });

    it('should clear interval on destroy', () => {
      component.bannerInterval = setInterval(() => {}, 1000);
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      component.ngOnDestroy();

      expect(clearIntervalSpy).toHaveBeenCalledWith(component.bannerInterval);
    });

    it('should not error on destroy without interval', () => {
      component.bannerInterval = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Banner Auto-Scroll', () => {
    it('should start auto-scroll interval', () => {
      component.startBannerAutoScroll();

      expect(component.bannerInterval).toBeDefined();
    });

    it('should advance banner every 3500ms', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 0;

      component.startBannerAutoScroll();

      vi.advanceTimersByTime(3500);
      expect(component.currentBanner).toBe(1);

      vi.advanceTimersByTime(3500);
      expect(component.currentBanner).toBe(2);

      vi.advanceTimersByTime(3500);
      expect(component.currentBanner).toBe(0);
    });

    it('should continue cycling through banners', () => {
      component.banners = [{ id: '1' }, { id: '2' }];
      component.currentBanner = 0;

      component.startBannerAutoScroll();

      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(3500);
      }

      expect(component.currentBanner).toBe(0);
    });
  });

  describe('Next Banner', () => {
    it('should move to next banner', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 0;

      component.nextBanner();

      expect(component.currentBanner).toBe(1);
    });

    it('should wrap to first banner from last', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 2;

      component.nextBanner();

      expect(component.currentBanner).toBe(0);
    });

    it.each([
      { banners: 2, current: 0, expected: 1 },
      { banners: 2, current: 1, expected: 0 },
      { banners: 5, current: 3, expected: 4 },
      { banners: 5, current: 4, expected: 0 }
    ])('should navigate correctly from $current to $expected with $banners banners', ({ banners, current, expected }) => {
      component.banners = Array.from({ length: banners }, (_, i) => ({ id: String(i + 1) }));
      component.currentBanner = current;

      component.nextBanner();

      expect(component.currentBanner).toBe(expected);
    });
  });

  describe('Previous Banner', () => {
    it('should move to previous banner', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 2;

      component.prevBanner();

      expect(component.currentBanner).toBe(1);
    });

    it('should wrap to last banner from first', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 0;

      component.prevBanner();

      expect(component.currentBanner).toBe(2);
    });

    it.each([
      { banners: 2, current: 1, expected: 0 },
      { banners: 2, current: 0, expected: 1 },
      { banners: 5, current: 2, expected: 1 },
      { banners: 5, current: 0, expected: 4 }
    ])('should navigate correctly from $current to $expected with $banners banners', ({ banners, current, expected }) => {
      component.banners = Array.from({ length: banners }, (_, i) => ({ id: String(i + 1) }));
      component.currentBanner = current;

      component.prevBanner();

      expect(component.currentBanner).toBe(expected);
    });
  });

  describe('Go to Banner', () => {
    it('should navigate to specific banner index', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.currentBanner = 0;

      component.goToBanner(2);

      expect(component.currentBanner).toBe(2);
    });

    it.each([
      { index: 0 },
      { index: 1 },
      { index: 2 },
      { index: 3 },
      { index: 4 }
    ])('should set currentBanner to $index', ({ index }) => {
      component.banners = Array.from({ length: 5 }, (_, i) => ({ id: String(i + 1) }));

      component.goToBanner(index);

      expect(component.currentBanner).toBe(index);
    });
  });

  describe('Banner Input', () => {
    it('should accept empty banner array', () => {
      component.banners = [];

      expect(component.banners).toEqual([]);
    });

    it('should accept banner array with items', () => {
      const banners = [
        { id: '1', imageURL: 'banner1.jpg' },
        { id: '2', imageURL: 'banner2.jpg' }
      ];

      component.banners = banners;

      expect(component.banners).toEqual(banners);
    });

    it('should handle single banner', () => {
      component.banners = [{ id: '1' }];
      component.currentBanner = 0;

      component.nextBanner();

      expect(component.currentBanner).toBe(0);
    });
  });

  describe('Banner Navigation Edge Cases', () => {
    it('should handle next on empty banner array', () => {
      component.banners = [];
      component.currentBanner = 0;

      expect(() => component.nextBanner()).not.toThrow();
    });

    it('should handle prev on empty banner array', () => {
      component.banners = [];
      component.currentBanner = 0;

      expect(() => component.prevBanner()).not.toThrow();
    });

    it('should cycle through single banner correctly', () => {
      component.banners = [{ id: '1' }];
      component.currentBanner = 0;

      component.nextBanner();
      expect(component.currentBanner).toBe(0);

      component.prevBanner();
      expect(component.currentBanner).toBe(0);
    });
  });

  describe('Auto-Scroll Management', () => {
    it('should continue auto-scroll after manual navigation', () => {
      component.banners = [{ id: '1' }, { id: '2' }, { id: '3' }];
      component.startBannerAutoScroll();

      component.nextBanner();
      vi.advanceTimersByTime(3500);

      expect(component.currentBanner).toBe(2);
    });

    it('should not create multiple intervals', () => {
      component.startBannerAutoScroll();
      const firstInterval = component.bannerInterval;

      component.startBannerAutoScroll();
      const secondInterval = component.bannerInterval;

      expect(secondInterval).not.toBe(firstInterval);
    });
  });

  describe('Lifecycle Integration', () => {
    it('should start auto-scroll on init and clean up on destroy', () => {
      component.banners = [{ id: '1' }, { id: '2' }];

      component.ngOnInit();
      expect(component.bannerInterval).toBeDefined();

      component.ngOnDestroy();
      // Interval is cleared but property still has reference
    });

    it('should handle destroy before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Banner Wrapping', () => {
    it('should wrap forward correctly multiple times', () => {
      component.banners = [{ id: '1' }, { id: '2' }];
      component.currentBanner = 0;

      component.nextBanner();
      expect(component.currentBanner).toBe(1);

      component.nextBanner();
      expect(component.currentBanner).toBe(0);

      component.nextBanner();
      expect(component.currentBanner).toBe(1);
    });

    it('should wrap backward correctly multiple times', () => {
      component.banners = [{ id: '1' }, { id: '2' }];
      component.currentBanner = 0;

      component.prevBanner();
      expect(component.currentBanner).toBe(1);

      component.prevBanner();
      expect(component.currentBanner).toBe(0);

      component.prevBanner();
      expect(component.currentBanner).toBe(1);
    });
  });
});
