import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CartSummaryComponent } from './cart-summary.component';
import { Subject } from 'rxjs';

describe('CartSummaryComponent', () => {
  let component: CartSummaryComponent;
  let mockCartService: any;
  let mockRouter: any;
  let cartChangedSubject: Subject<void>;

  beforeEach(() => {
    cartChangedSubject = new Subject<void>();

    mockCartService = {
      cartChanged: cartChangedSubject.asObservable(),
      getCart: vi.fn().mockReturnValue([]),
      getCount: vi.fn().mockReturnValue(0),
      getTotal: vi.fn().mockReturnValue(0)
    };

    mockRouter = {
      navigate: vi.fn()
    };

    component = new CartSummaryComponent(mockCartService, mockRouter);
  });

  describe('Component Initialization', () => {
    it('should initialize with empty cart state', () => {
      expect(component.cartItems).toEqual([]);
      expect(component.totalQuantity).toBe(0);
      expect(component.totalAmount).toBe(0);
      expect(component.isVisible).toBe(false);
    });

    it('should call updateCartSummary on init', () => {
      component.ngOnInit();

      expect(mockCartService.getCart).toHaveBeenCalled();
      expect(mockCartService.getCount).toHaveBeenCalled();
      expect(mockCartService.getTotal).toHaveBeenCalled();
    });

    it('should subscribe to cart changes on init', () => {
      component.ngOnInit();

      expect(component['cartSubscription']).toBeDefined();
    });
  });

  describe('Cart Summary Updates', () => {
    it.each([
      { 
        items: [{ name: 'Pizza', qty: 2, price: 200 }], 
        count: 2, 
        total: 400,
        visible: true 
      },
      { 
        items: [{ name: 'Burger', qty: 1, price: 150 }], 
        count: 1, 
        total: 150,
        visible: true 
      },
      { 
        items: [], 
        count: 0, 
        total: 0,
        visible: false 
      }
    ])('should update cart with $count items', ({ items, count, total, visible }) => {
      mockCartService.getCart.mockReturnValue(items);
      mockCartService.getCount.mockReturnValue(count);
      mockCartService.getTotal.mockReturnValue(total);

      component.ngOnInit();

      expect(component.cartItems).toEqual(items);
      expect(component.totalQuantity).toBe(count);
      expect(component.totalAmount).toBe(total);
      expect(component.isVisible).toBe(visible);
    });

    it('should show summary when cart has items', () => {
      mockCartService.getCart.mockReturnValue([{ name: 'Item', qty: 1, price: 100 }]);
      mockCartService.getCount.mockReturnValue(1);
      mockCartService.getTotal.mockReturnValue(100);

      component.ngOnInit();

      expect(component.isVisible).toBe(true);
    });

    it('should hide summary when cart is empty', () => {
      mockCartService.getCart.mockReturnValue([]);
      mockCartService.getCount.mockReturnValue(0);
      mockCartService.getTotal.mockReturnValue(0);

      component.ngOnInit();

      expect(component.isVisible).toBe(false);
    });
  });

  describe('Cart Change Subscription', () => {
    it('should update summary when cart changes', () => {
      mockCartService.getCart.mockReturnValue([]);
      mockCartService.getCount.mockReturnValue(0);
      mockCartService.getTotal.mockReturnValue(0);

      component.ngOnInit();
      expect(component.totalQuantity).toBe(0);

      // Simulate cart change
      mockCartService.getCart.mockReturnValue([{ name: 'Pizza', qty: 1, price: 250 }]);
      mockCartService.getCount.mockReturnValue(1);
      mockCartService.getTotal.mockReturnValue(250);
      cartChangedSubject.next();

      expect(component.totalQuantity).toBe(1);
      expect(component.totalAmount).toBe(250);
      expect(component.isVisible).toBe(true);
    });

    it('should handle multiple cart changes', () => {
      component.ngOnInit();

      // First change
      mockCartService.getCart.mockReturnValue([{ name: 'Item1', qty: 2, price: 100 }]);
      mockCartService.getCount.mockReturnValue(2);
      mockCartService.getTotal.mockReturnValue(200);
      cartChangedSubject.next();
      expect(component.totalQuantity).toBe(2);

      // Second change
      mockCartService.getCart.mockReturnValue([{ name: 'Item1', qty: 2, price: 100 }, { name: 'Item2', qty: 1, price: 150 }]);
      mockCartService.getCount.mockReturnValue(3);
      mockCartService.getTotal.mockReturnValue(350);
      cartChangedSubject.next();
      expect(component.totalQuantity).toBe(3);
      expect(component.totalAmount).toBe(350);

      // Third change - empty cart
      mockCartService.getCart.mockReturnValue([]);
      mockCartService.getCount.mockReturnValue(0);
      mockCartService.getTotal.mockReturnValue(0);
      cartChangedSubject.next();
      expect(component.isVisible).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate to cart page when clicked', () => {
      component.onCartClick();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/cart']);
    });

    it('should call router.navigate exactly once per click', () => {
      component.onCartClick();
      component.onCartClick();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Price Formatting', () => {
    it.each([
      { price: 100, expected: '₹100' },
      { price: 250.50, expected: '₹250.5' },
      { price: 0, expected: '₹0' },
      { price: 1500, expected: '₹1500' },
      { price: 99.99, expected: '₹99.99' }
    ])('should format $price as $expected', ({ price, expected }) => {
      const formatted = component.formatPrice(price);

      expect(formatted).toBe(expected);
    });

    it('should handle negative prices', () => {
      const formatted = component.formatPrice(-50);
      
      expect(formatted).toBe('₹-50');
    });

    it('should handle large prices', () => {
      const formatted = component.formatPrice(999999);
      
      expect(formatted).toBe('₹999999');
    });
  });

  describe('Component Lifecycle', () => {
    it('should unsubscribe from cart changes on destroy', () => {
      component.ngOnInit();
      const subscription = component['cartSubscription'];
      const unsubscribeSpy = vi.spyOn(subscription!, 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should handle destroy when subscription does not exist', () => {
      // Don't call ngOnInit
      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle destroy with undefined subscription', () => {
      component['cartSubscription'] = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Visibility Logic', () => {
    it.each([
      { quantity: 0, expectedVisible: false },
      { quantity: 1, expectedVisible: true },
      { quantity: 5, expectedVisible: true },
      { quantity: 100, expectedVisible: true }
    ])('should set visibility to $expectedVisible when quantity is $quantity', 
      ({ quantity, expectedVisible }) => {
        mockCartService.getCount.mockReturnValue(quantity);
        mockCartService.getCart.mockReturnValue(quantity > 0 ? [{ name: 'Item', qty: quantity }] : []);
        mockCartService.getTotal.mockReturnValue(quantity * 100);

        component.ngOnInit();

        expect(component.isVisible).toBe(expectedVisible);
      });
  });

  describe('Cart Items Array', () => {
    it('should store complex cart items correctly', () => {
      const complexCart = [
        { name: 'Pizza', qty: 2, price: 250, category: 'Food' },
        { name: 'Coke', qty: 1, price: 50, category: 'Beverage' },
        { name: 'Fries', qty: 3, price: 100, category: 'Sides' }
      ];

      mockCartService.getCart.mockReturnValue(complexCart);
      mockCartService.getCount.mockReturnValue(6);
      mockCartService.getTotal.mockReturnValue(650);

      component.ngOnInit();

      expect(component.cartItems).toEqual(complexCart);
      expect(component.cartItems).toHaveLength(3);
    });

    it('should handle empty array correctly', () => {
      mockCartService.getCart.mockReturnValue([]);
      mockCartService.getCount.mockReturnValue(0);
      mockCartService.getTotal.mockReturnValue(0);

      component.ngOnInit();

      expect(component.cartItems).toEqual([]);
      expect(component.cartItems).toHaveLength(0);
    });
  });
});
