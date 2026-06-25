import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DeliveryRangeDialogComponent } from '@zitro/ui';
import { CartService } from '@zitro/services';
import { CouponService } from '@zitro/services';
import { OrderService } from '@zitro/services';
import { OrderProcessingService, OrderProcessingStage } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';
import { UserManagementService, UserAddress } from '@zitro/services';
import {
  CreateOrderData,
  OrderItem as OrderItemModel,
  OrderType,
} from '@zitro/models';
import { AppliedCoupon } from '@zitro/models';
import { BottomNavComponent } from '@zitro/ui';
import { OrderLoadingModalComponent } from '@zitro/ui';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  VALIDATION_MESSAGES,
  FALLBACK_VALUES,
} from '../../core/constants/app.constants';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LocationSelectionService, SelectedLocation } from '@zitro/services';
import { CouponSelectorComponent } from '@zitro/ui';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { CallRestaurantButtonComponent } from '@zitro/ui';
import { APP_CONSTANTS } from '../../core/constants/app.constants';
import { AnalyticsService } from '@zitro/services';
import { OrderConfigService } from '@zitro/services';
import { OrderConfiguration, TableConfig } from '@zitro/models';
import { PricingApiService } from '@zitro/services';
import { PricingBreakdown, PricingConfig } from '@zitro/models';

/* Deprecated: Moved to pricing.model.ts
interface PricingConfig {
  currency: string;
  delivery: {
    enabled: boolean;
    apply: boolean;
    base_fee: number;
    per_km_fee: number;
    free_delivery_above: number;
    surge_multiplier: number;
    max_delivery_cap: number;
  };
  platform_fee: {
    enabled: boolean;
    apply: boolean;
    flat_fee: number;
  };
  packaging: {
    enabled: boolean;
    apply: boolean;
    default_fee: number;
    type: string;
  };
  gst: {
    enabled: boolean;
    apply: boolean;
    food_percent: number;
  };
  rounding: {
    enabled: boolean;
    type: string;
  };
}
*/

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BottomNavComponent,
    DecimalPipe,
    OrderLoadingModalComponent,
    CouponSelectorComponent,
    CachedImageDirective,
    LoaderComponent,
    CallRestaurantButtonComponent,
  ],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent implements OnInit, OnDestroy {
  private cartService = inject(CartService);
  private couponService = inject(CouponService);
  private orderService = inject(OrderService);
  private orderProcessingService = inject(OrderProcessingService);
  private firebaseAuthService = inject(FirebaseAuthService);
  private userManagementService = inject(UserManagementService);
  private router = inject(Router);
  private dialog = inject(MatDialog) ?? inject(MatDialog);
  private analyticsService = inject(AnalyticsService);
  orderConfigService = inject(OrderConfigService);
  private pricingService = inject(PricingApiService);
  private locationSelectionService = inject(LocationSelectionService);

  isUserLoggedIn = false;
  cart: any[];
  selectedPaymentMethod = 'cash'; // Default to cash
  deliveryCharge = 40;
  freeDeliveryThreshold = 250;
  appliedCoupon: AppliedCoupon | null = null;
  imageLoading: { [key: number]: boolean } = {};

  // Order type selection
  selectedOrderType: OrderType | null = null;
  orderTypeError = '';

  // Order type specific fields
  selectedTable = '';
  numberOfGuests = 2;
  scheduledPickupTime = '';

  // Order configuration
  orderConfig!: OrderConfiguration;
  availableTables: TableConfig[] = [];

  // Address selection
  userAddresses: UserAddress[] = [];
  selectedAddressId = '';
  isLoadingAddresses = false;

  // Order processing state
  isProcessingOrder = false;
  processingStage$: Observable<OrderProcessingStage>;

  private routerSubscription!: Subscription;
  private cartSubscription!: Subscription;

  // Packaging charges
  packagingChargesPerItem = 0;
  get totalPackagingCharges() {
    // No packaging charges for dine-in
    if (this.selectedOrderType === 'dine-in') {
      return 0;
    }
    if (!this.pricingConfig?.packaging.enabled) return 0;
    if (!this.pricingConfig?.packaging.apply) return 0; // Free if apply is false
    return this.pricingConfig?.packaging.default_fee || 0;
  }

  get originalPackagingCharges(): number {
    // No packaging charges for dine-in
    if (this.selectedOrderType === 'dine-in') {
      return 0;
    }
    if (!this.pricingConfig?.packaging.enabled) return 0;
    return this.pricingConfig?.packaging.default_fee || 0;
  }

  isRestaurantOpen = true;
  restaurantClosedMessage = '';

  // Pricing configuration from Firebase
  pricingConfig: PricingConfig | null = null;

  // Pricing breakdown from PricingService
  pricingBreakdown: PricingBreakdown | null = null;

  constructor() {
    this.cart = this.cartService.getCart();
    this.processingStage$ = this.orderProcessingService.processing$;
  }

  async ngOnInit() {
    // Load pricing configuration from PricingService
    this.pricingConfig = await this.pricingService.loadConfig();

    // Load order type configuration
    this.orderConfig = await this.orderConfigService.loadConfiguration();
    this.availableTables = this.orderConfigService.getAvailableTables();
    this.numberOfGuests = this.orderConfig.dineInConfig.defaultGuests;

    // Set default order type to delivery if enabled (BEFORE calculating pricing)
    if (this.orderConfigService.isOrderTypeEnabled('delivery')) {
      this.selectedOrderType = 'delivery';
    }

    // Calculate initial pricing (AFTER order type is set)
    await this.calculatePricing();

    // Track cart view
    await this.analyticsService.logScreenView('Cart', 'CartComponent');
    await this.analyticsService.logViewCart(this.subtotal, this.cart.length);

    await this.checkUserLoggedIn();
    if (this.isUserLoggedIn) {
      await this.loadUserAddresses();
    }
    // Subscribe to cart changes for dynamic coupon recalculation BEFORE refreshing
    this.cartSubscription = this.cartService.cartChanged.subscribe(async () => {
      this.cart = this.cartService.getCart();
      // Initialize image loading states for cart items
      this.cart.forEach((item, index) => {
        this.imageLoading[index] = true;
      });
      await this.calculatePricing();
      this.recalculateCouponOnCartChange();
    });

    // Refresh cart items from Firebase to get latest prices and offer status
    // await this.cartService.refreshCartItemsFromFirebase();

    // Manually refresh the cart reference after Firebase refresh
    this.cart = this.cartService.getCart();

    // Initialize image loading states for all cart items
    this.cart.forEach((item, index) => {
      this.imageLoading[index] = true;
    });

    // Fetch packaging charges from app settings
    try {
      const checkoutSettings =
        await this.orderService['appSettingsService'].getCheckoutSettings();
      this.packagingChargesPerItem =
        checkoutSettings.packagingChargesPerItem || 0;
      // Check restaurant open/close status (assume checkoutSettings has open/close info)
      if (checkoutSettings.openTime && checkoutSettings.closeTime) {
        const now = new Date();
        const [openHour, openMinute] = checkoutSettings.openTime
          .split(':')
          .map((v: string) => parseInt(v, 10));
        const [closeHour, closeMinute] = checkoutSettings.closeTime
          .split(':')
          .map((v: string) => parseInt(v, 10));
        const open = new Date(now);
        open.setHours(openHour, openMinute, 0, 0);
        const close = new Date(now);
        close.setHours(closeHour, closeMinute, 0, 0);
        this.isRestaurantOpen = now >= open && now <= close;
        if (!this.isRestaurantOpen) {
          this.restaurantClosedMessage = `The restaurant is currently closed. Open hours: ${checkoutSettings.openTime} - ${checkoutSettings.closeTime}`;
        }
      }
    } catch (error) {
      console.error('Error fetching packaging charges:', error);
      this.packagingChargesPerItem = 0;
    }
    // Check if returning from coupon selection page
    this.handleCouponReturn();

    // Listen for navigation events to refresh addresses when returning from manage addresses
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async (event: NavigationEnd) => {
        await this.checkUserLoggedIn();
        if (event.url === '/cart' && this.isUserLoggedIn) {
          // Refresh addresses when returning to cart
          this.loadUserAddresses();
        }

        // Handle coupon selection return
        if (event.url === '/cart') {
          this.handleCouponReturn();
        }
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  get subtotal() {
    return this.cartService.getTotal();
  }

  get isEligibleForFreeDelivery() {
    if (!this.pricingConfig) return false;
    return this.pricingService.isEligibleForFreeDelivery(
      this.subtotal,
      this.pricingConfig,
    );
  }

  get currentDeliveryCharge() {
    return this.pricingBreakdown?.charges.delivery.applied || 0;
  }

  get total() {
    return this.pricingBreakdown?.total || 0;
  }

  get couponDiscount() {
    return this.pricingBreakdown?.discounts.discountAmount || 0;
  }

  get platformFee(): number {
    return this.pricingBreakdown?.charges.platformFee.applied || 0;
  }

  get gstAmount(): number {
    return this.pricingBreakdown?.charges.gst.applied || 0;
  }

  get totalSavings(): number {
    return this.pricingBreakdown?.savings.totalSavings || 0;
  }

  get originalDeliveryCharge(): number {
    return this.pricingBreakdown?.charges.delivery.calculated || 0;
  }

  get originalPlatformFee(): number {
    return this.pricingBreakdown?.charges.platformFee.calculated || 0;
  }

  get OrigionalGstAmount(): number {
    return this.pricingBreakdown?.charges.gst.calculated || 0;
  }

  get hasItems() {
    return this.cart && this.cart.length > 0;
  }

  get deliveryMessage() {
    if (!this.pricingConfig) return '';
    return this.pricingService.getFreeDeliveryMessage(
      this.subtotal,
      this.pricingConfig,
    );
  }

  async checkUserLoggedIn() {
    this.isUserLoggedIn = await this.userManagementService.isLoggedIn();
  }

  /**
   * Handle order type selection
   */
  async onOrderTypeChange(type: OrderType) {
    // Check if order type is enabled
    if (!this.orderConfigService.isOrderTypeEnabled(type)) {
      alert(
        `${this.orderConfigService.getOrderTypeDisplayName(type)} orders are currently not available`,
      );
      return;
    }

    this.selectedOrderType = type;
    this.orderTypeError = '';

    // Clear type-specific fields when changing order type
    if (type !== 'dine-in') {
      this.selectedTable = '';
      this.numberOfGuests = this.orderConfig.dineInConfig.defaultGuests;
    }
    if (type !== 'takeout') {
      this.scheduledPickupTime = '';
    }

    // Recalculate pricing for new order type
    await this.calculatePricing();

    // Revalidate coupon for the new order type
    this.revalidateCouponForOrderType();
  }

  /**
   * Validate order type selection
   */
  validateOrderType(): boolean {
    if (!this.selectedOrderType) {
      this.orderTypeError = this.orderConfigService.getMessage(
        'general',
        'orderTypeRequired',
      );
      // Scroll to order type section
      setTimeout(() => {
        const element = document.querySelector('.dh-order-type-selection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return false;
    }

    // Validate dine-in specific fields
    if (this.selectedOrderType === 'dine-in') {
      if (this.orderConfigService.shouldShowDineInDetails()) {
        if (!this.selectedTable || this.selectedTable.trim() === '') {
          this.orderTypeError = this.orderConfigService.getMessage(
            'dineIn',
            'tableRequired',
          );
          setTimeout(() => {
            const element = document.querySelector('.dh-dinein-fields');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          return false;
        }

        // Check if table is available
        const table = this.availableTables.find(
          (t) => t.id === this.selectedTable,
        );
        if (!table || !table.isAvailable) {
          this.orderTypeError = this.orderConfigService.getMessage(
            'dineIn',
            'tableUnavailable',
          );
          setTimeout(() => {
            const element = document.querySelector('.dh-dinein-fields');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          return false;
        }
      }
    }

    // Validate takeout specific fields
    if (this.selectedOrderType === 'takeout') {
      if (this.orderConfigService.shouldShowTakeoutScheduledPickup()) {
        if (
          !this.scheduledPickupTime ||
          this.scheduledPickupTime.trim() === ''
        ) {
          this.orderTypeError = this.orderConfigService.getMessage(
            'takeout',
            'pickupTimeRequired',
          );
          setTimeout(() => {
            const element = document.querySelector('.dh-takeout-fields');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          return false;
        }
      }
    }

    // Validate delivery specific fields
    if (this.selectedOrderType === 'delivery') {
      if (!this.isAddressSelected) {
        this.orderTypeError = this.orderConfigService.getMessage(
          'delivery',
          'addressRequired',
        );
        setTimeout(() => {
          const element = document.querySelector('.dh-address-selection');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return false;
      }
    }

    this.orderTypeError = '';
    return true;
  }

  /**
   * Revalidate coupon when order type changes
   */
  async revalidateCouponForOrderType() {
    if (this.appliedCoupon && this.selectedOrderType) {
      const coupon = this.appliedCoupon.coupon;

      // Check if coupon is applicable to the selected order type
      if (
        coupon.applicableOrderTypes &&
        coupon.applicableOrderTypes.length > 0
      ) {
        if (!coupon.applicableOrderTypes.includes(this.selectedOrderType)) {
          // Coupon not applicable to this order type
          this.onCouponRemoved();
          alert(
            `The coupon "${coupon.code}" is not applicable for ${this.selectedOrderType} orders.`,
          );
        }
      }
    }
  }

  /**
   * Get order type display label
   */
  /**
   * Get order type display label
   */
  getOrderTypeLabel(type: OrderType): string {
    return this.orderConfigService.getOrderTypeDisplayName(type);
  }

  /**
   * Get order type icon
   */
  getOrderTypeIcon(type: OrderType): string {
    return this.orderConfigService.getOrderTypeIcon(type);
  }

  /**
   * Increment number of guests
   */
  incrementGuests() {
    if (this.numberOfGuests < this.orderConfig.dineInConfig.maxGuests) {
      this.numberOfGuests++;
    }
  }

  /**
   * Decrement number of guests
   */
  decrementGuests() {
    if (this.numberOfGuests > this.orderConfig.dineInConfig.minGuests) {
      this.numberOfGuests--;
    }
  }

  /**
   * Handle table selection
   */
  onTableSelect() {
    if (!this.selectedTable) return;

    const table = this.availableTables.find((t) => t.id === this.selectedTable);
    if (table && table.capacity) {
      // Reset guests to default if current count exceeds table capacity
      if (this.numberOfGuests > table.capacity) {
        this.numberOfGuests = Math.min(
          this.orderConfig.dineInConfig.defaultGuests,
          table.capacity,
        );
      }
    }
  }

  /**
   * Get capacity of the selected table
   */
  getSelectedTableCapacity(): number {
    if (!this.selectedTable) return this.orderConfig.dineInConfig.maxGuests;

    const table = this.availableTables.find((t) => t.id === this.selectedTable);
    return table?.capacity || this.orderConfig.dineInConfig.maxGuests;
  }

  /**
   * Get display names for order types
   */
  get isDineInEnabled(): boolean {
    return this.orderConfigService.isOrderTypeEnabled('dine-in');
  }

  get isTakeoutEnabled(): boolean {
    return this.orderConfigService.isOrderTypeEnabled('takeout');
  }

  get isDeliveryEnabled(): boolean {
    return this.orderConfigService.isOrderTypeEnabled('delivery');
  }

  get shouldShowDineInDetails(): boolean {
    return this.orderConfigService.shouldShowDineInDetails();
  }

  get shouldShowTakeoutScheduledPickup(): boolean {
    return this.orderConfigService.shouldShowTakeoutScheduledPickup();
  }

  /**
   * Get pickup message from configuration
   */
  getPickupMessage(): string {
    return (
      this.orderConfig?.messages?.takeout?.pickupMessage ||
      'Your order will be ready for pickup in approximately 20-30 minutes.'
    );
  }

  /**
   * Get current datetime in local format for datetime-local input
   */
  getCurrentDateTimeLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Calculate pricing using PricingService
   */
  async calculatePricing() {
    if (!this.pricingConfig) {
      this.pricingConfig = await this.pricingService.loadConfig();
    }

    this.pricingBreakdown = await this.pricingService.calculatePricing({
      cartItems: this.cart,
      subtotal: this.subtotal,
      orderType: this.selectedOrderType,
      deliveryAddress: this.selectedAddress,
      appliedCoupon: this.appliedCoupon,
      pricingConfig: this.pricingConfig,
    });

    console.log('Pricing calculated:', this.pricingBreakdown);
  }

  get canPlaceOrder() {
    return (
      this.hasItems &&
      this.isUserLoggedIn &&
      this.selectedOrderType !== null &&
      (this.selectedOrderType !== 'delivery' || this.isAddressSelected)
    );
  }

  get selectedLocationSnapshot(): SelectedLocation {
    return this.locationSelectionService.snapshot;
  }

  get isAddressSelected() {
    // Valid if either a saved address is matched OR any non-none location is selected from header
    return (
      this.selectedAddressId !== '' ||
      this.selectedLocationSnapshot.type !== 'none'
    );
  }

  get selectedAddress() {
    return (
      this.userAddresses.find(
        (addr) => this.getAddressId(addr) === this.selectedAddressId,
      ) || null
    );
  }

  addToCart(item: any) {
    this.cartService.addToCart(item);
  }
  removeFromCart(item: any) {
    this.cartService.removeFromCart(item, true);
  }
  clearCart() {
    this.cartService.clearCart();
  }

  // Get variation label for display
  getVariationLabel(item: any): string {
    if (item.hasVariations && item.selectedVariationId && item.variations) {
      const variation = item.variations.find(
        (v: any) => v.id === item.selectedVariationId,
      );
      return variation ? variation.label : '';
    }
    return '';
  }

  // Address management methods
  async loadUserAddresses() {
    if (!this.isUserLoggedIn) return;

    try {
      this.isLoadingAddresses = true;
      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (phoneNumber) {
        const userData =
          await this.userManagementService.getUserData(phoneNumber);
        this.userAddresses = userData?.addresses || [];

        if (this.userAddresses.length > 0) {
          // Try to match the header-selected location (type 'saved' → label = 'Home'/'Work'/'Other')
          const locSnap = this.locationSelectionService.snapshot;
          const matchedByLabel =
            locSnap.type === 'saved'
              ? this.userAddresses.find((a) => a.type === locSnap.label)
              : null;

          if (matchedByLabel) {
            this.selectedAddressId = this.getAddressId(matchedByLabel);
          } else if (!this.selectedAddressId) {
            // Fall back to default or first
            const defaultAddress = this.userAddresses.find(
              (addr) => addr.isDefault,
            );
            this.selectedAddressId = this.getAddressId(
              defaultAddress || this.userAddresses[0],
            );
          }
        }
      }
    } catch (error) {
      console.error('Error loading user addresses:', error);
      this.userAddresses = [];
    } finally {
      this.isLoadingAddresses = false;
    }
  }

  getAddressId(address: UserAddress): string {
    // Create a unique identifier for the address
    return `${address.name}_${address.phone}_${address.pincode}`;
  }

  getAddressDisplayText(address: UserAddress): string {
    // Create a shorter version for better mobile display
    const maxLength = 60;
    const fullText = `${address.name} - ${address.houseAndStreet}, ${address.landmark}, ${address.town}, ${address.state} - ${address.pincode}`;

    if (fullText.length <= maxLength) {
      return fullText;
    }

    // Shorter version for mobile
    const shortText = `${address.name} - ${address.houseAndStreet}, ${address.town} - ${address.pincode}`;

    if (shortText.length <= maxLength) {
      return shortText;
    }

    // Even shorter if still too long
    return `${address.name} - ${address.town} - ${address.pincode}`;
  }

  onAddressChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedAddressId = select.value;
  }

  goToManageAddresses() {
    this.router.navigate(['/addresses']);
  }

  async placeOrder() {
    // If restaurant is closed, do nothing
    if (!this.isRestaurantOpen) {
      return;
    }

    if (!this.hasItems) {
      console.warn('Cannot place order: Cart is empty');
      return; // Do nothing if cart is empty
    }

    // Check if user is logged in
    if (!this.isUserLoggedIn) {
      // Redirect guest users to login page
      this.router.navigate(['/auth/signin'], {
        queryParams: { returnUrl: '/cart' },
      });
      return;
    }

    // Validate order type selection FIRST
    if (!this.validateOrderType()) {
      alert(this.orderTypeError);
      return;
    }

    // Validate address selection (only for delivery)
    if (this.selectedOrderType === 'delivery' && !this.isAddressSelected) {
      alert(VALIDATION_MESSAGES.ADDRESS_SELECT_REQUIRED);
      return;
    }

    // Show delivery range dialog after validation
    const dialogRef = this.dialog.open(DeliveryRangeDialogComponent, {
      width: '350px',
      disableClose: true,
    });
    const proceed = await dialogRef.afterClosed().toPromise();
    if (!proceed) {
      return;
    }

    try {
      // Start the order processing
      this.isProcessingOrder = true;
      this.orderProcessingService.startProcessing();

      // Track begin checkout event
      await this.analyticsService.logBeginCheckout(
        this.subtotal,
        this.cart.length,
        this.cart.map((item) => ({
          id: item.id || '',
          name: item.name || '',
          price: item.price || 0,
          quantity: item.qty || 1,
        })),
      );

      // Stage 1: Validating order details
      await this.orderProcessingService.processStageWithDelay(
        'validating',
        1500,
      );

      // Validate cart data first
      if (!this.cart || this.cart.length === 0) {
        throw new Error('Cart is empty or invalid');
      }

      // Transform cart items to order items with validation
      const orderItems: OrderItemModel[] = this.cart
        .filter((item) => item && item.name) // Filter out invalid items
        .map((item) => {
          // Get variation label if applicable
          let variationLabel = '';
          let variationPrice = 0;
          if (
            item.hasVariations &&
            item.selectedVariationId &&
            item.variations
          ) {
            const selectedVar = item.variations.find(
              (v: any) => v.id === item.selectedVariationId,
            );
            if (selectedVar) {
              variationLabel = selectedVar.label;
              variationPrice = selectedVar.price;
            }
          }

          const orderItem: OrderItemModel = {
            id: (
              item.id ||
              item.name ||
              FALLBACK_VALUES.UNKNOWN_ITEM
            ).toString(),
            name: (item.name || FALLBACK_VALUES.UNKNOWN_ITEM).toString(),
            price: this.parsePrice(item.price),
            qty: Math.max(1, parseInt(item.qty) || 1), // Ensure qty is at least 1
            imageUrl: (item.imageUrl || '').toString(),
            weight: (item.weight || '').toString(),
            // Include variation data
            selectedVariationId: item.selectedVariationId,
            selectedVariationLabel: variationLabel,
            selectedVariationPrice: variationPrice,
          };

          console.log('Transformed order item:', orderItem); // Debug log
          return orderItem;
        });

      if (orderItems.length === 0) {
        throw new Error('No valid items found in cart');
      }

      // Stage 2: Creating order
      await this.orderProcessingService.processStageWithDelay('creating', 1200);

      // Validate order data
      const subtotalValue = this.subtotal || 0;
      // Use the same free delivery logic as cart
      const deliveryChargeValue = this.isEligibleForFreeDelivery
        ? 0
        : this.deliveryCharge;
      const totalValue = this.total || 0;

      // Create order data with no undefined values
      const orderData: CreateOrderData = {
        orderType: this.selectedOrderType!,
        tableNumber:
          this.selectedOrderType === 'dine-in' ? this.selectedTable : undefined,
        numberOfGuests:
          this.selectedOrderType === 'dine-in'
            ? this.numberOfGuests
            : undefined,
        scheduledPickupTime:
          this.selectedOrderType === 'takeout' && this.scheduledPickupTime
            ? new Date(this.scheduledPickupTime)
            : undefined,
        items: orderItems,
        subtotal: subtotalValue,
        deliveryCharge: deliveryChargeValue,
        total: totalValue,
        paymentMethod:
          (this.selectedPaymentMethod as 'cash' | 'online') || 'cash',
        deliveryAddress:
          this.selectedAddress && this.selectedOrderType === 'delivery'
            ? {
                name: this.selectedAddress.name,
                phone: this.selectedAddress.phone,
                street: this.selectedAddress.houseAndStreet,
                city: this.selectedAddress.town,
                state: this.selectedAddress.state,
                pincode: this.selectedAddress.pincode,
                landmark: this.selectedAddress.landmark || undefined,
                type: this.selectedAddress.type || 'Other',
              }
            : undefined,
        charges: this.buildOrderCharges(),
      };

      console.log('Creating order with data:', orderData);

      // Stage 3: Processing payment information
      await this.orderProcessingService.processStageWithDelay(
        'processing',
        1000,
      );

      // Track payment and shipping info
      await this.analyticsService.logAddPaymentInfo(
        this.selectedPaymentMethod,
        this.total,
      );
      if (this.selectedAddress) {
        await this.analyticsService.logAddShippingInfo('standard', this.total);
      }

      // Create order in Firebase
      const order = await this.orderService.createOrder(orderData);

      // Stage 4: Confirming with restaurant
      await this.orderProcessingService.processStageWithDelay(
        'confirming',
        1500,
      );

      // Stage 5: Completed
      this.orderProcessingService.updateStage('completed');

      // Wait a bit to show the success state
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate to order confirmation page with order ID as query parameter
      this.router.navigate(['/order-confirmation'], {
        queryParams: { orderId: order.orderId },
      });

      // Clear the cart after successful order creation
      this.clearCart();
    } catch (error) {
      this.analyticsService.logEvent('order_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cartValue: this.subtotal,
        cartItems: this.cart.length,
        paymentMethod: this.selectedPaymentMethod,
      });
      console.error('Error creating order:', error);

      // Show error state
      this.orderProcessingService.updateStage(
        'error',
        'Failed to place order. Please try again.',
        error instanceof Error ? error.message : 'Unknown error',
      );

      // Wait a bit to show the error state
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } finally {
      this.isProcessingOrder = false;
      this.orderProcessingService.reset();
    }
  }

  goToListing() {
    this.router.navigate(['/listing']);
  }

  onImageLoad(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  goToLogin() {
    // Store flag indicating user is trying to checkout
    localStorage.setItem('pendingCheckout', 'true');
    this.router.navigate(['/auth/signin'], {
      queryParams: { returnUrl: '/cart' },
    });
  }

  private parsePrice(price: any): number {
    if (typeof price === 'number') {
      return Math.max(0, price); // Ensure non-negative
    }
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^\d.]/g, ''));
      return Math.max(0, isNaN(parsed) ? 0 : parsed);
    }
    return 0; // Default to 0 for invalid prices
  }

  // Handle coupon selection return flow
  private handleCouponReturn(): void {
    // Modern approach: Use history.state directly (Angular 20+)
    const state = history.state;
    if (state && Object.keys(state).length > 0) {
      const returnedCoupon = state['appliedCoupon'];

      if (returnedCoupon === null) {
        // Coupon was removed
        this.appliedCoupon = null;
        console.log('Coupon removed via navigation state');
      } else if (returnedCoupon) {
        // Coupon was applied
        this.appliedCoupon = returnedCoupon;
        console.log('Coupon applied via navigation state:', returnedCoupon);
      }

      // Clear the state to prevent re-processing on subsequent navigations
      if (state['appliedCoupon'] !== undefined) {
        delete state['appliedCoupon'];
        history.replaceState(state, '', window.location.pathname);
      }
    }
  }

  // Coupon event handlers
  async onCouponApplied(appliedCoupon: AppliedCoupon): Promise<void> {
    this.appliedCoupon = appliedCoupon;
    console.log('Coupon applied:', appliedCoupon);

    // Recalculate pricing with coupon
    await this.calculatePricing();

    // Track coupon application
    this.analyticsService.logApplyCoupon(
      appliedCoupon.coupon.code,
      appliedCoupon.discountAmount,
      this.subtotal,
    );
  }

  async onCouponRemoved(): Promise<void> {
    this.appliedCoupon = null;
    console.log('Coupon removed');

    // Recalculate pricing without coupon
    await this.calculatePricing();
  }

  // Dynamic coupon recalculation when cart changes
  private recalculateCouponOnCartChange(): void {
    if (!this.appliedCoupon) {
      return; // No coupon to recalculate
    }

    const coupon = this.appliedCoupon.coupon;
    console.log('Recalculating coupon due to cart change:', coupon.code);

    // Check if coupon is still valid with current cart
    this.couponService
      .validateCoupon(
        coupon.code,
        this.subtotal,
        this.cart,
        this.selectedOrderType || undefined,
      )
      .subscribe({
        next: (validationResult) => {
          if (validationResult.isValid) {
            // Update the coupon with new discount amount
            this.appliedCoupon = {
              coupon: coupon,
              discountAmount: validationResult.discountAmount,
            };
            console.log(
              'Coupon recalculated successfully. New discount:',
              validationResult.discountAmount,
            );
          } else {
            // Coupon is no longer valid, remove it
            this.appliedCoupon = null;
            console.log(
              'Coupon removed due to cart changes:',
              validationResult.message,
            );

            // Show a notification to user (you can customize this)
            this.showCouponRemovedNotification(
              validationResult.message || 'Coupon is no longer valid',
            );
          }
        },
        error: (error) => {
          console.error('Error recalculating coupon:', error);
          // In case of error, remove the coupon to be safe
          this.appliedCoupon = null;
        },
      });
  }

  private showCouponRemovedNotification(message: string): void {
    // You can implement a toast notification here
    // For now, just log to console
    console.warn('Coupon notification:', message);
  }

  // Handle image error by setting default image
  onImageError(event: any): void {
    event.target.src = 'assets/foodCategories/default.png';
  }

  /**
   * Build detailed charges breakdown for the order
   */
  private buildOrderCharges(): any {
    if (!this.pricingBreakdown) {
      return {};
    }

    return this.pricingService.formatChargesForOrder(this.pricingBreakdown);
  }
}
