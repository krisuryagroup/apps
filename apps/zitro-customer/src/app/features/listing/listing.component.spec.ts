import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ListingComponent } from './listing.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsService } from '../../core/services/products.service';
import { CategoriesService } from '../../core/services/categories.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { FirebaseAuthService } from '../../core/services/firebase-auth.service';
import { CartService } from '../../core/services/cart.service';
import { of, BehaviorSubject } from 'rxjs';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { signal } from '@angular/core';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';

describe('ListingComponent', () => {
  let component: ListingComponent;
  let fixture: ComponentFixture<ListingComponent>;
  let mockRouter: any;
  let mockRoute: any;
  let mockProductsService: any;
  let mockCategoriesService: any;
  let mockFavoritesService: any;
  let mockFirebaseAuthService: any;
  let mockCartService: any;
  let urlSubject: BehaviorSubject<any>;
  let queryParamsSubject: BehaviorSubject<any>;

  const mockProducts = [
    {
      id: '1',
      name: 'Pizza Margherita',
      category: 'pizza',
      description: 'Classic pizza',
      price: 10,
      imageUrl: 'pizza.jpg',
      isRecommended: false,
      isPopular: true
    },
    {
      id: '2',
      name: 'Burger Deluxe',
      category: 'burger',
      description: 'Juicy burger',
      price: 8,
      imageUrl: 'burger.jpg',
      isRecommended: true,
      isPopular: false
    },
    {
      id: '3',
      name: 'Chinese Noodles',
      category: 'chinese',
      description: 'Spicy noodles',
      price: 12,
      imageUrl: 'noodles.jpg',
      isRecommended: false,
      isPopular: false
    }
  ];

  const mockCategories = [
    { id: 'cat1', name: 'Pizza', imageURL: 'pizza.jpg' },
    { id: 'cat2', name: 'Burger', imageURL: 'burger.jpg' },
    { id: 'cat3', name: 'Chinese', imageURL: 'chinese.jpg' }
  ];

  beforeEach(async () => {
    urlSubject = new BehaviorSubject([]);
    queryParamsSubject = new BehaviorSubject({});

    mockRouter = {
      navigate: vi.fn(),
      url: '/listing'
    };

    mockRoute = {
      url: urlSubject.asObservable(),
      queryParams: queryParamsSubject.asObservable()
    };

    mockProductsService = {
      getProducts: vi.fn().mockResolvedValue(mockProducts),
      getCachedProducts: vi.fn().mockReturnValue(mockProducts)
    };

    mockCategoriesService = {
      getCategories: vi.fn().mockResolvedValue(mockCategories)
    };

    mockFavoritesService = {
      getFavorites: vi.fn().mockResolvedValue([]),
      initializeFavorites: vi.fn().mockResolvedValue(undefined),
      isFavorite: vi.fn().mockReturnValue(false),
      addFavorite: vi.fn().mockResolvedValue(undefined),
      removeFavorite: vi.fn().mockResolvedValue(undefined)
    };

    mockFirebaseAuthService = {
      user: signal(null),
      getCurrentUser: vi.fn().mockReturnValue(null)
    };

    mockCartService = {
      getQuantity: vi.fn().mockReturnValue(0),
      addItem: vi.fn(),
      removeItem: vi.fn(),
      getCartItemCount: vi.fn().mockReturnValue(0)
    };

    // Resolve component resources before configuring TestBed
    await resolveComponentResources(null as any);

    await TestBed.configureTestingModule({
      imports: [ListingComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: FavoritesService, useValue: mockFavoritesService },
        { provide: FirebaseAuthService, useValue: mockFirebaseAuthService },
        { provide: CartService, useValue: mockCartService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ListingComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load products and categories on init', async () => {
      await component.ngOnInit();

      expect(mockProductsService.getProducts).toHaveBeenCalled();
      expect(mockCategoriesService.getCategories).toHaveBeenCalled();
      expect(component.allItems).toEqual(mockProducts);
      expect(component.allCategories).toEqual(mockCategories);
    });

    it('should initialize favorites service after timeout', fakeAsync(() => {
      const loadCachedFavoritesSpy = vi.spyOn(component as any, 'loadCachedFavorites');
      
      component.ngOnInit();
      
      expect(loadCachedFavoritesSpy).not.toHaveBeenCalled();
      
      tick(1000);
      
      expect(loadCachedFavoritesSpy).toHaveBeenCalled();
    }));

    it('should NOT call filterItems from setTimeout', fakeAsync(() => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems');
      
      component.ngOnInit();
      
      // Clear any calls from initial setup
      filterItemsSpy.mockClear();
      
      tick(1000);
      
      // filterItems should NOT be called from setTimeout
      // It should only be called by route subscription
      expect(filterItemsSpy).not.toHaveBeenCalled();
    }));

    it('should sync cart quantities on init', async () => {
      const syncCartSpy = vi.spyOn(component, 'syncCartQuantities');
      
      await component.ngOnInit();
      
      expect(syncCartSpy).toHaveBeenCalled();
    });
  });

  describe('Route Parameter Handling', () => {
    it('should handle category param from query parameters', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ category: 'Pizza' });
      tick(0);

      expect(component.category).toBe('pizza');
    }));

    it('should handle name param as fallback', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ name: 'Burger' });
      tick(0);

      expect(component.category).toBe('burger');
    }));

    it('should prefer category param over name param', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ category: 'Pizza', name: 'Burger' });
      tick(0);

      expect(component.category).toBe('pizza');
    }));

    it('should handle categoryId param', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ categoryId: 'cat1' });
      tick(0);

      expect(component.categoryId).toBe('cat1');
    }));

    it('should handle search param', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ search: 'Pizza' });
      tick(0);

      expect(component.search).toBe('pizza');
    }));

    it('should detect favorites route from URL segments', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      urlSubject.next([{ path: 'favorites' }]);
      tick(0);

      expect(component.showFavorites).toBe(true);
    }));

    it('should detect favorites from query param', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ favorites: 'true' });
      tick(0);

      expect(component.showFavorites).toBe(true);
    }));

    it('should detect recommended from query param', fakeAsync(() => {
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ recommended: 'true' });
      tick(0);

      expect(component.showRecommended).toBe(true);
    }));

    it('should call filterItems when route params change', fakeAsync(() => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue();
      
      component.ngOnInit();
      tick(0);

      queryParamsSubject.next({ category: 'pizza' });
      tick(0);

      expect(filterItemsSpy).toHaveBeenCalled();
    }));

    it('should handle multiple param changes correctly', fakeAsync(() => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue();
      
      component.ngOnInit();
      tick(0);

      // First change
      queryParamsSubject.next({ category: 'pizza' });
      tick(0);
      expect(component.category).toBe('pizza');

      // Second change
      queryParamsSubject.next({ category: 'burger', search: 'deluxe' });
      tick(0);
      expect(component.category).toBe('burger');
      expect(component.search).toBe('deluxe');

      expect(filterItemsSpy).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Filter Items Logic', () => {
    beforeEach(async () => {
      component.allItems = mockProducts;
      await component.loadCategories();
    });

    it('should filter by category', async () => {
      component.category = 'pizza';
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Pizza Margherita');
    });

    it('should filter by search term', async () => {
      component.search = 'burger';
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Burger Deluxe');
    });

    it('should filter by both category and search', async () => {
      component.category = 'pizza';
      component.search = 'margherita';
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Pizza Margherita');
    });

    it('should show favorites when showFavorites is true', async () => {
      component.showFavorites = true;
      mockFavoritesService.getFavorites.mockResolvedValue([mockProducts[0]]);
      
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Pizza Margherita');
    });

    it('should show recommended items when showRecommended is true', async () => {
      component.showRecommended = true;
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(1);
      expect(component.filteredItems[0].name).toBe('Burger Deluxe');
    });

    it('should show all items when no filters are applied', async () => {
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(3);
    });
  });

  describe('Category Filtering', () => {
    beforeEach(async () => {
      component.allItems = mockProducts;
      await component.loadCategories();
    });

    it('should update filtered categories when filtering by search', async () => {
      component.search = 'pizza';
      await component.filterItems();

      expect(component.filteredCategories).toHaveLength(1);
      expect(component.filteredCategories[0].name.toLowerCase()).toBe('pizza');
    });

    it('should show all categories when no search is applied', async () => {
      await component.filterItems();

      expect(component.filteredCategories.length).toBeGreaterThan(0);
    });
  });

  describe('Subscription Cleanup', () => {
    it('should unsubscribe on destroy', () => {
      const unsubscribeSpy = vi.fn();
      component['routeSubscription'] = { unsubscribe: unsubscribeSpy } as any;

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should not throw error if no subscription exists', () => {
      component['routeSubscription'] = undefined as any;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Cart Integration', () => {
    it('should sync cart quantities correctly', () => {
      component.allItems = mockProducts;
      mockCartService.getQuantity.mockImplementation((id: string) => {
        return id === '1' ? 2 : 0;
      });

      component.syncCartQuantities();

      expect(component.allItems[0].quantity).toBe(2);
      expect(component.allItems[1].quantity).toBe(0);
    });

    it('should add item to cart', () => {
      const product = mockProducts[0];
      
      component.addToCart(product);

      expect(mockCartService.addItem).toHaveBeenCalledWith(product);
    });

    it('should remove item from cart', () => {
      const product = mockProducts[0];
      
      component.removeFromCart(product);

      expect(mockCartService.removeItem).toHaveBeenCalledWith(product.id);
    });
  });

  describe('Favorites Integration', () => {
    it('should check if item is favorite', () => {
      const product = mockProducts[0];
      mockFavoritesService.isFavorite.mockReturnValue(true);

      const result = component.isFavorite(product.id);

      expect(result).toBe(true);
      expect(mockFavoritesService.isFavorite).toHaveBeenCalledWith(product.id);
    });

    it('should toggle favorite on', async () => {
      const product = mockProducts[0];
      mockFavoritesService.isFavorite.mockReturnValue(false);

      await component.toggleFavorite(product);

      expect(mockFavoritesService.addFavorite).toHaveBeenCalledWith(product);
    });

    it('should toggle favorite off', async () => {
      const product = mockProducts[0];
      mockFavoritesService.isFavorite.mockReturnValue(true);

      await component.toggleFavorite(product);

      expect(mockFavoritesService.removeFavorite).toHaveBeenCalledWith(product.id);
    });
  });

  describe('Navigation', () => {
    it('should navigate back', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should filter by category', async () => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue();
      
      await component.filterByCategory('pizza');

      expect(component.category).toBe('pizza');
      expect(filterItemsSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty products array', async () => {
      mockProductsService.getProducts.mockResolvedValue([]);
      component.allItems = [];
      
      await component.filterItems();

      expect(component.filteredItems).toHaveLength(0);
    });

    it('should handle empty categories array', async () => {
      mockCategoriesService.getCategories.mockResolvedValue([]);
      
      await component.loadCategories();

      expect(component.allCategories).toHaveLength(0);
    });

    it('should handle error when loading products', async () => {
      mockProductsService.getProducts.mockRejectedValue(new Error('Failed to load'));
      
      await component.loadProducts();

      expect(component.loading).toBe(false);
    });

    it('should handle error when loading categories', async () => {
      mockCategoriesService.getCategories.mockRejectedValue(new Error('Failed to load'));
      
      await component.loadCategories();

      expect(component.allCategories).toHaveLength(0);
    });
  });

  describe('setTimeout Behavior - Critical Tests', () => {
    it('should only load favorites in setTimeout, not filter items', fakeAsync(() => {
      const loadCachedFavoritesSpy = vi.spyOn(component as any, 'loadCachedFavorites').mockResolvedValue(undefined);
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue(undefined);

      component.ngOnInit();
      
      // Clear calls from route subscription initial trigger
      loadCachedFavoritesSpy.mockClear();
      filterItemsSpy.mockClear();

      // Advance time by 1000ms
      tick(1000);

      // Only loadCachedFavorites should be called from setTimeout
      expect(loadCachedFavoritesSpy).toHaveBeenCalledTimes(1);
      
      // filterItems should NOT be called from setTimeout
      expect(filterItemsSpy).not.toHaveBeenCalled();
    }));

    it('should call filterItems only from route subscription', fakeAsync(() => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue(undefined);

      component.ngOnInit();
      tick(0);

      // filterItems should be called from route subscription
      expect(filterItemsSpy).toHaveBeenCalled();
      
      filterItemsSpy.mockClear();
      
      // Advance time by setTimeout duration
      tick(1000);
      
      // filterItems should NOT be called again from setTimeout
      expect(filterItemsSpy).not.toHaveBeenCalled();
    }));

    it('should prevent duplicate filtering on initialization', fakeAsync(() => {
      const filterItemsSpy = vi.spyOn(component, 'filterItems').mockResolvedValue(undefined);

      component.ngOnInit();
      tick(0);

      const initialCallCount = filterItemsSpy.mock.calls.length;
      
      // Advance through setTimeout
      tick(1000);
      
      // Call count should remain the same (no duplicate calls from setTimeout)
      expect(filterItemsSpy.mock.calls.length).toBe(initialCallCount);
    }));
  });
});
