import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, Subscription } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import {
  CartItemRowComponent,
  CartPricingSummaryComponent,
  OrderLoadingModalComponent,
  DeliveryRangeDialogComponent,
  CouponSelectorComponent,
} from '@zitro/ui';
import {
  CartService,
  OrderService,
  OrderProcessingService,
  UserManagementService,
  OrderConfigService,
  PricingService,
  LocationSelectionService,
  CouponService,
  AnalyticsService,
  AddressApiService,
  FirebaseAuthService,
} from '@zitro/services';
import {
  CartItem,
  OrderType,
  PricingBreakdown,
  PricingConfig,
  AppliedCoupon,
  Address,
  CreateOrderData,
  OrderItem as OrderItemModel,
  OrderConfiguration,
  TableConfig,
} from '@zitro/models';
import {
  VALIDATION_MESSAGES,
  FALLBACK_VALUES,
  APP_CONSTANTS,
} from '../../core/constants/app.constants';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    I18nPipe,
    DecimalPipe,
    CartItemRowComponent,
    CartPricingSummaryComponent,
    OrderLoadingModalComponent,
    CouponSelectorComponent,
  ],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage implements OnDestroy {
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly orderProcessing = inject(OrderProcessingService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly orderConfigService = inject(OrderConfigService);
  private readonly pricingService = inject(PricingService);
  private readonly locationService = inject(LocationSelectionService);
  private readonly couponService = inject(CouponService);
  private readonly analytics = inject(AnalyticsService);
  private readonly addressApi = inject(AddressApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly processingStage = toSignal(this.orderProcessing.processing$);

  readonly cart = signal<CartItem[]>(this.cartService.getCart());
  readonly isLoggedIn = signal(false);
  readonly pricingConfig = signal<PricingConfig | null>(null);
  readonly pricingBreakdown = signal<PricingBreakdown | null>(null);
  readonly selectedOrderType = signal<OrderType | null>(null);
  readonly orderTypeError = signal('');
  readonly selectedTable = signal('');
  readonly numberOfGuests = signal(2);
  readonly scheduledPickupTime = signal('');
  readonly addresses = signal<Address[]>([]);
  readonly selectedAddressId = signal('');
  readonly isLoadingAddresses = signal(false);
  readonly selectedPaymentMethod = signal<'cash' | 'online'>('cash');
  readonly isProcessingOrder = signal(false);
  readonly orderConfig = signal<OrderConfiguration | null>(null);
  readonly availableTables = signal<TableConfig[]>([]);
  readonly appliedCoupon = signal<AppliedCoupon | null>(null);
  readonly isRestaurantOpen = signal(true);

  readonly subtotal = computed(() => this.cartService.getTotal());
  readonly hasItems = computed(() => this.cart().length > 0);
  readonly total = computed(() => this.pricingBreakdown()?.total || 0);
  readonly itemCount = computed(() =>
    this.cart().reduce((s, i) => s + (i.qty || 1), 0)
  );
  readonly isAddressSelected = computed(
    () =>
      this.selectedAddressId() !== '' ||
      this.locationService.snapshot.type !== 'none'
  );
  readonly selectedAddress = computed(
    () => this.addresses().find(a => a.id === this.selectedAddressId()) ?? null
  );
  readonly canPlaceOrder = computed(
    () =>
      this.hasItems() &&
      this.isLoggedIn() &&
      this.selectedOrderType() !== null &&
      (this.selectedOrderType() !== 'delivery' || this.isAddressSelected())
  );
  readonly isDineInEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('dine-in')
  );
  readonly isTakeoutEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('takeout')
  );
  readonly isDeliveryEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('delivery')
  );

  private readonly cartSub: Subscription;
  private readonly routerSub: Subscription;

  constructor() {
    this.init();

    this.cartSub = this.cartService.cartChanged.subscribe(async () => {
      this.cart.set(this.cartService.getCart());
      await this.calculatePricing();
      this.recalculateCoupon();
    });

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(async (e: NavigationEnd) => {
        await this.checkAuth();
        if (e.url === '/cart') {
          if (this.isLoggedIn()) await this.loadAddresses();
          this.handleCouponReturn();
        }
      });

  }

  private async init(): Promise<void> {
    this.pricingConfig.set(await this.pricingService.loadPricingConfig());

    const config = await this.orderConfigService.loadConfiguration();
    this.orderConfig.set(config);
    this.availableTables.set(this.orderConfigService.getAvailableTables());
    this.numberOfGuests.set(config.dineInConfig.defaultGuests);

    if (this.orderConfigService.isOrderTypeEnabled('delivery')) {
      this.selectedOrderType.set('delivery');
    }

    await this.calculatePricing();
    await this.checkAuth();
    if (this.isLoggedIn()) await this.loadAddresses();
    this.cart.set(this.cartService.getCart());
    this.handleCouponReturn();
  }

  private async checkAuth(): Promise<void> {
    const phone = await this.userMgmt.getCurrentUserPhone();
    this.isLoggedIn.set(!!phone);
  }

  private async loadAddresses(): Promise<void> {
    this.isLoadingAddresses.set(true);
    this.addressApi.getAddresses().subscribe({
      next: addrs => {
        this.applyAddresses(addrs);
        this.isLoadingAddresses.set(false);
      },
      error: () => {
        this.addresses.set([]);
        this.isLoadingAddresses.set(false);
      },
    });
  }

  private applyAddresses(addrs: Address[]): void {
    this.addresses.set(addrs);
    if (!addrs.length) return;

    const locSnap = this.locationService.snapshot;
    const matchedByLabel =
      locSnap.type === 'saved'
        ? addrs.find(a => a.type === locSnap.label)
        : null;

    if (matchedByLabel) {
      this.selectedAddressId.set(matchedByLabel.id);
    } else if (!this.selectedAddressId()) {
      const defaultAddr = addrs.find(a => a.isDefault) ?? addrs[0];
      this.selectedAddressId.set(defaultAddr.id);
    }
  }

  private async calculatePricing(): Promise<void> {
    let config = this.pricingConfig();
    if (!config) {
      config = await this.pricingService.getPricingConfig();
      this.pricingConfig.set(config);
    }
    const breakdown = await this.pricingService.calculatePricing({
      cartItems: this.cart(),
      subtotal: this.subtotal(),
      orderType: this.selectedOrderType(),
      deliveryAddress: this.selectedAddress(),
      appliedCoupon: this.appliedCoupon(),
      pricingConfig: config,
    });
    this.pricingBreakdown.set(breakdown);
  }

  async onOrderTypeChange(type: OrderType): Promise<void> {
    if (!this.orderConfigService.isOrderTypeEnabled(type)) return;
    this.selectedOrderType.set(type);
    this.orderTypeError.set('');
    if (type !== 'dine-in') this.selectedTable.set('');
    if (type !== 'takeout') this.scheduledPickupTime.set('');
    await this.calculatePricing();
    this.revalidateCoupon();
  }

  onSelectAddress(id: string): void {
    this.selectedAddressId.set(id);
  }

  onSelectPayment(method: 'cash' | 'online'): void {
    this.selectedPaymentMethod.set(method);
  }

  incrementGuests(): void {
    const max = this.orderConfig()?.dineInConfig.maxGuests ?? 10;
    if (this.numberOfGuests() < max) this.numberOfGuests.update(n => n + 1);
  }

  decrementGuests(): void {
    const min = this.orderConfig()?.dineInConfig.minGuests ?? 1;
    if (this.numberOfGuests() > min) this.numberOfGuests.update(n => n - 1);
  }

  onTableSelect(value: string): void {
    this.selectedTable.set(value);
    const table = this.availableTables().find(t => t.id === value);
    if (table?.capacity && this.numberOfGuests() > table.capacity) {
      this.numberOfGuests.set(
        Math.min(this.orderConfig()?.dineInConfig.defaultGuests ?? 2, table.capacity)
      );
    }
  }

  onIncrement(item: CartItem): void {
    this.cartService.addToCart(item);
  }

  onDecrement(item: CartItem): void {
    this.cartService.removeFromCart(item, true);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  async onCouponApplied(coupon: AppliedCoupon): Promise<void> {
    this.appliedCoupon.set(coupon);
    await this.calculatePricing();
    this.analytics.logApplyCoupon(
      coupon.coupon.code,
      coupon.discountAmount,
      this.subtotal()
    );
  }

  async onCouponRemoved(): Promise<void> {
    this.appliedCoupon.set(null);
    await this.calculatePricing();
  }

  navigateToCoupons(): void {
    this.router.navigate(['/coupons']);
  }

  goToMenu(): void {
    this.router.navigate(['/listing']);
  }

  goToAddAddress(): void {
    this.router.navigate(['/add-address'], {
      queryParams: { mode: 'checkout' },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/signin'], {
      queryParams: { returnUrl: '/cart' },
    });
  }

  async placeOrder(): Promise<void> {
    if (!this.isRestaurantOpen()) return;
    if (!this.hasItems()) return;

    if (!this.isLoggedIn()) {
      this.goToLogin();
      return;
    }

    if (!this.validateOrderType()) {
      alert(this.orderTypeError());
      return;
    }

    const dialogRef = this.dialog.open(DeliveryRangeDialogComponent, {
      width: '350px',
      disableClose: true,
    });
    const proceed = await dialogRef.afterClosed().toPromise();
    if (!proceed) return;

    try {
      this.isProcessingOrder.set(true);
      this.orderProcessing.startProcessing();

      await this.analytics.logBeginCheckout(
        this.subtotal(),
        this.cart().length,
        this.cart().map(i => ({
          id: i.id || '',
          name: i.name || '',
          price: i.price || 0,
          quantity: i.qty || 1,
        }))
      );

      await this.orderProcessing.processStageWithDelay('validating', 1500);

      const orderItems: OrderItemModel[] = this.cart()
        .filter(i => i?.name)
        .map(i => {
          let variationLabel = '';
          let variationPrice = 0;
          if (i.hasVariations && i.selectedVariationId && i.variations) {
            const v = i.variations.find(v => v.id === i.selectedVariationId);
            if (v) {
              variationLabel = v.label;
              variationPrice = v.price;
            }
          }
          return {
            id: (i.id || i.name || FALLBACK_VALUES.UNKNOWN_ITEM).toString(),
            name: (i.name || FALLBACK_VALUES.UNKNOWN_ITEM).toString(),
            price: this.parsePrice(i.price),
            qty: Math.max(1, parseInt(String(i.qty)) || 1),
            imageUrl: (i.imageUrl || '').toString(),
            weight: (i.weight || '').toString(),
            selectedVariationId: i.selectedVariationId,
            selectedVariationLabel: variationLabel,
            selectedVariationPrice: variationPrice,
          } as OrderItemModel;
        });

      if (!orderItems.length) throw new Error('No valid items in cart');

      await this.orderProcessing.processStageWithDelay('creating', 1200);

      const addr = this.selectedAddress();
      const orderData: CreateOrderData = {
        orderType: this.selectedOrderType()!,
        tableNumber:
          this.selectedOrderType() === 'dine-in'
            ? this.selectedTable()
            : undefined,
        numberOfGuests:
          this.selectedOrderType() === 'dine-in'
            ? this.numberOfGuests()
            : undefined,
        scheduledPickupTime:
          this.selectedOrderType() === 'takeout' && this.scheduledPickupTime()
            ? new Date(this.scheduledPickupTime())
            : undefined,
        items: orderItems,
        subtotal: this.subtotal(),
        deliveryCharge:
          this.pricingBreakdown()?.charges.delivery.applied || 0,
        total: this.total(),
        paymentMethod: this.selectedPaymentMethod(),
        deliveryAddress:
          addr && this.selectedOrderType() === 'delivery'
            ? {
                name: addr.name,
                phone: addr.phone,
                street: addr.houseAndStreet,
                city: addr.town,
                state: addr.state,
                pincode: addr.pincode,
                landmark: addr.landmark || undefined,
                type: addr.type || 'Other',
              }
            : undefined,
        charges: this.pricingBreakdown()
          ? this.pricingService.formatChargesForOrder(this.pricingBreakdown()!)
          : undefined,
      };

      await this.orderProcessing.processStageWithDelay('processing', 1000);
      await this.analytics.logAddPaymentInfo(this.selectedPaymentMethod(), this.total());

      const order = await this.orderService.createOrder(orderData);
      await this.orderProcessing.processStageWithDelay('confirming', 1500);
      this.orderProcessing.updateStage('completed');

      await new Promise(r => setTimeout(r, 2000));

      this.clearCart();
      this.router.navigate(['/order-confirmation'], {
        queryParams: { orderId: order.orderId },
      });
    } catch (err) {
      this.analytics.logEvent('order_failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        cartValue: this.subtotal(),
      });
      this.orderProcessing.updateStage(
        'error',
        'Failed to place order. Please try again.',
        err instanceof Error ? err.message : 'Unknown error'
      );
      await new Promise(r => setTimeout(r, 3000));
    } finally {
      this.isProcessingOrder.set(false);
      this.orderProcessing.reset();
    }
  }

  private validateOrderType(): boolean {
    if (!this.selectedOrderType()) {
      this.orderTypeError.set(
        this.orderConfigService.getMessage('general', 'orderTypeRequired')
      );
      return false;
    }
    if (this.selectedOrderType() === 'dine-in') {
      if (this.orderConfigService.shouldShowDineInDetails()) {
        if (!this.selectedTable()) {
          this.orderTypeError.set(
            this.orderConfigService.getMessage('dineIn', 'tableRequired')
          );
          return false;
        }
        const table = this.availableTables().find(
          t => t.id === this.selectedTable()
        );
        if (!table?.isAvailable) {
          this.orderTypeError.set(
            this.orderConfigService.getMessage('dineIn', 'tableUnavailable')
          );
          return false;
        }
      }
    }
    if (
      this.selectedOrderType() === 'delivery' &&
      !this.isAddressSelected()
    ) {
      this.orderTypeError.set(
        this.orderConfigService.getMessage('delivery', 'addressRequired')
      );
      return false;
    }
    this.orderTypeError.set('');
    return true;
  }

  private revalidateCoupon(): void {
    const coupon = this.appliedCoupon()?.coupon;
    if (!coupon || !this.selectedOrderType()) return;
    if (
      coupon.applicableOrderTypes?.length &&
      !coupon.applicableOrderTypes.includes(this.selectedOrderType()!)
    ) {
      this.appliedCoupon.set(null);
    }
  }

  private recalculateCoupon(): void {
    const applied = this.appliedCoupon();
    if (!applied) return;
    this.couponService
      .validateCoupon(
        applied.coupon.code,
        this.subtotal(),
        this.cart(),
        this.selectedOrderType() || undefined
      )
      .subscribe({
        next: result => {
          if (result.isValid) {
            this.appliedCoupon.set({
              coupon: applied.coupon,
              discountAmount: result.discountAmount,
            });
          } else {
            this.appliedCoupon.set(null);
          }
        },
        error: () => this.appliedCoupon.set(null),
      });
  }

  private handleCouponReturn(): void {
    const state = history.state;
    if (!state || !Object.keys(state).length) return;
    if (state['appliedCoupon'] === null) {
      this.appliedCoupon.set(null);
    } else if (state['appliedCoupon']) {
      this.appliedCoupon.set(state['appliedCoupon']);
    }
    if (state['appliedCoupon'] !== undefined) {
      delete state['appliedCoupon'];
      history.replaceState(state, '', window.location.pathname);
    }
  }

  private parsePrice(price: unknown): number {
    if (typeof price === 'number') return Math.max(0, price);
    if (typeof price === 'string') {
      const p = parseFloat(price.replace(/[^\d.]/g, ''));
      return Math.max(0, isNaN(p) ? 0 : p);
    }
    return 0;
  }

  getOrderTypeIcon(type: OrderType): string {
    return this.orderConfigService.getOrderTypeIcon(type);
  }

  getOrderTypeLabel(type: OrderType): string {
    return this.orderConfigService.getOrderTypeDisplayName(type);
  }

  ngOnDestroy(): void {
    this.cartSub.unsubscribe();
    this.routerSub.unsubscribe();
  }
}
