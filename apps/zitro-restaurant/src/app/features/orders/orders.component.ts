import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BusinessApiService, BusinessOrderDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableFilterField,
  DataTableFilterValue,
  DataTablePagination,
} from '@zitro/admin-ui';

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
];
const STATUS_NEXT: Record<string, string> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'shipped',
  shipped: 'delivered',
};
const ALL_ORDERS_PAGE_SIZE = 20;

@Component({
  selector: 'app-restaurant-orders',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.orders' | i18n }}</h1>
    </div>
    <div class="tabs">
      <button
        class="tab"
        [class.active]="statusFilter() === 'all'"
        data-testid="order-queue-tab-all"
        (click)="selectTab('all')"
      >
        All Orders
      </button>
      @for (s of displayStatuses; track s) {
        <button
          class="tab"
          [class.active]="statusFilter() === s"
          [attr.data-testid]="'order-queue-tab-' + s"
          (click)="selectTab(s)"
        >
          {{ s }}
        </button>
      }
    </div>

    @if (statusFilter() === 'all') {
      <lib-data-table
        data-testid="all-orders-table"
        [columns]="allOrdersColumns"
        [rows]="orders()"
        [loading]="loading()"
        [pagination]="allOrdersPagination()"
        [filters]="allOrdersFilters"
        [filterValues]="allOrdersFilterValues()"
        (filterChange)="onAllOrdersFilterChange($event)"
        (pageChange)="onAllOrdersPageChange($event)"
        (rowClick)="goToDetail($event)"
      >
        <ng-template #rowActions let-order>
          <div class="order-actions">
            @if (order.status === 'pending') {
              <button
                class="btn btn-sm btn-primary"
                data-testid="order-accept-btn"
                (click)="advance(order)"
              >
                Accept
              </button>
              <button
                class="btn btn-sm btn-danger"
                data-testid="order-reject-btn"
                (click)="openReject(order)"
              >
                Reject
              </button>
            } @else if (nextStatus(order.status)) {
              <button
                class="btn btn-sm btn-primary"
                data-testid="order-advance-btn"
                (click)="advance(order)"
              >
                → {{ nextStatus(order.status) }}
              </button>
            }
            <a
              class="btn btn-sm btn-outline"
              [routerLink]="['/orders', order.orderId]"
              >Detail</a
            >
          </div>
        </ng-template>
      </lib-data-table>
    } @else if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <div class="order-list">
        @for (order of orders(); track order.id) {
          <div
            class="order-card card"
            [attr.data-testid]="'order-card-' + order.orderId"
          >
            <div class="order-header">
              <strong>{{ order.orderId }}</strong>
              <span class="badge" [class]="'badge-' + order.status">{{
                order.status
              }}</span>
              <span class="order-time">{{
                order.createdAt | date: 'HH:mm'
              }}</span>
            </div>
            <div class="order-meta">
              {{ order.itemCount }} items · ₹{{ order.total }}
            </div>
            <div class="order-actions">
              @if (order.status === 'pending') {
                <button
                  class="btn btn-sm btn-primary"
                  data-testid="order-accept-btn"
                  (click)="advance(order)"
                >
                  Accept
                </button>
                <button
                  class="btn btn-sm btn-danger"
                  data-testid="order-reject-btn"
                  (click)="openReject(order)"
                >
                  Reject
                </button>
              } @else if (nextStatus(order.status)) {
                <button
                  class="btn btn-sm btn-primary"
                  data-testid="order-advance-btn"
                  (click)="advance(order)"
                >
                  → {{ nextStatus(order.status) }}
                </button>
              }
              <a
                class="btn btn-sm btn-outline"
                [routerLink]="['/orders', order.orderId]"
                >Detail</a
              >
            </div>
          </div>
        } @empty {
          <p class="empty">{{ 'restaurant.noOrders' | i18n }}</p>
        }
      </div>
    }
    @if (rejectingOrder()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'restaurant.rejectOrder' | i18n }}</h2>
          <label for="reject-reason" class="form-label">{{
            'restaurant.rejectReason' | i18n
          }}</label>
          <input
            id="reject-reason"
            class="input"
            data-testid="order-reject-reason-input"
            [(ngModel)]="rejectReason"
          />
          <div class="panel-actions">
            <button
              class="btn btn-danger"
              [disabled]="!rejectReason"
              (click)="confirmReject()"
            >
              {{ 'businesses.reject' | i18n }}
            </button>
            <button
              class="btn btn-outline"
              (click)="rejectingOrder.set(null); rejectReason = ''"
            >
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid var(--zitro-divider);
      margin-bottom: var(--zitro-spacing-lg);
      overflow-x: auto;
    }
    .tab {
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-md);
      border: none;
      background: none;
      cursor: pointer;
      font-size: var(--zitro-font-size-sm);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      color: var(--zitro-on-surface-variant);
      white-space: nowrap;
      &.active {
        color: var(--zitro-primary);
        border-bottom-color: var(--zitro-primary);
        font-weight: 500;
      }
    }
    .order-list {
      display: flex;
      flex-direction: column;
      gap: var(--zitro-spacing-md);
    }
    .order-header {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-sm);
      flex-wrap: wrap;
      margin-bottom: var(--zitro-spacing-xs);
    }
    .order-time {
      color: var(--zitro-on-surface-variant);
      font-size: var(--zitro-font-size-sm);
      margin-left: auto;
    }
    .order-meta {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
      margin-bottom: var(--zitro-spacing-sm);
    }
    .order-actions {
      display: flex;
      gap: var(--zitro-spacing-sm);
      flex-wrap: wrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantOrdersComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  private readonly router = inject(Router);
  protected orders = signal<BusinessOrderDto[]>([]);
  protected loading = signal(true);
  protected statusFilter = signal('pending');
  protected rejectingOrder = signal<BusinessOrderDto | null>(null);
  protected rejectReason = '';
  // Was missing 'delivered'/'cancelled' — a restaurant partner had no tab
  // that could ever show a fulfilled or rejected order, even though the
  // GetBusinessOrders API already supports filtering by either status.
  protected readonly displayStatuses = ORDER_STATUSES;

  // ── "All Orders" tab — combined view with search/status/date-range filters,
  // backed by lib-data-table's reusable filter-bar configuration. ───────────
  protected readonly allOrdersColumns: DataTableColumn<BusinessOrderDto>[] = [
    { key: 'orderId', labelKey: 'orders.orderId' },
    { key: 'status', labelKey: 'orders.status' },
    {
      key: 'createdAt',
      labelKey: 'orders.createdAt',
      format: (o) => new Date(o.createdAt).toLocaleString(),
    },
    { key: 'itemCount', labelKey: 'orders.items' },
    { key: 'total', labelKey: 'orders.total', format: (o) => `₹${o.total}` },
  ];
  protected readonly allOrdersFilters: DataTableFilterField[] = [
    {
      key: 'status',
      type: 'select',
      labelKey: 'orders.status',
      options: [
        { value: '', labelKey: 'orders.allStatuses' },
        ...ORDER_STATUSES.map((s) => ({
          value: s,
          labelKey: `orderStatus.${s}`,
        })),
      ],
    },
    {
      key: 'search',
      type: 'search',
      labelKey: 'orders.search',
      placeholderKey: 'orders.orderIdPlaceholder',
    },
    { key: 'dateRange', type: 'dateRange', labelKey: 'orders.dateRange' },
  ];
  protected allOrdersFilterValues = signal<DataTableFilterValue>({
    status: '',
  });
  protected allOrdersPagination = signal<DataTablePagination>({
    page: 1,
    pageSize: ALL_ORDERS_PAGE_SIZE,
    total: 0,
  });

  protected nextStatus(s: string): string | null {
    return STATUS_NEXT[s] ?? null;
  }

  ngOnInit(): void {
    this.load();
  }

  protected selectTab(status: string): void {
    this.statusFilter.set(status);
    if (status === 'all') {
      this.allOrdersPagination.update((p) => ({ ...p, page: 1 }));
      this.loadAllOrders();
    } else {
      this.load();
    }
  }

  protected load(): void {
    const id = this.api.businessId();
    if (!id) return;
    this.loading.set(true);
    this.api.listOrders(id, { status: this.statusFilter() }).subscribe({
      next: (o) => {
        this.orders.set(o);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onAllOrdersFilterChange(value: DataTableFilterValue): void {
    this.allOrdersFilterValues.set(value);
    this.allOrdersPagination.update((p) => ({ ...p, page: 1 }));
    this.loadAllOrders();
  }

  protected onAllOrdersPageChange(page: number): void {
    this.allOrdersPagination.update((p) => ({ ...p, page }));
    this.loadAllOrders();
  }

  protected goToDetail(order: BusinessOrderDto): void {
    this.router.navigate(['/orders', order.orderId]);
  }

  private loadAllOrders(): void {
    const id = this.api.businessId();
    if (!id) return;
    this.loading.set(true);

    const filters = this.allOrdersFilterValues();
    const status =
      typeof filters['status'] === 'string' ? filters['status'] : '';
    const search =
      typeof filters['search'] === 'string' ? filters['search'] : '';
    const dateRange = filters['dateRange'];
    const fromDate =
      typeof dateRange === 'object' && dateRange ? dateRange.from : '';
    const toDate =
      typeof dateRange === 'object' && dateRange ? dateRange.to : '';

    const { page, pageSize } = this.allOrdersPagination();
    this.api
      .listOrdersPaged(id, {
        status,
        search,
        fromDate,
        toDate,
        page: String(page),
        pageSize: String(pageSize),
      })
      .subscribe({
        next: (res) => {
          this.orders.set(res.orders);
          this.allOrdersPagination.set({
            page: res.page,
            pageSize: res.pageSize,
            total: res.totalCount,
          });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected advance(order: BusinessOrderDto): void {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    const id = this.api.businessId()!;
    this.api.updateOrderStatus(id, order.orderId, next).subscribe({
      next: () => this.reload(),
    });
  }

  private reload(): void {
    if (this.statusFilter() === 'all') {
      this.loadAllOrders();
    } else {
      this.load();
    }
  }

  protected openReject(order: BusinessOrderDto): void {
    this.rejectingOrder.set(order);
  }

  protected confirmReject(): void {
    const order = this.rejectingOrder();
    if (!order || !this.rejectReason) return;
    const id = this.api.businessId()!;
    this.api
      .updateOrderStatus(id, order.orderId, 'cancelled', this.rejectReason)
      .subscribe({
        next: () => {
          this.rejectingOrder.set(null);
          this.rejectReason = '';
          this.reload();
        },
      });
  }
}
