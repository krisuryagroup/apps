import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HomeComponent } from './home.component';
import { COMMON_CONSTANTS } from '../../core/constants/app.constants';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let mockRouter: any;
  let mockCategoriesService: any;
  let mockProductsService: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn()
    };

    mockCategoriesService = {
      getCategories: vi.fn()
    };

    mockProductsService = {
      getPopularOnlineProducts: vi.fn(),
      getRecommendedOnlineProducts: vi.fn()
    };

    component = new HomeComponent(mockRouter, mockCategoriesService, mockProductsService);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.categories).toEqual([]);
      expect(component.popularProducts).toEqual([]);
      expect(component.recommendedProducts).toEqual([]);
      expect(component.isLoadingCategories).toBe(true);
      expect(component.isLoadingProducts).toBe(true);
      expect(component.isLoadingRecommended).toBe(true);
      expect(component.maxPopularItems).toBe(8);
      expect(component.searchQuery).toBe('');
      expect(component.showItemDialog).toBe(false);
      expect(component.selectedItem).toBe(null);
    });

    it('should load categories, popular and recommended products on init', async () => {
      const mockCategories = [{ id: '1', name: 'Category 1' }];
      const mockPopularProducts = [{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }];
      const mockRecommendedProducts = [{ id: 'r1', name: 'Recommended 1', isEnabledForOnlineOrders: true }];
      mockCategoriesService.getCategories.mockResolvedValue(mockCategories);
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockPopularProducts);
      mockProductsService.getRecommendedOnlineProducts.mockResolvedValue(mockRecommendedProducts);

      await component.ngOnInit();

      expect(mockCategoriesService.getCategories).toHaveBeenCalled();
      expect(mockProductsService.getPopularOnlineProducts).toHaveBeenCalled();
      expect(mockProductsService.getRecommendedOnlineProducts).toHaveBeenCalled();
      expect(component.categories).toEqual(mockCategories);
      expect(component.popularProducts).toEqual(mockPopularProducts);
      expect(component.recommendedProducts).toEqual(mockRecommendedProducts);
    });
  });

  describe('Load Categories', () => {
    it('should load categories successfully', async () => {
      const mockCategories = [
        { id: '1', name: 'Appetizers' },
        { id: '2', name: 'Main Course' }
      ];
      mockCategoriesService.getCategories.mockResolvedValue(mockCategories);

      await component.loadCategories();

      expect(component.categories).toEqual(mockCategories);
      expect(component.isLoadingCategories).toBe(false);
    });

    it('should handle category loading error', async () => {
      mockCategoriesService.getCategories.mockRejectedValue(new Error('Load failed'));

      await component.loadCategories();

      expect(console.error).toHaveBeenCalledWith('Error loading categories:', expect.any(Error));
      expect(component.isLoadingCategories).toBe(false);
    });

    it('should set loading state correctly', async () => {
      mockCategoriesService.getCategories.mockResolvedValue([]);

      expect(component.isLoadingCategories).toBe(true);
      await component.loadCategories();
      expect(component.isLoadingCategories).toBe(false);
    });

    it('should reset loading state even on error', async () => {
      mockCategoriesService.getCategories.mockRejectedValue(new Error('Error'));

      await component.loadCategories();

      expect(component.isLoadingCategories).toBe(false);
    });
  });

  describe('Load Popular Products', () => {
    it('should load popular products successfully', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Pizza', isEnabledForOnlineOrders: true },
        { id: 'p2', name: 'Burger', isEnabledForOnlineOrders: true }
      ];
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockProducts);

      await component.loadPopularProducts();

      expect(component.popularProducts).toEqual(mockProducts);
      expect(component.isLoadingProducts).toBe(false);
    });

    it('should log number of loaded products', async () => {
      const mockProducts = [
        { id: 'p1', name: 'Pizza', isEnabledForOnlineOrders: true },
        { id: 'p2', name: 'Burger', isEnabledForOnlineOrders: true }
      ];
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockProducts);

      await component.loadPopularProducts();

      expect(console.log).toHaveBeenCalledWith('Loaded', 2, 'popular online-enabled products');
    });

    it('should handle product loading error', async () => {
      mockProductsService.getPopularOnlineProducts.mockRejectedValue(new Error('Load failed'));

      await component.loadPopularProducts();

      expect(console.error).toHaveBeenCalledWith('Error loading popular products:', expect.any(Error));
      expect(component.popularProducts).toEqual([]);
      expect(component.isLoadingProducts).toBe(false);
    });

    it('should set empty array on error', async () => {
      mockProductsService.getPopularOnlineProducts.mockRejectedValue(new Error('Error'));

      await component.loadPopularProducts();

      expect(component.popularProducts).toEqual([]);
    });

    it('should reset loading state even on error', async () => {
      mockProductsService.getPopularOnlineProducts.mockRejectedValue(new Error('Error'));

      await component.loadPopularProducts();

      expect(component.isLoadingProducts).toBe(false);
    });
  });

  describe('Load Recommended Products', () => {
    it('should load recommended products successfully', async () => {
      const mockProducts = [
        { id: 'r1', name: 'Pasta', isEnabledForOnlineOrders: true },
        { id: 'r2', name: 'Salad', isEnabledForOnlineOrders: true }
      ];
      mockProductsService.getRecommendedOnlineProducts.mockResolvedValue(mockProducts);

      await component.loadRecommendedProducts();

      expect(component.recommendedProducts).toEqual(mockProducts);
      expect(component.isLoadingRecommended).toBe(false);
    });

    it('should log number of loaded recommended products', async () => {
      const mockProducts = [
        { id: 'r1', name: 'Pasta', isEnabledForOnlineOrders: true },
        { id: 'r2', name: 'Salad', isEnabledForOnlineOrders: true }
      ];
      mockProductsService.getRecommendedOnlineProducts.mockResolvedValue(mockProducts);

      await component.loadRecommendedProducts();

      expect(console.log).toHaveBeenCalledWith('Loaded', 2, 'recommended products');
    });

    it.each([
      { scenario: 'network error', error: new Error('Network failed') },
      { scenario: 'service error', error: new Error('Service unavailable') }
    ])('should handle $scenario gracefully', async ({ error }) => {
      mockProductsService.getRecommendedOnlineProducts.mockRejectedValue(error);

      await component.loadRecommendedProducts();

      expect(console.error).toHaveBeenCalledWith('Error loading recommended products:', error);
      expect(component.recommendedProducts).toEqual([]);
      expect(component.isLoadingRecommended).toBe(false);
    });
  });

  describe('Navigate to Category', () => {
    it('should navigate to categories page for view all', () => {
      component.navigateToCategory('');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/categories']);
    });

    it('should navigate to listing with category filter', () => {
      component.navigateToCategory('Appetizers');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing'], {
        queryParams: { category: 'Appetizers' }
      });
    });

    it('should navigate with category name preserving case', () => {
      component.navigateToCategory('Main Course');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing'], {
        queryParams: { category: 'Main Course' }
      });
    });

    it.each([
      { category: 'Pizza', expected: 'Pizza' },
      { category: 'BURGERS', expected: 'BURGERS' },
      { category: 'Ice Cream', expected: 'Ice Cream' }
    ])('should navigate with category $category preserving case', ({ category, expected }) => {
      component.navigateToCategory(category);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing'], {
        queryParams: { category: expected }
      });
    });
  });

  describe('Product Click', () => {
    it('should show item dialog with product details', () => {
      const product = { 
        id: 'p1', 
        name: 'Margherita Pizza',
        description: 'Delicious pizza with cheese',
        price: 12.99,
        weight: '500g',
        imageURL: 'pizza.jpg',
        isOfferDisabled: false,
        isEnabledForOnlineOrders: true 
      } as any;

      component.onProductClick(product);

      expect(component.showItemDialog).toBe(true);
      expect(component.selectedItem).toEqual({
        imageURL: 'pizza.jpg',
        title: 'Margherita Pizza',
        description: 'Delicious pizza with cheese',
        weight: '500g',
        offer: COMMON_CONSTANTS.OFFER_APPLICABLE_TEXT,
        price: 12.99
      });
    });

    it('should not show offer when isOfferDisabled is true', () => {
      const product = { 
        id: 'p1', 
        name: 'Special Burger',
        description: 'Tasty burger',
        price: 8.99,
        imageURL: 'burger.jpg',
        isOfferDisabled: true,
        isEnabledForOnlineOrders: true 
      } as any;

      component.onProductClick(product);

      expect(component.selectedItem.offer).toBeUndefined();
    });

    it('should handle product without optional fields', () => {
      const product = { 
        id: 'p1', 
        name: 'Simple Item',
        price: 5.99,
        imageURL: 'item.jpg',
        isEnabledForOnlineOrders: true 
      } as any;

      component.onProductClick(product);

      expect(component.showItemDialog).toBe(true);
      expect(component.selectedItem).toEqual({
        imageURL: 'item.jpg',
        title: 'Simple Item',
        description: undefined,
        weight: undefined,
        offer: COMMON_CONSTANTS.OFFER_APPLICABLE_TEXT,
        price: 5.99
      });
    });
  });

  describe('Item Dialog', () => {
    it('should close item dialog and clear selected item', () => {
      component.showItemDialog = true;
      component.selectedItem = { title: 'Test Item', price: 10 };

      component.onCloseItemDialog();

      expect(component.showItemDialog).toBe(false);
      expect(component.selectedItem).toBe(null);
    });

    it('should handle closing dialog when already closed', () => {
      component.showItemDialog = false;
      component.selectedItem = null;

      component.onCloseItemDialog();

      expect(component.showItemDialog).toBe(false);
      expect(component.selectedItem).toBe(null);
    });
  });

  describe('View All Click', () => {
    it('should navigate to listing page', () => {
      component.onViewAllClick();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing']);
    });
  });

  describe('Recommended View All Click', () => {
    it('should navigate to listing with recommended filter', () => {
      component.onRecommendedViewAllClick();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/listing'], {
        queryParams: { recommended: 'true' }
      });
    });
  });

  describe('Cart Updated', () => {
    it('should have onCartUpdated method', () => {
      expect(component.onCartUpdated).toBeDefined();
      expect(() => component.onCartUpdated()).not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    it('should navigate to search with query', () => {
      component.searchQuery = 'pizza';

      component.onSearch();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/search'], {
        queryParams: { search: 'pizza' }
      });
    });

    it('should trim search query', () => {
      component.searchQuery = '  burger  ';

      component.onSearch();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/search'], {
        queryParams: { search: 'burger' }
      });
    });

    it('should not search with empty query', () => {
      component.searchQuery = '';

      component.onSearch();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should not search with whitespace only', () => {
      component.searchQuery = '   ';

      component.onSearch();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should load all data successfully on init', async () => {
      const mockCategories = [{ id: '1', name: 'Category 1' }];
      const mockPopularProducts = [{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }];
      const mockRecommendedProducts = [{ id: 'r1', name: 'Recommended 1', isEnabledForOnlineOrders: true }];
      mockCategoriesService.getCategories.mockResolvedValue(mockCategories);
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockPopularProducts);
      mockProductsService.getRecommendedOnlineProducts.mockResolvedValue(mockRecommendedProducts);

      await component.ngOnInit();

      expect(component.categories).toEqual(mockCategories);
      expect(component.popularProducts).toEqual(mockPopularProducts);
      expect(component.recommendedProducts).toEqual(mockRecommendedProducts);
      expect(component.isLoadingCategories).toBe(false);
      expect(component.isLoadingProducts).toBe(false);
      expect(component.isLoadingRecommended).toBe(false);
    });

    it.each([
      { 
        failedService: 'categories',
        categoriesResult: Promise.reject(new Error('Failed')),
        popularResult: Promise.resolve([{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }]),
        recommendedResult: Promise.resolve([{ id: 'r1', name: 'Recommended 1', isEnabledForOnlineOrders: true }])
      },
      { 
        failedService: 'popular products',
        categoriesResult: Promise.resolve([{ id: '1', name: 'Category 1' }]),
        popularResult: Promise.reject(new Error('Failed')),
        recommendedResult: Promise.resolve([{ id: 'r1', name: 'Recommended 1', isEnabledForOnlineOrders: true }])
      },
      { 
        failedService: 'recommended products',
        categoriesResult: Promise.resolve([{ id: '1', name: 'Category 1' }]),
        popularResult: Promise.resolve([{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }]),
        recommendedResult: Promise.reject(new Error('Failed'))
      }
    ])('should handle $failedService failure without blocking other data', async ({ categoriesResult, popularResult, recommendedResult }) => {
      mockCategoriesService.getCategories.mockReturnValue(categoriesResult);
      mockProductsService.getPopularOnlineProducts.mockReturnValue(popularResult);
      mockProductsService.getRecommendedOnlineProducts.mockReturnValue(recommendedResult);

      await component.ngOnInit();

      // At least one data source should still work
      const hasData = component.categories.length > 0 || 
                     component.popularProducts.length > 0 || 
                     component.recommendedProducts.length > 0;
      expect(hasData).toBe(true);
    });
  });

  describe('Search Input Handling', () => {
    it('should update search query on input', () => {
      const event = { target: { value: 'pasta' } };

      component.onSearchInput(event);

      expect(component.searchQuery).toBe('pasta');
    });

    it('should clear search query', () => {
      component.searchQuery = 'pizza';

      component.clearSearch();

      expect(component.searchQuery).toBe('');
    });
  });

  describe('Integration Flows', () => {
    it('should load both categories and products on init', async () => {
      const mockCategories = [{ id: '1', name: 'Category 1' }];
      const mockProducts = [{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }];
      mockCategoriesService.getCategories.mockResolvedValue(mockCategories);
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockProducts);

      await component.ngOnInit();

      expect(component.categories).toEqual(mockCategories);
      expect(component.popularProducts).toEqual(mockProducts);
      expect(component.isLoadingCategories).toBe(false);
      expect(component.isLoadingProducts).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      mockCategoriesService.getCategories.mockRejectedValue(new Error('Categories failed'));
      const mockProducts = [{ id: 'p1', name: 'Product 1', isEnabledForOnlineOrders: true }];
      mockProductsService.getPopularOnlineProducts.mockResolvedValue(mockProducts);

      await component.ngOnInit();

      expect(component.categories).toEqual([]);
      expect(component.popularProducts).toEqual(mockProducts);
    });
  });

  describe('Search Input Edge Cases', () => {
    it.each([
      { input: 'burger', expected: 'burger' },
      { input: 'PIZZA', expected: 'PIZZA' },
      { input: '123', expected: '123' },
      { input: '', expected: '' }
    ])('should set searchQuery to $expected for input $input', ({ input, expected }) => {
      const event = { target: { value: input } };

      component.onSearchInput(event);

      expect(component.searchQuery).toBe(expected);
    });
  });
});
