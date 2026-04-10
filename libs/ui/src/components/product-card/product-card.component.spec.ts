import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductCardComponent } from './product-card.component';
import { Product } from '../../../core/models/product.model';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let mockCartService: any;
  let mockFavoritesService: any;
  let mockProductsService: any;

  const mockProduct: Product = {
    id: '1',
    name: 'Test Product',
    description: 'Test description',
    price: 10.99,
    imageURL: 'test.jpg',
    category: 'Test',
    isEnabledForOnlineOrders: true
  };

  beforeEach(() => {
    mockCartService = {
      getCart: vi.fn().mockReturnValue([]),
      addToCart: vi.fn(),
      removeFromCart: vi.fn()
    };

    mockFavoritesService = {
      isFavoriteSync: vi.fn().mockReturnValue(false),
      addToFavorites: vi.fn().mockResolvedValue(undefined),
      removeFromFavorites: vi.fn().mockResolvedValue(undefined)
    };

    mockProductsService = {
      formatPrice: vi.fn((price) => `$${price.toFixed(2)}`)
    };

    component = new ProductCardComponent(
      mockCartService,
      mockFavoritesService,
      mockProductsService
    );

    component.product = { ...mockProduct };
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.displayStyle).toBe('horizontal');
      expect(component.showFavorite).toBe(true);
      expect(component.showQuantityControls).toBe(true);
      expect(component.showDescription).toBe(true);
      expect(component.compactMode).toBe(false);
      expect(component.isFavorite).toBe(false);
      expect(component.currentQuantity).toBe(0);
      expect(component.showDescriptionDialog).toBe(false);
    });

    it.each([
      { displayStyle: 'horizontal', showFavorite: true, showQuantityControls: true },
      { displayStyle: 'vertical', showFavorite: false, showQuantityControls: false },
      { displayStyle: 'horizontal', showFavorite: true, showQuantityControls: false }
    ])('should accept custom input values', (inputs) => {
      component.displayStyle = inputs.displayStyle as any;
      component.showFavorite = inputs.showFavorite;
      component.showQuantityControls = inputs.showQuantityControls;

      expect(component.displayStyle).toBe(inputs.displayStyle);
      expect(component.showFavorite).toBe(inputs.showFavorite);
      expect(component.showQuantityControls).toBe(inputs.showQuantityControls);
    });

    it('should load favorite status on init', async () => {
      mockFavoritesService.isFavoriteSync.mockReturnValue(true);

      await component.ngOnInit();

      expect(mockFavoritesService.isFavoriteSync).toHaveBeenCalledWith('1');
      expect(component.isFavorite).toBe(true);
    });

    it('should load quantity on init', async () => {
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 3, price: 10.99 }
      ]);

      await component.ngOnInit();

      expect(component.currentQuantity).toBe(3);
    });

    it('should not load favorite status when showFavorite is false', async () => {
      component.showFavorite = false;

      await component.ngOnInit();

      expect(mockFavoritesService.isFavoriteSync).not.toHaveBeenCalled();
    });
  });

  describe('Quantity Management', () => {
    it('should get item quantity from cart', () => {
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 2, price: 10.99 }
      ]);

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(2);
    });

    it('should return 0 when product not in cart', () => {
      mockCartService.getCart.mockReturnValue([]);

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(0);
    });

    it.each([
      { cartQty: 0, expected: 0 },
      { cartQty: 1, expected: 1 },
      { cartQty: 5, expected: 5 },
      { cartQty: 10, expected: 10 }
    ])('should return $expected when cart has $cartQty items', ({ cartQty, expected }) => {
      mockCartService.getCart.mockReturnValue(
        cartQty > 0 ? [{ name: 'Test Product', qty: cartQty, price: 10.99 }] : []
      );

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(expected);
    });

    it('should increment quantity', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 2, price: 10.99 }
      ]);

      component.onIncrement(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockCartService.addToCart).toHaveBeenCalledWith(mockProduct);
      expect(component.currentQuantity).toBe(2);
    });

    it('should decrement quantity', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 1, price: 10.99 }
      ]);

      component.onDecrement(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockCartService.removeFromCart).toHaveBeenCalledWith(mockProduct);
      expect(component.currentQuantity).toBe(1);
    });

    it('should emit quantityChange on increment', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      const emitSpy = vi.fn();
      component.quantityChange.subscribe(emitSpy);
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 3, price: 10.99 }
      ]);

      component.onIncrement(mockEvent);

      expect(emitSpy).toHaveBeenCalledWith({
        product: mockProduct,
        quantity: 3
      });
    });

    it('should emit quantityChange on decrement', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      const emitSpy = vi.fn();
      component.quantityChange.subscribe(emitSpy);
      mockCartService.getCart.mockReturnValue([]);

      component.onDecrement(mockEvent);

      expect(emitSpy).toHaveBeenCalledWith({
        product: mockProduct,
        quantity: 0
      });
    });
  });

  describe('Favorite Management', () => {
    it('should add to favorites when not favorited', async () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      component.isFavorite = false;
      mockFavoritesService.isFavoriteSync.mockReturnValue(true);

      await component.onFavoriteToggle(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockFavoritesService.addToFavorites).toHaveBeenCalledWith(mockProduct);
      expect(mockFavoritesService.removeFromFavorites).not.toHaveBeenCalled();
      expect(component.isFavorite).toBe(true);
    });

    it('should remove from favorites when already favorited', async () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      component.isFavorite = true;
      mockFavoritesService.isFavoriteSync.mockReturnValue(false);

      await component.onFavoriteToggle(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockFavoritesService.removeFromFavorites).toHaveBeenCalledWith('1');
      expect(mockFavoritesService.addToFavorites).not.toHaveBeenCalled();
      expect(component.isFavorite).toBe(false);
    });

    it('should emit favoriteToggle event', async () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
      const emitSpy = vi.fn();
      component.favoriteToggle.subscribe(emitSpy);

      await component.onFavoriteToggle(mockEvent);

      expect(emitSpy).toHaveBeenCalledWith(mockProduct);
    });

    it.each([
      { initialState: false, expectedCall: 'addToFavorites' },
      { initialState: true, expectedCall: 'removeFromFavorites' }
    ])('should call $expectedCall when favorite is $initialState', 
      async ({ initialState, expectedCall }) => {
        const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;
        component.isFavorite = initialState;

        await component.onFavoriteToggle(mockEvent);

        if (expectedCall === 'addToFavorites') {
          expect(mockFavoritesService.addToFavorites).toHaveBeenCalled();
        } else {
          expect(mockFavoritesService.removeFromFavorites).toHaveBeenCalled();
        }
      });
  });

  describe('Product Click Handling', () => {
    it('should emit productClick event', () => {
      const emitSpy = vi.fn();
      component.productClick.subscribe(emitSpy);

      component.onProductClick();

      expect(emitSpy).toHaveBeenCalledWith(mockProduct);
    });

    it('should emit correct product data', () => {
      const customProduct = { ...mockProduct, name: 'Custom Product', price: 25.99 };
      component.product = customProduct;
      const emitSpy = vi.fn();
      component.productClick.subscribe(emitSpy);

      component.onProductClick();

      expect(emitSpy).toHaveBeenCalledWith(customProduct);
    });
  });

  describe('Price Formatting', () => {
    it.each([
      { price: 10.99, expected: '$10.99' },
      { price: 5.50, expected: '$5.50' },
      { price: 100, expected: '$100.00' },
      { price: 0.99, expected: '$0.99' }
    ])('should format $price as $expected', ({ price, expected }) => {
      const formatted = component.formatPrice(price);

      expect(mockProductsService.formatPrice).toHaveBeenCalledWith(price);
      expect(formatted).toBe(expected);
    });
  });

  describe('Image Error Handling', () => {
    it('should return error handler function', () => {
      const handler = component.getImageErrorHandler();

      expect(typeof handler).toBe('function');
    });

    it('should set default image on error', () => {
      const handler = component.getImageErrorHandler();
      const mockEvent = {
        target: { src: 'invalid.jpg' }
      };

      handler(mockEvent);

      expect(mockEvent.target.src).toBe('assets/foodCategories/default.png');
    });

    it('should replace any failed image with default', () => {
      const handler = component.getImageErrorHandler();
      const mockEvent = {
        target: { src: 'https://cdn.example.com/product-404.jpg' }
      };

      handler(mockEvent);

      expect(mockEvent.target.src).toBe('assets/foodCategories/default.png');
    });
  });

  describe('Description Dialog Management', () => {
    it('should open description dialog', () => {
      const event = {
        text: 'Long product description',
        productName: 'Custom Name'
      };

      component.onShowDescriptionDialog(event);

      expect(component.showDescriptionDialog).toBe(true);
      expect(component.dialogDescription).toBe('Long product description');
      expect(component.dialogProductName).toBe('Custom Name');
    });

    it('should use product name if not provided in event', () => {
      const event = {
        text: 'Long product description'
      };

      component.onShowDescriptionDialog(event);

      expect(component.showDescriptionDialog).toBe(true);
      expect(component.dialogProductName).toBe('Test Product');
    });

    it('should close description dialog', () => {
      component.showDescriptionDialog = true;
      component.dialogDescription = 'Some text';
      component.dialogProductName = 'Some product';

      component.onCloseDescriptionDialog();

      expect(component.showDescriptionDialog).toBe(false);
      expect(component.dialogDescription).toBe('');
      expect(component.dialogProductName).toBe('');
    });

    it.each([
      { text: 'Short desc', productName: 'Product A' },
      { text: 'Very long description with lots of details', productName: 'Product B' },
      { text: '', productName: 'Product C' }
    ])('should handle dialog with text="$text"', ({ text, productName }) => {
      component.onShowDescriptionDialog({ text, productName });

      expect(component.showDescriptionDialog).toBe(true);
      expect(component.dialogDescription).toBe(text);
      expect(component.dialogProductName).toBe(productName);
    });
  });

  describe('Display Modes', () => {
    it.each([
      { displayStyle: 'horizontal', compactMode: false },
      { displayStyle: 'vertical', compactMode: false },
      { displayStyle: 'horizontal', compactMode: true },
      { displayStyle: 'vertical', compactMode: true }
    ])('should support displayStyle=$displayStyle compactMode=$compactMode', 
      ({ displayStyle, compactMode }) => {
        component.displayStyle = displayStyle as any;
        component.compactMode = compactMode;

        expect(component.displayStyle).toBe(displayStyle);
        expect(component.compactMode).toBe(compactMode);
      });

    it('should toggle display options', () => {
      component.showFavorite = false;
      component.showQuantityControls = false;
      component.showDescription = false;

      expect(component.showFavorite).toBe(false);
      expect(component.showQuantityControls).toBe(false);
      expect(component.showDescription).toBe(false);
    });
  });

  describe('Event Propagation', () => {
    it('should stop propagation on favorite toggle', async () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;

      await component.onFavoriteToggle(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should stop propagation on increment', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;

      component.onIncrement(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should stop propagation on decrement', () => {
      const mockEvent = { stopPropagation: vi.fn() } as unknown as Event;

      component.onDecrement(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });
});
