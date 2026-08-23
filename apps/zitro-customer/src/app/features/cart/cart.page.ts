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
  CartItemRowComponent,
  CouponSelectorCartComponent,
} from '@zitro/ui';
import {
  CartApiService,
  OrderApiService,
  OrderProcessingService,
  UserManagementService,
  OrderConfigService,
  PricingApiService,
  LocationSelectionService,
  AnalyticsService,
  AddressApiService,
} from '@zitro/services';
import type {
  ApiCartItem,
  AppliedCoupon,
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
    CartItemRowComponent,
    CouponSelectorCartComponent,
  ],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly cartApi = inject(CartApiService);
  private readonly orderApi = inject(OrderApiService);
  private readonly orderProcessing = inject(OrderProcessingService);
  private readonly userMgmt = inject(UserManagementService);
  private readonly orderConfigService = inject(OrderConfigService);
  private readonly pricingService = inject(PricingApiService);
  private readonly locationService = inject(LocationSelectionService);
  private readonly analytics = inject(AnalyticsService);
  private readonly addressApi = inject(AddressApiService);
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(I18nService);

  readonly processingStage = toSignal(this.orderProcessing.processing$);

  // ── Query param → current business slug ─────────────────────────────────
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {},
  });
  readonly businessSlug = computed(
    () => (this.queryParams() as Record<string, string>)['business'] ?? '',
  );

  // ── Cart from API state ──────────────────────────────────────────────────
  readonly apiCart = computed(() =>
    this.cartApi.getCartForBusiness(this.businessSlug()),
  );
  readonly items = computed(() => this.apiCart()?.items ?? []);
  readonly subtotal = computed(() => this.apiCart()?.estimatedTotal ?? 0);
  readonly couponCode = computed(() => this.apiCart()?.couponCode ?? null);
  readonly couponDiscount = computed(
    () => this.apiCart()?.couponDiscountPreview ?? 0,
  );
  readonly appliedCoupon = computed<AppliedCoupon | null>(() => {
    const code = this.couponCode();
    if (!code) return null;
    return {
      coupon: { code, title: code } as never,
      discountAmount: this.couponDiscount(),
    };
  });
  readonly businessName = computed(
    () => this.apiCart()?.businessName ?? this.businessSlug(),
  );
  readonly hasItems = computed(() => this.items().length > 0);
  readonly itemCount = computed(() =>
    this.items().reduce((s, i) => s + i.quantity, 0),
  );

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
  readonly deliveryNote = signal('');
  readonly deliveryNoteDraft = signal('');
  readonly isDeliveryNoteSheetOpen = signal(false);
  readonly pickupNote = signal('');
  readonly pickupNoteDraft = signal('');
  readonly isPickupNoteSheetOpen = signal(false);
  readonly dineInNote = signal('');
  readonly dineInNoteDraft = signal('');
  readonly isDineInNoteSheetOpen = signal(false);
  readonly isAddressSheetOpen = signal(false);

  readonly selectedLocation = toSignal(this.locationService.selectedLocation$, {
    initialValue: this.locationService.snapshot,
  });
  readonly userProfile = toSignal(this.userMgmt.userProfile$, {
    initialValue: null,
  });

  readonly allCarts = computed(() => this.cartApi.cartList());

  readonly selectedAddress = computed(
    () =>
      this.addresses().find((a) => a.id === this.selectedAddressId()) ?? null,
  );
  // Requires an actual saved address to be selected — falling back to "a
  // delivery location/coordinates is set" here (as this used to) let the
  // Place Order button stay enabled and validateOrderType() pass with zero
  // address chosen, since a general delivery-area location is set as soon as
  // the location gate is passed, well before any address exists. The backend
  // requires a real deliveryAddressId and rejects orders without one
  // (ADDRESS_REQUIRED) — this must agree with that.
  readonly isAddressSelected = computed(() => !!this.selectedAddressId());
  readonly canPlaceOrder = computed(
    () =>
      this.hasItems() &&
      this.isLoggedIn() &&
      this.selectedOrderType() !== null &&
      (this.selectedOrderType() !== 'delivery' || this.isAddressSelected()),
  );
  readonly total = computed(() => this.pricingBreakdown()?.total ?? 0);

  readonly isDineInEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('dine-in'),
  );
  readonly isTakeoutEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('takeout'),
  );
  readonly isDeliveryEnabled = computed(() =>
    this.orderConfigService.isOrderTypeEnabled('delivery'),
  );

  readonly selectedTableConfig = computed(
    () =>
      this.availableTables().find((t) => t.id === this.selectedTable()) ?? null,
  );

  readonly guestMax = computed(() => {
    const globalMax = this.orderConfig()?.dineInConfig.maxGuests ?? 10;
    const cap = this.selectedTableConfig()?.capacity;
    return cap ? Math.min(globalMax, cap) : globalMax;
  });

  readonly guestMin = computed(
    () => this.orderConfig()?.dineInConfig.minGuests ?? 1,
  );

  readonly canIncrementGuests = computed(
    () => this.numberOfGuests() < this.guestMax(),
  );
  readonly canDecrementGuests = computed(
    () => this.numberOfGuests() > this.guestMin(),
  );

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
    if (this.selectedOrderType() === 'delivery') {
      const addr = this.selectedAddress();
      if (!addr) return '';
      return addr.name ? `${addr.name}, ${addr.phone}` : addr.phone;
    }
    const profile = this.userProfile();
    if (!profile) return '';
    return profile.name
      ? `${profile.name}, ${profile.phoneNumber ?? ''}`
      : (profile.phoneNumber ?? '');
  });

  readonly paymentMethodLabel = computed(() =>
    this.selectedPaymentMethod() === 'cash'
      ? this.i18n.translate('payment.cash')
      : this.i18n.translate('payment.online'),
  );

  // ── HTML-facing aliases / display helpers ────────────────────────────────
  readonly restaurantName = computed(() => this.businessName());
  readonly deliveryEtaLabel = computed(() => '20–30 min');
  readonly shortAddress = computed(() => {
    const addr = this.selectedAddress();
    if (addr)
      return [addr.houseAndStreet, addr.town].filter(Boolean).join(', ');
    return this.selectedLocation().address ?? '';
  });
  readonly restaurantNote = computed(() => this.customerNote());
  readonly billOriginalTotal = computed(() => {
    const pb = this.pricingBreakdown();
    return pb ? pb.total + (pb.savings?.totalSavings ?? 0) : 0;
  });

  // ── Cutlery preference ─────────────────────────────────────────────────────
  readonly dontSendCutlery = signal(false);

  toggleCutlery(): void {
    this.dontSendCutlery.update((v) => !v);
  }

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
    this.pricingConfig.set(await this.pricingService.loadConfig());

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
      await this.cartApi.loadCart(slug).catch(() => {
        /* no-op */
      });
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
      next: (addrs) => {
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
        ? addrs.find((a) => a.type === locSnap.label)
        : null;

    if (matchedByLabel) {
      this.selectedAddressId.set(matchedByLabel.id);
    } else if (!this.selectedAddressId()) {
      const defaultAddr = addrs.find((a) => a.isDefault) ?? addrs[0];
      this.selectedAddressId.set(defaultAddr.id);
    }
  }

  // ── Pricing ──────────────────────────────────────────────────────────────

  private async calculatePricing(): Promise<void> {
    let config = this.pricingConfig();
    if (!config) {
      config = await this.pricingService.loadConfig();
      this.pricingConfig.set(config);
    }
    const breakdown = await this.pricingService.calculatePricing({
      cartItems: [], // pricing service uses subtotal, not individual items
      subtotal: this.subtotal(),
      orderType: this.selectedOrderType(),
      deliveryAddress: this.selectedAddress(),
      appliedCoupon: this.couponCode()
        ? {
            coupon: { code: this.couponCode()! } as never,
            discountAmount: this.couponDiscount(),
          }
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
    if (this.canIncrementGuests()) this.numberOfGuests.update((n) => n + 1);
  }

  decrementGuests(): void {
    if (this.canDecrementGuests()) this.numberOfGuests.update((n) => n - 1);
  }

  onTableSelect(value: string): void {
    this.selectedTable.set(value);
    const table = this.availableTables().find((t) => t.id === value);
    if (table?.capacity && this.numberOfGuests() > table.capacity) {
      this.numberOfGuests.set(
        Math.min(
          this.orderConfig()?.dineInConfig.defaultGuests ?? 2,
          table.capacity,
        ),
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
  openBillSheet(): void {
    this.isBillSheetOpen.set(true);
  }
  closeBillSheet(): void {
    this.isBillSheetOpen.set(false);
  }
  openPaymentSheet(): void {
    this.isPaymentSheetOpen.set(true);
  }
  closePaymentSheet(): void {
    this.isPaymentSheetOpen.set(false);
  }
  selectPaymentAndClose(method: 'cash' | 'online'): void {
    this.selectedPaymentMethod.set(method);
    this.isPaymentSheetOpen.set(false);
  }

  // ── Item editor (no-op until catalog integration) ─────────────────────────
  openItemEditor(_item: ApiCartItem): void {
    /* noop */
  }
  closeItemEditor(): void {
    /* noop */
  }
  async onEditItemApplied(_event: unknown): Promise<void> {
    /* noop */
  }

  // ── Misc ──────────────────────────────────────────────────────────────────
  shareCart(): void {
    /* no-op */
  }
  addMoreItems(): void {
    this.goToMenu();
  }

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

  openDeliveryNoteSheet(): void {
    this.deliveryNoteDraft.set(this.deliveryNote());
    this.isDeliveryNoteSheetOpen.set(true);
  }

  saveDeliveryNote(): void {
    this.deliveryNote.set(this.deliveryNoteDraft().trim());
    this.isDeliveryNoteSheetOpen.set(false);
  }

  closeDeliveryNoteSheet(): void {
    this.isDeliveryNoteSheetOpen.set(false);
  }

  updateDeliveryNoteDraft(value: string): void {
    this.deliveryNoteDraft.set(value);
  }

  openPickupNoteSheet(): void {
    this.pickupNoteDraft.set(this.pickupNote());
    this.isPickupNoteSheetOpen.set(true);
  }

  savePickupNote(): void {
    this.pickupNote.set(this.pickupNoteDraft().trim());
    this.isPickupNoteSheetOpen.set(false);
  }

  closePickupNoteSheet(): void {
    this.isPickupNoteSheetOpen.set(false);
  }

  updatePickupNoteDraft(value: string): void {
    this.pickupNoteDraft.set(value);
  }

  openDineInNoteSheet(): void {
    this.dineInNoteDraft.set(this.dineInNote());
    this.isDineInNoteSheetOpen.set(true);
  }

  saveDineInNote(): void {
    this.dineInNote.set(this.dineInNoteDraft().trim());
    this.isDineInNoteSheetOpen.set(false);
  }

  closeDineInNoteSheet(): void {
    this.isDineInNoteSheetOpen.set(false);
  }

  updateDineInNoteDraft(value: string): void {
    this.dineInNoteDraft.set(value);
  }

  // ── Navigation ───────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goToMenu(): void {
    const slug = this.businessSlug();
    this.router.navigate(['/listing'], {
      queryParams: slug ? { businessSlug: slug } : {},
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/signin'], {
      queryParams: { returnUrl: `/cart?business=${this.businessSlug()}` },
    });
  }

  goToAddAddress(): void {
    this.router.navigate(['/add-address'], {
      queryParams: { mode: 'checkout', business: this.businessSlug() },
    });
  }

  goToEditAddress(id?: string): void {
    const addressId = id ?? this.selectedAddressId();
    const slug = this.businessSlug();
    if (!addressId) {
      this.goToAddAddress();
      return;
    }
    this.isAddressSheetOpen.set(false);
    this.router.navigate(['/add-address'], {
      queryParams: { mode: 'checkout', addressId: addressId, business: slug },
    });
  }

  openAddressSheet(): void {
    this.isAddressSheetOpen.set(true);
  }

  closeAddressSheet(): void {
    this.isAddressSheetOpen.set(false);
  }

  selectAddress(id: string): void {
    this.selectedAddressId.set(id);
    this.isAddressSheetOpen.set(false);
  }

  addressTypeIcon(type: Address['type']): string {
    if (type === 'Home') return 'home';
    if (type === 'Office') return 'work';
    return 'location_on';
  }

  // ── Order placement ──────────────────────────────────────────────────────

  /** True when the checkout-summary items about to be charged don't match
   * (by cart-item id + quantity) what the cart page is currently showing. */
  private hasCartDiverged(checkoutItems: ApiCartItem[]): boolean {
    const displayed = this.apiCart()?.items ?? [];
    if (displayed.length !== checkoutItems.length) return true;
    const displayedQtyById = new Map(displayed.map((i) => [i.id, i.quantity]));
    return checkoutItems.some((i) => displayedQtyById.get(i.id) !== i.quantity);
  }

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

    let hadError = false;
    try {
      this.isProcessingOrder.set(true);
      this.orderProcessing.startProcessing();

      await this.orderProcessing.processStageWithDelay('validating', 1200);

      const slug = this.businessSlug();
      const summary = await this.cartApi.getCheckoutSummary(slug);

      if (!summary.canProceed) {
        const unavailable = summary.unavailableItems
          .map((i) => i.productName)
          .join(', ');
        this.orderProcessing.updateStage(
          'error',
          `Some items are unavailable: ${unavailable}`,
        );
        await new Promise((r) => setTimeout(r, 3000));
        return;
      }

      // Fast, cheap pre-check only — NOT the source of correctness. There's a
      // real window between this check and the createOrder() call below (the
      // "creating"/"processing" stage delays), so a cart mutation can still
      // land in between and this check alone can't catch it. The actual
      // guarantee is server-side: PlaceOrderHandler locks and re-reads the
      // real cart at order-creation time and rejects with CART_CHANGED
      // (handled in the catch block below) if it moved. This check just
      // avoids the round-trip in the common case where nothing raced.
      if (this.hasCartDiverged(summary.items)) {
        await this.cartApi.loadCart(slug);
        this.orderProcessing.updateStage(
          'error',
          'Your cart changed just now — please review it and try again.',
        );
        await new Promise((r) => setTimeout(r, 3000));
        return;
      }

      await this.orderProcessing.processStageWithDelay('creating', 1000);

      const cart = this.apiCart()!;
      const addr = this.selectedAddress();

      const options: CreateOrderOptions = {
        orderType: this.selectedOrderType()!,
        paymentMethod: this.selectedPaymentMethod(),
        deliveryAddressId: addr?.id ?? null,
        tableNumber:
          this.selectedOrderType() === 'dine-in' ? this.selectedTable() : null,
        numberOfGuests:
          this.selectedOrderType() === 'dine-in' ? this.numberOfGuests() : null,
        couponCode: this.couponCode(),
        customerNotes: this.customerNote() || null,
      };

      // Map ApiCartItem → CartItem shape expected by OrderMapper
      const cartItems = summary.items.map(
        (i) =>
          ({
            id: i.productId,
            name: i.productName,
            price: i.currentPrice,
            qty: i.quantity,
            selectedVariationId: i.variationId ?? undefined,
          }) as never,
      );

      await this.orderProcessing.processStageWithDelay('processing', 800);

      const order = await firstValueFrom(
        this.orderApi.createOrder(
          { items: cartItems, businessId: cart.businessId },
          options,
          slug,
        ),
      );

      await this.orderProcessing.processStageWithDelay('confirming', 1200);
      this.orderProcessing.updateStage('completed');

      await new Promise((r) => setTimeout(r, 2000));

      this.cartApi.clearLocalCart(slug);
      this.router.navigate(['/order-confirmation'], {
        queryParams: { orderId: order.orderId },
      });
    } catch (err) {
      hadError = true;
      let userMessage = this.i18n.translate('order.error.generic'); // fallback i18n key
      let details = 'Unknown error';
      hadError = true;

      // Angular HttpErrorResponse
      if (err && typeof err === 'object' && 'error' in err) {
        const apiError = (err as any).error;
        if (apiError && typeof apiError === 'object') {
          // Prefer i18n key if available, else fallback to backend message.
          // I18nService.translate() has no `fallback` option — it only takes
          // {variable} interpolation params — so a missing key used to leak
          // the raw "order.error.xxx" string straight to the user instead of
          // falling back. translate() returns the key itself when a
          // translation is missing (see its own console.warn branch), so
          // detect that here and fall back to the backend's own message.
          if (apiError.errorCode) {
            const i18nKey = `order.error.${apiError.errorCode.toLowerCase()}`;
            const translated = this.i18n.translate(i18nKey);
            userMessage =
              translated === i18nKey
                ? apiError.error || apiError.message || userMessage
                : translated;
          } else if (apiError.error) {
            userMessage = apiError.error;
          }
          details = apiError.error || apiError.message || details;

          // The server now enforces this authoritatively (locked, atomic read
          // of the real cart at order-creation time — see PlaceOrderHandler),
          // closing the race the client-side hasCartDiverged() check above
          // can't fully close on its own (there's a real window between that
          // check and the request actually landing). Refresh the display so
          // the user sees the cart the server just rejected against, same as
          // the early client-side check already does.
          if (apiError.errorCode === 'CART_CHANGED') {
            await this.cartApi.loadCart(this.businessSlug());
          }
        }
      } else if (err instanceof Error) {
        details = err.message;
      }

      this.analytics.logEvent('order_failed', {
        error: details,
        cartValue: this.subtotal(),
      });
      this.orderProcessing.updateStage('error', userMessage, details);
      await new Promise((r) => setTimeout(r, 3000));
      // Do not reset orderProcessing here, keep error stage visible
      hadError = true;
    } finally {
      this.isProcessingOrder.set(false);
      // Only reset if no error occurred
      if (!hadError) {
        this.orderProcessing.reset();
      }
    }
  }

  private validateOrderType(): boolean {
    if (!this.selectedOrderType()) {
      this.orderTypeError.set(
        this.orderConfigService.getMessage('general', 'orderTypeRequired'),
      );
      return false;
    }
    if (
      this.selectedOrderType() === 'dine-in' &&
      this.orderConfigService.shouldShowDineInDetails()
    ) {
      if (!this.selectedTable()) {
        this.orderTypeError.set(
          this.orderConfigService.getMessage('dineIn', 'tableRequired'),
        );
        return false;
      }
      const table = this.availableTables().find(
        (t) => t.id === this.selectedTable(),
      );
      if (!table?.isAvailable) {
        this.orderTypeError.set(
          this.orderConfigService.getMessage('dineIn', 'tableUnavailable'),
        );
        return false;
      }
    }
    if (this.selectedOrderType() === 'delivery' && !this.isAddressSelected()) {
      this.orderTypeError.set(
        this.orderConfigService.getMessage('delivery', 'addressRequired'),
      );
      return false;
    }
    this.orderTypeError.set('');
    return true;
  }
}
