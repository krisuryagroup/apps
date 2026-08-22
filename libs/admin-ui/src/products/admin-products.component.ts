import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BrandDto,
  BusinessSummaryDto,
  CategoryDto,
  ProductDetailDto,
  ProductDto,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
} from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-products',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DataTableComponent,
    ConfirmationDialogComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.products' | i18n }}</h1>
      <div style="display:flex;gap:8px">
        <button
          class="btn btn-primary"
          type="button"
          data-testid="product-add-btn"
          (click)="openAddProduct()"
        >
          + {{ 'products.addProduct' | i18n }}
        </button>
        <button
          class="btn btn-outline"
          type="button"
          data-testid="bulk-price-adjust-btn"
          (click)="showBulkAdjust.set(true)"
        >
          {{ 'products.bulkPriceAdjust' | i18n }}
        </button>
      </div>
    </div>
    <div class="filters">
      <input
        class="input"
        data-testid="product-search"
        [(ngModel)]="q"
        (ngModelChange)="load()"
        placeholder="{{ 'products.searchPlaceholder' | i18n }}"
      />
    </div>
    <lib-data-table
      data-testid="product-table"
      [columns]="columns"
      [rows]="products()"
      [loading]="loading()"
      [error]="error()"
    >
      <ng-template #rowActions let-row>
        <button
          class="btn btn-sm btn-outline"
          data-testid="product-edit-btn"
          (click)="openEditProduct(row)"
        >
          {{ 'common.edit' | i18n }}
        </button>
        <button class="btn btn-sm btn-danger" (click)="requestRemove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
    <lib-confirmation-dialog
      [isVisible]="!!pendingDelete()"
      [config]="deleteDialogConfig()"
      (confirmed)="confirmRemove()"
      (cancelled)="pendingDelete.set(null)"
    />

    @if (showBulkAdjust()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'products.bulkPriceAdjust' | i18n }}</h2>
          <div class="form-grid">
            <label for="bulk-scope" class="form-label">{{
              'products.bulkScope' | i18n
            }}</label>
            <select
              id="bulk-scope"
              class="select"
              data-testid="bulk-adjust-scope"
              [(ngModel)]="bulkScope"
            >
              <option value="business">
                {{ 'products.bulkScopeBusiness' | i18n }}
              </option>
              <option value="brand">
                {{ 'products.bulkScopeBrand' | i18n }}
              </option>
            </select>

            @if (bulkScope === 'business') {
              <label for="bulk-business" class="form-label">{{
                'businesses.name' | i18n
              }}</label>
              <select
                id="bulk-business"
                class="select"
                data-testid="bulk-adjust-business"
                [(ngModel)]="bulkBusinessId"
              >
                <option [value]="''">{{ 'common.select' | i18n }}</option>
                @for (b of businesses(); track b.id) {
                  <option [value]="b.id">{{ b.name }}</option>
                }
              </select>
            } @else {
              <label for="bulk-brand" class="form-label">{{
                'businesses.brand' | i18n
              }}</label>
              <select
                id="bulk-brand"
                class="select"
                data-testid="bulk-adjust-brand"
                [(ngModel)]="bulkBrandId"
              >
                <option [value]="''">{{ 'common.select' | i18n }}</option>
                @for (b of brands(); track b.id) {
                  <option [value]="b.id">{{ b.name }}</option>
                }
              </select>
            }

            <label for="bulk-direction" class="form-label">{{
              'products.bulkDirection' | i18n
            }}</label>
            <select
              id="bulk-direction"
              class="select"
              data-testid="bulk-adjust-direction"
              [(ngModel)]="bulkIsIncrease"
            >
              <option [ngValue]="true">
                {{ 'products.bulkIncrease' | i18n }}
              </option>
              <option [ngValue]="false">
                {{ 'products.bulkDecrease' | i18n }}
              </option>
            </select>

            <label for="bulk-type" class="form-label">{{
              'products.bulkType' | i18n
            }}</label>
            <select
              id="bulk-type"
              class="select"
              data-testid="bulk-adjust-type"
              [(ngModel)]="bulkIsPercentage"
            >
              <option [ngValue]="true">
                {{ 'products.bulkPercentage' | i18n }}
              </option>
              <option [ngValue]="false">
                {{ 'products.bulkFlatAmount' | i18n }}
              </option>
            </select>

            <label for="bulk-value" class="form-label">{{
              'products.bulkValue' | i18n
            }}</label>
            <input
              id="bulk-value"
              class="input"
              type="number"
              min="0"
              step="0.01"
              data-testid="bulk-adjust-value"
              [(ngModel)]="bulkValue"
              placeholder="{{
                bulkIsPercentage
                  ? ('products.bulkValuePercentPlaceholder' | i18n)
                  : ('products.bulkValueFlatPlaceholder' | i18n)
              }}"
            />
          </div>

          @if (bulkResultMessage()) {
            <p class="map-hint" data-testid="bulk-adjust-result">
              {{ bulkResultMessage() }}
            </p>
          }
          @if (bulkError()) {
            <p class="error-text" data-testid="bulk-adjust-error">
              {{ bulkError() }}
            </p>
          }

          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="bulk-adjust-apply-btn"
              [disabled]="bulkApplying() || !canApplyBulkAdjust()"
              (click)="applyBulkAdjust()"
            >
              {{
                bulkApplying()
                  ? ('common.saving' | i18n)
                  : ('products.bulkApply' | i18n)
              }}
            </button>
            <button class="btn btn-outline" (click)="closeBulkAdjust()">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showProductForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{
              editingProduct()
                ? ('common.edit' | i18n)
                : ('products.addProduct' | i18n)
            }}
          </h2>
          <div class="form-grid">
            @if (!editingProduct()) {
              <label for="prod-scope" class="form-label">{{
                'products.bulkScope' | i18n
              }}</label>
              <select
                id="prod-scope"
                class="select"
                data-testid="product-form-scope"
                [(ngModel)]="productScope"
              >
                <option value="business">
                  {{ 'products.bulkScopeBusiness' | i18n }}
                </option>
                <option value="brand">
                  {{ 'products.bulkScopeBrand' | i18n }}
                </option>
              </select>

              @if (productScope === 'business') {
                <label for="prod-business" class="form-label">{{
                  'businesses.name' | i18n
                }}</label>
                <select
                  id="prod-business"
                  class="select"
                  data-testid="product-form-business"
                  [(ngModel)]="productBusinessId"
                >
                  <option [value]="''">{{ 'common.select' | i18n }}</option>
                  @for (b of businesses(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              } @else {
                <label for="prod-brand" class="form-label">{{
                  'businesses.brand' | i18n
                }}</label>
                <select
                  id="prod-brand"
                  class="select"
                  data-testid="product-form-brand"
                  [(ngModel)]="productBrandId"
                >
                  <option [value]="''">{{ 'common.select' | i18n }}</option>
                  @for (b of brands(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              }
            }

            <label for="prod-name" class="form-label">{{
              'products.name' | i18n
            }}</label>
            <input
              id="prod-name"
              class="input"
              data-testid="product-form-name"
              [(ngModel)]="productForm.name"
            />

            <label for="prod-price" class="form-label">{{
              'products.price' | i18n
            }}</label>
            <input
              id="prod-price"
              class="input"
              type="number"
              min="0"
              step="0.01"
              data-testid="product-form-price"
              [(ngModel)]="productForm.price"
            />

            <label for="prod-desc" class="form-label">{{
              'products.description' | i18n
            }}</label>
            <input
              id="prod-desc"
              class="input"
              data-testid="product-form-description"
              [(ngModel)]="productForm.description"
            />

            <label for="prod-image" class="form-label">{{
              'products.imageUrl' | i18n
            }}</label>
            <input
              id="prod-image"
              class="input"
              data-testid="product-form-image"
              [(ngModel)]="productForm.imageUrl"
            />

            <label for="prod-category" class="form-label">{{
              'categories.name' | i18n
            }}</label>
            <select
              id="prod-category"
              class="select"
              data-testid="product-form-category"
              [(ngModel)]="productForm.categoryId"
            >
              <option [value]="''">{{ 'common.select' | i18n }}</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.path }}</option>
              }
            </select>

            <label for="prod-food-type" class="form-label">{{
              'products.foodType' | i18n
            }}</label>
            <select
              id="prod-food-type"
              class="select"
              data-testid="product-form-food-type"
              [(ngModel)]="productForm.foodType"
            >
              <option value="veg">{{ 'products.veg' | i18n }}</option>
              <option value="non-veg">{{ 'products.nonVeg' | i18n }}</option>
              <option value="egg">{{ 'products.egg' | i18n }}</option>
              <option value="vegan">{{ 'products.vegan' | i18n }}</option>
            </select>

            <label for="prod-gst" class="form-label">{{
              'products.gstRate' | i18n
            }}</label>
            <input
              id="prod-gst"
              class="input"
              type="number"
              min="0"
              step="0.01"
              data-testid="product-form-gst"
              [(ngModel)]="productForm.gstRatePercentage"
            />

            <label for="prod-hsn" class="form-label">{{
              'products.hsnSacCode' | i18n
            }}</label>
            <input
              id="prod-hsn"
              class="input"
              data-testid="product-form-hsn"
              [(ngModel)]="productForm.hsnSacCode"
            />

            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-available"
                [(ngModel)]="productForm.isAvailable"
              />
              {{ 'products.active' | i18n }}
            </label>
            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-online"
                [(ngModel)]="productForm.isEnabledForOnlineOrders"
              />
              {{ 'products.available' | i18n }}
            </label>
            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-recommended"
                [(ngModel)]="productForm.isRecommended"
              />
              {{ 'products.recommended' | i18n }}
            </label>
            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-bestseller"
                [(ngModel)]="productForm.isBestseller"
              />
              {{ 'products.bestseller' | i18n }}
            </label>
            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-new"
                [(ngModel)]="productForm.isNew"
              />
              {{ 'products.new' | i18n }}
            </label>
            <label class="form-label checkbox-label">
              <input
                type="checkbox"
                data-testid="product-form-spicy"
                [(ngModel)]="productForm.isSpicy"
              />
              {{ 'products.spicy' | i18n }}
            </label>
          </div>

          @if (productFormError()) {
            <p class="error-text" data-testid="product-form-error">
              {{ productFormError() }}
            </p>
          }

          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="product-form-save-btn"
              [disabled]="productSaving() || !canSaveProduct()"
              (click)="saveProduct()"
            >
              {{
                productSaving()
                  ? ('common.saving' | i18n)
                  : ('common.save' | i18n)
              }}
            </button>
            <button class="btn btn-outline" (click)="closeProductForm()">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-xs);
        font-size: var(--zitro-font-size-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly i18n = inject(I18nService);
  protected products = signal<ProductDto[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected q = '';

  // ── Bulk price adjust ────────────────────────────────────────────────────
  protected showBulkAdjust = signal(false);
  protected businesses = signal<BusinessSummaryDto[]>([]);
  protected brands = signal<BrandDto[]>([]);
  protected bulkScope: 'business' | 'brand' = 'business';
  protected bulkBusinessId = '';
  protected bulkBrandId = '';
  protected bulkIsIncrease = true;
  protected bulkIsPercentage = true;
  protected bulkValue: number | null = null;
  protected bulkApplying = signal(false);
  protected bulkResultMessage = signal('');
  protected bulkError = signal('');

  // ── Create / edit product ────────────────────────────────────────────────
  protected showProductForm = signal(false);
  protected editingProduct = signal<ProductDetailDto | null>(null);
  protected categories = signal<CategoryDto[]>([]);
  protected productScope: 'business' | 'brand' = 'business';
  protected productBusinessId = '';
  protected productBrandId = '';
  protected productSaving = signal(false);
  protected productFormError = signal('');
  protected productForm = {
    name: '',
    price: 0,
    description: '',
    imageUrl: '',
    categoryId: '',
    foodType: 'veg',
    gstRatePercentage: null as number | null,
    hsnSacCode: '',
    isAvailable: true,
    isEnabledForOnlineOrders: true,
    isRecommended: false,
    isBestseller: false,
    isNew: false,
    isSpicy: false,
  };

  protected readonly columns: DataTableColumn<ProductDto>[] = [
    { key: 'name', labelKey: 'products.name' },
    {
      key: 'price',
      labelKey: 'products.price',
      format: (r) => `₹${r.price}`,
    },
    {
      key: 'isEnabledForOnlineOrders',
      labelKey: 'products.available',
      format: (r) => (r.isEnabledForOnlineOrders ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.load();
    this.api.listBusinesses({ pageSize: '200' }).subscribe({
      next: (page) => this.businesses.set(page.items),
      error: () => this.businesses.set([]),
    });
    this.api.listBrands({ pageSize: '200' }).subscribe({
      next: (page) => this.brands.set(page.items),
      error: () => this.brands.set([]),
    });
    this.api.listCategories().subscribe({
      next: (cs) => this.categories.set(cs),
      error: () => this.categories.set([]),
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    const p: Record<string, string> = {};
    if (this.q) p['q'] = this.q;
    this.api.searchProducts(p).subscribe({
      next: (ps) => {
        this.products.set(ps);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected pendingDelete = signal<ProductDto | null>(null);
  protected deleteDialogConfig = computed<ConfirmationDialogConfig>(() => ({
    title: this.i18n.translate('common.confirmDeleteTitle'),
    message: this.i18n.translate('common.confirmDeleteMessage', {
      name: this.pendingDelete()?.name ?? '',
    }),
    confirmLabel: this.i18n.translate('common.delete'),
    cancelLabel: this.i18n.translate('common.cancel'),
    destructive: true,
    closeOnBackdropClick: true,
  }));

  protected requestRemove(p: ProductDto): void {
    this.pendingDelete.set(p);
  }

  protected confirmRemove(): void {
    const p = this.pendingDelete();
    if (!p) return;
    this.pendingDelete.set(null);
    this.api.deleteProduct(p.id).subscribe({
      next: () => this.products.update((ps) => ps.filter((x) => x.id !== p.id)),
    });
  }

  protected canApplyBulkAdjust(): boolean {
    const scopeChosen =
      this.bulkScope === 'business'
        ? !!this.bulkBusinessId
        : !!this.bulkBrandId;
    return scopeChosen && !!this.bulkValue && this.bulkValue > 0;
  }

  protected applyBulkAdjust(): void {
    if (!this.canApplyBulkAdjust()) return;
    this.bulkApplying.set(true);
    this.bulkResultMessage.set('');
    this.bulkError.set('');

    const req: Record<string, unknown> = {
      businessId: this.bulkScope === 'business' ? this.bulkBusinessId : null,
      brandId: this.bulkScope === 'brand' ? this.bulkBrandId : null,
      isPercentage: this.bulkIsPercentage,
      isIncrease: this.bulkIsIncrease,
      value: this.bulkValue,
    };

    this.api.bulkAdjustProductPrices(req).subscribe({
      next: (res) => {
        this.bulkApplying.set(false);
        this.bulkResultMessage.set(
          this.i18n.translate('products.bulkResult', {
            count: String(res.updatedCount),
          }),
        );
        this.load();
      },
      error: () => {
        this.bulkApplying.set(false);
        this.bulkError.set(this.i18n.translate('products.bulkError'));
      },
    });
  }

  protected closeBulkAdjust(): void {
    this.showBulkAdjust.set(false);
    this.bulkScope = 'business';
    this.bulkBusinessId = '';
    this.bulkBrandId = '';
    this.bulkIsIncrease = true;
    this.bulkIsPercentage = true;
    this.bulkValue = null;
    this.bulkResultMessage.set('');
    this.bulkError.set('');
  }

  protected openAddProduct(): void {
    this.editingProduct.set(null);
    this.productScope = 'business';
    this.productBusinessId = '';
    this.productBrandId = '';
    this.productForm = {
      name: '',
      price: 0,
      description: '',
      imageUrl: '',
      categoryId: '',
      foodType: 'veg',
      gstRatePercentage: null,
      hsnSacCode: '',
      isAvailable: true,
      isEnabledForOnlineOrders: true,
      isRecommended: false,
      isBestseller: false,
      isNew: false,
      isSpicy: false,
    };
    this.productFormError.set('');
    this.showProductForm.set(true);
  }

  protected openEditProduct(row: ProductDto): void {
    this.productFormError.set('');
    this.api.getProductById(row.id).subscribe({
      next: (p) => {
        this.editingProduct.set(p);
        this.productForm = {
          name: p.name,
          price: p.price,
          description: p.description ?? '',
          imageUrl: p.imageUrl ?? '',
          categoryId: p.categoryId ?? '',
          foodType: p.foodType ?? 'veg',
          gstRatePercentage: p.gstRatePercentage ?? null,
          hsnSacCode: p.hsnSacCode ?? '',
          isAvailable: p.status,
          isEnabledForOnlineOrders: p.isEnabledForOnlineOrders,
          isRecommended: p.isRecommended,
          isBestseller: p.isBestseller,
          isNew: p.isNew,
          isSpicy: p.isSpicy,
        };
        this.showProductForm.set(true);
      },
      error: () =>
        this.productFormError.set(this.i18n.translate('products.loadError')),
    });
  }

  protected canSaveProduct(): boolean {
    if (!this.productForm.name || this.productForm.price <= 0) return false;
    if (!this.editingProduct()) {
      return this.productScope === 'business'
        ? !!this.productBusinessId
        : !!this.productBrandId;
    }
    return true;
  }

  protected saveProduct(): void {
    if (!this.canSaveProduct()) return;
    this.productSaving.set(true);
    this.productFormError.set('');

    const onSuccess = () => {
      this.productSaving.set(false);
      this.closeProductForm();
      this.load();
    };
    const onError = () => {
      this.productSaving.set(false);
      this.productFormError.set(this.i18n.translate('products.saveError'));
    };

    const editing = this.editingProduct();
    if (editing) {
      this.api
        .updateProduct(editing.id, {
          name: this.productForm.name,
          price: this.productForm.price,
          description: this.productForm.description || null,
          imageUrl: this.productForm.imageUrl || null,
          categoryId: this.productForm.categoryId || null,
          foodType: this.productForm.foodType,
          isEnabledForOnlineOrders: this.productForm.isEnabledForOnlineOrders,
          status: this.productForm.isAvailable,
          isRecommended: this.productForm.isRecommended,
          isBestseller: this.productForm.isBestseller,
          isNew: this.productForm.isNew,
          isSpicy: this.productForm.isSpicy,
          gstRatePercentage: this.productForm.gstRatePercentage,
          hsnSacCode: this.productForm.hsnSacCode || null,
        })
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.api
        .createProduct({
          name: this.productForm.name,
          basePrice: this.productForm.price,
          description: this.productForm.description || null,
          imageUrl: this.productForm.imageUrl || null,
          weight: null,
          categoryId: this.productForm.categoryId || null,
          businessId:
            this.productScope === 'business' ? this.productBusinessId : null,
          brandId: this.productScope === 'brand' ? this.productBrandId : null,
          foodType: this.productForm.foodType,
          isAvailable: this.productForm.isAvailable,
          isEnabledForOnlineOrders: this.productForm.isEnabledForOnlineOrders,
          isOfferDisabled: false,
          isMrpItem: false,
          isRecommended: this.productForm.isRecommended,
          isBestseller: this.productForm.isBestseller,
          isNew: this.productForm.isNew,
          isSpicy: this.productForm.isSpicy,
          priority: 0,
          sortOrderInCategory: 0,
          gstRatePercentage: this.productForm.gstRatePercentage,
          hsnSacCode: this.productForm.hsnSacCode || null,
        })
        .subscribe({ next: onSuccess, error: onError });
    }
  }

  protected closeProductForm(): void {
    this.showProductForm.set(false);
    this.editingProduct.set(null);
    this.productFormError.set('');
  }
}
