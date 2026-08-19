import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BusinessApiService, MenuCategoryDto, MenuItemDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header"><h1 class="page-title">{{ 'restaurant.menu' | i18n }}</h1>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" routerLink="/menu/import">{{ 'restaurant.menuImport' | i18n }}</button>
        <button class="btn btn-primary" data-testid="item-add-btn" (click)="openAddItem()">+ {{ 'restaurant.addItem' | i18n }}</button>
        <button class="btn btn-outline" data-testid="category-add-btn" (click)="openAddCategory()">+ {{ 'restaurant.addCategory' | i18n }}</button>
      </div>
    </div>

    <div class="menu-layout">
      <aside class="category-sidebar">
        <p class="sidebar-title">{{ 'restaurant.categories' | i18n }}</p>
        <ul class="cat-list" data-testid="category-list">
          <li><button class="cat-item-btn" [class.active]="!selectedCategory()" (click)="selectedCategory.set(null)">{{ 'restaurant.allItems' | i18n }}</button></li>
          @for (cat of categories(); track cat.id) {
            <li><button class="cat-item-btn" [class.active]="selectedCategory()?.id === cat.id" (click)="selectCategory(cat)">
              {{ cat.name }}
              <button class="btn-icon" type="button" (click)="deleteCategory(cat); $event.stopPropagation()">✕</button>
            </button></li>
          }
        </ul>
      </aside>

      <section class="item-section">
        @if (loading()) { <p class="loading">{{ 'common.loading' | i18n }}</p> }
        @else {
          <table class="item-table" data-testid="item-list">
            <thead><tr><th>Name</th><th>Price</th><th>Category</th><th>Available</th><th></th></tr></thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td>{{ item.name }}</td>
                  <td>₹{{ item.basePrice }}</td>
                  <td>{{ getCategoryName(item.categoryId) }}</td>
                  <td>{{ item.isAvailable ? '✓' : '✗' }}</td>
                  <td>
                    <button class="btn btn-sm btn-outline" (click)="openEditItem(item)">{{ 'common.edit' | i18n }}</button>
                    <button class="btn btn-sm btn-danger" (click)="deleteItem(item)">{{ 'common.delete' | i18n }}</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">{{ 'restaurant.noItems' | i18n }}</td></tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>

    @if (showItemForm()) {
      <div class="overlay"><div class="panel">
        <h2 class="panel-title">{{ editingItem() ? ('common.edit' | i18n) : ('restaurant.addItem' | i18n) }}</h2>
        <div class="form-row">
          <label for="item-name" class="form-label">{{ 'products.name' | i18n }}</label>
          <input id="item-name" class="input" data-testid="item-form-name" [(ngModel)]="itemForm.name" />
          <label for="item-price" class="form-label">{{ 'products.price' | i18n }}</label>
          <input id="item-price" class="input" data-testid="item-form-price" type="number" [(ngModel)]="itemForm.basePrice" />
          <label for="item-cat" class="form-label">{{ 'categories.name' | i18n }}</label>
          <select id="item-cat" class="select" data-testid="item-form-category" [(ngModel)]="itemForm.categoryId">
            @for (c of categories(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          <label for="item-food-type" class="form-label">Food type</label>
          <select id="item-food-type" class="select" data-testid="item-form-food-type" [(ngModel)]="itemForm.foodType">
            <option value="veg">Veg</option>
            <option value="non-veg">Non-Veg</option>
          </select>
          <label class="form-label checkbox-label" for="item-avail">
            <input id="item-avail" type="checkbox" [(ngModel)]="itemForm.isAvailable" />
            Available
          </label>
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" data-testid="item-form-save-btn" [disabled]="!itemForm.name || saving()" (click)="saveItem()">{{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}</button>
          <button class="btn btn-outline" (click)="showItemForm.set(false)">{{ 'common.cancel' | i18n }}</button>
        </div>
      </div></div>
    }
    @if (showCatForm()) {
      <div class="overlay"><div class="panel">
        <h2 class="panel-title">{{ 'restaurant.addCategory' | i18n }}</h2>
        <div class="form-row">
          <label for="cat-name" class="form-label">Name</label>
          <input id="cat-name" class="input" [(ngModel)]="catFormName" />
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" [disabled]="!catFormName || saving()" (click)="saveCategory()">{{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}</button>
          <button class="btn btn-outline" (click)="showCatForm.set(false)">{{ 'common.cancel' | i18n }}</button>
        </div>
      </div></div>
    }
  `,
  styles: `@use '../../_restaurant-shared' as *; .menu-layout{display:flex;gap:var(--zitro-spacing-lg);} .category-sidebar{width:200px;flex-shrink:0;} .sidebar-title{font-size:var(--zitro-font-size-sm);font-weight:var(--zitro-font-weight-medium);color:var(--zitro-color-on-surface-variant);margin:0 0 var(--zitro-spacing-sm);} .cat-item-btn{display:flex;width:100%;text-align:left;border:none;background:none;cursor:pointer;padding:var(--zitro-spacing-sm) var(--zitro-spacing-md);border-radius:var(--zitro-radius-md);font-size:var(--zitro-font-size-sm);align-items:center;justify-content:space-between;&.active{background:color-mix(in srgb,var(--zitro-color-primary) 10%,transparent);color:var(--zitro-color-primary);&:hover{background:color-mix(in srgb,var(--zitro-color-primary) 15%,transparent);}}&:hover{background:var(--zitro-color-surface-container);}} .btn-icon{background:none;border:none;cursor:pointer;color:var(--zitro-color-on-surface-variant);font-size:12px;} .item-section{flex:1;} .item-table{width:100%;border-collapse:collapse;th,td{padding:var(--zitro-spacing-sm);text-align:left;border-bottom:1px solid var(--zitro-color-outline-variant);}th{font-size:var(--zitro-font-size-sm);color:var(--zitro-color-on-surface-variant);background:var(--zitro-color-surface-container);}} .empty{text-align:center;color:var(--zitro-color-on-surface-variant);padding:var(--zitro-spacing-xl);} .checkbox-label{display:flex;align-items:center;gap:8px;grid-column:1/-1;}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantMenuComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected categories = signal<MenuCategoryDto[]>([]);
  protected items = signal<MenuItemDto[]>([]);
  protected selectedCategory = signal<MenuCategoryDto | null>(null);
  protected loading = signal(true);
  protected showItemForm = signal(false);
  protected showCatForm = signal(false);
  protected editingItem = signal<MenuItemDto | null>(null);
  protected saving = signal(false);
  protected catFormName = '';
  protected itemForm = { name: '', basePrice: 0, categoryId: '', foodType: 'veg', isAvailable: true };

  ngOnInit(): void { this.loadAll(); }

  private loadAll(): void {
    const id = this.api.businessId()!;
    this.loading.set(true);
    this.api.listCategories(id).subscribe({ next: c => this.categories.set(c) });
    this.api.listProducts(id).subscribe({ next: p => { this.items.set(p); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  protected selectCategory(cat: MenuCategoryDto): void {
    this.selectedCategory.set(cat);
    const id = this.api.businessId()!;
    this.api.listProducts(id, cat.id).subscribe({ next: p => this.items.set(p) });
  }

  protected getCategoryName(id: string): string { return this.categories().find(c => c.id === id)?.name ?? '—'; }

  protected openAddItem(): void { this.editingItem.set(null); this.itemForm = { name: '', basePrice: 0, categoryId: this.categories()[0]?.id ?? '', foodType: 'veg', isAvailable: true }; this.showItemForm.set(true); }
  protected openEditItem(i: MenuItemDto): void { this.editingItem.set(i); this.itemForm = { name: i.name, basePrice: i.basePrice, categoryId: i.categoryId, foodType: i.foodType ?? 'veg', isAvailable: i.isAvailable }; this.showItemForm.set(true); }
  protected openAddCategory(): void { this.catFormName = ''; this.showCatForm.set(true); }

  protected saveItem(): void {
    this.saving.set(true);
    const id = this.api.businessId()!;
    const call$ = this.editingItem()
      ? this.api.updateProduct(id, this.editingItem()!.id, this.itemForm as Record<string, unknown>)
      : this.api.createProduct(id, this.itemForm as Record<string, unknown>);
    call$.subscribe({ next: () => { this.saving.set(false); this.showItemForm.set(false); this.loadAll(); }, error: () => this.saving.set(false) });
  }

  protected saveCategory(): void {
    this.saving.set(true);
    const id = this.api.businessId()!;
    this.api.createCategory(id, { name: this.catFormName }).subscribe({ next: c => { this.categories.update(cs => [...cs, c]); this.saving.set(false); this.showCatForm.set(false); }, error: () => this.saving.set(false) });
  }

  protected deleteItem(i: MenuItemDto): void {
    if (!confirm(`Delete "${i.name}"?`)) return;
    this.api.deleteProduct(this.api.businessId()!, i.id).subscribe({ next: () => this.items.update(is => is.filter(x => x.id !== i.id)) });
  }

  protected deleteCategory(c: MenuCategoryDto): void {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    this.api.deleteCategory(this.api.businessId()!, c.id).subscribe({ next: () => { this.categories.update(cs => cs.filter(x => x.id !== c.id)); if (this.selectedCategory()?.id === c.id) this.selectedCategory.set(null); } });
  }
}
