import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductGridComponent } from './product-grid.component';
import { Product } from '../../../core/models/product.model';

describe('ProductGridComponent', () => {
  let component: ProductGridComponent;

  const mockProducts: Product[] = [
    {
      id: '1',
      name: 'Product 1',
      description: 'Description 1',
      price: 10.99,
      imageURL: 'product1.jpg',
      category: 'Category A',
      isEnabledForOnlineOrders: true
    },
    {
      id: '2',
      name: 'Product 2',
      description: 'Description 2',
      price: 15.99,
      imageURL: 'product2.jpg',
      category: 'Category B',
      isEnabledForOnlineOrders: true
    },
    {
      id: '3',
      name: 'Product 3',
      description: 'Description 3',
      price: 20.99,
      imageURL: 'product3.jpg',
      category: 'Category A',
      isEnabledForOnlineOrders: true
    }
  ];

  beforeEach(() => {
    component = new ProductGridComponent();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.products).toEqual([]);
      expect(component.title).toBe('');
      expect(component.displayStyle).toBe('horizontal');
      expect(component.maxItems).toBe(0);
      expect(component.showViewAll).toBe(true);
      expect(component.compactMode).toBe(false);
      expect(component.columns).toBe(2);
    });

    it.each([
      { title: 'Featured Products', maxItems: 4, columns: 2 },
      { title: 'Best Sellers', maxItems: 6, columns: 3 },
      { title: 'New Arrivals', maxItems: 0, columns: 4 }
    ])('should accept custom input values', ({ title, maxItems, columns }) => {
      component.title = title;
      component.maxItems = maxItems;
      component.columns = columns;

      expect(component.title).toBe(title);
      expect(component.maxItems).toBe(maxItems);
      expect(component.columns).toBe(columns);
    });
  });

  describe('Display Products Logic', () => {
    beforeEach(() => {
      component.products = [...mockProducts];
    });

    it('should return all products when maxItems is 0', () => {
      component.maxItems = 0;

      const displayed = component.displayProducts;

      expect(displayed).toEqual(mockProducts);
      expect(displayed.length).toBe(3);
    });

    it.each([
      { maxItems: 1, expectedCount: 1 },
      { maxItems: 2, expectedCount: 2 },
      { maxItems: 3, expectedCount: 3 },
      { maxItems: 5, expectedCount: 3 }
    ])('should limit to $expectedCount products when maxItems=$maxItems', 
      ({ maxItems, expectedCount }) => {
        component.maxItems = maxItems;

        const displayed = component.displayProducts;

        expect(displayed.length).toBe(expectedCount);
      });

    it('should return first N products when limited', () => {
      component.maxItems = 2;

      const displayed = component.displayProducts;

      expect(displayed[0].id).toBe('1');
      expect(displayed[1].id).toBe('2');
    });

    it('should return empty array when products is empty', () => {
      component.products = [];
      component.maxItems = 5;

      const displayed = component.displayProducts;

      expect(displayed).toEqual([]);
    });

    it('should handle negative maxItems as unlimited', () => {
      component.maxItems = -1;

      const displayed = component.displayProducts;

      expect(displayed.length).toBe(3);
    });
  });

  describe('View All Button Visibility', () => {
    beforeEach(() => {
      component.products = [...mockProducts];
    });

    it('should show view all when maxItems limits products', () => {
      component.showViewAll = true;
      component.maxItems = 2;

      expect(component.shouldShowViewAll).toBe(true);
    });

    it('should not show view all when showing all products', () => {
      component.showViewAll = true;
      component.maxItems = 3;

      expect(component.shouldShowViewAll).toBe(false);
    });

    it('should not show view all when maxItems is 0', () => {
      component.showViewAll = true;
      component.maxItems = 0;

      expect(component.shouldShowViewAll).toBe(false);
    });

    it('should not show view all when showViewAll is false', () => {
      component.showViewAll = false;
      component.maxItems = 2;

      expect(component.shouldShowViewAll).toBe(false);
    });

    it.each([
      { showViewAll: true, maxItems: 2, productCount: 3, expected: true },
      { showViewAll: true, maxItems: 3, productCount: 3, expected: false },
      { showViewAll: false, maxItems: 2, productCount: 3, expected: false },
      { showViewAll: true, maxItems: 0, productCount: 3, expected: false },
      { showViewAll: true, maxItems: 2, productCount: 2, expected: false }
    ])('should return $expected for showViewAll=$showViewAll maxItems=$maxItems products=$productCount',
      ({ showViewAll, maxItems, productCount, expected }) => {
        component.showViewAll = showViewAll;
        component.maxItems = maxItems;
        component.products = mockProducts.slice(0, productCount);

        expect(component.shouldShowViewAll).toBe(expected);
      });
  });

  describe('Event Handling', () => {
    it('should emit productClick event', () => {
      const emitSpy = vi.fn();
      component.productClick.subscribe(emitSpy);
      const product = mockProducts[0];

      component.onProductClick(product);

      expect(emitSpy).toHaveBeenCalledWith(product);
    });

    it('should emit viewAllClick event', () => {
      const emitSpy = vi.fn();
      component.viewAllClick.subscribe(emitSpy);

      component.onViewAllClick();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit cartUpdated event', () => {
      const emitSpy = vi.fn();
      component.cartUpdated.subscribe(emitSpy);

      component.onQuantityChange();

      expect(emitSpy).toHaveBeenCalled();
    });

    it.each([
      { eventName: 'productClick', method: 'onProductClick' },
      { eventName: 'viewAllClick', method: 'onViewAllClick' },
      { eventName: 'cartUpdated', method: 'onQuantityChange' }
    ])('should emit $eventName when $method is called', ({ eventName, method }) => {
      const emitSpy = vi.fn();
      (component as any)[eventName].subscribe(emitSpy);

      if (method === 'onProductClick') {
        component.onProductClick(mockProducts[0]);
      } else {
        (component as any)[method]();
      }

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Product Tracking', () => {
    it('should track products by id', () => {
      const product = mockProducts[0];

      const trackId = component.trackByProductId(0, product);

      expect(trackId).toBe('1');
    });

    it.each([
      { index: 0, productId: '1' },
      { index: 1, productId: '2' },
      { index: 2, productId: '3' }
    ])('should return product id $productId for index $index', ({ index, productId }) => {
      const trackId = component.trackByProductId(index, mockProducts[index]);

      expect(trackId).toBe(productId);
    });

    it('should use id for tracking regardless of index', () => {
      const product = mockProducts[2];

      const trackId = component.trackByProductId(999, product);

      expect(trackId).toBe('3');
    });
  });

  describe('Display Styles', () => {
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
  });

  describe('Grid Layout Configuration', () => {
    it.each([
      { columns: 1, description: 'single column' },
      { columns: 2, description: 'two columns' },
      { columns: 3, description: 'three columns' },
      { columns: 4, description: 'four columns' }
    ])('should support $description layout', ({ columns }) => {
      component.columns = columns;

      expect(component.columns).toBe(columns);
    });
  });

  describe('Empty State Handling', () => {
    it('should handle empty products array', () => {
      component.products = [];

      expect(component.displayProducts).toEqual([]);
      expect(component.shouldShowViewAll).toBe(false);
    });

    it('should handle undefined title', () => {
      component.title = '';

      expect(component.title).toBe('');
    });

    it('should work with no products and max items', () => {
      component.products = [];
      component.maxItems = 10;

      expect(component.displayProducts).toEqual([]);
      expect(component.shouldShowViewAll).toBe(false);
    });
  });

  describe('Large Product Lists', () => {
    it('should handle many products efficiently', () => {
      const manyProducts = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        description: `Description ${i + 1}`,
        price: 10.99 + i,
        imageURL: `product${i + 1}.jpg`,
        category: 'Category',
        isEnabledForOnlineOrders: true
      }));
      component.products = manyProducts;
      component.maxItems = 10;

      const displayed = component.displayProducts;

      expect(displayed.length).toBe(10);
      expect(component.shouldShowViewAll).toBe(true);
    });

    it('should slice large arrays correctly', () => {
      const manyProducts = Array.from({ length: 50 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Product ${i + 1}`,
        description: `Description ${i + 1}`,
        price: 10.99,
        imageURL: 'product.jpg',
        category: 'Category',
        isEnabledForOnlineOrders: true
      }));
      component.products = manyProducts;
      component.maxItems = 20;

      const displayed = component.displayProducts;

      expect(displayed.length).toBe(20);
      expect(displayed[0].id).toBe('1');
      expect(displayed[19].id).toBe('20');
    });
  });

  describe('Product Updates', () => {
    it('should update displayProducts when products change', () => {
      component.products = [mockProducts[0]];
      component.maxItems = 0;

      expect(component.displayProducts.length).toBe(1);

      component.products = mockProducts;

      expect(component.displayProducts.length).toBe(3);
    });

    it('should update displayProducts when maxItems changes', () => {
      component.products = mockProducts;
      component.maxItems = 1;

      expect(component.displayProducts.length).toBe(1);

      component.maxItems = 2;

      expect(component.displayProducts.length).toBe(2);
    });

    it('should update shouldShowViewAll when products change', () => {
      component.products = [mockProducts[0]];
      component.maxItems = 2;
      component.showViewAll = true;

      expect(component.shouldShowViewAll).toBe(false);

      component.products = mockProducts;

      expect(component.shouldShowViewAll).toBe(true);
    });
  });
});
