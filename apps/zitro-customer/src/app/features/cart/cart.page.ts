import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  OrderLoadingModalComponent,
  DeliveryRangeDialogComponent,
  ItemDetailSheetComponent,
  CartPricingSummaryComponent,
  PricingSummaryConfig,
} from '@zitro/ui';
import {
  CartApiService,
  OrderApiService,
  OrderProcessingService,
  UserManagementService,
  OrderConfigService,
  PricingService,
  LocationSelectionService,
  AnalyticsService,
  AddressApiService,
} from '@zitro/services';
import type {
  ApiCartItem,
  OrderType,
  PricingBreakdown,
  PricingConfig,
  Address,
  OrderConfiguration,
  TableConfig,
} from '@zitro/models';
import type { CreateOrderOptions } from '@zitro/services';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    I18nPipe,
    DecimalPipe,
    OrderLoadingModalComponent,
    ItemDetailSheetComponent,
    CartPricingSummaryComponent,
  ],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cartApi = inject(CartApiService);
  private readonly orderApi = inject(OrderApiService);
  private readonly orderProcessing = inject(OrderProcessingService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly orderConfigService = inject(OrderConfigService);
  private readonly pricingService = inject(PricingService);
  private readonly locationService = inject(LocationSelectionService);
  private readonly analytics = inject(AnalyticsService);
  private readonly addressApi = inject(AddressApiService);
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(I18nService);

  readonly processingStage = toSignal(this.orderProcessing.processing$);

  // ── Query param → current business slug ─────────────────────────────────
  private readonly queryParams = toSignal(this.route.queryParams, { initialValue: {} });
  readonly businessSlug = computed(() => (this.queryParams() as Record<string, string>)['business'] ?? '');

  // ── Cart from API state ──────────────────────────────────────────────────
  readonly apiCart = computed(() => this.cartApi.getCartForBusiness(this.businessSlug()));
  readonly items = computed(() => this.apiCart()?.items ?? []);
  readonly subtotal = computed(() => this.apiCart()?.estimatedTotal ?? 0);
  readonly couponCode = computed(() => this.apiCart()?.couponCode ?? null);
  readonly couponDiscount = computed(() => this.apiCart()?.couponDiscountPreview ?? 0);
  readonly businessName = computed(() => this.apiCart()?.businessName ?? this.businessSlug());
  readonly hasItems = computed(() => this.items().length > 0);
  readonly itemCount = computed(() => this.items().reduce((s, i) => s + i.quantity, 0));

  // ── Checkout state ───────────────────────────────────────────────────────
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
  readonly customerNote = signal('');
  readonly noteDraft = signal('');
  readonly isNoteSheetOpen = signal(false);

  readonly selectedLocation = toSignal(this.locationService.selectedLocation$, {
    initialValue: this.locationService.snapshot,
  });
  readonly userProfile = toSignal(this.userMgmt.userProfile$, { initialValue: null });

  readonly selectedAddress = computed(
    () => this.addresses().find(a => a.id === this.selectedAddressId()) ?? null
  );
  readonly isAddressSelected = computed(
    () => !!this.selectedAddressId() || this.locationService.snapshot.type !== 'none'
  );
  readonly canPlaceOrder = computed(
    () =>
      this.hasItems() &&
      this.isLoggedIn() &&
      this.selectedOrderType() !== null &&
      (this.selectedOrderType() !== 'delivery' || this.isAddressSelected())
  );
  readonly total = computed(() => this.pricingBreakdown()?.total ?? 0);

  readonly isDineInEnabled = computed(() => this.orderConfigService.isOrderTypeEnabled('dine-in'));
  readonly isTakeoutEnabled = computed(() => this.orderConfigService.isOrderTypeEnabled('takeout'));
  readonly isDeliveryEnabled = computed(() => this.orderConfigService.isOrderTypeEnabled('delivery'));

  readonly deliveryAddressLabel = computed(() => {
    const addr = this.selectedAddress();
    if (!addr) return this.selectedLocation().label ?? '';
    return addr.type ?? addr.name ?? '';
  });
  readonly deliveryAddressShort = computed(() => {
    const addr = this.selectedAddress();
    if (!addr) return this.selectedLocation().address ?? '';
    return [addr.houseAndStreet, addr.town].filter(Boolean).join(', ');
  });

  readonly billSheetPricingConfig: PricingSummaryConfig = {
    showHeader: false,
    showCouponAction: false,
    variant: 'cart',
    freeDeliveryThreshold: 500,
  };

  readonly contactLabel = computed(() => {
    const profile = this.userProfile();
    if (!profile) return '';
    return profile.name ? `${profile.name}, ${profile.phoneNumber ?? ''}` : (profile.phoneNumber ?? '');
  });

  readonly paymentMethodLabel = computed(() =>
    this.selectedPaymentMethod() === 'cash'
      ? this.i18n.translate('payment.cash')
      : this.i18n.translate('payment.online')
  );

  // ── HTML-facing aliases / display helpers ────────────────────────────────
  readonly restaurantName = computed(() => this.businessName());
  readonly deliveryEtaLabel = computed(() => '20–30 min');
  readonly shortAddress = computed(() => {
    const addr = this.selectedAddress();
    if (addr) return [addr.houseAndStreet, addr.town].filter(Boolean).join(', ');
    return this.selectedLocation().address ?? '';
  });
  readonly restaurantNote = computed(() => this.customerNote());
  readonly billOriginalTotal = computed(() => {
    const pb = this.pricingBreakdown();
    return pb ? pb.total + (pb.savings?.totalSavings ?? 0) : 0;
  });

  // ── UI panel state ────────────────────────────────────────────────────────
  readonly isBillSheetOpen = signal(false);
  readonly isPaymentSheetOpen = signal(false);

  // ── Item editing — disabled until catalog integration ────────────────────
  readonly isEditItemSheetOpen = computed(() => false as boolean);
  readonly editingItem = computed(() => null as null);
  readonly editingItemQuantity = computed(() => 1);

  private destroyed = false;

  constructor() {
    this.init();
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

    await this.checkAuth();
    if (this.isLoggedIn()) await this.loadAddresses();

    // Load this business's cart from the API (in case it hasn't been loaded yet)
    const slug = this.businessSlug();
    if (slug && !this.apiCart()) {
      await this.cartApi.loadCart(slug).catch(() => {});
    }

    await this.calculatePricing();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  // ── Auth & Addresses ─────────────────────────────────────────────────────

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
    const matchedByLabel = locSnap.type === 'saved'
      ? addrs.find(a => a.type === locSnap.label)
      : null;

    if (matchedByLabel) {
      this.selectedAddressId.set(matchedByLabel.id);
    } else if (!this.selectedAddressId()) {
      const defaultAddr = addrs.find(a => a.isDefault) ?? addrs[0];
      this.selectedAddressId.set(defaultAddr.id);
    }
  }

  // ── Pricing ──────────────────────────────────────────────────────────────

  private async calculatePricing(): Promise<void> {
    let config = this.pricingConfig();
    if (!config) {
      config = await this.pricingService.getPricingConfig();
      this.pricingConfig.set(config);
    }
    const breakdown = await this.pricingService.calculatePricing({
      cartItems: [],          // pricing service uses subtotal, not individual items
      subtotal: this.subtotal(),
      orderType: this.selectedOrderType(),
      deliveryAddress: this.selectedAddress(),
      appliedCoupon: this.couponCode()
        ? { coupon: { code: this.couponCode()! } as never, discountAmount: this.couponDiscount() }
        : null,
      pricingConfig: config,
    });
    this.pricingBreakdown.set(breakdown);
  }

  // ── Order type / table / guests ──────────────────────────────────────────

  async onOrderTypeChange(type: OrderType): Promise<void> {
    if (!this.orderConfigService.isOrderTypeEnabled(type)) return;
    this.selectedOrderType.set(type);
    this.orderTypeError.set('');
    if (type !== 'dine-in') this.selectedTable.set('');
    if (type !== 'takeout') this.scheduledPickupTime.set('');
    await this.calculatePricing();
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

  // ── Cart item qty actions ─────────────────────────────────────────────────

  async onIncrement(item: ApiCartItem): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    await this.cartApi.updateQty(slug, item.id, item.quantity + 1);
    await this.calculatePricing();
  }

  async onDecrement(item: ApiCartItem): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    await this.cartApi.updateQty(slug, item.id, item.quantity - 1);
    await this.calculatePricing();
  }

  async clearCart(): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    await this.cartApi.clearCart(slug);
  }

  // ── Bill / Payment sheets ─────────────────────────────────────────────────
  openBillSheet(): void { this.isBillSheetOpen.set(true); }
  closeBillSheet(): void { this.isBillSheetOpen.set(false); }
  openPaymentSheet(): void { this.isPaymentSheetOpen.set(true); }
  closePaymentSheet(): void { this.isPaymentSheetOpen.set(false); }
  selectPaymentAndClose(method: 'cash' | 'online'): void {
    this.selectedPaymentMethod.set(method);
    this.isPaymentSheetOpen.set(false);
  }

  // ── Item editor (no-op until catalog integration) ─────────────────────────
  openItemEditor(_item: ApiCartItem): void { /* noop */ }
  closeItemEditor(): void { /* noop */ }
  async onEditItemApplied(_event: unknown): Promise<void> { /* noop */ }

  // ── Misc ──────────────────────────────────────────────────────────────────
  shareCart(): void { /* no-op */ }
  addMoreItems(): void { this.goToMenu(); }

  // ── Coupon ────────────────────────────────────────────────────────────────

  async onCouponApplied(code: string): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    const result = await this.cartApi.applyCoupon(slug, code);
    if (result.success) {
      await this.calculatePricing();
    }
  }

  async onCouponRemoved(): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    await this.cartApi.removeCoupon(slug);
    await this.calculatePricing();
  }

  navigateToCoupons(): void {
    this.router.navigate(['/coupons'], {
      queryParams: { business: this.businessSlug() },
    });
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  openNoteSheet(): void {
    this.noteDraft.set(this.customerNote());
    this.isNoteSheetOpen.set(true);
  }

  saveNote(): void {
    this.customerNote.set(this.noteDraft().trim());
    this.isNoteSheetOpen.set(false);
  }

  closeNoteSheet(): void {
    this.isNoteSheetOpen.set(false);
  }

  updateNoteDraft(value: string): void {
    this.noteDraft.set(value);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goToMenu(): void {
    const slug = this.businessSlug();
    this.router.navigate(['/listing'], { queryParams: slug ? { businessSlug: slug } : {} });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/signin'], {
      queryParams: { returnUrl: `/cart?business=${this.businessSlug()}` },
    });
  }

  goToAddAddress(): void {
    this.router.navigate(['/add-address'], { queryParams: { mode: 'checkout' } });
  }

  // ── Order placement ──────────────────────────────────────────────────────

  async placeOrder(): Promise<void> {
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
    const proceed = await firstValueFrom(dialogRef.afterClosed());
    if (!proceed) return;

    try {
      this.isProcessingOrder.set(true);
      this.orderProcessing.startProcessing();

      await this.orderProcessing.processStageWithDelay('validating', 1200);

      const slug = this.businessSlug();
      const summary = await this.cartApi.getCheckoutSummary(slug);

      if (!summary.canProceed) {
        const unavailable = summary.unavailableItems.map(i => i.productName).join(', ');
        this.orderProcessing.updateStage('error', `Some items are unavailable: ${unavailable}`);
        await new Promise(r => setTimeout(r, 3000));
        return;
      }

      await this.orderProcessing.processStageWithDelay('creating', 1000);

      const cart = this.apiCart()!;
      const addr = this.selectedAddress();

      const options: CreateOrderOptions = {
        orderType: this.selectedOrderType()!,
        paymentMethod: this.selectedPaymentMethod(),
        deliveryAddressId: addr?.id ?? null,
        tableNumber: this.selectedOrderType() === 'dine-in' ? this.selectedTable() : null,
        numberOfGuests: this.selectedOrderType() === 'dine-in' ? this.numberOfGuests() : null,
        couponCode: this.couponCode(),
        customerNotes: this.customerNote() || null,
      };

      // Map ApiCartItem → CartItem shape expected by OrderMapper
      const cartItems = summary.items.map(i => ({
        id: i.productId,
        name: i.productName,
        price: i.currentPrice,
        qty: i.quantity,
        selectedVariationId: i.variationId ?? undefined,
      } as never));

      await this.orderProcessing.processStageWithDelay('processing', 800);

      const order = await firstValueFrom(
        this.orderApi.createOrder(
          { items: cartItems, businessId: cart.businessId },
          options
        )
      );

      await this.orderProcessing.processStageWithDelay('confirming', 1200);
      this.orderProcessing.updateStage('completed');

      await new Promise(r => setTimeout(r, 2000));

      await this.cartApi.clearCart(slug);
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
      this.orderTypeError.set(this.orderConfigService.getMessage('general', 'orderTypeRequired'));
      return false;
    }
    if (this.selectedOrderType() === 'dine-in' && this.orderConfigService.shouldShowDineInDetails()) {
      if (!this.selectedTable()) {
        this.orderTypeError.set(this.orderConfigService.getMessage('dineIn', 'tableRequired'));
        return false;
      }
      const table = this.availableTables().find(t => t.id === this.selectedTable());
      if (!table?.isAvailable) {
        this.orderTypeError.set(this.orderConfigService.getMessage('dineIn', 'tableUnavailable'));
        return false;
      }
    }
    if (this.selectedOrderType() === 'delivery' && !this.isAddressSelected()) {
      this.orderTypeError.set(this.orderConfigService.getMessage('delivery', 'addressRequired'));
      return false;
    }
    this.orderTypeError.set('');
    return true;
  }
}
