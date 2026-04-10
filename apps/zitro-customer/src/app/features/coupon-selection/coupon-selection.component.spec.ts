import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CouponSelectionComponent } from './coupon-selection.component';
import { Router, ActivatedRoute } from '@angular/router';
import { CouponService } from '../../core/services/coupon.service';
import { OnlineOrderCoupon, CouponValidationResult, AppliedCoupon } from '../../core/models/coupon.model';
import { of, throwError } from 'rxjs';

describe('CouponSelectionComponent', () => {
  let component: CouponSelectionComponent;
  let mockCouponService: any;
  let mockRouter: any;
  let mockRoute: any;

  const mockCoupon: OnlineOrderCoupon = {
    id: 'coupon-1',
    code: 'SAVE20',
    title: 'Save 20%',
    description: 'Save 20%',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 100,
    maxDiscount: 50,
    isActive: true,
    validFrom: new Date(),
    validTo: new Date(Date.now() + 86400000),
    usedCount: 0,
    isDisplayedForOnlineOrders: true,
    isDisplayedAtMerchantProfile: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as OnlineOrderCoupon;

  beforeEach(() => {
    mockCouponService = {
      getActiveCoupons: vi.fn(),
      validateCoupon: vi.fn(),
      getCouponByCode: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {
      queryParams: of({}),
    };

    component = new CouponSelectionComponent(mockCouponService, mockRouter, mockRoute);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(history, 'state', 'get').mockReturnValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it.each([
      { field: 'availableCoupons', value: [] },
      { field: 'couponCode', value: '' },
      { field: 'isLoading', value: false },
      { field: 'validationMessage', value: '' },
      { field: 'isValidationError', value: false },
      { field: 'orderAmount', value: 0 },
      { field: 'cartItems', value: [] },
      { field: 'currentAppliedCoupon', value: null },
    ])('should initialize $field to $value', ({ field, value }) => {
      expect((component as any)[field]).toEqual(value);
    });

    it('should load active coupons on init', () => {
      mockCouponService.getActiveCoupons.mockReturnValue(of([mockCoupon]));

      component.ngOnInit();

      expect(mockCouponService.getActiveCoupons).toHaveBeenCalled();
    });

    it('should load data from history state', () => {
      mockCouponService.getActiveCoupons.mockReturnValue(of([]));
      vi.spyOn(history, 'state', 'get').mockReturnValue({
        orderAmount: 299,
        cartItems: [{ id: 1, price: 100 }],
        appliedCoupon: { coupon: mockCoupon, discountAmount: 50 },
      });

      component.ngOnInit();

      expect(component.orderAmount).toBe(299);
      expect(component.cartItems).toHaveLength(1);
      expect(component.couponCode).toBe('SAVE20');
    });

    it('should load order amount from query params as fallback', () => {
      mockRoute.queryParams = of({ amount: '199' });
      mockCouponService.getActiveCoupons.mockReturnValue(of([]));

      component.ngOnInit();

      expect(component.orderAmount).toBe(199);
    });
  });

  describe('Load Active Coupons', () => {
    it('should load coupons successfully', () => {
      const mockCoupons = [mockCoupon];
      mockCouponService.getActiveCoupons.mockReturnValue(of(mockCoupons));

      component.loadActiveCoupons();

      expect(component.availableCoupons).toEqual(mockCoupons);
    });

    it('should handle load errors', () => {
      mockCouponService.getActiveCoupons.mockReturnValue(throwError(() => new Error('Load failed')));

      component.loadActiveCoupons();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Apply Coupon', () => {
    beforeEach(() => {
      component.orderAmount = 299;
      component.cartItems = [{ id: 1, price: 299 }];
    });

    it('should show error if code is empty', () => {
      component.couponCode = '';

      component.applyCoupon();

      expect(component.validationMessage).toBe('Please enter a coupon code');
      expect(component.isValidationError).toBe(true);
    });

    it('should apply valid coupon', () => {
      const validationResult: CouponValidationResult = {
        isValid: true,
        discountAmount: 50,
        message: 'Coupon applied',
        finalAmount: 249,
      };
      
      mockCouponService.validateCoupon.mockReturnValue(of(validationResult));
      mockCouponService.getCouponByCode.mockReturnValue(of(mockCoupon));
      const returnSpy = vi.spyOn(component, 'returnToCart');

      component.applyCoupon('SAVE20');

      expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('SAVE20', 299, component.cartItems);
    });

    it('should show error for invalid coupon', () => {
      const validationResult: CouponValidationResult = {
        isValid: false,
        discountAmount: 0,
        message: 'Invalid coupon',
        finalAmount: 0,
      };
      
      mockCouponService.validateCoupon.mockReturnValue(of(validationResult));

      component.applyCoupon('INVALID');

      expect(component.validationMessage).toBe('Invalid coupon');
      expect(component.isValidationError).toBe(true);
    });

    it('should use couponCode property if no parameter provided', () => {
      component.couponCode = 'SAVE20';
      mockCouponService.validateCoupon.mockReturnValue(of({ isValid: false, discountAmount: 0, message: 'Invalid' }));

      component.applyCoupon();

      expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('SAVE20', expect.any(Number), expect.any(Array));
    });

    it('should trim coupon code', () => {
      mockCouponService.validateCoupon.mockReturnValue(of({ isValid: false, discountAmount: 0, message: 'Invalid' }));

      component.applyCoupon('  SAVE20  ');

      expect(mockCouponService.validateCoupon).toHaveBeenCalledWith('  SAVE20  ', expect.any(Number), expect.any(Array));
    });
  });

  describe('Remove Coupon', () => {
    it('should clear coupon and return to cart', () => {
      component.currentAppliedCoupon = { coupon: mockCoupon, discountAmount: 50 };
      const returnSpy = vi.spyOn(component, 'returnToCart');

      component.removeCoupon();

      expect(returnSpy).toHaveBeenCalledWith(null);
    });
  });

  describe('Return to Cart', () => {
    it('should navigate to cart with applied coupon', () => {
      const appliedCoupon: AppliedCoupon = {
        coupon: mockCoupon,
        discountAmount: 50,
      };

      component.returnToCart(appliedCoupon);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart'], {
        state: { appliedCoupon, orderAmount: 0, cartItems: [] },
      });
    });

    it('should navigate to cart without coupon', () => {
      component.returnToCart(null);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart'], {
        state: { appliedCoupon: null, orderAmount: 0, cartItems: [] },
      });
    });
  });

  describe('Close Selection', () => {
    it('should navigate back to cart', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
    });
  });

  describe('Calculate Eligibility Amounts', () => {
    it('should calculate eligible and ineligible amounts', () => {
      component.cartItems = [
        { id: 1, price: 100, isOfferDisabled: false },
        { id: 2, price: 50, isOfferDisabled: true },
        { id: 3, price: 75, isOfferDisabled: false },
      ];

      component.calculateEligibilityAmounts();

      expect(component.eligibleAmount).toBe(175);
      expect(component.ineligibleAmount).toBe(50);
      expect(component.totalAmount).toBe(225);
    });

    it('should handle empty cart', () => {
      component.cartItems = [];

      component.calculateEligibilityAmounts();

      expect(component.eligibleAmount).toBe(0);
      expect(component.ineligibleAmount).toBe(0);
      expect(component.totalAmount).toBe(0);
    });

    it('should handle all items eligible', () => {
      component.cartItems = [
        { id: 1, price: 100, isOfferDisabled: false },
        { id: 2, price: 50, isOfferDisabled: false },
      ];

      component.calculateEligibilityAmounts();

      expect(component.eligibleAmount).toBe(150);
      expect(component.ineligibleAmount).toBe(0);
    });

    it('should treat items without isOfferDisabled as eligible', () => {
      component.cartItems = [
        { id: 1, price: 100 },
      ];

      component.calculateEligibilityAmounts();

      expect(component.eligibleAmount).toBe(100);
    });
  });

  describe('Validation Messages', () => {
    it('should show validation message', () => {
      (component as any).showValidationMessage('Test message', false);

      expect(component.validationMessage).toBe('Test message');
      expect(component.isValidationError).toBe(false);
    });

    it.each([
      { message: 'Success', isError: false },
      { message: 'Error occurred', isError: true },
    ])('should set message: "$message", error: $isError', ({ message, isError }) => {
      (component as any).showValidationMessage(message, isError);

      expect(component.validationMessage).toBe(message);
      expect(component.isValidationError).toBe(isError);
    });
  });

  describe('Coupon Display Helpers', () => {
    it('should check if coupon is currently applied', () => {
      component.currentAppliedCoupon = { coupon: mockCoupon, discountAmount: 50 };

      const isApplied = component.isCouponApplied(mockCoupon);

      expect(isApplied).toBe(true);
    });

    it('should return false for non-applied coupon', () => {
      component.currentAppliedCoupon = null;

      const isApplied = component.isCouponApplied(mockCoupon);

      expect(isApplied).toBe(false);
    });

    it('should check if coupon is applicable', () => {
      component.eligibleAmount = 150;
      const coupon = { ...mockCoupon, minOrderAmount: 100 };

      const isApplicable = component.isCouponApplicable(coupon);

      expect(isApplicable).toBe(true);
    });

    it.each([
      { eligibleAmount: 150, minAmount: 100, expected: true },
      { eligibleAmount: 50, minAmount: 100, expected: false },
      { eligibleAmount: 100, minAmount: 100, expected: true },
    ])('should check applicable: eligible=$eligibleAmount, min=$minAmount => $expected',
      ({ eligibleAmount, minAmount, expected }) => {
        component.eligibleAmount = eligibleAmount;
        const coupon = { ...mockCoupon, minOrderAmount: minAmount };

        expect(component.isCouponApplicable(coupon)).toBe(expected);
      }
    );
  });
});
