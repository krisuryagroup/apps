import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, OrderSummaryDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-orders',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <h1 class="page-title">{{ 'nav.orders' | i18n }}</h1>
    <div class="filters">
      <input
        class="input"
        data-testid="order-search-phone"
        [(ngModel)]="phone"
        (ngModelChange)="load()"
        placeholder="{{ 'orders.phonePlaceholder' | i18n }}"
      />
      <input
        class="input"
        [(ngModel)]="orderId"
        (ngModelChange)="load()"
        placeholder="{{ 'orders.orderIdPlaceholder' | i18n }}"
      />
      <select
        id="order-status"
        class="select"
        data-testid="order-search-status-filter"
        [(ngModel)]="status"
        (ngModelChange)="load()"
      >
        <option value="">{{ 'orders.allStatuses' | i18n }}</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
      <input
        class="input"
        type="date"
        data-testid="order-search-date-range"
        [(ngModel)]="fromDate"
        (ngModelChange)="load()"
      />
      <input
        class="input"
        type="date"
        [(ngModel)]="toDate"
        (ngModelChange)="load()"
      />
    </div>
    <lib-data-table
      data-testid="order-search-table"
      [columns]="columns"
      [rows]="orders()"
      [loading]="loading()"
    />
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected orders = signal<OrderSummaryDto[]>([]);
  protected loading = signal(true);
  protected phone = '';
  protected orderId = '';
  protected status = '';
  protected fromDate = '';
  protected toDate = '';
  protected readonly statuses = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'shipped',
    'delivered',
    'completed',
    'cancelled',
  ];

  protected readonly columns: DataTableColumn<OrderSummaryDto>[] = [
    { key: 'orderId', labelKey: 'orders.orderId' },
    {
      key: 'businessName',
      labelKey: 'orders.business',
      format: (r) => r.businessName ?? '—',
    },
    {
      key: 'customerPhone',
      labelKey: 'orders.customer',
      format: (r) => r.customerPhone ?? '—',
    },
    { key: 'status', labelKey: 'orders.status' },
    { key: 'total', labelKey: 'orders.total', format: (r) => `₹${r.total}` },
    {
      key: 'createdAt',
      labelKey: 'orders.date',
      format: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    const p: Record<string, string> = {};
    if (this.phone) p['customerPhone'] = this.phone;
    if (this.orderId) p['search'] = this.orderId;
    if (this.status) p['status'] = this.status;
    if (this.fromDate) p['fromDate'] = this.fromDate;
    if (this.toDate) p['toDate'] = this.toDate;
    this.api.listAdminOrders(p).subscribe({
      next: (o) => {
        this.orders.set(o);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
