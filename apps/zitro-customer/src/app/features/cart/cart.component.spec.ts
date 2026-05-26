import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CartComponent } from './cart.component';

describe('CartComponent', () => {
  let component: CartComponent;
  let mockCartService: any;
  let mockCouponService: any;
  let mockOrderService: any;
  let mockOrderProcessingService: any;
  let mockFirebaseAuthService: any;
  let mockUserManagementService: any;
  let mockRouter: any;
  let mockDialog: any;
  let mockAnalyticsService: any;

  beforeEach(() => {
    mockCartService = {
      getCart: vi.fn(() => []),
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      clearCart: vi.fn(),
      getTotal: vi.fn(() => 0),
      refreshCartItemsFromFirebase: vi.fn().mockResolvedValue(undefined),
      cartChanged: {
        subscribe: vi.fn((callback: () => void) => {
          callback();
          return { unsubscribe: vi.fn() };
        }),
      },
    };

    mockCouponService = {
      validateCoupon: vi.fn(),
    };

    mockOrderService = {
      appSettingsService: {
        getCheckoutSettings: vi.fn().mockResolvedValue({
          deliveryFee: 40,
          packagingChargesPerItem: 5,
          openTime: '09:00',
          closeTime: '22:00',
        }),
      },
    };

    mockOrderProcessingService = {
      processing$: {
        subscribe: vi.fn(),
      },
      startProcessing: vi.fn(),
      processStageWithDelay: vi.fn().mockResolvedValue(undefined),
    };

    mockFirebaseAuthService = {
      isGuestMode: vi.fn(() => false),
    };

    mockUserManagementService = {
      isLoggedIn: vi.fn().mockResolvedValue(false),
      getCurrentUserPhone: vi.fn().mockResolvedValue('1234567890'),
      getUserData: vi.fn().mockResolvedValue({
        addresses: [],
      }),
      updateUserAddresses: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
      events: {
        pipe: vi.fn(() => ({
          subscribe: vi.fn(),
        })),
      },
    };

    mockDialog = {
      open: vi.fn(() => ({
        afterClosed: vi.fn(() => Promise.resolve(true)),
      })),
    };

    mockAnalyticsService = {
      logScreenView: vi.fn().mockResolvedValue(undefined),
      logViewCart: vi.fn().mockResolvedValue(undefined),
      logBeginCheckout: vi.fn().mockResolvedValue(undefined),
      logAddPaymentInfo: vi.fn().mockResolvedValue(undefined),
      logAddShippingInfo: vi.fn().mockResolvedValue(undefined),
      logApplyCoupon: vi.fn().mockResolvedValue(undefined),
      logEvent: vi.fn().mockResolvedValue(undefined),
    };

    component = new CartComponent(
      mockCartService,
      mockCouponService,
      mockOrderService,
      mockOrderProcessingService,
      mockFirebaseAuthService,
      mockUserManagementService,
      mockRouter,
      mockDialog,
      mockAnalyticsService,
    );

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Component Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it('should initialize with default values', () => {
      expect(component.selectedPaymentMethod).toBe('cash');
      expect(component.deliveryCharge).toBe(40);
      expect(component.appliedCoupon).toBeNull();
    });

    it('should load cart on init', async () => {
      await component.ngOnInit();

      expect(mockCartService.getCart).toHaveBeenCalled();
    });

    it('should fetch packaging charges on init', async () => {
      await component.ngOnInit();

      expect(
        mockOrderService.appSettingsService.getCheckoutSettings,
      ).toHaveBeenCalled();
      expect(component.packagingChargesPerItem).toBe(5);
    });
  });

  describe('Cart Operations', () => {
    it('should add item to cart', () => {
      const mockItem = { id: '1', name: 'Pizza', price: 299 };

      component.addToCart(mockItem);

      expect(mockCartService.addToCart).toHaveBeenCalledWith(mockItem);
    });

    it('should remove item from cart', () => {
      const mockItem = { id: '1', name: 'Pizza', price: 299 };

      component.removeFromCart(mockItem);

      expect(mockCartService.removeFromCart).toHaveBeenCalledWith(
        mockItem,
        true,
      );
    });

    it('should clear cart', () => {
      component.clearCart();

      expect(mockCartService.clearCart).toHaveBeenCalled();
    });
  });

  describe('Cart Calculations', () => {
    beforeEach(() => {
      mockCartService.getTotal.mockReturnValue(300);
      component.cart = [
        { name: 'Item 1', price: 150, qty: 1 },
        { name: 'Item 2', price: 150, qty: 1 },
      ];
      component.pricingConfig = {
        currency: 'INR',
        delivery: {
          enabled: true,
          apply: true,
          base_fee: 40,
          per_km_fee: 0,
          free_delivery_above: 250,
          surge_multiplier: 1,
          max_delivery_cap: 0,
        },
        platform_fee: { enabled: true, apply: true, flat_fee: 5 },
        packaging: { enabled: true, apply: true, default_fee: 5, type: 'flat' },
        gst: { enabled: true, apply: true, food_percent: 5 },
        rounding: { enabled: false, apply: false, type: 'none' },
      };
    });

    it('should calculate subtotal correctly', () => {
      expect(component.subtotal).toBe(300);
    });

    it('should calculate total packaging charges based on items', () => {
      expect(component.totalPackagingCharges).toBe(10); // 2 items * 5
    });

    it('should check free delivery eligibility', () => {
      expect(component.isEligibleForFreeDelivery).toBe(true);
    });

    it('should calculate delivery charge as 0 for free delivery', () => {
      expect(component.currentDeliveryCharge).toBe(0);
    });

    it('should calculate delivery charge when not eligible for free delivery', () => {
      mockCartService.getTotal.mockReturnValue(200);
      component.pricingConfig.delivery.free_delivery_above = 250;

      expect(component.currentDeliveryCharge).toBe(40);
    });

    it('should calculate total with all charges applied', () => {
      mockCartService.getTotal.mockReturnValue(200);
      component.pricingConfig.delivery.free_delivery_above = 250;
      component.cart = [{ name: 'Item', price: 200, qty: 1 }];

      const total = component.total;

      // 200 + 40 (delivery) + 5 (platform) + 5 (packaging) + 10 (GST 5% of 200) = 260
      expect(total).toBe(260);
    });

    it('should apply coupon discount to total', () => {
      mockCartService.getTotal.mockReturnValue(300);
      component.appliedCoupon = {
        coupon: {
          code: 'TEST10',
          discount: 10,
          discountType: 'percentage',
        } as any,
        discountAmount: 30,
      };

      // 300 + 0 (free delivery) + 5 (platform) + 10 (packaging for 2 items) + 15 (GST 5% of 300) - 30 (coupon) = 300
      expect(component.total).toBe(300);
    });
  });

  describe('Login Flow', () => {
    it('should set pendingCheckout flag when going to login', () => {
      component.goToLogin();

      expect(localStorage.getItem('pendingCheckout')).toBe('true');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/signin'], {
        queryParams: { returnUrl: '/cart' },
      });
    });

    it('should navigate to login with return URL', () => {
      component.goToLogin();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/signin'], {
        queryParams: { returnUrl: '/cart' },
      });
    });
  });

  describe('Address Management', () => {
    beforeEach(() => {
      component.pricingConfig = {
        currency: 'INR',
        delivery: {
          enabled: true,
          apply: true,
          base_fee: 40,
          per_km_fee: 0,
          free_delivery_above: 250,
          surge_multiplier: 1,
          max_delivery_cap: 0,
        },
        platform_fee: { enabled: false, apply: false, flat_fee: 0 },
        packaging: {
          enabled: false,
          apply: false,
          default_fee: 0,
          type: 'flat',
        },
        gst: { enabled: false, apply: false, food_percent: 0 },
        rounding: { enabled: false, apply: false, type: 'none' },
      };
    });

    it('should load user addresses when logged in', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockResolvedValue({
        addresses: [
          {
            name: 'Home',
            houseAndStreet: '123 Main St',
            phone: '1234567890',
            pincode: '123456',
            town: 'Town',
            state: 'State',
            type: 'Home',
            isDefault: true,
          },
        ],
      });

      await component.checkUserLoggedIn();
      await component.loadUserAddresses();

      expect(mockUserManagementService.getUserData).toHaveBeenCalledWith(
        '1234567890',
      );
      expect(component.userAddresses.length).toBe(1);
    });

    it('should not load addresses when not logged in', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(false);
      await component.checkUserLoggedIn();

      await component.loadUserAddresses();

      expect(mockUserManagementService.getUserData).not.toHaveBeenCalled();
    });

    it('should navigate to manage addresses page', () => {
      component.goToManageAddresses();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/addresses']);
    });

    it('should handle error loading addresses', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(true);
      mockUserManagementService.getUserData.mockRejectedValue(
        new Error('Network error'),
      );

      await component.checkUserLoggedIn();
      await component.loadUserAddresses();

      expect(console.error).toHaveBeenCalled();
      expect(component.userAddresses).toEqual([]);
    });
  });

  describe('User State', () => {
    beforeEach(() => {
      component.pricingConfig = {
        currency: 'INR',
        delivery: {
          enabled: true,
          apply: true,
          base_fee: 40,
          per_km_fee: 0,
          free_delivery_above: 250,
          surge_multiplier: 1,
          max_delivery_cap: 0,
        },
        platform_fee: { enabled: false, apply: false, flat_fee: 0 },
        packaging: {
          enabled: false,
          apply: false,
          default_fee: 0,
          type: 'flat',
        },
        gst: { enabled: false, apply: false, food_percent: 0 },
        rounding: { enabled: false, apply: false, type: 'none' },
      };
    });

    it('should allow order confirmation when logged in with address and items', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(true);
      await component.checkUserLoggedIn();
      component.cart = [{ name: 'Item', price: 100 }];
      component.selectedAddressId = 'address-1';

      expect(component.canPlaceOrder).toBe(true);
    });

    it('should not allow order confirmation when not logged in', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(false);
      await component.checkUserLoggedIn();
      component.cart = [{ name: 'Item', price: 100 }];

      expect(component.canPlaceOrder).toBe(false);
    });

    it('should not allow order confirmation without address', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(true);
      await component.checkUserLoggedIn();
      component.cart = [{ name: 'Item', price: 100 }];
      component.selectedAddressId = '';

      expect(component.canPlaceOrder).toBe(false);
    });

    it('should not allow order confirmation with empty cart', async () => {
      mockUserManagementService.isLoggedIn.mockResolvedValue(true);
      await component.checkUserLoggedIn();
      component.cart = [];
      component.selectedAddressId = 'address-1';

      expect(component.canPlaceOrder).toBe(false);
    });
  });

  describe('Coupon Management', () => {
    it('should apply coupon', () => {
      const mockCoupon = {
        coupon: {
          code: 'TEST10',
          discount: 10,
          discountType: 'percentage',
        } as any,
        discountAmount: 30,
      };

      component.onCouponApplied(mockCoupon);

      expect(component.appliedCoupon).toEqual(mockCoupon);
    });

    it('should remove coupon', () => {
      component.appliedCoupon = {
        coupon: {
          code: 'TEST10',
          discount: 10,
          discountType: 'percentage',
        } as any,
        discountAmount: 30,
      };

      component.onCouponRemoved();

      expect(component.appliedCoupon).toBeNull();
    });

    it('should calculate coupon discount', () => {
      component.appliedCoupon = {
        coupon: {
          code: 'TEST10',
          discount: 10,
          discountType: 'percentage',
        } as any,
        discountAmount: 50,
      };

      expect(component.couponDiscount).toBe(50);
    });

    it('should return 0 discount when no coupon applied', () => {
      component.appliedCoupon = null;

      expect(component.couponDiscount).toBe(0);
    });
  });

  describe('Navigation', () => {
    it('should navigate to listing page', () => {
      component.goToListing();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing']);
    });
  });

  describe('Delivery Message', () => {
    beforeEach(() => {
      component.pricingConfig = {
        currency: 'INR',
        delivery: {
          enabled: true,
          apply: true,
          base_fee: 40,
          per_km_fee: 0,
          free_delivery_above: 250,
          surge_multiplier: 1,
          max_delivery_cap: 0,
        },
        platform_fee: { enabled: false, apply: false, flat_fee: 0 },
        packaging: {
          enabled: false,
          apply: false,
          default_fee: 0,
          type: 'flat',
        },
        gst: { enabled: false, apply: false, food_percent: 0 },
        rounding: { enabled: false, apply: false, type: 'none' },
      };
    });

    it('should show amount needed for free delivery', () => {
      mockCartService.getTotal.mockReturnValue(200);

      const message = component.deliveryMessage;

      expect(message).toContain('50.00');
      expect(message).toContain('free delivery');
    });

    it('should show empty message when eligible for free delivery', () => {
      mockCartService.getTotal.mockReturnValue(300);

      expect(component.deliveryMessage).toBe('');
    });
  });

  describe('Cart State', () => {
    it('should detect cart with items', () => {
      component.cart = [{ name: 'Item', price: 100 }];

      expect(component.hasItems).toBe(true);
    });

    it('should detect empty cart', () => {
      component.cart = [];

      expect(component.hasItems).toBe(false);
    });
  });

  describe('Address Selection', () => {
    it('should detect selected address', () => {
      component.selectedAddressId = 'address-1';

      expect(component.isAddressSelected).toBe(true);
    });

    it('should detect no address selected', () => {
      component.selectedAddressId = '';

      expect(component.isAddressSelected).toBe(false);
    });

    it('should get selected address object', () => {
      const mockAddress = {
        name: 'Home',
        houseAndStreet: '123 Main St',
        phone: '1234567890',
        pincode: '123456',
        town: 'Test Town',
        state: 'Test State',
        type: 'Home',
        isDefault: true,
      };
      component.userAddresses = [mockAddress];
      component.selectedAddressId = `Home_1234567890_123456`;

      const selected = component.selectedAddress;

      expect(selected).toEqual(mockAddress);
    });

    it('should return null when no address selected', () => {
      component.userAddresses = [];
      component.selectedAddressId = '';

      expect(component.selectedAddress).toBeNull();
    });
  });

  describe('Address Display', () => {
    it('should generate address ID', () => {
      const address = {
        name: 'Home',
        phone: '1234567890',
        pincode: '123456',
        houseAndStreet: '123 Main St',
        landmark: 'Near Park',
        town: 'Test Town',
        state: 'Test State',
        type: 'Home' as const,
        isDefault: true,
      };

      const id = component.getAddressId(address);

      expect(id).toBe('Home_1234567890_123456');
    });

    it('should format full address display text', () => {
      const address = {
        name: 'John',
        houseAndStreet: '123',
        landmark: 'Park',
        town: 'Town',
        state: 'State',
        pincode: '123456',
        phone: '1234567890',
        type: 'Home' as const,
        isDefault: true,
      };

      const text = component.getAddressDisplayText(address);

      expect(text).toContain('John');
      expect(text).toContain('123');
      expect(text).toContain('Park');
      expect(text).toContain('Town');
    });

    it('should truncate long address display text', () => {
      const address = {
        name: 'Very Long Name For Testing',
        houseAndStreet: 'Very Long Street Name That Should Be Truncated',
        landmark: 'Very Long Landmark Name',
        town: 'Very Long Town Name',
        state: 'Very Long State Name',
        pincode: '123456',
        phone: '1234567890',
        type: 'Home' as const,
        isDefault: true,
      };

      const text = component.getAddressDisplayText(address);

      expect(text.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Pricing Configuration', () => {
    describe('Delivery Charges', () => {
      it('should apply delivery charge when enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.currentDeliveryCharge).toBe(40);
        expect(component.total).toBe(240); // 200 + 40
      });

      it('should not apply delivery charge when enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: false,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.originalDeliveryCharge).toBe(40);
        expect(component.totalSavings).toBe(40); // Saved delivery charge
        expect(component.total).toBe(200); // 200 only
      });

      it('should not apply delivery when enabled=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);

        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.originalDeliveryCharge).toBe(0);
      });

      it('should apply free delivery when threshold met and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 250,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(300);
        component.cart = [{ name: 'Item', price: 300, qty: 1 }];

        expect(component.isEligibleForFreeDelivery).toBe(true);
        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.totalSavings).toBe(40); // Free delivery savings
        expect(component.total).toBe(300);
      });

      it('should apply surge multiplier to delivery charge', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1.5,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);

        expect(component.currentDeliveryCharge).toBe(60); // 40 * 1.5
      });

      it('should cap delivery charge at max_delivery_cap', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 2,
            max_delivery_cap: 50,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);

        expect(component.currentDeliveryCharge).toBe(50); // Capped at 50 instead of 80 (40 * 2)
      });
    });

    describe('Platform Fee', () => {
      it('should apply platform fee when enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: true, flat_fee: 5 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.platformFee).toBe(5);
        expect(component.total).toBe(205); // 200 + 5
      });

      it('should not apply platform fee when enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.platformFee).toBe(0);
        expect(component.originalPlatformFee).toBe(5);
        expect(component.totalSavings).toBe(5); // Saved platform fee
        expect(component.total).toBe(200);
      });

      it('should not apply platform fee when enabled=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: true, flat_fee: 5 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);

        expect(component.platformFee).toBe(0);
        expect(component.originalPlatformFee).toBe(0);
      });
    });

    describe('Packaging Charges', () => {
      it('should apply packaging charges when enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: true,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];

        expect(component.totalPackagingCharges).toBe(20); // 2 items * 10
        expect(component.total).toBe(220); // 200 + 20
      });

      it('should not apply packaging charges when enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: true,
            apply: false,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];

        expect(component.totalPackagingCharges).toBe(0);
        expect(component.originalPackagingCharges).toBe(20); // 2 items * 10
        expect(component.totalSavings).toBe(20); // Saved packaging charges
        expect(component.total).toBe(200);
      });

      it('should not apply packaging when enabled=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.totalPackagingCharges).toBe(0);
        expect(component.originalPackagingCharges).toBe(0);
      });
    });

    describe('GST Calculations', () => {
      it('should apply GST when enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: true, apply: true, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.gstAmount).toBe(10); // 5% of 200
        expect(component.total).toBe(210); // 200 + 10
      });

      it('should not apply GST when enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: true, apply: false, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.gstAmount).toBe(0);
        expect(component.totalSavings).toBe(10); // Saved GST (5% of 200)
        expect(component.total).toBe(200);
      });

      it('should not apply GST when enabled=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: true, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);

        expect(component.gstAmount).toBe(0);
      });
    });

    describe('Rounding', () => {
      it('should round total when enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 45,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: true, apply: true, type: 'nearest_rupee' },
        };
        mockCartService.getTotal.mockReturnValue(200.7);
        component.cart = [{ name: 'Item', price: 200.7, qty: 1 }];

        expect(component.total).toBe(246); // Rounded from 245.7 (200.7 + 45)
      });

      it('should not round when enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 45,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: true, apply: false, type: 'nearest_rupee' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.total).toBe(245); // Not rounded
      });
    });

    describe('Combined Scenarios', () => {
      it('should apply all charges when all enabled=true and apply=true', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: true, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: true, food_percent: 5 },
          rounding: { enabled: true, apply: true, type: 'nearest_rupee' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];

        expect(component.currentDeliveryCharge).toBe(40);
        expect(component.platformFee).toBe(5);
        expect(component.totalPackagingCharges).toBe(20); // 2 * 10
        expect(component.gstAmount).toBe(10); // 5% of 200
        expect(component.total).toBe(275); // 200 + 40 + 5 + 20 + 10
      });

      it('should show all savings when all enabled=true but apply=false', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: false,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: false,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: false, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];

        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.platformFee).toBe(0);
        expect(component.totalPackagingCharges).toBe(0);
        expect(component.gstAmount).toBe(0);
        expect(component.total).toBe(200); // Only subtotal
        expect(component.totalSavings).toBe(75); // 40 + 5 + 20 + 10
      });

      it('should calculate total with coupon discount', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: true, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: true, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];
        component.appliedCoupon = {
          coupon: {
            code: 'SAVE20',
            discount: 20,
            discountType: 'percentage',
          } as any,
          discountAmount: 40,
        };

        expect(component.total).toBe(235); // 200 + 40 + 5 + 20 + 10 - 40
        expect(component.totalSavings).toBe(40); // Coupon savings
      });

      it('should combine free delivery and other savings', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 250,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: false,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: false, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(300);
        component.cart = [
          { name: 'Item 1', price: 150, qty: 1 },
          { name: 'Item 2', price: 150, qty: 1 },
        ];

        expect(component.isEligibleForFreeDelivery).toBe(true);
        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.total).toBe(300); // Only subtotal
        expect(component.totalSavings).toBe(80); // 40 (free delivery) + 5 (platform) + 20 (packaging) + 15 (GST 5% of 300)
      });

      it('should handle mixed scenarios correctly', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: false, food_percent: 5 },
          rounding: { enabled: true, apply: true, type: 'nearest_rupee' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [
          { name: 'Item 1', price: 100, qty: 1 },
          { name: 'Item 2', price: 100, qty: 1 },
        ];

        expect(component.currentDeliveryCharge).toBe(40);
        expect(component.platformFee).toBe(0); // Not applied
        expect(component.totalPackagingCharges).toBe(20); // Applied
        expect(component.gstAmount).toBe(0); // Not applied
        expect(component.total).toBe(260); // 200 + 40 + 20, rounded
        expect(component.totalSavings).toBe(15); // 5 (platform) + 10 (GST)
      });
    });

    describe('Total Savings Scenarios', () => {
      it('should calculate savings with free delivery from threshold', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 250,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(300);
        component.cart = [{ name: 'Item', price: 300, qty: 1 }];

        expect(component.totalSavings).toBe(40); // Free delivery savings
      });

      it('should calculate savings from unapplied charges', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: false,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: false,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: false, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        const expectedSavings = 40 + 5 + 10 + 10; // delivery + platform + packaging + GST
        expect(component.totalSavings).toBe(expectedSavings);
      });

      it('should not double count free delivery when apply=false and threshold met', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: false,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 250,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(300);
        component.cart = [{ name: 'Item', price: 300, qty: 1 }];

        // When apply=false, delivery savings only count if NOT eligible for free delivery
        // Here we ARE eligible (300 >= 250), so no savings counted to avoid confusion
        expect(component.totalSavings).toBe(0);
      });

      it('should calculate total savings with coupon', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: false,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: false, flat_fee: 5 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];
        component.appliedCoupon = {
          coupon: { code: 'SAVE50', discount: 50, discountType: 'flat' } as any,
          discountAmount: 50,
        };

        expect(component.totalSavings).toBe(95); // 40 + 5 + 50
      });
    });

    describe('Edge Cases', () => {
      it('should handle zero subtotal', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: true,
            apply: true,
            base_fee: 40,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: true, apply: true, flat_fee: 5 },
          packaging: {
            enabled: true,
            apply: true,
            default_fee: 10,
            type: 'flat',
          },
          gst: { enabled: true, apply: true, food_percent: 5 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(0);
        component.cart = [];

        expect(component.gstAmount).toBe(0);
        expect(component.total).toBe(45); // 0 + 40 + 5 + 0
      });

      it('should handle null pricingConfig gracefully', () => {
        component.pricingConfig = null;
        mockCartService.getTotal.mockReturnValue(200);
        component.cart = [{ name: 'Item', price: 200, qty: 1 }];

        expect(component.currentDeliveryCharge).toBe(0);
        expect(component.platformFee).toBe(0);
        expect(component.totalPackagingCharges).toBe(0);
        expect(component.gstAmount).toBe(0);
      });

      it('should not allow negative totals', () => {
        component.pricingConfig = {
          currency: 'INR',
          delivery: {
            enabled: false,
            apply: false,
            base_fee: 0,
            per_km_fee: 0,
            free_delivery_above: 500,
            surge_multiplier: 1,
            max_delivery_cap: 0,
          },
          platform_fee: { enabled: false, apply: false, flat_fee: 0 },
          packaging: {
            enabled: false,
            apply: false,
            default_fee: 0,
            type: 'flat',
          },
          gst: { enabled: false, apply: false, food_percent: 0 },
          rounding: { enabled: false, apply: false, type: 'none' },
        };
        mockCartService.getTotal.mockReturnValue(50);
        component.cart = [{ name: 'Item', price: 50, qty: 1 }];
        component.appliedCoupon = {
          coupon: { code: 'MEGA', discount: 100, discountType: 'flat' } as any,
          discountAmount: 100,
        };

        expect(component.total).toBe(0); // Should not go negative
      });
    });
  });
});
