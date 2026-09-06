import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BusinessApiService,
  MenuCategoryDto,
  MenuItemDto,
  hasRole,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import { SharedMenuComponent } from './shared-menu.component';

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [FormsModule, I18nPipe, RouterLink, SharedMenuComponent],
  template: `
    @if (checkingMode()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (menuMode() === 'shared') {
      <app-restaurant-shared-menu />
    } @else {
      <div class="page-header">
        <h1 class="page-title">{{ 'restaurant.menu' | i18n }}</h1>
        @if (canManage()) {
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" routerLink="/menu/import">
              {{ 'restaurant.menuImport' | i18n }}
            </button>
            <button
              class="btn btn-outline"
              data-testid="bulk-add-btn"
              routerLink="/menu/bulk-add"
            >
              {{ 'restaurant.bulkAdd' | i18n }}
            </button>
            <button
              class="btn btn-primary"
              data-testid="item-add-btn"
              (click)="openAddItem()"
            >
              + {{ 'restaurant.addItem' | i18n }}
            </button>
            <button
              class="btn btn-outline"
              data-testid="category-add-btn"
              (click)="openAddCategory()"
            >
              + {{ 'restaurant.addCategory' | i18n }}
            </button>
            <button
              class="btn btn-outline"
              type="button"
              data-testid="menu-bulk-adjust-btn"
              (click)="showBulkAdjust.set(true)"
            >
              {{ 'products.bulkPriceAdjust' | i18n }}
            </button>
          </div>
        }
      </div>

      <div class="menu-layout">
        <aside class="category-sidebar">
          <p class="sidebar-title">{{ 'restaurant.categories' | i18n }}</p>
          <ul class="cat-list" data-testid="category-list">
            <li>
              <button
                class="cat-item-btn"
                [class.active]="!selectedCategory()"
                (click)="selectAllItems()"
              >
                {{ 'restaurant.allItems' | i18n }}
              </button>
            </li>
            @for (cat of categories(); track cat.id) {
              <li>
                <button
                  class="cat-item-btn"
                  [class.active]="selectedCategory()?.id === cat.id"
                  (click)="selectCategory(cat)"
                >
                  {{ cat.name }}
                  @if (canManage()) {
                    <button
                      class="btn-icon"
                      type="button"
                      (click)="deleteCategory(cat); $event.stopPropagation()"
                    >
                      ✕
                    </button>
                  }
                </button>
              </li>
            }
          </ul>
        </aside>

        <section class="item-section">
          @if (loading()) {
            <p class="loading">{{ 'common.loading' | i18n }}</p>
          } @else {
            <table class="item-table" data-testid="item-list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Available</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr>
                    <td>{{ item.name }}</td>
                    <td>₹{{ item.basePrice }}</td>
                    <td>{{ getCategoryName(item.categoryId) }}</td>
                    <td>
                      <button
                        type="button"
                        class="availability-toggle"
                        [class.availability-toggle--on]="item.isAvailable"
                        [disabled]="togglingItemId() === item.id"
                        [attr.aria-pressed]="item.isAvailable"
                        [attr.aria-label]="
                          item.isAvailable
                            ? ('restaurant.markUnavailable' | i18n)
                            : ('restaurant.markAvailable' | i18n)
                        "
                        (click)="toggleAvailable(item)"
                      >
                        <span class="availability-toggle__knob"></span>
                      </button>
                    </td>
                    <td>
                      @if (canManage()) {
                        <button
                          class="btn btn-sm btn-outline"
                          (click)="openEditItem(item)"
                        >
                          {{ 'common.edit' | i18n }}
                        </button>
                        <button
                          class="btn btn-sm btn-danger"
                          (click)="deleteItem(item)"
                        >
                          {{ 'common.delete' | i18n }}
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="empty">
                      {{ 'restaurant.noItems' | i18n }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>

      @if (showItemForm()) {
        <div class="overlay">
          <div class="panel">
            <h2 class="panel-title">
              {{
                editingItem()
                  ? ('common.edit' | i18n)
                  : ('restaurant.addItem' | i18n)
              }}
            </h2>
            <div class="form-row">
              <label for="item-name" class="form-label">{{
                'products.name' | i18n
              }}</label>
              <input
                id="item-name"
                class="input"
                data-testid="item-form-name"
                [(ngModel)]="itemForm.name"
              />
              <label for="item-price" class="form-label">{{
                'products.price' | i18n
              }}</label>
              <input
                id="item-price"
                class="input"
                data-testid="item-form-price"
                type="number"
                [(ngModel)]="itemForm.basePrice"
              />
              <label for="item-cat" class="form-label">{{
                'products.category' | i18n
              }}</label>
              <select
                id="item-cat"
                class="select"
                data-testid="item-form-category"
                [(ngModel)]="itemForm.categoryId"
              >
                @for (c of categories(); track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
              <label for="item-food-type" class="form-label">Food type</label>
              <select
                id="item-food-type"
                class="select"
                data-testid="item-form-food-type"
                [(ngModel)]="itemForm.foodType"
              >
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
              <label class="form-label checkbox-label" for="item-avail">
                <input
                  id="item-avail"
                  type="checkbox"
                  [(ngModel)]="itemForm.isAvailable"
                />
                Available
              </label>
            </div>
            <div class="panel-actions">
              <button
                class="btn btn-primary"
                data-testid="item-form-save-btn"
                [disabled]="!itemForm.name || saving()"
                (click)="saveItem()"
              >
                {{
                  saving() ? ('common.saving' | i18n) : ('common.save' | i18n)
                }}
              </button>
              <button class="btn btn-outline" (click)="showItemForm.set(false)">
                {{ 'common.cancel' | i18n }}
              </button>
            </div>
          </div>
        </div>
      }
      @if (showCatForm()) {
        <div class="overlay">
          <div class="panel">
            <h2 class="panel-title">{{ 'restaurant.addCategory' | i18n }}</h2>
            <div class="form-row">
              <label for="cat-name" class="form-label">Name</label>
              <input id="cat-name" class="input" [(ngModel)]="catFormName" />
            </div>
            <div class="panel-actions">
              <button
                class="btn btn-primary"
                [disabled]="!catFormName || saving()"
                (click)="saveCategory()"
              >
                {{
                  saving() ? ('common.saving' | i18n) : ('common.save' | i18n)
                }}
              </button>
              <button class="btn btn-outline" (click)="showCatForm.set(false)">
                {{ 'common.cancel' | i18n }}
              </button>
            </div>
          </div>
        </div>
      }
      @if (showBulkAdjust()) {
        <div class="overlay">
          <div class="panel">
            <h2 class="panel-title">{{ 'products.bulkPriceAdjust' | i18n }}</h2>
            <div class="form-row">
              <label for="menu-bulk-direction" class="form-label">{{
                'products.bulkDirection' | i18n
              }}</label>
              <select
                id="menu-bulk-direction"
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
            </div>
            <div class="form-row">
              <label for="menu-bulk-type" class="form-label">{{
                'products.bulkType' | i18n
              }}</label>
              <select
                id="menu-bulk-type"
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
            </div>
            <div class="form-row">
              <label for="menu-bulk-value" class="form-label">{{
                'products.bulkValue' | i18n
              }}</label>
              <input
                id="menu-bulk-value"
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
              <p class="empty" data-testid="bulk-adjust-result">
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
                [disabled]="bulkApplying() || !bulkValue || bulkValue <= 0"
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
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .menu-layout {
      display: flex;
      gap: var(--zitro-spacing-lg);
    }
    .category-sidebar {
      width: 200px;
      flex-shrink: 0;
    }
    .sidebar-title {
      font-size: var(--zitro-font-size-sm);
      font-weight: 500;
      color: var(--zitro-on-surface-variant);
      margin: 0 0 var(--zitro-spacing-sm);
    }
    .cat-item-btn {
      display: flex;
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      cursor: pointer;
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-md);
      border-radius: var(--zitro-radius-md);
      font-size: var(--zitro-font-size-sm);
      align-items: center;
      justify-content: space-between;
      &.active {
        background: color-mix(in srgb, var(--zitro-primary) 10%, transparent);
        color: var(--zitro-primary);
        &:hover {
          background: color-mix(in srgb, var(--zitro-primary) 15%, transparent);
        }
      }
      &:hover {
        background: var(--zitro-surface-variant);
      }
    }
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--zitro-on-surface-variant);
      font-size: 12px;
    }
    .item-section {
      flex: 1;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      th,
      td {
        padding: var(--zitro-spacing-sm);
        text-align: left;
        border-bottom: 1px solid var(--zitro-divider);
      }
      th {
        font-size: var(--zitro-font-size-sm);
        color: var(--zitro-on-surface-variant);
        background: var(--zitro-surface-variant);
      }
    }
    .empty {
      text-align: center;
      color: var(--zitro-on-surface-variant);
      padding: var(--zitro-spacing-xl);
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      grid-column: 1/-1;
    }
    .availability-toggle {
      position: relative;
      width: 38px;
      height: 22px;
      border-radius: 999px;
      border: none;
      background: var(--zitro-divider);
      cursor: pointer;
      padding: 0;
      transition: background 0.15s ease;
      flex-shrink: 0;
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      &--on {
        background: var(--zitro-primary);
      }
    }
    .availability-toggle__knob {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease;
      .availability-toggle--on & {
        transform: translateX(16px);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantMenuComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  private readonly i18n = inject(I18nService);

  /** Manager+ can create/edit/delete categories and items; staff keeps only the
   * availability toggle per row (RESTAURANT-RBAC-PLAN.md). */
  protected canManage(): boolean {
    return hasRole(this.api.currentUser()?.role, 'manager');
  }

  protected checkingMode = signal(true);
  protected menuMode = signal<'shared' | 'independent'>('independent');
  protected categories = signal<MenuCategoryDto[]>([]);
  protected items = signal<MenuItemDto[]>([]);
  protected selectedCategory = signal<MenuCategoryDto | null>(null);
  protected loading = signal(true);
  protected showItemForm = signal(false);
  protected showCatForm = signal(false);
  protected editingItem = signal<MenuItemDto | null>(null);
  protected saving = signal(false);
  protected catFormName = '';
  protected itemForm = {
    name: '',
    basePrice: 0,
    categoryId: '',
    foodType: 'veg',
    isAvailable: true,
  };

  // ── Bulk price adjust ────────────────────────────────────────────────────
  protected showBulkAdjust = signal(false);
  protected bulkIsIncrease = true;
  protected bulkIsPercentage = true;
  protected bulkValue: number | null = null;
  protected bulkApplying = signal(false);
  protected bulkResultMessage = signal('');
  protected bulkError = signal('');

  ngOnInit(): void {
    const id = this.api.businessId()!;
    this.api.getProfile(id).subscribe({
      next: (profile) => {
        this.menuMode.set(profile.menuMode);
        this.checkingMode.set(false);
        // A shared-mode branch doesn't own products/categories — SharedMenuComponent
        // handles it entirely on its own, no need to load this component's own data.
        if (profile.menuMode === 'independent') this.loadAll();
      },
      error: () => this.checkingMode.set(false),
    });
  }

  private loadAll(): void {
    const id = this.api.businessId()!;
    this.loading.set(true);
    this.api
      .listCategories(id)
      .subscribe({ next: (c) => this.categories.set(c) });
    this.api.listProducts(id).subscribe({
      next: (p) => {
        this.items.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected selectCategory(cat: MenuCategoryDto): void {
    this.selectedCategory.set(cat);
    const id = this.api.businessId()!;
    this.api
      .listProducts(id, cat.id)
      .subscribe({ next: (p) => this.items.set(p) });
  }

  protected selectAllItems(): void {
    this.selectedCategory.set(null);
    const id = this.api.businessId()!;
    this.api.listProducts(id).subscribe({ next: (p) => this.items.set(p) });
  }

  protected getCategoryName(id: string): string {
    return this.categories().find((c) => c.id === id)?.name ?? '—';
  }

  protected openAddItem(): void {
    this.editingItem.set(null);
    this.itemForm = {
      name: '',
      basePrice: 0,
      categoryId: this.categories()[0]?.id ?? '',
      foodType: 'veg',
      isAvailable: true,
    };
    this.showItemForm.set(true);
  }
  protected openEditItem(i: MenuItemDto): void {
    this.editingItem.set(i);
    this.itemForm = {
      name: i.name,
      basePrice: i.basePrice,
      categoryId: i.categoryId,
      foodType: i.foodType ?? 'veg',
      isAvailable: i.isAvailable,
    };
    this.showItemForm.set(true);
  }
  protected openAddCategory(): void {
    this.catFormName = '';
    this.showCatForm.set(true);
  }

  protected saveItem(): void {
    this.saving.set(true);
    const id = this.api.businessId()!;
    // Backend's IsEnabledForOnlineOrders is what actually gates customer-facing menu
    // visibility (see GetBusinessMenuHandler) — this form has no separate toggle for it,
    // so "Available" drives both fields. Without this, created items silently never show
    // up for customers even with Available checked (isEnabledForOnlineOrders defaults to
    // false server-side when omitted from a create request).
    const editing = this.editingItem();
    // CreateBusinessProductRequest's fields are `basePrice`/`isAvailable`;
    // UpdateBusinessProductRequest's equivalents are named `price`/`status` instead —
    // sending the create-shaped keys on an update left both fields absent from what the
    // backend actually reads, which it treats as "no change", so price AND availability
    // edits were both silently dropped.
    const req = editing
      ? {
          name: this.itemForm.name,
          price: this.itemForm.basePrice,
          categoryId: this.itemForm.categoryId,
          foodType: this.itemForm.foodType,
          status: this.itemForm.isAvailable,
          isEnabledForOnlineOrders: this.itemForm.isAvailable,
        }
      : {
          ...this.itemForm,
          isEnabledForOnlineOrders: this.itemForm.isAvailable,
        };
    const call$ = editing
      ? this.api.updateProduct(id, editing.id, req as Record<string, unknown>)
      : this.api.createProduct(id, req as Record<string, unknown>);
    call$.subscribe({
      next: () => {
        this.saving.set(false);
        this.showItemForm.set(false);
        this.loadAll();
      },
      error: () => this.saving.set(false),
    });
  }

  protected saveCategory(): void {
    this.saving.set(true);
    const id = this.api.businessId()!;
    // createCategory's response is just { id } (the Create command it calls is shared with
    // the admin module and only ever returns the new Guid) — reload instead of appending
    // that partial object, same as saveItem() already does for products. Appending it
    // directly used to render a nameless row (just the delete "✕") until the next reload.
    this.api.createCategory(id, { name: this.catFormName }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showCatForm.set(false);
        this.loadAll();
      },
      error: () => this.saving.set(false),
    });
  }

  protected deleteItem(i: MenuItemDto): void {
    if (!confirm(`Delete "${i.name}"?`)) return;
    this.api.deleteProduct(this.api.businessId()!, i.id).subscribe({
      next: () => this.items.update((is) => is.filter((x) => x.id !== i.id)),
    });
  }

  // ── One-click availability toggle ─────────────────────────────────────────
  protected togglingItemId = signal<string | null>(null);

  protected toggleAvailable(i: MenuItemDto): void {
    const next = !i.isAvailable;
    this.togglingItemId.set(i.id);
    const id = this.api.businessId()!;
    // UpdateBusinessProductRequest names this field `status` (and separately
    // `isEnabledForOnlineOrders`, which gates customer-facing visibility) — see saveItem().
    this.api
      .updateProduct(id, i.id, { status: next, isEnabledForOnlineOrders: next })
      .subscribe({
        next: () => {
          this.togglingItemId.set(null);
          this.items.update((items) =>
            items.map((item) =>
              item.id === i.id ? { ...item, isAvailable: next } : item,
            ),
          );
        },
        error: () => this.togglingItemId.set(null),
      });
  }

  protected deleteCategory(c: MenuCategoryDto): void {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.api.deleteCategory(this.api.businessId()!, c.id).subscribe({
      next: () => {
        this.categories.update((cs) => cs.filter((x) => x.id !== c.id));
        if (this.selectedCategory()?.id === c.id)
          this.selectedCategory.set(null);
      },
    });
  }

  protected applyBulkAdjust(): void {
    if (!this.bulkValue || this.bulkValue <= 0) return;
    const id = this.api.businessId()!;
    this.bulkApplying.set(true);
    this.bulkResultMessage.set('');
    this.bulkError.set('');

    this.api
      .bulkAdjustProductPrices(id, {
        categoryId: this.selectedCategory()?.id ?? null,
        isPercentage: this.bulkIsPercentage,
        isIncrease: this.bulkIsIncrease,
        value: this.bulkValue,
      })
      .subscribe({
        next: (res) => {
          this.bulkApplying.set(false);
          this.bulkResultMessage.set(
            this.i18n.translate('products.bulkResult', {
              count: String(res.updatedCount),
            }),
          );
          this.loadAll();
        },
        error: () => {
          this.bulkApplying.set(false);
          this.bulkError.set(this.i18n.translate('products.bulkError'));
        },
      });
  }

  protected closeBulkAdjust(): void {
    this.showBulkAdjust.set(false);
    this.bulkIsIncrease = true;
    this.bulkIsPercentage = true;
    this.bulkValue = null;
    this.bulkResultMessage.set('');
    this.bulkError.set('');
  }
}
