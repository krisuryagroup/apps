import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CouponSelectorCartComponent } from './coupon-selector-cart.component';

describe('CouponSelectorCartComponent', () => {
  let component: CouponSelectorCartComponent;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn()
    };

    component = new CouponSelectorCartComponent(mockRouter);
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.orderAmount).toBe(0);
      expect(component.cartItems).toEqual([]);
      expect(component.appliedCoupon).toBeNull();
    });

    it.each([
      { orderAmount: 100, cartCount: 2, hasCoupon: false },
      { orderAmount: 250.50, cartCount: 5, hasCoupon: true },
      { orderAmount: 0, cartCount: 0, hasCoupon: false }
    ])('should accept input values', ({ orderAmount, cartCount, hasCoupon }) => {
      component.orderAmount = orderAmount;
      component.cartItems = Array(cartCount).fill({});
      component.appliedCoupon = hasCoupon ? { coupon: {} as any, discountAmount: 10 } : null;

      expect(component.orderAmount).toBe(orderAmount);
      expect(component.cartItems.length).toBe(cartCount);
      expect(component.appliedCoupon).toBe(hasCoupon ? component.appliedCoupon : null);
    });
  });

  describe('View All Coupons Navigation', () => {
    it('should navigate to coupons page', () => {
      component.orderAmount = 100;
      component.cartItems = [{ name: 'Item 1', qty: 2 }];
      component.appliedCoupon = null;

      component.viewAllCoupons();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/coupons'], {
        state: {
          orderAmount: 100,
          cartItems: [{ name: 'Item 1', qty: 2 }],
          appliedCoupon: null
        }
      });
    });

    it('should pass applied coupon in navigation state', () => {
      const appliedCoupon = {
        coupon: { code: 'TEST123', discountType: 'percentage', discountValue: 10 } as any,
        discountAmount: 15
      };
      component.orderAmount = 150;
      component.cartItems = [];
      component.appliedCoupon = appliedCoupon;

      component.viewAllCoupons();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/coupons'], {
        state: {
          orderAmount: 150,
          cartItems: [],
          appliedCoupon: appliedCoupon
        }
      });
    });

    it.each([
      { orderAmount: 50, itemCount: 1 },
      { orderAmount: 200, itemCount: 3 },
      { orderAmount: 1000, itemCount: 10 }
    ])('should navigate with orderAmount=$orderAmount and $itemCount items',
      ({ orderAmount, itemCount }) => {
        component.orderAmount = orderAmount;
        component.cartItems = Array(itemCount).fill({ name: 'Item', price: 10 });

        component.viewAllCoupons();

        expect(mockRouter.navigate).toHaveBeenCalledWith(['/coupons'], {
          state: expect.objectContaining({
            orderAmount,
            cartItems: expect.any(Array)
          })
        });
      });
  });

  describe('Remove Coupon', () => {
    it('should emit couponRemoved event', () => {
      const emitSpy = vi.fn();
      component.couponRemoved.subscribe(emitSpy);

      component.removeCoupon();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit when coupon is applied', () => {
      const emitSpy = vi.fn();
      component.couponRemoved.subscribe(emitSpy);
      component.appliedCoupon = {
        coupon: { code: 'TEST' } as any,
        discountAmount: 20
      };

      component.removeCoupon();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit even when no coupon is applied', () => {
      const emitSpy = vi.fn();
      component.couponRemoved.subscribe(emitSpy);
      component.appliedCoupon = null;

      component.removeCoupon();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Event Emitters', () => {
    it('should have couponApplied output', () => {
      expect(component.couponApplied).toBeDefined();
    });

    it('should have couponRemoved output', () => {
      expect(component.couponRemoved).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should maintain cart items state', () => {
      const cartItems = [
        { name: 'Item 1', price: 10, qty: 2 },
        { name: 'Item 2', price: 15, qty: 1 }
      ];

      component.cartItems = cartItems;

      expect(component.cartItems).toEqual(cartItems);
      expect(component.cartItems.length).toBe(2);
    });

    it('should update order amount', () => {
      component.orderAmount = 100;
      expect(component.orderAmount).toBe(100);

      component.orderAmount = 250;
      expect(component.orderAmount).toBe(250);
    });

    it('should handle applied coupon changes', () => {
      const coupon1 = { coupon: { code: 'FIRST' } as any, discountAmount: 10 };
      const coupon2 = { coupon: { code: 'SECOND' } as any, discountAmount: 20 };

      component.appliedCoupon = coupon1;
      expect(component.appliedCoupon).toEqual(coupon1);

      component.appliedCoupon = coupon2;
      expect(component.appliedCoupon).toEqual(coupon2);

      component.appliedCoupon = null;
      expect(component.appliedCoupon).toBeNull();
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty cart items', () => {
      component.cartItems = [];
      component.orderAmount = 0;

      component.viewAllCoupons();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/coupons'], {
        state: {
          orderAmount: 0,
          cartItems: [],
          appliedCoupon: null
        }
      });
    });

    it('should handle null order amount', () => {
      component.orderAmount = 0;

      expect(component.orderAmount).toBe(0);
    });
  });
});
