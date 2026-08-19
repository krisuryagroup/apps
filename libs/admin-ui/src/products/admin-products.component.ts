import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ProductDto } from '@zitro/services';
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
  private readonly i18n = inject(I18nService);
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
}
