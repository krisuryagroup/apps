import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationService } from './navigation.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

describe('NavigationService', () => {
  let service: NavigationService;
  let mockRouter: any;
  let mockLocation: any;

  beforeEach(() => {
    mockRouter = {
      url: '/features/home',
      navigate: vi.fn(),
    };

    mockLocation = {
      back: vi.fn(),
    };

    service = new NavigationService(mockRouter, mockLocation);
  });

  describe('Parent Route Detection', () => {
    it.each([
      { route: '/features/account/favorites', expectedParent: '/features/account' },
      { route: '/features/manage-addresses', expectedParent: '/features/account' },
      { route: '/features/order-history', expectedParent: '/features/account' },
      { route: '/features/cart', expectedParent: '/features/home' },
      { route: '/features/category-listing', expectedParent: '/features/categories' },
      { route: '/features/listing', expectedParent: '/features/home' },
    ])('should return $expectedParent for route $route', ({ route, expectedParent }) => {
      const parent = service.getParentRoute(route);

      expect(parent).toBe(expectedParent);
    });

    it('should return null for routes without parent', () => {
      const parent = service.getParentRoute('/features/home');

      expect(parent).toBeNull();
    });

    it('should handle routes with dynamic segments', () => {
      // Service checks exact match first, then pattern matching
      // '/features/order-tracking' exists in hierarchy
      const parent = service.getParentRoute('/features/order-tracking');
      expect(parent).toBe('/features/order-history');
    });
  });

  describe('Can Go Back', () => {
    it('should return true when current route has parent', () => {
      mockRouter.url = '/features/cart';

      const canGoBack = service.canGoBack();

      expect(canGoBack).toBe(true);
    });

    it('should return false when current route has no parent', () => {
      mockRouter.url = '/features/home';

      const canGoBack = service.canGoBack();

      expect(canGoBack).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate to parent route when it exists', () => {
      mockRouter.url = '/features/cart';

      service.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/features/home']);
    });

    it('should navigate to home when no parent route defined', () => {
      mockRouter.url = '/unknown-route';

      service.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/features/home']);
    });

    it('should navigate to home page', () => {
      service.navigateToHome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/features/home']);
    });

    it('should navigate to order history page', () => {
      service.navigateToOrderHistory();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/features/order-history']);
    });
  });

  describe('Route Detection', () => {
    it('should identify main routes', () => {
      expect(service.isMainRoute('/features/home')).toBe(true);
      expect(service.isMainRoute('/features/account')).toBe(true);
      expect(service.isMainRoute('/features/order-tracking')).toBe(false);
    });

    it('should get current route', () => {
      mockRouter.url = '/features/home';
      expect(service.getCurrentRoute()).toBe('/features/home');
    });
  });
});
