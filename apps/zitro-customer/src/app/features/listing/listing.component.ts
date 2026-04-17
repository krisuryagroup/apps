import { Component, OnInit, OnDestroy } from '@angular/core';
import { FavoritesService } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { Product } from '@zitro/models';
import { CategoriesService, Category } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';
import { matchesSearch } from '@zitro/utils';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '@zitro/ui';
import { FormsModule } from '@angular/forms';
import { CartService } from '@zitro/services';
import { CartSummaryComponent } from '@zitro/ui';
import { DescriptionDialogComponent } from '@zitro/ui';
import { ItemDetailsDialogComponent } from '@zitro/ui';
import { combineLatest, Subscription } from 'rxjs';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { APP_CONSTANTS, CATEGORY_ORDER, FILTER_PREFERENCES, COMMON_CONSTANTS } from '../../core/constants/app.constants';
import { AnalyticsService } from '@zitro/services';
import { AppSettingsService } from '@zitro/services';
import { AnalyticsConfigModel } from '@zitro/models';

@Component({
  selector: 'app-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomNavComponent, CartSummaryComponent, DescriptionDialogComponent, ItemDetailsDialogComponent, CachedImageDirective, LoaderComponent],
  templateUrl: './listing.component.html',
  styleUrls: ['./listing.component.scss']
})
export class ListingComponent implements OnInit, OnDestroy {
  category: string = '';
  categoryId: string = '';
  search: string = '';
  filteredItems: Product[] = [];
  favoriteItems: Product[] = [];
  showFavorites: boolean = false;
  showRecommended: boolean = false;
  allItems: Product[] = [];
  loading: boolean = false;
  imageLoading: { [key: string]: boolean } = {};

  showFilter = false;
  showScrollTop = false;
  filters = {
    new: false,
    spicy: false,
    categories: [] as string[],
    preferences: [] as string[],
  };
  filterCategories: Category[] = [];
  filterPreferences = [...FILTER_PREFERENCES];

  items = Array.from({ length: 100 }, (_, i) => `Item #${i + 1}`);

  private searchTimeout: any;
  private routeSubscription?: Subscription;

  // Dialog properties
  showDescriptionDialog: boolean = false;
  dialogDescription: string = '';
  dialogProductName: string = '';

  // Item details dialog state
  showItemDialog: boolean = false;
  selectedItem: any = null;
  analyticConfigs: AnalyticsConfigModel | null = null;
  lastSavedSearchTerm: string = "";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private favoritesService: FavoritesService,
    private cartService: CartService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private authService: FirebaseAuthService,
    private analyticsService: AnalyticsService,
    private appSettingsService: AppSettingsService
  ) {
    // Add scroll event listener
    // window.addEventListener('scroll', this.onWindowScroll.bind(this));
  }

  categoryFilter: string = '';
  sortOption: string = 'category';

  async loadProducts(): Promise<void> {
    this.loading = true;
    try {
      // Load only products that are enabled for online orders
      this.allItems = await this.productsService.getOnlineEnabledProducts();
      console.log('Loaded', this.allItems.length, 'online-enabled products');
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      this.loading = false;
    }
  }

  async refreshProducts(): Promise<void> {
    this.loading = true;
    try {
      // Clear cache and get fresh data
      await this.productsService.refreshProducts();
      // Then filter to only online-enabled products
      this.allItems = await this.productsService.getOnlineEnabledProducts();
      await this.filterItems();
      console.log('Refreshed online-enabled products from server');
    } catch (error) {
      console.error('Error refreshing products:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadCategories(): Promise<void> {
    try {
      this.filterCategories = await this.categoriesService.getCategories();
      console.log('Loaded', this.filterCategories.length, 'categories');
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async onCategoryFilterChange(event: any) {
    this.category = this.categoryFilter;
    await this.filterItems();
  }

  async onSortChange(event: any) {
    await this.filterItems();
  }

  toggleCategory(cat: Category) {
    const categoryName = cat.name.toLowerCase();
    const idx = this.filters.categories.indexOf(categoryName);
    if (idx > -1) this.filters.categories.splice(idx, 1);
    else this.filters.categories.push(categoryName);
  }

  togglePreference(pref: string) {
    const idx = this.filters.preferences.indexOf(pref);
    if (idx > -1) this.filters.preferences.splice(idx, 1);
    else this.filters.preferences.push(pref);
  }

  async applyFilters() {
    this.showFilter = false;
    await this.filterItems();
  }

  async resetFilters() {
    this.filters = { new: false, spicy: false, categories: [], preferences: [] };
    await this.filterItems();
  }

  resetListingParams() {
    this.category = '';
    this.categoryId = '';
    this.showFavorites = false;
    this.showRecommended = false;
    // Update URL without these parameters
    this.router.navigate([], {
      queryParams: { search: this.search }, // Keep only search parameter
      queryParamsHandling: 'merge',
      relativeTo: this.route
    });
  }

  onSearchInput(event: any) {
    
    // Reset other parameters when searching
    this.resetListingParams();
        // Clear previous timeout
    const searchValue = event.target?.value?.toLowerCase() ?? '';
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reset other parameters when searching
    if (this.search !== searchValue) {
      this.search = searchValue;
      // Reset category, favorites, and recommended when search changes
      this.category = '';
      this.categoryId = '';
      this.showFavorites = false;
      this.showRecommended = false;
    }
    
    // Set new timeout for debouncing
    this.searchTimeout = setTimeout(() => {
      // Update URL with search parameter - use replaceUrl to avoid creating history entries
      this.router.navigate([], {
        queryParams: searchValue ? { search: searchValue } : {},
        queryParamsHandling: 'merge',
        relativeTo: this.route,
        replaceUrl: true // This prevents creating new history entries for each keystroke
      });
      this.filterItems();
    }, 300); // 300ms delay

  }

  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.showScrollTop = target.scrollTop > 300;
  }

  scrollToTop(): void {
    const container = document.querySelector('.scrollable-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async ngOnInit() {
    this.analyticConfigs = await this.appSettingsService.getAnalyticConfigs();
    // Track screen view
    await this.analyticsService.logScreenView('Product Listing', 'ListingComponent');
    
    // Load products and categories concurrently
    await Promise.all([
      this.loadProducts(),
      this.loadCategories()
    ]);
    
    // Initialize favorites service (it will auto-detect current user)
    // Wait a bit for Firebase Auth to initialize and load favorites
    setTimeout(async () => {
      await this.loadCachedFavorites();
      // Note: filterItems() will be called by the route subscription below
    }, 1000);
    
    // Sync cart quantities when component initializes
    this.syncCartQuantities();
    
    // Combine URL and query parameter subscriptions properly to avoid nested subscriptions
    this.routeSubscription = combineLatest([
      this.route.url,
      this.route.queryParams
    ]).subscribe(async ([urlSegments, params]) => {
      const isFavoritesRoute = urlSegments.some(seg => seg.path === 'favorites');
      console.log('URL segments:', urlSegments.map(seg => seg.path), 'isFavoritesRoute:', isFavoritesRoute);
      
      // Handle category parameter (supports 'category', 'name', and 'categoryId')
      if (params['category'] || params['name'] || params['categoryId']) {
        // Prefer 'category' param (from home/category-cards), then 'name', then leave as is
        const categoryParam = params['category'] || params['name'] || '';
        this.category = categoryParam.toLowerCase();
        this.categoryId = params['categoryId'] || '';
        
        // Track category view if category is specified
        if (this.category) {
          await this.analyticsService.logViewCategory(this.category, this.category);
        }
      }
      
      // Update search term
      const newSearch = (params['search'] || '').toLowerCase();
      if (this.search !== newSearch) {
        this.search = newSearch;
      }
      
      this.showFavorites = isFavoritesRoute || !!params['favorites'];
      this.showRecommended = !!params['recommended'];
      
      console.log("Query Params:", this.category, this.categoryId, this.search, this.showFavorites, this.showRecommended);
      await this.filterItems();
    });
  }

  /**
   * Load cached favorites to initialize the service
   */
  private async loadCachedFavorites(): Promise<void> {
    try {
      await this.favoritesService.getFavorites();
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  syncCartQuantities() {
    // Sync all item quantities with cart service
    this.allItems.forEach(item => {
      item.qty = this.getCartQty(item);
    });
  }

  async filterItems() {
    // First sync quantities from cart service
    this.syncCartQuantities();

    // Show existing `loading` indicator while filtering/searching and keep it visible at least 1000ms
    const start = Date.now();
    this.loading = true;

    // Initialize image loading states for all items
    this.imageLoading = {};

    // Debug logging (reduced verbosity)
    console.log('Filtering with:', {
      categoryId: this.categoryId,
      category: this.category,
      search: this.search,
      showFavorites: this.showFavorites,
      totalItems: this.allItems.length
    });

    let filtered = this.allItems.filter(item => {
      // Search filter
      
   const matchesFound = this.search ? 
    matchesSearch(item.name, this.search) ||
    matchesSearch(item.description ?? '', this.search) ||
    // Search by category name instead of ID
    this.filterCategories.some(cat => 
      cat.id === item.category && matchesSearch(cat.name, this.search)
    ) : true;

      // Category filter
      let matchesCategory = true;
      if (this.filters.categories.length > 0) {
        // When using filter UI, match category names from filterCategories
        matchesCategory = this.filters.categories.some(catName => {
          const categoryObj = this.filterCategories.find(cat => cat.name.toLowerCase() === catName.toLowerCase());
          return categoryObj && item.category === categoryObj.id;
        });
      } else if (this.categoryId) {
        // Direct match with category ID from query params
        matchesCategory = item.category === this.categoryId;
      } else if (this.category) {
        // Match category name from query params
        const selectedCategory = this.filterCategories.find(cat => cat.name.toLowerCase() === this.category.toLowerCase());
        matchesCategory = selectedCategory ? item.category === selectedCategory.id : false;
      }

      // New filter
      const matchesNew = !this.filters.new || item.isNew === true;
      
      
      // Spicy filter
      const matchesSpicy = !this.filters.spicy || item.isSpicy === true;
      
      
      // Dietary preferences filter
      let matchesPreferences = true;
      if (this.filters.preferences.length > 0) {
        matchesPreferences = this.filters.preferences.some(pref => 
          item.dietaryPreferences && item.dietaryPreferences.includes(pref)
        );
      }
      
      
      
      // Recommended filter
      const matchesRecommended = !this.showRecommended || item.isRecommended === true;
  return matchesFound && matchesCategory && matchesNew && matchesSpicy && matchesPreferences && matchesRecommended;
    });

    // Debug logging for the filtered results (reduced verbosity)
    console.log('Filtered results:', {
      filteredCount: filtered.length,
      showFavorites: this.showFavorites
    });

    if (this.showFavorites) {
      console.log('Filtering for favorites...');
      const favoriteItems = await this.favoritesService.getFavoriteProductsFromList(filtered);
      console.log('Found favorite items:', favoriteItems.length);
      this.filteredItems = favoriteItems;
    } else {
      // Default: sort by popular (qty desc)
      filtered.sort((a, b) => (b.qty || 0) - (a.qty || 0));
      this.filteredItems = filtered;
    }
    
    // Initialize image loading states for all filtered items
    this.filteredItems.forEach(item => {
      this.imageLoading[item.id] = true;
    });
    
    // Track search with results count if search was performed
    if (this.search && this.search.trim() && this.search.length > 0 && this.analyticConfigs?.toggleAnalytics.disable_search !== true && this.lastSavedSearchTerm !== this.search.trim()) {
      this.lastSavedSearchTerm = this.search.trim();
      await this.analyticsService.logSearch(this.search.trim(), this.filteredItems.length);
    }
    
    // Ensure loading flag is visible at least 1000ms
    const elapsed = Date.now() - start;
    const minMs = 1000;
    if (elapsed < minMs) {
      await new Promise(res => setTimeout(res, minMs - elapsed));
    }
    this.loading = false;

  }

  isFavorite(item: any) {
    return this.favoritesService.isFavoriteSync(item.id);
  }

  async toggleFavorite(item: any) {
    await this.favoritesService.toggleFavorite(item);
  }

  getCartQty(item: any): number {
    // For products with variations, show total quantity across all variations
    if (item.hasVariations && item.variations) {
      const cart = this.cartService.getCart();
      return cart
        .filter(cartItem => cartItem.name === item.name)
        .reduce((total, cartItem) => total + (cartItem.qty || 0), 0);
    }
    // For regular products, use the cart service method
    return this.cartService.getItemQuantity(item);
  }

  increment(index: number) {
    const item = this.filteredItems[index];
    if (item) {
      // If product has variations, force user to select variation in dialog
      if (item.hasVariations && item.variations && item.variations.length > 0) {
        this.onShowItemDialog(item);
        return;
      }
      this.cartService.addToCart(item); 
      this.syncItemInAllItems(item);
    }
  }

  decrement(index: number) {
    const item = this.filteredItems[index];
    const currentQty = this.getCartQty(item);
    if (item && currentQty > 0) {
      this.cartService.removeFromCart(item);
      this.syncItemInAllItems(item);
    }
  }

  syncItemInAllItems(updatedItem: any) {
    // Update the quantity in allItems to maintain consistency
    const allItemIndex = this.allItems.findIndex(item => item.name === updatedItem.name);
    if (allItemIndex !== -1) {
      this.allItems[allItemIndex].qty = this.getCartQty(updatedItem);
    }
    
    // Update the quantity in filteredItems
    const filteredIndex = this.filteredItems.findIndex(item => item.name === updatedItem.name);
    if (filteredIndex !== -1) {
      this.filteredItems[filteredIndex].qty = this.getCartQty(updatedItem);
    }
  }

  trackByItemId(index: number, item: any): string {
    return item.id || item.name; // Use id or name as unique identifier
  }

  ngOnDestroy() {
    // Remove scroll event listener
    // window.removeEventListener('scroll', this.onWindowScroll.bind(this));
    
    // Unsubscribe from route subscription to prevent memory leaks
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    // Clear search timeout if any
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  // Dialog methods
  onShowDescriptionDialog(event: {text: string, productName?: string}, product: Product): void {
    this.dialogDescription = event.text;
    this.dialogProductName = event.productName || product.name;
    this.showDescriptionDialog = true;
  }

  onCloseDescriptionDialog(): void {
    this.showDescriptionDialog = false;
    this.dialogDescription = '';
    this.dialogProductName = '';
  }

  // Item details dialog state
  onShowItemDialog(item: Product): void {
    this.selectedItem = {
      id: item.id,
      name: item.name,
      imageURL: item.imageUrl,
      title: item.name,
      description: item.description,
      weight: item.weight,
      offer: !item.isOfferDisabled ? COMMON_CONSTANTS.OFFER_APPLICABLE_TEXT : undefined,
      price: item.price,
      hasVariations: item.hasVariations ?? false,
      variations: item.variations ?? [],
      selectedVariationId: item.selectedVariationId ?? undefined,
      category: item.category,
      isEnabledForOnlineOrders: item.isEnabledForOnlineOrders,
      isOfferDisabled: item.isOfferDisabled,
      status: item.status
    };
    this.showItemDialog = true;
  }

  onCloseItemDialog(): void {
    this.showItemDialog = false;
    this.selectedItem = null;
  }

  // Handle image error by setting default image
  onImageError(event: any): void {
    event.target.src = 'assets/foodCategories/default.png';
  }

  // Add minimum display time for loader (300ms)
  onImageLoad(itemId: string): void {
    setTimeout(() => {
      this.imageLoading[itemId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError2(itemId: string): void {
    setTimeout(() => {
      this.imageLoading[itemId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }
}
