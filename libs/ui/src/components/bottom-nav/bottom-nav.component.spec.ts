import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BottomNavComponent } from './bottom-nav.component';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

describe('BottomNavComponent', () => {
  let component: BottomNavComponent;
  let mockRouter: any;
  let eventsSubject: Subject<any>;

  beforeEach(() => {
    eventsSubject = new Subject();
    
    mockRouter = {
      url: '/home',
      events: eventsSubject.asObservable(),
      navigate: vi.fn()
    };

    component = new BottomNavComponent(mockRouter);
  });

  describe('Component Initialization', () => {
    it('should initialize with default active state', () => {
      expect(component.active).toBe('home');
    });

    it('should have 4 navigation items defined', () => {
      expect(component.navItems).toHaveLength(4);
      expect(component.navItems.map(item => item.key)).toEqual(['home', 'search', 'favorites', 'account']);
    });

    it.each([
      { key: 'home', route: '/home', altRoutes: ['/'] },
      { key: 'search', route: '/listing', altRoutes: ['/search'] },
      { key: 'favorites', route: '/favorites', altRoutes: [] },
      { key: 'account', route: '/account', altRoutes: [] }
    ])('should have correct route for $key', ({ key, route, altRoutes }) => {
      const navItem = component.navItems.find(item => item.key === key);
      
      expect(navItem).toBeDefined();
      expect(navItem?.route).toBe(route);
      expect(navItem?.altRoutes).toEqual(altRoutes);
    });
  });

  describe('Set Active From Route', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    // Exact route matches
    it.each([
      { url: '/home', expected: 'home' },
      { url: '/', expected: 'home' },
      { url: '/listing', expected: 'search' },
      { url: '/search', expected: 'search' },
      { url: '/favorites', expected: 'favorites' },
      { url: '/account', expected: 'account' }
    ])('should set active to "$expected" for exact route "$url"', ({ url, expected }) => {
      mockRouter.url = url;
      component.ngOnInit();

      expect(component.active).toBe(expected);
    });

    // Nested routes
    it.each([
      { url: '/home/detail', expected: 'home' },
      { url: '/listing/category/pizza', expected: 'search' },
      { url: '/account/profile', expected: 'account' },
      { url: '/favorites/list', expected: 'favorites' }
    ])('should set active to "$expected" for nested route "$url"', ({ url, expected }) => {
      mockRouter.url = url;
      component.ngOnInit();

      expect(component.active).toBe(expected);
    });

    // Special cart handling
    it.each([
      { url: '/cart', expected: 'cart' },
      { url: '/cart/checkout', expected: 'cart' }
    ])('should set active to "cart" for cart-related route "$url"', ({ url, expected }) => {
      mockRouter.url = url;
      component.ngOnInit();

      expect(component.active).toBe(expected);
    });

    // Default fallback
    it.each([
      '/unknown',
      '/orders',
      '/settings',
      ''
    ])('should default to "home" for unmatched route "%s"', (url) => {
      mockRouter.url = url;
      component.ngOnInit();

      expect(component.active).toBe('home');
    });
  });

  describe('Router Navigation', () => {
    it('should call router.navigate when navigate is called', () => {
      const mockItem = { route: '/home' };
      const mockEvent = { preventDefault: vi.fn() } as unknown as MouseEvent;

      component.navigate(mockItem, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it.each([
      { route: '/home', label: 'Home' },
      { route: '/listing', label: 'Search' },
      { route: '/favorites', label: 'Favorites' },
      { route: '/account', label: 'Account' }
    ])('should navigate to $route for $label item', ({ route }) => {
      const mockItem = { route };
      const mockEvent = { preventDefault: vi.fn() } as unknown as MouseEvent;

      component.navigate(mockItem, mockEvent);

      expect(mockRouter.navigate).toHaveBeenCalledWith([route]);
    });

    it('should prevent default event behavior', () => {
      const mockItem = { route: '/home' };
      const mockEvent = { preventDefault: vi.fn() } as unknown as MouseEvent;

      component.navigate(mockItem, mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalledOnce();
    });
  });

  describe('Route Change Subscription', () => {
    it('should update active state on NavigationEnd event', () => {
      mockRouter.url = '/home';
      component.ngOnInit();
      expect(component.active).toBe('home');

      // Emit navigation end event
      eventsSubject.next(new NavigationEnd(1, '/account', '/account'));

      expect(component.active).toBe('account');
    });

    it('should handle multiple navigation events', () => {
      mockRouter.url = '/home';
      component.ngOnInit();

      eventsSubject.next(new NavigationEnd(1, '/listing', '/listing'));
      expect(component.active).toBe('search');

      eventsSubject.next(new NavigationEnd(2, '/account', '/account'));
      expect(component.active).toBe('account');

      eventsSubject.next(new NavigationEnd(3, '/home', '/home'));
      expect(component.active).toBe('home');
    });

    it('should use urlAfterRedirects from NavigationEnd', () => {
      mockRouter.url = '/';
      component.ngOnInit();

      // Simulate redirect from / to /home
      eventsSubject.next(new NavigationEnd(1, '/', '/home'));

      expect(component.active).toBe('home');
    });
  });

  describe('Component Lifecycle', () => {
    it('should subscribe to router events on init', () => {
      component.ngOnInit();

      expect(component['routerSubscription']).toBeDefined();
    });

    it('should unsubscribe from router events on destroy', () => {
      component.ngOnInit();
      const subscription = component['routerSubscription'];
      const unsubscribeSpy = vi.spyOn(subscription, 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle destroy when subscription does not exist', () => {
      // Don't call ngOnInit, so subscription is undefined
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Nav Items Structure', () => {
    it('should have all required properties for each nav item', () => {
      component.navItems.forEach(item => {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('route');
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('altRoutes');
      });
    });

    it('should have unique keys for all nav items', () => {
      const keys = component.navItems.map(item => item.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });

    it('should have unique routes for primary navigation', () => {
      const routes = component.navItems.map(item => item.route);
      const uniqueRoutes = new Set(routes);

      expect(uniqueRoutes.size).toBe(routes.length);
    });
  });
});
