import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import {
  CatalogApiService,
  CartApiService,
  BannerService,
  BusinessContextService,
  ToastService,
} from '@zitro/services';
import { Category, Product, ProductVariation, Banner } from '@zitro/models';
import { matchesSearch } from '@zitro/utils';
import {
  CatalogProductGridComponent,
  CatalogProductGridConfig,
  ItemDetailSheetComponent,
  SearchBarComponent,
  CartSummaryComponent,
  EvolvedLoaderComponent as LoaderComponent,
  EmptyStateComponent,
  ErrorStateComponent,
  BannerCarouselComponent,
} from '@zitro/ui';
import type { LoaderConfig } from '@zitro/ui';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

interface CategorySection {
  categoryId: string;
  categoryName: string;
  products: Product[];
}

const LISTING_SEARCH_CONFIG = {
  debounceMs: 0,
  placeholderKey: 'listing.searchPlaceholder',
};

const LIST_GRID_CONFIG: CatalogProductGridConfig = {
  cardConfig: {
    layout: 'list',
    showAddButton: true,
    showDietaryBadge: true,
    showVariationPill: true,
  },
  columns: 1,
  emptyMessageKey: 'listing.noResults',
};

@Component({
  selector: 'app-listing',
  standalone: true,
  imports: [
    RouterLink,
    I18nPipe,
    CatalogProductGridComponent,
    ItemDetailSheetComponent,
    SearchBarComponent,
    CartSummaryComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    BannerCarouselComponent,
  ],
  templateUrl: './listing.component.html',
  styleUrl: './listing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer')
  private scrollContainerRef!: ElementRef<HTMLElement>;

  private carouselRef = viewChild(BannerCarouselComponent);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogApi = inject(CatalogApiService);
  readonly cartApi = inject(CartApiService);
  private bannerService = inject(BannerService);
  private businessContext = inject(BusinessContextService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private _scrollCleanup?: () => void;

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly isCartUpdating = signal(false);
  readonly banners = signal<Banner[]>([]);

  readonly cartLoaderConfig: LoaderConfig = {
    size: 'sm',
    color: 'primary',
    overlay: true,
  };
  readonly allProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly searchQuery = signal('');
  readonly activeCategoryId = signal('');
  readonly isCategorySheetOpen = signal(false);
  readonly collapsedSections = signal(new Set<string>());
  readonly selectedProduct = signal<Product | null>(null);
  readonly isDetailOpen = signal(false);
  readonly vegOnly = signal(false);

  readonly _businessSlug = signal('');
  readonly listGridConfig = LIST_GRID_CONFIG;
  readonly listingSearchConfig = LISTING_SEARCH_CONFIG;

  readonly categorySections = computed((): CategorySection[] => {
    const cats = this.categories();
    const q = this.searchQuery().toLowerCase();
    const vegFilter = this.vegOnly();
    const prods = this.allProducts().filter(
      (p) => p.isEnabledForOnlineOrders !== false,
    );
    const afterVeg = vegFilter
      ? prods.filter((p) => p.foodType === 'Veg')
      : prods;
    const filtered = q
      ? afterVeg.filter(
          (p) =>
            matchesSearch(p.name, q) || matchesSearch(p.description ?? '', q),
        )
      : afterVeg;

    if (cats.length === 0) {
      return filtered.length > 0
        ? [{ categoryId: 'all', categoryName: 'Menu', products: filtered }]
        : [];
    }
    return cats
      .map((cat) => ({
        categoryId: cat.id,
        categoryName: cat.name,
        products: filtered.filter((p) => p.category === cat.id),
      }))
      .filter((s) => s.products.length > 0);
  });

  readonly hasMenuItems = computed(() =>
    this.allProducts().some(
      (product) => product.isEnabledForOnlineOrders !== false,
    ),
  );

  readonly showNoSearchResults = computed(
    () =>
      !this.isLoading() &&
      !this.hasError() &&
      !!this.searchQuery().trim() &&
      this.hasMenuItems() &&
      this.categorySections().length === 0,
  );

  readonly activeCategoryName = computed(() => {
    const id = this.activeCategoryId();
    const found = this.categorySections().find((s) => s.categoryId === id);
    return (
      found?.categoryName ?? this.categorySections()[0]?.categoryName ?? ''
    );
  });

  readonly quantities = computed<Record<string, number>>(() => {
    const slug = this._businessSlug();
    const result: Record<string, number> = {};
    for (const p of this.allProducts()) {
      result[p.id] = this.cartApi.getItemQtyInCart(slug, p.id);
    }
    return result;
  });

  readonly selectedProductQuantity = computed(() => {
    const p = this.selectedProduct();
    if (!p) return 0;
    return this.cartApi.getItemQtyInCart(this._businessSlug(), p.id);
  });

  constructor() {
    effect(() => {
      if (this.banners().length > 1) {
        this.carouselRef()?.startAutoPlay();
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug =
          params['businessSlug'] ||
          localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
          '';
        if (slug) {
          localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, slug);
        }
        if (slug !== this._businessSlug()) {
          this._businessSlug.set(slug);
          this.loadData(slug);
        }
        this.searchQuery.set(params['search'] ?? '');
        this._syncActiveCategoryToVisibleSections();
      });
  }

  ngAfterViewInit(): void {
    const container = this.scrollContainerRef?.nativeElement;
    if (!container) return;
    const handler = () => this._syncActiveSectionFromScroll(container);
    container.addEventListener('scroll', handler, { passive: true });
    this._scrollCleanup = () =>
      container.removeEventListener('scroll', handler);
  }

  ngOnDestroy(): void {
    this._scrollCleanup?.();
  }

  private _syncActiveSectionFromScroll(container: HTMLElement): void {
    const sections =
      container.querySelectorAll<HTMLElement>('[data-section-id]');
    const containerTop = container.getBoundingClientRect().top;
    let activeId = '';
    for (const el of Array.from(sections)) {
      if (el.getBoundingClientRect().top - containerTop <= 56) {
        activeId = el.dataset['sectionId'] ?? '';
      }
    }
    if (activeId && activeId !== this.activeCategoryId()) {
      this.activeCategoryId.set(activeId);
    }
  }

  private loadData(slug: string): void {
    if (!slug) return;
    this.isLoading.set(true);
    this.hasError.set(false);
    this.businessContext.setBusinessId(slug);

    this.bannerService
      .getBanners()
      .then((b) => this.banners.set(b))
      .catch(() => this.banners.set([]));

    this.catalogApi
      .getBusinessMenu(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ products, categories }) => {
          this.allProducts.set(products);
          this.categories.set(categories);
          this._syncActiveCategoryToVisibleSections();
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  onSearchChange(q: string): void {
    this.searchQuery.set(q);
    this._syncActiveCategoryToVisibleSections();
  }

  private _syncActiveCategoryToVisibleSections(): void {
    const firstVisibleCategoryId = this.categorySections()[0]?.categoryId ?? '';
    this.activeCategoryId.set(firstVisibleCategoryId);
  }

  toggleSection(categoryId: string): void {
    this.collapsedSections.update((set) => {
      const next = new Set(set);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  openCategorySheet(): void {
    this.isCategorySheetOpen.set(true);
  }

  jumpToCategory(categoryId: string): void {
    this.isCategorySheetOpen.set(false);
    this.activeCategoryId.set(categoryId);
    setTimeout(() => {
      const container = this.scrollContainerRef?.nativeElement;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(
        `[data-section-id="${categoryId}"]`,
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }

  onViewDetails(product: Product): void {
    this.selectedProduct.set(product);
    this.isDetailOpen.set(true);
  }

  onDetailClosed(): void {
    this.isDetailOpen.set(false);
    this.selectedProduct.set(null);
  }

  /** Surfaces a cart-mutation failure instead of swallowing it silently — a
   * failed add/update used to leave the tapped button doing nothing with no
   * indication why (e.g. 400 PRODUCT_UNAVAILABLE for an item that slipped
   * through as looking available). */
  private showCartError(err: unknown): void {
    const message =
      (err as { error?: { error?: string } })?.error?.error ||
      'listing.addToCartFailed';
    this.toast.show({ message, color: 'danger', duration: 4000 });
  }

  async onAddToCart(event: {
    product: Product;
    variation: ProductVariation | null;
  }): Promise<void> {
    const slug = this._businessSlug();
    if (!slug) return;
    this.isCartUpdating.set(true);
    try {
      await this.cartApi.addToCart(
        slug,
        event.product.id,
        event.variation?.id ?? undefined,
      );
    } catch (err) {
      this.showCartError(err);
    } finally {
      this.isCartUpdating.set(false);
    }
  }

  async onIncrement(product: Product): Promise<void> {
    const slug = this._businessSlug();
    if (!slug) return;
    this.isCartUpdating.set(true);
    try {
      await this.cartApi.addToCart(slug, product.id);
    } catch (err) {
      this.showCartError(err);
    } finally {
      this.isCartUpdating.set(false);
    }
  }

  async onDecrement(product: Product): Promise<void> {
    const slug = this._businessSlug();
    if (!slug) return;
    const cart = this.cartApi.getCartForBusiness(slug);
    if (!cart) return;
    const cartItem = cart.items.find((i) => i.productId === product.id);
    if (!cartItem) return;
    this.isCartUpdating.set(true);
    try {
      await this.cartApi.updateQty(slug, cartItem.id, cartItem.quantity - 1);
    } catch (err) {
      this.showCartError(err);
    } finally {
      this.isCartUpdating.set(false);
    }
  }

  onBannerClick(banner: Banner): void {
    if (banner.targetUrl) {
      window.open(banner.targetUrl, '_blank', 'noopener');
    }
  }

  toggleVegFilter(): void {
    this.vegOnly.update((v) => !v);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  retry(): void {
    this.loadData(this._businessSlug());
  }
}
