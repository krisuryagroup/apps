import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ProductDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-products',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <h1 class="page-title">{{ 'nav.products' | i18n }}</h1>
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
        <button class="btn btn-sm btn-danger" (click)="remove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected products = signal<ProductDto[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected q = '';

  protected readonly columns: DataTableColumn<ProductDto>[] = [
    { key: 'name', labelKey: 'products.name' },
    {
      key: 'basePrice',
      labelKey: 'products.price',
      format: (r) => `₹${r.basePrice}`,
    },
    {
      key: 'isAvailable',
      labelKey: 'products.available',
      format: (r) => (r.isAvailable ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.load();
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

  protected remove(p: ProductDto): void {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this.api.deleteProduct(p.id).subscribe({
      next: () => this.products.update((ps) => ps.filter((x) => x.id !== p.id)),
    });
  }
}
