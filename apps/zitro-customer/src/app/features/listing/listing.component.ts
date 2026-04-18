import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { CatalogApiService, CartService } from '@zitro/services';
import { Category, Product, ProductVariation } from '@zitro/models';
import { matchesSearch } from '@zitro/utils';
import {
  CatalogProductGridComponent,
  ItemDetailSheetComponent,
  SearchBarComponent,
  CategoryBarComponent,
  CartSummaryComponent,
  EvolvedLoaderComponent as LoaderComponent,
  EmptyStateComponent,
  ErrorStateComponent,
} from '@zitro/ui';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

@Component({
  selector: 'app-listing',
  standalone: true,
  imports: [
    I18nPipe,
    CatalogProductGridComponent,
    ItemDetailSheetComponent,
    SearchBarComponent,
    CategoryBarComponent,
    CartSummaryComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './listing.component.html',
  styleUrl: './listing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogApi = inject(CatalogApiService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly allProducts = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly searchQuery = signal('');
  readonly activeCategoryId = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly isDetailOpen = signal(false);

  private readonly _businessSlug = signal('');
  private readonly _cartVersion = signal(0);

  readonly categoryBarItems = computed(() =>
    this.categories().map(c => ({ id: c.id, name: c.name, imageURL: c.imageUrl }))
  );

  readonly filteredProducts = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const catId = this.activeCategoryId();
    return this.allProducts().filter(p => {
      const matchesCat = catId ? p.category === catId : true;
      const matchesQ = q
        ? matchesSearch(p.name, q) || matchesSearch(p.description ?? '', q)
        : true;
      return matchesCat && matchesQ && p.isEnabledForOnlineOrders !== false;
    });
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
        if (params['category']) this.activeCategoryId.set(params['category']);
        if (params['search']) this.searchQuery.set(params['search']);
      });

    this.cartService.cartChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this._cartVersion.update(v => v + 1));
  }

  private loadData(slug: string): void {
    if (!slug) return;
    this.isLoading.set(true);
    this.hasError.set(false);

    forkJoin({
      products: this.catalogApi.getProducts(slug),
      categories: this.catalogApi.getCategories(slug),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ products, categories }) => {
          this.allProducts.set(products);
          this.categories.set(categories);
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
  }

  onCategorySelect(id: string): void {
    this.activeCategoryId.set(this.activeCategoryId() === id ? '' : id);
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
