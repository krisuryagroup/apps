import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CategoryListingComponent } from './category-listing.component';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ProductsService } from '../../core/services/products.service';
import { Product } from '../../core/models/product.model';
import { of } from 'rxjs';

describe('CategoryListingComponent', () => {
  let component: CategoryListingComponent;
  let mockRoute: any;
  let mockRouter: any;
  let mockCartService: any;
  let mockProductsService: any;

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Pizza',
    price: 199,
    category: 'pizza',
    imageURL: 'https://example.com/pizza.jpg',
    status: true,
    stock: 10,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
    isEnabledForOnlineOrders: true,
  } as Product;

  beforeEach(() => {
    mockRoute = {
      queryParams: of({ name: 'pizza', search: '' }),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockCartService = {
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      getItemQuantity: vi.fn(),
    };

    mockProductsService = {
      getOnlineEnabledProducts: vi.fn(),
      isProductAvailable: vi.fn(),
      formatPrice: vi.fn((price) => `₹${price}`),
    };

    component = new CategoryListingComponent(
      mockRoute,
      mockRouter,
      mockCartService,
      mockProductsService
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it.each([
      { field: 'category', value: '' },
      { field: 'search', value: '' },
      { field: 'isLoading', value: true },
    ])('should initialize $field to $value', ({ field, value }) => {
      expect((component as any)[field]).toEqual(value);
    });

    it('should start with empty arrays', () => {
      expect(component.filteredItems).toEqual([]);
      expect(component.allItems).toEqual([]);
    });
  });

  describe('Load Products', () => {
    it('should load products successfully', async () => {
      const mockProducts = [mockProduct];
      mockProductsService.getOnlineEnabledProducts.mockResolvedValue(mockProducts);
      mockProductsService.isProductAvailable.mockReturnValue(true);

      await component.loadProducts();

      expect(mockProductsService.getOnlineEnabledProducts).toHaveBeenCalled();
      expect(component.allItems).toEqual(mockProducts);
      expect(component.isLoading).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockProductsService.getOnlineEnabledProducts.mockRejectedValue(new Error('Load failed'));

      await component.loadProducts();

      expect(console.error).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Filter Items', () => {
    beforeEach(() => {
      component.allItems = [
        { ...mockProduct, id: 'prod-1', name: 'Margherita Pizza', category: 'pizza' },
        { ...mockProduct, id: 'prod-2', name: 'Pepperoni Pizza', category: 'pizza' },
        { ...mockProduct, id: 'prod-3', name: 'Burger', category: 'burger' },
      ];
    });

    it('should filter by category', () => {
      component.category = 'pizza';
      mockProductsService.isProductAvailable.mockReturnValue(true);

      component.filterItems();

      expect(component.filteredItems).toHaveLength(2);
      expect(component.filteredItems.every(item => item.category === 'pizza')).toBe(true);
    });

    it('should filter by search term', () => {
      component.search = 'margherita';
      mockProductsService.isProductAvailable.mockReturnValue(true);

      component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Margherita Pizza');
    });

    it('should filter by both category and search', () => {
      component.category = 'pizza';
      component.search = 'pepperoni';
      mockProductsService.isProductAvailable.mockReturnValue(true);

      component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Pepperoni Pizza');
    });

    it('should only include available products', () => {
      mockProductsService.isProductAvailable.mockImplementation((item: Product) => item.id !== 'prod-2');

      component.filterItems();

      expect(component.filteredItems).toHaveLength(2);
      expect(component.filteredItems.find(item => item.id === 'prod-2')).toBeUndefined();
    });

    it('should return all items when no filters', () => {
      mockProductsService.isProductAvailable.mockReturnValue(true);

      component.filterItems();

      expect(component.filteredItems).toHaveLength(3);
    });
  });

  describe('Cart Operations', () => {
    it('should increment quantity', () => {
      component.incrementQuantity(mockProduct);

      expect(mockCartService.addToCart).toHaveBeenCalledWith(mockProduct);
    });

    it('should decrement quantity', () => {
      component.decrementQuantity(mockProduct);

      expect(mockCartService.removeFromCart).toHaveBeenCalledWith(mockProduct);
    });

    it('should get item quantity', () => {
      mockCartService.getItemQuantity.mockReturnValue(3);

      const quantity = component.getItemQuantity(mockProduct);

      expect(quantity).toBe(3);
      expect(mockCartService.getItemQuantity).toHaveBeenCalledWith(mockProduct);
    });
  });

  describe('Price Formatting', () => {
    it('should format price correctly', () => {
      const formatted = component.formatPrice(199);

      expect(formatted).toBe('₹199');
      expect(mockProductsService.formatPrice).toHaveBeenCalledWith(199);
    });
  });

  describe('Image Error Handling', () => {
    it('should set default image on error', () => {
      const mockEvent = {
        target: {
          src: '',
        },
      };

      component.onImageError(mockEvent);

      expect(mockEvent.target.src).toBe('assets/foodCategories/default.png');
    });
  });

  describe('Query Params Subscription', () => {
    it('should load products when params change', () => {
      const loadSpy = vi.spyOn(component, 'loadProducts').mockResolvedValue();

      component.ngOnInit();

      expect(component.category).toBe('pizza');
      expect(component.search).toBe('');
      expect(loadSpy).toHaveBeenCalled();
    });

    it.each([
      { name: 'PIZZA', search: 'test', expectedCategory: 'pizza', expectedSearch: 'test' },
      { name: 'Burger', search: 'CHEESE', expectedCategory: 'burger', expectedSearch: 'cheese' },
      { name: '', search: '', expectedCategory: '', expectedSearch: '' },
    ])('should handle params: name=$name, search=$search', ({ name, search, expectedCategory, expectedSearch }) => {
      mockRoute.queryParams = of({ name, search });
      vi.spyOn(component, 'loadProducts').mockResolvedValue();

      component.ngOnInit();

      expect(component.category).toBe(expectedCategory);
      expect(component.search).toBe(expectedSearch);
    });
  });
});
