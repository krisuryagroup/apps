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
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import { CatalogApiService, CartService } from '@zitro/services';
import { Category, Product, ProductVariation } from '@zitro/models';
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
} from '@zitro/ui';
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
  cardConfig: { layout: 'list', showAddButton: true, showDietaryBadge: true, showVariationPill: true },
  columns: 1,
  emptyMessageKey: 'listing.noResults',
};

@Component({
  selector: 'app-listing',
  standalone: true,
  imports: [
    I18nPipe,
    CatalogProductGridComponent,
    ItemDetailSheetComponent,
    SearchBarComponent,
    CartSummaryComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './listing.component.html',
  styleUrl: './listing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainerRef!: ElementRef<HTMLElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogApi = inject(CatalogApiService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);
  private _scrollCleanup?: () => void;

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly allProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly searchQuery = signal('');
  readonly activeCategoryId = signal('');
  readonly isCategorySheetOpen = signal(false);
  readonly collapsedSections = signal(new Set<string>());
  readonly selectedProduct = signal<Product | null>(null);
  readonly isDetailOpen = signal(false);

  private readonly _businessSlug = signal('');
  private readonly _cartVersion = signal(0);

  readonly listGridConfig = LIST_GRID_CONFIG;
  readonly listingSearchConfig = LISTING_SEARCH_CONFIG;

  readonly categorySections = computed((): CategorySection[] => {
    const cats = this.categories();
    const q = this.searchQuery().toLowerCase();
    const prods = this.allProducts().filter(p => p.isEnabledForOnlineOrders !== false);
    const filtered = q
      ? prods.filter(p => matchesSearch(p.name, q) || matchesSearch(p.description ?? '', q))
      : prods;

    if (cats.length === 0) {
      return filtered.length > 0
        ? [{ categoryId: 'all', categoryName: 'Menu', products: filtered }]
        : [];
    }
    return cats
      .map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        products: filtered.filter(p => p.category === cat.id),
      }))
      .filter(s => s.products.length > 0);
  });

  readonly hasMenuItems = computed(() =>
    this.allProducts().some(product => product.isEnabledForOnlineOrders !== false)
  );

  readonly showNoSearchResults = computed(() =>
    !this.isLoading() &&
    !this.hasError() &&
    !!this.searchQuery().trim() &&
    this.hasMenuItems() &&
    this.categorySections().length === 0
  );

  readonly activeCategoryName = computed(() => {
    const id = this.activeCategoryId();
    const found = this.categorySections().find(s => s.categoryId === id);
    return found?.categoryName ?? this.categorySections()[0]?.categoryName ?? '';
  });

  readonly quantities = computed<Record<string, number>>(() => {
    this._cartVersion();
    const result: Record<string, number> = {};
    for (const p of this.allProducts()) {
      result[p.id] = this.cartService.getItemQuantity(p);
    }
    return result;
  });

  readonly selectedProductQuantity = computed(() => {
    this._cartVersion();
    const p = this.selectedProduct();
    return p ? this.cartService.getItemQuantity(p) : 0;
  });

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const slug =
          params['businessSlug'] ||
          localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
          '';
        if (slug !== this._businessSlug()) {
          this._businessSlug.set(slug);
          this.loadData(slug);
        }
        this.searchQuery.set(params['search'] ?? '');
        this._syncActiveCategoryToVisibleSections();
      });

    this.cartService.cartChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this._cartVersion.update(v => v + 1));
  }

  ngAfterViewInit(): void {
    const container = this.scrollContainerRef?.nativeElement;
    if (!container) return;
    const handler = () => this._syncActiveSectionFromScroll(container);
    container.addEventListener('scroll', handler, { passive: true });
    this._scrollCleanup = () => container.removeEventListener('scroll', handler);
  }

  ngOnDestroy(): void {
    this._scrollCleanup?.();
  }

  private _syncActiveSectionFromScroll(container: HTMLElement): void {
    const sections = container.querySelectorAll<HTMLElement>('[data-section-id]');
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
    this.collapsedSections.update(set => {
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
      const el = container.querySelector<HTMLElement>(`[data-section-id="${categoryId}"]`);
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

  onAddToCart(event: { product: Product; variation: ProductVariation | null }): void {
    const item = event.variation
      ? { ...event.product, selectedVariationId: event.variation.id }
      : event.product;
    this.cartService.addToCart(item);
    this._cartVersion.update(v => v + 1);
  }

  onIncrement(product: Product): void {
    this.cartService.addToCart(product);
    this._cartVersion.update(v => v + 1);
  }

  onDecrement(product: Product): void {
    this.cartService.removeFromCart(product);
    this._cartVersion.update(v => v + 1);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  retry(): void {
    this.loadData(this._businessSlug());
  }
}
