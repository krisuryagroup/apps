import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import { CatalogApiService, CartService } from '@zitro/services';
import { Product, ProductVariation } from '@zitro/models';
import {
  CatalogProductGridComponent,
  ItemDetailSheetComponent,
  CartSummaryComponent,
  EvolvedLoaderComponent as LoaderComponent,
  EmptyStateComponent,
  ErrorStateComponent,
} from '@zitro/ui';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

@Component({
  selector: 'app-category-listing',
  standalone: true,
  imports: [
    I18nPipe,
    CatalogProductGridComponent,
    ItemDetailSheetComponent,
    CartSummaryComponent,
    LoaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './category-listing.component.html',
  styleUrl: './category-listing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogApi = inject(CatalogApiService);
  private cartService = inject(CartService);
  private destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly products = signal<Product[]>([]);
  readonly categoryName = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly isDetailOpen = signal(false);

  private businessSlug = '';
  private categoryId = '';

  private readonly _cartVersion = signal(0);

  readonly quantities = computed<Record<string, number>>(() => {
    this._cartVersion();
    const result: Record<string, number> = {};
    for (const p of this.products()) {
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
    const params = this.route.snapshot.queryParamMap;
    this.businessSlug =
      params.get('businessSlug') ||
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
      '';
    this.categoryId = params.get('category') || params.get('categoryId') || '';
    this.categoryName.set(params.get('name') || '');
    this.loadProducts();

    this.cartService.cartChanged
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this._cartVersion.update(v => v + 1));
  }

  private loadProducts(): void {
    if (!this.businessSlug) return;
    this.isLoading.set(true);
    this.hasError.set(false);

    this.catalogApi
      .getMenu(this.businessSlug, this.categoryId || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: products => {
          this.products.set(products.filter(p => p.isEnabledForOnlineOrders !== false));
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
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
    this.router.navigate(['/categories'], {
      queryParams: { businessSlug: this.businessSlug },
    });
  }

  retry(): void {
    this.loadProducts();
  }
}
