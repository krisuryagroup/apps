import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CouponSelectorComponent } from './coupon-selector.component';
import { of, throwError } from 'rxjs';

describe('CouponSelectorComponent', () => {
  let component: CouponSelectorComponent;
  let mockCouponService: any;

  const mockCoupons = [
    {
      id: '1',
      code: 'SAVE10',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 50,
      maxDiscount: 20,
      isActive: true
    },
    {
      id: '2',
      code: 'FLAT50',
      discountType: 'flat',
      discountValue: 50,
      minOrderAmount: 200,
      maxDiscount: null,
      isActive: true
    }
  ];

  beforeEach(() => {
    mockCouponService = {
      getActiveCoupons: vi.fn().mockReturnValue(of([])),
      validateCoupon: vi.fn(),
      getCouponByCode: vi.fn()
    };

    component = new CouponSelectorComponent(mockCouponService);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.orderAmount).toBe(0);
      expect(component.cartItems).toEqual([]);
      expect(component.appliedCoupon).toBeNull();
      expect(component.availableCoupons).toEqual([]);
      expect(component.couponCode).toBe('');
      expect(component.isLoading).toBe(false);
      expect(component.validationMessage).toBe('');
      expect(component.isValidationError).toBe(false);
      expect(component.showCouponList).toBe(false);
    });

    it('should load active coupons on init', () => {
      mockCouponService.getActiveCoupons.mockReturnValue(of(mockCoupons));

      component.ngOnInit();

      expect(mockCouponService.getActiveCoupons).toHaveBeenCalled();
      expect(component.availableCoupons).toEqual(mockCoupons);
    });

    it('should handle error loading coupons', () => {
      mockCouponService.getActiveCoupons.mockReturnValue(
        throwError(() => new Error('Load failed'))
      );

      component.ngOnInit();

      expect(console.error).toHaveBeenCalledWith('Error loading coupons:', expect.any(Error));
    });
  });

  describe('Apply Coupon', () => {
    beforeEach(() => {
      component.orderAmount = 100;
      component.cartItems = [];
    });

    it('should show error when coupon code is empty', () => {
      component.couponCode = '';

      component.applyCoupon();

      expect(component.validationMessage).toBe('Please enter a coupon code');
      expect(component.isValidationError).toBe(true);
    });

    it('should show error when coupon code is whitespace', () => {
      component.couponCode = '   ';

      component.applyCoupon();

      expect(component.validationMessage).toBe('Please enter a coupon code');
      expect(component.isValidationError).toBe(true);
    });

    it('should validate coupon with trim', () => {
      component.couponCode = '  TEST123  ';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Coupon applied'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('TEST123', 100, []);
    });

    it('should set loading state during validation', () => {
      component.couponCode = 'TEST';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Success'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      let loadingDuringCall = false;
      mockCouponService.validateCoupon.mockImplementation(() => {
        loadingDuringCall = component.isLoading;
        return of({ isValid: true, discountAmount: 10, message: 'Success' });
      });

      component.applyCoupon();

      expect(loadingDuringCall).toBe(true);
      expect(component.isLoading).toBe(false);
    });

    it('should emit couponApplied when valid', () => {
      const emitSpy = vi.fn();
      component.couponApplied.subscribe(emitSpy);
      component.couponCode = 'SAVE10';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Coupon applied successfully'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(emitSpy).toHaveBeenCalledWith({
        coupon: mockCoupons[0],
        discountAmount: 10
      });
    });

    it('should show success message when valid', () => {
      component.couponCode = 'SAVE10';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Coupon applied successfully'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(component.validationMessage).toBe('Coupon applied successfully');
      expect(component.isValidationError).toBe(false);
    });

    it('should clear coupon code after successful application', () => {
      component.couponCode = 'SAVE10';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Success'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(component.couponCode).toBe('');
    });

    it('should hide coupon list after successful application', () => {
      component.couponCode = 'SAVE10';
      component.showCouponList = true;
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Success'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(component.showCouponList).toBe(false);
    });

    it('should show error message when invalid', () => {
      component.couponCode = 'INVALID';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: false,
        discountAmount: 0,
        message: 'Coupon is not valid'
      }));

      component.applyCoupon();

      expect(component.validationMessage).toBe('Coupon is not valid');
      expect(component.isValidationError).toBe(true);
    });

    it('should handle validation error', () => {
      component.couponCode = 'TEST';
      mockCouponService.validateCoupon.mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      component.applyCoupon();

      expect(component.validationMessage).toBe('Error validating coupon. Please try again.');
      expect(component.isValidationError).toBe(true);
      expect(component.isLoading).toBe(false);
    });

    it('should auto-hide success message after 3 seconds', () => {
      component.couponCode = 'SAVE10';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Success'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));

      component.applyCoupon();

      expect(component.validationMessage).toBe('Success');

      vi.advanceTimersByTime(3000);

      expect(component.validationMessage).toBe('');
    });

    it('should not auto-hide error messages', () => {
      component.couponCode = 'INVALID';
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: false,
        discountAmount: 0,
        message: 'Invalid coupon'
      }));

      component.applyCoupon();

      vi.advanceTimersByTime(5000);

      expect(component.validationMessage).toBe('Invalid coupon');
    });
  });

  describe('Remove Coupon', () => {
    it('should emit couponRemoved event', () => {
      const emitSpy = vi.fn();
      component.couponRemoved.subscribe(emitSpy);

      component.removeCoupon();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should clear validation message then show success', () => {
      component.validationMessage = 'Some message';

      component.removeCoupon();

      // First clears, then sets to success message
      expect(component.validationMessage).toBe('Coupon removed successfully');
    });

    it('should show success message', () => {
      component.removeCoupon();

      expect(component.validationMessage).toBe('Coupon removed successfully');
      expect(component.isValidationError).toBe(false);
    });

    it('should auto-hide success message after 3 seconds', () => {
      component.removeCoupon();

      vi.advanceTimersByTime(3000);

      expect(component.validationMessage).toBe('');
    });
  });

  describe('Select Coupon', () => {
    beforeEach(() => {
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 10,
        message: 'Success'
      }));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupons[0]));
    });

    it('should set coupon code then clear after application', () => {
      component.selectCoupon(mockCoupons[0] as any);

      // Coupon code is cleared after successful application
      expect(component.couponCode).toBe('');
      expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('SAVE10', expect.any(Number), expect.any(Array));
    });

    it('should hide coupon list', () => {
      component.showCouponList = true;

      component.selectCoupon(mockCoupons[0] as any);

      expect(component.showCouponList).toBe(false);
    });

    it('should apply coupon automatically', () => {
      const emitSpy = vi.fn();
      component.couponApplied.subscribe(emitSpy);
      component.orderAmount = 100;

      component.selectCoupon(mockCoupons[0] as any);

      expect(mockCouponService.validateCoupon).toHaveBeenCalled();
    });
  });

  describe('Toggle Coupon List', () => {
    it('should toggle from false to true', () => {
      component.showCouponList = false;

      component.toggleCouponList();

      expect(component.showCouponList).toBe(true);
    });

    it('should toggle from true to false', () => {
      component.showCouponList = true;

      component.toggleCouponList();

      expect(component.showCouponList).toBe(false);
    });

    it('should toggle multiple times', () => {
      component.toggleCouponList();
      expect(component.showCouponList).toBe(true);

      component.toggleCouponList();
      expect(component.showCouponList).toBe(false);

      component.toggleCouponList();
      expect(component.showCouponList).toBe(true);
    });
  });

  describe('Coupon Applicability', () => {
    it.each([
      { orderAmount: 100, minOrder: 50, expected: true },
      { orderAmount: 50, minOrder: 50, expected: true },
      { orderAmount: 49, minOrder: 50, expected: false },
      { orderAmount: 100, minOrder: null, expected: true },
      { orderAmount: 100, minOrder: undefined, expected: true }
    ])('should return $expected for order=$orderAmount min=$minOrder',
      ({ orderAmount, minOrder, expected }) => {
        component.orderAmount = orderAmount;
        const coupon = { minOrderAmount: minOrder } as any;

        const result = component.isCouponApplicable(coupon);

        expect(result).toBe(expected);
      });
  });

  describe('Coupon Savings Calculation', () => {
    beforeEach(() => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: false }
      ];
      component.orderAmount = 130;
    });

    it('should calculate percentage discount', () => {
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: null,
        minOrderAmount: 0
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(13);
    });

    it('should cap percentage discount at maxDiscount', () => {
      const coupon = {
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 10,
        minOrderAmount: 0
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(10);
    });

    it('should calculate flat discount', () => {
      const coupon = {
        discountType: 'flat',
        discountValue: 50,
        minOrderAmount: 0
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(50);
    });

    it('should return 0 when coupon not applicable', () => {
      component.orderAmount = 50;
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 100
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(0);
    });

    it('should exclude items with isOfferDisabled', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: true }
      ];
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: null,
        minOrderAmount: 0
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(10); // Only 100 (50*2) is eligible
    });

    it('should handle string prices', () => {
      component.cartItems = [
        { name: 'Item 1', price: '$50.00', qty: 2, isOfferDisabled: false }
      ];
      const coupon = {
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: null,
        minOrderAmount: 0
      } as any;

      const savings = component.getCouponSavings(coupon);

      expect(savings).toBe(10);
    });
  });

  describe('Eligible Order Amount', () => {
    it('should return orderAmount when no cart items', () => {
      component.orderAmount = 100;
      component.cartItems = [];

      expect(component.eligibleOrderAmount).toBe(100);
    });

    it('should exclude items with isOfferDisabled', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: true }
      ];

      expect(component.eligibleOrderAmount).toBe(100);
    });

    it('should sum all eligible items', () => {
      component.cartItems = [
        { name: 'Item 1', price: 25, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: false },
        { name: 'Item 3', price: 20, qty: 1, isOfferDisabled: false }
      ];

      expect(component.eligibleOrderAmount).toBe(100);
    });

    it('should handle all items disabled', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: true },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: true }
      ];

      expect(component.eligibleOrderAmount).toBe(0);
    });
  });

  describe('Non-Offer Items Amount', () => {
    it('should return 0 when no cart items', () => {
      component.cartItems = [];

      expect(component.nonOfferItemsAmount).toBe(0);
    });

    it('should sum only items with isOfferDisabled', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: true }
      ];

      expect(component.nonOfferItemsAmount).toBe(30);
    });

    it('should return 0 when all items eligible', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 2, isOfferDisabled: false },
        { name: 'Item 2', price: 30, qty: 1, isOfferDisabled: false }
      ];

      expect(component.nonOfferItemsAmount).toBe(0);
    });
  });

  describe('Has Non-Offer Items', () => {
    it('should return true when there are non-offer items', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 1, isOfferDisabled: true }
      ];

      expect(component.hasNonOfferItems).toBe(true);
    });

    it('should return false when no non-offer items', () => {
      component.cartItems = [
        { name: 'Item 1', price: 50, qty: 1, isOfferDisabled: false }
      ];

      expect(component.hasNonOfferItems).toBe(false);
    });

    it('should return false when cart is empty', () => {
      component.cartItems = [];

      expect(component.hasNonOfferItems).toBe(false);
    });
  });

  describe('On Changes Lifecycle', () => {
    it('should revalidate applied coupon when cart items change', () => {
      component.appliedCoupon = {
        coupon: mockCoupons[0] as any,
        discountAmount: 10
      };
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: true,
        discountAmount: 12,
        message: 'Updated'
      }));

      component.ngOnChanges({ cartItems: { currentValue: [], previousValue: null } as any });

      expect(mockCouponService.validateCoupon).toHaveBeenCalled();
    });

    it('should remove invalid coupon on changes', () => {
      const emitSpy = vi.fn();
      component.couponRemoved.subscribe(emitSpy);
      component.appliedCoupon = {
        coupon: mockCoupons[0] as any,
        discountAmount: 10
      };
      mockCouponService.validateCoupon.mockReturnValue(of({
        isValid: false,
        discountAmount: 0,
        message: 'No longer valid'
      }));

      component.ngOnChanges({ orderAmount: { currentValue: 10, previousValue: 100 } as any });

      expect(emitSpy).toHaveBeenCalled();
      expect(component.appliedCoupon).toBeNull();
    });

    it('should not revalidate when no coupon applied', () => {
      component.appliedCoupon = null;

      component.ngOnChanges({ cartItems: { currentValue: [], previousValue: null } as any });

      expect(mockCouponService.validateCoupon).not.toHaveBeenCalled();
    });
  });
});
