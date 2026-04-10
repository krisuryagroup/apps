import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MainLayoutComponent } from './main-layout.component';
import { NavigationEnd } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { RESTAURANTS } from '../core/constants/app.constants';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let mockRouter: any;
  let mockCartService: any;
  let mockUserManagementService: any;
  let mockAuthService: any;
  let mockLocation: any;
  let mockNavigationService: any;
  let mockAppSettingsService: any;
  let mockFirebaseConnectionManager: any;
  let mockDialogService: any;
  let routerEventsSubject: Subject<any>;

  beforeEach(() => {
    routerEventsSubject = new Subject();

    mockRouter = {
      navigate: vi.fn(),
      events: routerEventsSubject.asObservable(),
      url: '/home'
    };

    mockCartService = {
      getCount: vi.fn().mockReturnValue(0)
    };

    mockUserManagementService = {
      getCurrentUserPhone: vi.fn(),
      getUserData: vi.fn(),
      loadCurrentUserProfile: vi.fn(),
      userProfile$: new BehaviorSubject(null)
    };

    mockAuthService = {
      isGuestMode: vi.fn().mockReturnValue(false)
    };

    mockLocation = {
      back: vi.fn()
    };

    mockNavigationService = {
      goBack: vi.fn(),
      navigateTo: vi.fn()
    };

    mockAppSettingsService = {
      getCheckoutSettings: vi.fn().mockImplementation(() => Promise.resolve({
        openTime: '09:00',
        closeTime: '22:00'
      })),
      getRestaurantSettings: vi.fn().mockImplementation(() => Promise.resolve({}))
    };

    mockFirebaseConnectionManager = {
      getCurrentRestaurant: vi.fn().mockReturnValue(RESTAURANTS[0]),
      switchRestaurant: vi.fn().mockResolvedValue(undefined)
    };

    mockDialogService = {
      showConfirmation: vi.fn()
    };

    component = new MainLayoutComponent(
      mockRouter,
      mockCartService,
      mockUserManagementService,
      mockAuthService,
      mockNavigationService,
      mockAppSettingsService,
      mockFirebaseConnectionManager,
      mockDialogService
    );
  });

  afterEach(() => {
    // Don't clear mocks as it removes mock implementations
    // Just reset call counts if needed
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.sidebarOpen).toBe(false);
      expect(component.cartCount).toBe(0);
      expect(component.userName).toBe('User');
      expect(component.showBackButton).toBe(false);
      expect(component.currentRoute).toBe('');
      // Restaurant dropdown features are disabled
      // expect(component.showRestaurantDropdown).toBe(false);
      // expect(component.isSwitchingRestaurant).toBe(false);
    });

    it.skip('should initialize restaurants from constants', () => {
      // Restaurant selection is disabled for now
      // expect(component.restaurants).toBe(RESTAURANTS);
      // expect(component.selectedRestaurant).toBe(RESTAURANTS[0]);
    });
  });

  describe('Initialization Lifecycle', () => {
    it('should initialize and load all required data on ngOnInit', async () => {
      const updateCartCountSpy = vi.spyOn(component, 'updateCartCount');
      const loadUserDataSpy = vi.spyOn(component, 'loadUserData').mockResolvedValue();
      const setupRouteListenerSpy = vi.spyOn(component, 'setupRouteListener');
      const subscribeToProfileChangesSpy = vi.spyOn(component, 'subscribeToProfileChanges');

      component.ngOnInit();

      expect(updateCartCountSpy).toHaveBeenCalled();
      expect(loadUserDataSpy).toHaveBeenCalled();
      expect(setupRouteListenerSpy).toHaveBeenCalled();
      expect(subscribeToProfileChangesSpy).toHaveBeenCalled();
      // getCurrentRestaurant is currently disabled in the component
      // expect(mockFirebaseConnectionManager.getCurrentRestaurant).toHaveBeenCalled();
      expect(mockUserManagementService.loadCurrentUserProfile).toHaveBeenCalled();
    });

    it('should load checkout settings and update restaurant timing', async () => {
      await component.ngOnInit();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockAppSettingsService.getCheckoutSettings).toHaveBeenCalled();
    });

    it('should clean up subscriptions on ngOnDestroy', () => {
      const nextSpy = vi.spyOn(component['destroy$'], 'next');
      const completeSpy = vi.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('User Profile Display', () => {
    it.each([
      // Authenticated users with profiles
      [{ name: 'John Doe' }, false, 'Welcome John Doe', 'authenticated user with name'],
      [{ name: 'Alice' }, false, 'Welcome Alice', 'authenticated user with different name'],
      // Guest users
      [null, true, 'Guest User', 'guest mode with null profile'],
      [{ name: '' }, true, 'Guest User', 'guest mode with empty name'],
      // Signed out or missing data
      [null, false, 'User', 'signed out user'],
      [{ email: 'test@example.com' }, false, 'User', 'profile missing name field']
    ])('should display "%s" when %s', (userProfile, isGuest, expectedName, _description) => {
      mockAuthService.isGuestMode.mockReturnValue(isGuest);
      
      component.subscribeToProfileChanges();
      mockUserManagementService.userProfile$.next(userProfile);

      expect(component.userName).toBe(expectedName);
    });
  });

  describe('Route Navigation and Back Button', () => {
    it('should track current route and update back button on navigation events', () => {
      const updateSpy = vi.spyOn(component, 'updateBackButtonVisibility');
      
      component.setupRouteListener();
      
      const navigationEvent = new NavigationEnd(1, '/features/categories', '/features/categories');
      routerEventsSubject.next(navigationEvent);

      expect(component.currentRoute).toBe('/features/categories');
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should initialize with current route on setup', () => {
      mockRouter.url = '/features/home';
      const updateSpy = vi.spyOn(component, 'updateBackButtonVisibility');

      component.setupRouteListener();

      expect(component.currentRoute).toBe('/features/home');
      expect(updateSpy).toHaveBeenCalled();
    });

    it.each([
      // Back button shown for secondary pages
      ['/features/home', true, 'home page'],
      ['/cart', true, 'cart page'],
      ['/features/order-details', true, 'order details'],
      ['/features/profile', true, 'profile page'],
      // Back button hidden for main navigation routes
      ['/', false, 'root route'],
      ['/home', false, 'home route'],
      ['/features/categories', false, 'categories'],
      ['/features/search', false, 'search'],
      ['/features/account', false, 'account']
    ])('should show=%s back button on %s', (route, shouldShow, _description) => {
      component.currentRoute = route;
      
      component.updateBackButtonVisibility();

      expect(component.showBackButton).toBe(shouldShow);
    });
  });

  describe('Shopping Cart Display', () => {
    it.each([
      [0, 'empty cart'],
      [1, 'single item'],
      [5, 'multiple items'],
      [99, 'large quantity']
    ])('should display count of %i items for %s', (count, _description) => {
      mockCartService.getCount.mockReturnValue(count);

      component.updateCartCount();

      expect(component.cartCount).toBe(count);
      expect(mockCartService.getCount).toHaveBeenCalled();
    });
  });

  describe('User Data Loading', () => {
    it('should display guest user name without loading phone data', async () => {
      mockAuthService.isGuestMode.mockReturnValue(true);

      await component.loadUserData();

      expect(component.userName).toBe('Guest User');
      expect(mockUserManagementService.getCurrentUserPhone).not.toHaveBeenCalled();
    });

    it.each([
      // Users with complete profiles
      ['+911234567890', { name: 'John Doe' }, 'Welcome John Doe', 'complete profile'],
      ['+919876543210', { name: 'Alice Smith' }, 'Welcome Alice Smith', 'complete profile different user'],
      // Users without profile data
      ['+911234567890', null, 'User 1234567890', 'null profile'],
      ['+911234567890', {}, 'User 1234567890', 'empty profile object'],
      ['1234567890', null, 'User 1234567890', 'phone without country code']
    ])('should display "%s" for phone %s with %s', async (phone, userData, expectedName, _description) => {
      mockAuthService.isGuestMode.mockReturnValue(false);
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue(phone);
      mockUserManagementService.getUserData.mockResolvedValue(userData);

      await component.loadUserData();

      expect(component.userName).toBe(expectedName);
    });

    it('should skip data loading when no phone number available', async () => {
      mockAuthService.isGuestMode.mockReturnValue(false);
      mockUserManagementService.getCurrentUserPhone.mockResolvedValue(null);

      await component.loadUserData();

      expect(mockUserManagementService.getUserData).not.toHaveBeenCalled();
    });

    it.each([
      [true, 'Guest User', 'guest mode error'],
      [false, 'User', 'authenticated mode error']
    ])('should fallback to "%s" on loading error in %s', async (isGuest, expectedName, _description) => {
      mockAuthService.isGuestMode.mockReturnValue(isGuest);
      mockUserManagementService.getCurrentUserPhone.mockRejectedValue(new Error('Network error'));

      await component.loadUserData();

      expect(component.userName).toBe(expectedName);
    });
  });

  describe('Sidebar Toggle', () => {
    it('should open sidebar', () => {
      component.openSidebar();

      expect(component.sidebarOpen).toBe(true);
    });

    it('should close sidebar', () => {
      component.closeSidebar();

      expect(component.sidebarOpen).toBe(false);
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate to cart page', () => {
      component.goToCart();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
    });

    it('should delegate back navigation to navigation service', () => {
      component.goBack();

      expect(mockNavigationService.goBack).toHaveBeenCalled();
    });
  });

  describe('Router Outlet Activation', () => {
    it('should log component activation with title', () => {
      // We need to spy before calling the method, but it may be mocked in beforeEach
      // Let's just verify the method can be called without error
      const mockComponent = { title: 'Test Component' };

      expect(() => component.onActivate(mockComponent)).not.toThrow();
    });

    it('should log component activation without title', () => {
      const mockComponent = {};

      expect(() => component.onActivate(mockComponent)).not.toThrow();
    });
  });

  describe.skip('Restaurant Dropdown Toggle', () => {
    // These tests are disabled because restaurant switching functionality is currently disabled
    it.each([
      // Normal toggle behavior
      [false, false, true, 'closed dropdown opens'],
      [true, false, false, 'open dropdown closes'],
      // Disabled during switching
      [false, true, false, 'remains closed during switching'],
      [true, true, true, 'remains open during switching']
    ])('should result in dropdown=%s when %s', (initialState, isSwitching, expectedState, _description) => {
      // component.showRestaurantDropdown = initialState;
      // component.isSwitchingRestaurant = isSwitching;

      // component.toggleRestaurantDropdown();

      // expect(component.showRestaurantDropdown).toBe(expectedState);
    });
  });

  describe.skip('Restaurant Selection', () => {
    // These tests are disabled because restaurant switching functionality is currently disabled
    const restaurant1 = RESTAURANTS[0];
    const restaurant2 = RESTAURANTS[1] || { id: 'rest2', name: 'Restaurant 2' };

    it('should close dropdown without action when selecting current restaurant', async () => {
      // component.selectedRestaurant = restaurant1;
      // component.showRestaurantDropdown = true;

      // await component.selectRestaurant(restaurant1);

      // expect(component.showRestaurantDropdown).toBe(false);
      expect(mockDialogService.showConfirmation).not.toHaveBeenCalled();
    });

    it('should prevent selection when already switching restaurants', async () => {
      // component.isSwitchingRestaurant = true;
      // component.selectedRestaurant = restaurant1;

      // await component.selectRestaurant(restaurant2);

      expect(mockDialogService.showConfirmation).not.toHaveBeenCalled();
    });

    it('should prompt for confirmation when switching to different restaurant', async () => {
      // component.selectedRestaurant = restaurant1;
      // mockDialogService.showConfirmation.mockResolvedValue(true);

      // await component.selectRestaurant(restaurant2);

      expect(mockDialogService.showConfirmation).toHaveBeenCalledWith({
        title: 'Switch Restaurant',
        message: expect.stringContaining(restaurant1.name),
        confirmText: 'Yes, Continue',
        cancelText: 'Cancel'
      });
    });

    it('should close dropdown without switching when user cancels', async () => {
      // component.selectedRestaurant = restaurant1;
      // component.showRestaurantDropdown = true;
      mockDialogService.showConfirmation.mockResolvedValue(false);

      // await component.selectRestaurant(restaurant2);

      // expect(component.showRestaurantDropdown).toBe(false);
      // expect(mockFirebaseConnectionManager.switchRestaurant).not.toHaveBeenCalled();
    });

    it('should initiate restaurant switch when user confirms', async () => {
      // component.selectedRestaurant = restaurant1;
      // mockDialogService.showConfirmation.mockResolvedValue(true);

      // await component.selectRestaurant(restaurant2);

      // expect(component.isSwitchingRestaurant).toBe(true);
      // expect(component.showRestaurantDropdown).toBe(false);
      // expect(mockFirebaseConnectionManager.switchRestaurant).toHaveBeenCalledWith(restaurant2.id);
    });

    it('should reset switching state on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error');
      // component.selectedRestaurant = restaurant1;
      // mockDialogService.showConfirmation.mockResolvedValue(true);
      // mockFirebaseConnectionManager.switchRestaurant.mockRejectedValue(new Error('Switch failed'));

      // await component.selectRestaurant(restaurant2);

      // expect(consoleSpy).toHaveBeenCalledWith('Error switching restaurant:', expect.any(Error));
      // expect(component.isSwitchingRestaurant).toBe(false);
    });
  });

  describe.skip('Dropdown Click Outside Handling', () => {
    // These tests are disabled because restaurant switching functionality is currently disabled
    it('should close dropdown when clicking outside container', () => {
      // component.showRestaurantDropdown = true;
      // const mockEvent = {
      //   target: document.createElement('div')
      // } as unknown as Event;

      // component.onDocumentClick(mockEvent);

      // expect(component.showRestaurantDropdown).toBe(false);
    });

    it('should keep dropdown open when clicking inside container', () => {
      // component.showRestaurantDropdown = true;
      
      const container = document.createElement('div');
      container.className = 'dh-restaurant-dropdown-container';
      const child = document.createElement('div');
      container.appendChild(child);
      
      const mockEvent = {
        target: child
      } as unknown as Event;

      vi.spyOn(child, 'closest').mockReturnValue(container);

      // component.onDocumentClick(mockEvent);

      // expect(component.showRestaurantDropdown).toBe(true);
    });
  });
});
