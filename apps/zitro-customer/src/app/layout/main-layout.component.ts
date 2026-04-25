import { Component, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '@zitro/ui';
import { BottomNavComponent } from '@zitro/ui';
import { WhatsappButtonComponent } from '@zitro/ui';
import { FooterComponent } from '@zitro/ui';
import { CartService } from '@zitro/services';
import { UserManagementService } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';
import { NavigationService } from '@zitro/services';
import { PHONE_CONSTANTS, RESTAURANTS, UI_TEXT, FALLBACK_VALUES } from '../core/constants/app.constants';
import { FirebaseConnectionManager } from '@zitro/services';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AppSettingsService } from '@zitro/services';
import { DialogService } from '@zitro/services';
import { formatOpenCloseTime, isRestaurantOpen } from '@zitro/utils';
import { RestaurantSwitchingUtil } from '@zitro/utils';
import { BreakpointService, Breakpoint } from '@zitro/services';
import { LocationService } from '@zitro/services';
import { LocationSelectionService } from '@zitro/services';
import { LocationBottomSheetComponent } from '@zitro/ui';
import { BannerService } from '@zitro/services';
import { BannerConfigs } from '@zitro/models';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SidebarComponent, BottomNavComponent, FooterComponent, LocationBottomSheetComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  sidebarOpen = false;
  @Output() sidebarOpenEvent = new EventEmitter<void>();
  cartCount = 0;
  userName: string = FALLBACK_VALUES.USER_PREFIX;
  showBackButton = false;
  currentRoute: string = '';
  isRestaurantOpen = false;
  restaurantTime: string = '';
  breakpoint: Breakpoint = 'mobile';
  isLoggedIn = false;
  headerTitle: string = '';
  isOnGameRoute = false;
  isOnCartPage = false;
  headerVisible: boolean = true;
  private lastScrollTop = 0;

  // Home-page hero state
  isOnHomePage: boolean = false;
  isPureVeg: boolean = true;
  scrolledPastBanner: boolean = false;
  locationLabel: string = 'Home';
  locationAddress: string = 'Set your location';

  /** Configs from the currently displayed banner slide (null = no banner / no config) */
  activeBannerConfigs: BannerConfigs | null = null;

  /** CSS color string to apply to header text, icons, location label.
   *  Returns the configured value or null (SCSS default takes over). */
  get headerTextColor(): string | null {
    return this.activeBannerConfigs?.headerTextColor ?? null; // null → CSS fallback to $secondary-color (white)
  }

  /** True when the restaurant OPEN/CLOSED badge + hours should be visible.
   *  Shown only when explicitly set to false in configs (hidden by default). */
  get showRestaurantStatus(): boolean {
    const disable = this.activeBannerConfigs?.disableRestaurantStatus ?? true;
    return !disable;
  }

  get shouldShowHeader(): boolean {
    if (!this.headerVisible) {
      return false;
    }

    const isMobileOrTablet = this.breakpoint === 'mobile' || this.breakpoint === 'tablet';
    if (isMobileOrTablet) {
      return this.isOnHomePage;
    }

    return true;
  }

  // Route-based settings refresh tracking
  private lastRouteRefreshTimestamp = 0;
  private readonly ROUTE_REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  
  // Desktop navigation items
  desktopNavItems = [
    { label: UI_TEXT.HOME, icon: 'home', route: '/home' },    
    { label: UI_TEXT.PROFILE, icon: 'person', route: '/account' },
    { label: UI_TEXT.MANAGE_ADDRESSES, icon: 'location_on', route: '/addresses' },
    { label: UI_TEXT.MY_ORDERS, icon: 'receipt_long', route: '/orders' },
    { label: UI_TEXT.CONTACT_US, icon: 'contact_support', route: '/contact' }
  ];
  
  // Restaurant selection properties - DISABLED FOR NOW
  // restaurants = RESTAURANTS;
  // selectedRestaurant = RESTAURANTS[0]; // Default to first restaurant
  // showRestaurantDropdown = false;
  // isSwitchingRestaurant = false;

  constructor(
    private router: Router, 
    private cartService: CartService, 
    private userManagementService: UserManagementService, 
    private authService: FirebaseAuthService,
    private navigationService: NavigationService,
    private appSettingsService: AppSettingsService,
    private firebaseConnectionManager: FirebaseConnectionManager,
    private dialogService: DialogService,
    private breakpointService: BreakpointService,
    private locationService: LocationService,
    private locationSelectionService: LocationSelectionService,
    private bannerService: BannerService,
  ) {}

  async ngOnInit() {
    window.addEventListener('scroll', this.handleScroll.bind(this));
    this.isOnHomePage = this.router.url === '/home' || this.router.url === '/';
    if (this.isOnHomePage) { this.tryGetLocation(); }
    await this.checkLoginStatus();
    await this.loadUserData();
    this.updateCartCount();
    this.setupRouteListener();
    this.subscribeToProfileChanges();
    
    // Initialize with current restaurant from connection manager - DISABLED FOR NOW
    // this.selectedRestaurant = this.firebaseConnectionManager.getCurrentRestaurant() as any;
    
    // Load current user profile to initialize the BehaviorSubject
    this.userManagementService.loadCurrentUserProfile();
    
    // Initialize restaurant timing with selected restaurant - DISABLED FOR NOW
    // this.updateRestaurantTiming();
    
    var checkoutSettings = this.appSettingsService.getCheckoutSettings();
    checkoutSettings.then(settings => {
      var openTime = settings.openTime;
      var closeTime = settings.closeTime;
      
      // Override with settings if available, otherwise use restaurant data
      if (openTime && closeTime) {
        this.isRestaurantOpen = isRestaurantOpen(openTime, closeTime);
        this.restaurantTime = formatOpenCloseTime(openTime, closeTime);
      }
    });

    // Listen for breakpoint changes
    this.breakpointService.breakpointChanges().pipe(takeUntil(this.destroy$)).subscribe((bp: Breakpoint) => {
      this.breakpoint = bp;
    });

    // Keep header location labels in sync with the selection service
    this.locationSelectionService.selectedLocation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loc => {
        this.locationLabel  = loc.label;
        this.locationAddress = loc.address;
      });

    // React to per-banner header config changes (text color, restaurant status visibility)
    this.bannerService.activeBannerConfigs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(configs => {
        this.activeBannerConfigs = configs;
      });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.handleScroll.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
  }

  async checkLoginStatus() {
    this.isLoggedIn = await this.userManagementService.isLoggedIn();
  }
  
  subscribeToProfileChanges() {
    // Subscribe to user profile changes
    this.userManagementService.userProfile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async userProfile => {
        if (userProfile && userProfile.name) {
          this.userName = `${UI_TEXT.WELCOME} ${userProfile.name}`;
        } else if (userProfile === null) {
          // User has signed out, clear the user name
          this.userName = FALLBACK_VALUES.USER_PREFIX;
        } else {
          // Fallback for when profile data is not available
          this.userName = FALLBACK_VALUES.USER_PREFIX;
        }
      });
  }

  setupRouteListener() {
    // Listen to route changes to determine when to show/hide back button
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
        this.updateBackButtonVisibility();
        this.updateHeaderTitle();
        this.isOnGameRoute = event.urlAfterRedirects.includes('/game-2048');
        this.isOnCartPage = event.urlAfterRedirects === '/cart';
        this.isOnHomePage = event.urlAfterRedirects === '/home' || event.urlAfterRedirects === '/';
        this.scrolledPastBanner = false;
        if (this.isOnHomePage) { this.tryGetLocation(); }
        // // Refresh settings on critical route changes
        // this.refreshSettingsOnRouteChange(event.urlAfterRedirects);
      });
        // Set initial state
    this.currentRoute = this.router.url;
    this.updateBackButtonVisibility();
    this.isOnGameRoute = this.router.url.includes('/game-2048');
    this.isOnCartPage = this.router.url === '/cart';
    this.isOnHomePage = this.router.url === '/home' || this.router.url === '/';
    this.updateHeaderTitle();
  }

  updateHeaderTitle() {
    // skip for home route
    if (this.currentRoute === '/home' || this.currentRoute === '/') {
      this.headerTitle = '';
      return;
    }

    // Find the nav item whose route matches the current route
    const activeItem = this.desktopNavItems.find(item => this.isActiveRoute(item.route));
    this.headerTitle = activeItem ? activeItem.label : '';
  }
  
  /**
   * Refresh app settings when navigating to critical routes
   * This ensures settings are up-to-date before loading important pages
   * Respects 5-minute cooldown to prevent excessive refreshes
   */
  private refreshSettingsOnRouteChange(url: string): void {
    // Define routes that should trigger settings refresh
    const criticalRoutes = ['/home', '/listing'];
    
    // Check if current route matches any critical route
    const shouldRefresh = criticalRoutes.some(route => 
      url === route || url.startsWith(`${route}/`) || url.startsWith(`${route}?`)
    );
    
    if (!shouldRefresh) {
      return;
    }
    
    // Check cooldown period - only refresh if 5 minutes have passed
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRouteRefreshTimestamp;
    
    if (timeSinceLastRefresh < this.ROUTE_REFRESH_COOLDOWN) {
      const remainingTime = Math.ceil((this.ROUTE_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000);
      console.log(`⏳ Route refresh cooldown active. Next refresh in ${remainingTime}s`);
      return;
    }
    
    // Update timestamp and trigger refresh
    this.lastRouteRefreshTimestamp = now;
    console.log(`🔄 Route-based refresh triggered for: ${url}`);
    
    this.appSettingsService.refreshSettings().catch(error => {
      console.error('❌ Failed to refresh settings on route change:', error);
    });
  }

  updateBackButtonVisibility() {
    // Define routes where back button should NOT be shown (main/home routes)
    const homeRoutes = ['/', '/home', '/features/categories', '/features/search', '/features/account'];
    
    // Special case: always show back button for home page (will go to order history)
    if (this.currentRoute === '/features/home') {
      this.showBackButton = true;
    } else {
      this.showBackButton = !homeRoutes.includes(this.currentRoute);
    }
  }

  ngDoCheck() {
    this.updateCartCount();
  }

  updateCartCount() {
    this.cartCount = this.cartService.getCount();
  }

  async loadUserData() {
    try {
      const currentUserPhone = await this.userManagementService.getCurrentUserPhone();
      if (currentUserPhone) {
        const userData = await this.userManagementService.getUserData(currentUserPhone);
        if (userData && userData.name) {
          this.userName = `${UI_TEXT.WELCOME} ${userData.name}`;
        } else {
          // Fallback to a formatted phone number or default
          this.userName = currentUserPhone.includes(PHONE_CONSTANTS.INDIA_CODE) 
            ? `${FALLBACK_VALUES.USER_PREFIX} ${currentUserPhone.substring(3)}` 
            : `${FALLBACK_VALUES.USER_PREFIX} ${currentUserPhone}`;
        }
      } else {
        this.userName = UI_TEXT.USER;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userName = UI_TEXT.USER;
    }
  }

  updateLoginStatus() {
    this.checkLoginStatus();
  }

  login() {
    this.router.navigate(['/auth/signin']);
  }

  logout() {
    this.authService.signOut();
    // this.userManagementService.clearUserProfile();
    // this.isLoggedIn = false;
    // this.userName = 'User';
    // this.router.navigate(['/auth/signin']);
  }

  openSidebar() {
    this.sidebarOpen = true;
  }


  closeSidebar() {
    this.sidebarOpen = false;
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToAccount() {
    this.router.navigate(['/account']);
  }

  goBack() {
    // Use the navigation service for intelligent back navigation
    this.navigationService.goBack();
  }

  onActivate(component: any) {
    // Component activation hook
  }

  // Check if screen is desktop or larger (769px+) - shows some desktop features
  isDesktop(): boolean {
    return this.breakpoint === 'desktop' || this.breakpoint === 'large-desktop';
  }

  // Check if screen is desktop-lite (769-1024px) - simplified desktop nav + bottom nav
  isDesktopLite(): boolean {
    return this.breakpoint === 'desktop';
  }

  // Check if screen is large desktop (1025px+) - full desktop layout, no bottom nav
  isLargeScreen(): boolean {
    return this.breakpoint === 'large-desktop';
  }

  navigateToRoute(route: string): void {
    this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  handleScroll() {
    try {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > this.lastScrollTop && scrollTop > 500) {
        // Scrolling down, hide header
        this.headerVisible = false;
      } else {
        // Scrolling up or at top, show header
        this.headerVisible = true;
      }
      this.scrolledPastBanner = scrollTop > (window.innerWidth * (700 / 1080));
      this.lastScrollTop = scrollTop;
    } catch (error) {
      console.error('Error handling scroll event:', error);
      this.headerVisible = true;
      return;
    }
  }

  togglePureVeg(): void {
    this.isPureVeg = !this.isPureVeg;
  }

  requestLocation(): void {
    this.locationSelectionService.open();
  }

  private async tryGetLocation(): Promise<void> {
    const current = this.locationSelectionService.snapshot;
    // Never override a location the user explicitly picked (saved address or nearby place)
    if (current.type === 'saved' || current.type === 'nearby') return;
    // If type === 'gps' or 'none': always re-geocode so stale cached addresses get refreshed

    try {
      const pref = this.locationService.getLocationPermissionPreference();
      if (pref === 'denied') { return; }
      const cached = this.locationService.getCachedLocation();
      const coordinates = cached.coordinates ?? await this.locationService.getCurrentLocation();

      if (await this.userManagementService.isLoggedIn()) {
        const nearestSavedAddress = await this.findNearestSavedAddress(coordinates);
        if (nearestSavedAddress) {
          this.locationSelectionService.setLocation(nearestSavedAddress.location);
          this.locationSelectionService.setSelectedSavedAddress(nearestSavedAddress.address);
          return;
        }
      }

      const addr = await this.locationSelectionService.reverseGeocode(
        coordinates.lat,
        coordinates.lng
      );
      this.locationSelectionService.setLocation({
        label: 'Current Location',
        address: addr,
        coordinates,
        type: 'gps'
      });
      this.locationSelectionService.setSelectedSavedAddress(null);
    } catch {
      // Silently fail — default text remains
    }
  }

  private async findNearestSavedAddress(coordinates: { lat: number; lng: number }): Promise<{
    address: Awaited<ReturnType<UserManagementService['getUserDefaultAddress']>> extends infer T
      ? Exclude<T, null>
      : never;
    location: {
      label: string;
      address: string;
      coordinates?: { lat: number; lng: number };
      type: 'saved';
    };
  } | null> {
    const phone = await this.userManagementService.getCurrentUserPhone();
    if (!phone) return null;

    const userData = await this.userManagementService.getUserData(phone);
    const addresses = userData?.addresses ?? [];
    if (addresses.length === 0) return null;

    const resolvedAddresses = await Promise.all(
      addresses.map(async address => {
        const fullAddress = [address.houseAndStreet, address.town, address.state]
          .filter(Boolean)
          .join(', ');

        if (!fullAddress) return null;

        try {
          const suggestions = await this.locationSelectionService.searchAddresses(fullAddress, coordinates);
          const match = suggestions[0];
          if (!match) return null;

          return {
            address,
            location: {
              label: address.type || 'Home',
              address: fullAddress,
              coordinates: match.coordinates,
              type: 'saved' as const,
            },
            distanceKm: this.locationService.calculateDistance(coordinates, match.coordinates),
          };
        } catch {
          return null;
        }
      })
    );

    const nearestAddress = resolvedAddresses
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((left, right) => left.distanceKm - right.distanceKm)[0];

    return nearestAddress ?? null;
  }

  // Restaurant selection methods - DISABLED FOR NOW
  // toggleRestaurantDropdown() {
  //   if (this.isSwitchingRestaurant) {
  //     return; // Prevent dropdown toggle during switching
  //   }
  //   this.showRestaurantDropdown = !this.showRestaurantDropdown;
  // }

  // async selectRestaurant(restaurant: any) {
  //   if (this.selectedRestaurant.id === restaurant.id || this.isSwitchingRestaurant) {
  //     this.showRestaurantDropdown = false;
  //     return;
  //   }

  //   try {
  //     // Get confirmation message from utility
  //     const currentName = this.selectedRestaurant.name;
  //     const newName = restaurant.name;
  //     const confirmationMessage = RestaurantSwitchingUtil.getSwitchConfirmationMessage(currentName, newName);
      
  //     // Show confirmation dialog
  //     const userConfirmed = await this.dialogService.showConfirmation({
  //       title: 'Switch Restaurant',
  //       message: confirmationMessage,
  //       confirmText: 'Yes, Continue',
  //       cancelText: 'Cancel'
  //     });
      
  //     // If user cancels, just close dropdown and return
  //     if (!userConfirmed) {
  //       this.showRestaurantDropdown = false;
  //       return;
  //     }
      
  //     this.showRestaurantDropdown = false;
  //     this.isSwitchingRestaurant = true;
      
  //     // Use the Firebase connection manager to switch
  //     await this.firebaseConnectionManager.switchRestaurant(restaurant.id);
      
  //     // Note: The page will reload, so code after this won't execute
      
  //   } catch (error) {
  //     console.error('Error switching restaurant:', error);
  //     this.isSwitchingRestaurant = false;
  //     // Handle error - maybe show an error message to user
  //   }
  // }

  // private updateRestaurantTiming() {
  //   const restaurant = this.selectedRestaurant;
  //   this.isRestaurantOpen = isRestaurantOpen(restaurant.openTime, restaurant.closeTime);
  //   this.restaurantTime = formatOpenCloseTime(restaurant.openTime, restaurant.closeTime);
  // }

  // Close dropdown when clicking outside - DISABLED FOR NOW
  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: Event) {
  //   const target = event.target as HTMLElement;
  //   if (!target.closest('.dh-restaurant-dropdown-container')) {
  //     this.showRestaurantDropdown = false;
  //   }
  // }
}
