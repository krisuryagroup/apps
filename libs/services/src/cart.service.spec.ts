import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CartService } from './cart.service';
import { Subject } from 'rxjs';

describe('CartService', () => {
  let service: CartService;
  let mockCacheService: any;
  let mockProductsService: any;

  beforeEach(() => {
    mockCacheService = {
      getCachedData: vi.fn().mockReturnValue(null),
      setCachedData: vi.fn(),
      getCurrentRestaurantId: vi.fn().mockReturnValue('rest-123')
    };

    mockProductsService = {
      getProductsByIds: vi.fn().mockResolvedValue([])
    };

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new CartService(mockCacheService, mockProductsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with empty cart when no cached data', () => {
      expect(service.getCart()).toEqual([]);
    });

    it('should load cart from cache on initialization', () => {
      const cachedCart = [
        { id: '1', name: 'Pizza', price: 10, qty: 2, isEnabledForOnlineOrders: true }
      ];
      mockCacheService.getCachedData.mockReturnValue(cachedCart);

      service = new CartService(mockCacheService, mockProductsService);

      expect(service.getCart()).toEqual(cachedCart);
    });

    it('should handle cache load error gracefully', () => {
      mockCacheService.getCachedData.mockImplementation(() => {
        throw new Error('Cache error');
      });

      service = new CartService(mockCacheService, mockProductsService);

      expect(service.getCart()).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Add to Cart', () => {
    it('should add new item to cart', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };

      service.addToCart(product as any);

      const cart = service.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0]).toMatchObject({ ...product, qty: 1 });
    });

    it('should increment quantity for existing item', () => {
      const product = { id: '1', name: 'Burger', price: 5, isEnabledForOnlineOrders: true };

      service.addToCart(product as any);
      service.addToCart(product as any);

      const cart = service.getCart();
      expect(cart).toHaveLength(1);
      expect(cart[0].qty).toBe(2);
    });

    it('should save cart after adding item', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };

      service.addToCart(product as any);

      expect(mockCacheService.setCachedData).toHaveBeenCalled();
    });

    it.each([
      { qty: 1, additions: 1 },
      { qty: 3, additions: 3 },
      { qty: 10, additions: 10 }
    ])('should have qty=$qty after $additions additions', ({ qty, additions }) => {
      const product = { id: '1', name: 'Item', price: 5, isEnabledForOnlineOrders: true };

      for (let i = 0; i < additions; i++) {
        service.addToCart(product as any);
      }

      expect(service.getCart()[0].qty).toBe(qty);
    });

    it('should treat items with same name as same item', () => {
      const product1 = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      const product2 = { id: '2', name: 'Pizza', price: 12, isEnabledForOnlineOrders: true };

      service.addToCart(product1 as any);
      service.addToCart(product2 as any);

      expect(service.getCart()).toHaveLength(1);
      expect(service.getCart()[0].qty).toBe(2);
    });
  });

  describe('Remove from Cart', () => {
    it('should decrement quantity when qty > 1', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      service.addToCart(product as any);

      service.removeFromCart(product as any);

      expect(service.getCart()[0].qty).toBe(1);
    });

    it('should remove item completely when qty = 1', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);

      service.removeFromCart(product as any);

      expect(service.getCart()).toHaveLength(0);
    });

    it('should not error when removing non-existent item', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };

      expect(() => service.removeFromCart(product as any)).not.toThrow();
    });

    it('should save cart after removing item', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      mockCacheService.setCachedData.mockClear();

      service.removeFromCart(product as any);

      expect(mockCacheService.setCachedData).toHaveBeenCalled();
    });
  });

  describe('Get Item Quantity', () => {
    it('should return 0 for item not in cart', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };

      expect(service.getItemQuantity(product as any)).toBe(0);
    });

    it('should return correct quantity for item in cart', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      service.addToCart(product as any);

      expect(service.getItemQuantity(product as any)).toBe(2);
    });

    it.each([
      { qty: 1 },
      { qty: 5 },
      { qty: 10 }
    ])('should return $qty correctly', ({ qty }) => {
      const product = { id: '1', name: 'Item', price: 5, isEnabledForOnlineOrders: true };

      for (let i = 0; i < qty; i++) {
        service.addToCart(product as any);
      }

      expect(service.getItemQuantity(product as any)).toBe(qty);
    });
  });

  describe('Clear Cart', () => {
    it('should remove all items from cart', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      service.addToCart({ id: '2', name: 'Burger', price: 5, isEnabledForOnlineOrders: true } as any);

      service.clearCart();

      expect(service.getCart()).toHaveLength(0);
    });

    it('should save empty cart', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      mockCacheService.setCachedData.mockClear();

      service.clearCart();

      expect(mockCacheService.setCachedData).toHaveBeenCalledWith('foodapp_cart', []);
    });
  });

  describe('Get Total', () => {
    it('should return 0 for empty cart', () => {
      expect(service.getTotal()).toBe(0);
    });

    it('should calculate total for single item', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      expect(service.getTotal()).toBe(10);
    });

    it('should calculate total with quantity', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      service.addToCart(product as any);

      expect(service.getTotal()).toBe(20);
    });

    it('should calculate total for multiple items', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      service.addToCart({ id: '2', name: 'Burger', price: 5, isEnabledForOnlineOrders: true } as any);

      expect(service.getTotal()).toBe(15);
    });

    it.each([
      { items: [{ price: 10, qty: 2 }], expected: 20 },
      { items: [{ price: 5, qty: 1 }, { price: 3, qty: 2 }], expected: 11 },
      { items: [{ price: 15.50, qty: 3 }], expected: 46.50 },
      { items: [{ price: 0, qty: 5 }], expected: 0 }
    ])('should calculate total correctly for $items', ({ items, expected }) => {
      items.forEach((item, idx) => {
        const product = { id: String(idx), name: `Item${idx}`, price: item.price, isEnabledForOnlineOrders: true };
        for (let i = 0; i < item.qty; i++) {
          service.addToCart(product as any);
        }
      });

      expect(service.getTotal()).toBe(expected);
    });

    it('should handle item with no price', () => {
      service.addToCart({ id: '1', name: 'Free Item', isEnabledForOnlineOrders: true } as any);

      expect(service.getTotal()).toBe(0);
    });
  });

  describe('Get Total Formatted', () => {
    it('should format total with rupee symbol', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      expect(service.getTotalFormatted()).toBe('₹10');
    });

    it('should format zero as ₹0', () => {
      expect(service.getTotalFormatted()).toBe('₹0');
    });

    it.each([
      { total: 0, expected: '₹0' },
      { total: 15, expected: '₹15' },
      { total: 123.50, expected: '₹123.5' }
    ])('should format $total as $expected', ({ total, expected }) => {
      if (total > 0) {
        service.addToCart({ id: '1', name: 'Item', price: total, isEnabledForOnlineOrders: true } as any);
      }

      expect(service.getTotalFormatted()).toBe(expected);
    });
  });

  describe('Get Count', () => {
    it('should return 0 for empty cart', () => {
      expect(service.getCount()).toBe(0);
    });

    it('should count single item', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      expect(service.getCount()).toBe(1);
    });

    it('should count multiple quantities', () => {
      const product = { id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      service.addToCart(product as any);
      service.addToCart(product as any);

      expect(service.getCount()).toBe(3);
    });

    it('should count across multiple items', () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      service.addToCart({ id: '2', name: 'Burger', price: 5, isEnabledForOnlineOrders: true } as any);

      expect(service.getCount()).toBe(3);
    });
  });

  describe('Cart Changed Observable', () => {
    it('should emit on add to cart', async () => {
      const emitPromise = new Promise<void>(resolve => {
        service.cartChanged.subscribe(() => resolve());
      });

      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      await emitPromise;
    });

    it('should emit on remove from cart', async () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      const emitPromise = new Promise<void>(resolve => {
        service.cartChanged.subscribe(() => resolve());
      });

      service.removeFromCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      await emitPromise;
    });

    it('should emit on clear cart', async () => {
      service.addToCart({ id: '1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      const emitPromise = new Promise<void>(resolve => {
        service.cartChanged.subscribe(() => resolve());
      });

      service.clearCart();

      await emitPromise;
    });
  });

  describe('Refresh Cart Items from Firebase', () => {
    it('should not call service for empty cart', async () => {
      await service.refreshCartItemsFromFirebase();

      expect(mockProductsService.getProductsByIds).not.toHaveBeenCalled();
    });

    it('should update prices from Firebase', async () => {
      service.addToCart({ id: 'p1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      const updatedProduct = { id: 'p1', name: 'Pizza', price: 12, isEnabledForOnlineOrders: true };
      mockProductsService.getProductsByIds.mockResolvedValue([updatedProduct]);

      await service.refreshCartItemsFromFirebase();

      expect(service.getCart()[0].price).toBe(12);
    });

    it('should preserve quantities during refresh', async () => {
      const product = { id: 'p1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true };
      service.addToCart(product as any);
      service.addToCart(product as any);

      mockProductsService.getProductsByIds.mockResolvedValue([
        { id: 'p1', name: 'Pizza', price: 15, isEnabledForOnlineOrders: true }
      ]);

      await service.refreshCartItemsFromFirebase();

      expect(service.getCart()[0].qty).toBe(2);
    });

    it('should handle refresh error gracefully', async () => {
      service.addToCart({ id: 'p1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      mockProductsService.getProductsByIds.mockRejectedValue(new Error('Network error'));

      await service.refreshCartItemsFromFirebase();

      expect(console.error).toHaveBeenCalled();
      expect(service.getCart()).toHaveLength(1);
    });

    it('should warn when cart items have no IDs', async () => {
      service.addToCart({ name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);

      await service.refreshCartItemsFromFirebase();

      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('do not have IDs'));
    });

    it('should keep old item if not found in Firebase', async () => {
      service.addToCart({ id: 'p1', name: 'Pizza', price: 10, isEnabledForOnlineOrders: true } as any);
      mockProductsService.getProductsByIds.mockResolvedValue([]);

      await service.refreshCartItemsFromFirebase();

      expect(service.getCart()[0].price).toBe(10);
    });
  });
});
