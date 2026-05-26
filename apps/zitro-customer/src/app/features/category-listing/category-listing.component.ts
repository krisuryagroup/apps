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
import { CatalogApiService, CartApiService } from '@zitro/services';
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
  private cartApi = inject(CartApiService);
  private destroyRef = inject(DestroyRef);

  readonly isLoading = signal(false);
  readonly hasError = signal(false);
  readonly products = signal<Product[]>([]);
  readonly categoryName = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly isDetailOpen = signal(false);

  private businessSlug = '';
  private categoryId = '';

  readonly quantities = computed<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    for (const p of this.products()) {
      result[p.id] = this.cartApi.getItemQtyInCart(this.businessSlug, p.id);
    }
    return result;
  });

  readonly selectedProductQuantity = computed(() => {
    const p = this.selectedProduct();
    if (!p) return 0;
    return this.cartApi.getItemQtyInCart(this.businessSlug, p.id);
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
    if (!this.businessSlug) return;
    this.cartApi.addToCart(this.businessSlug, event.product.id, event.variation?.id ?? undefined).catch(() => {});
  }

  onIncrement(product: Product): void {
    if (!this.businessSlug) return;
    this.cartApi.addToCart(this.businessSlug, product.id).catch(() => {});
  }

  onDecrement(product: Product): void {
    if (!this.businessSlug) return;
    const cart = this.cartApi.getCartForBusiness(this.businessSlug);
    if (!cart) return;
    const cartItem = cart.items.find(i => i.productId === product.id);
    if (!cartItem) return;
    this.cartApi.updateQty(this.businessSlug, cartItem.id, cartItem.quantity - 1).catch(() => {});
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
