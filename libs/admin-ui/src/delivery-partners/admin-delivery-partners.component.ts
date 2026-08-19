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
  DeliveryPartnerDto,
  PagedResult,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-delivery-partners',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <h1 class="page-title">{{ 'nav.delivery' | i18n }}</h1>
    <div class="filters">
      <select
        id="dp-status"
        class="select"
        [(ngModel)]="statusFilter"
        (ngModelChange)="load()"
      >
        <option value="">{{ 'delivery.allStatuses' | i18n }}</option>
        <option value="active">active</option>
        <option value="suspended">suspended</option>
      </select>
    </div>
    <lib-data-table
      [columns]="columns"
      [rows]="result()?.items ?? []"
      [loading]="loading()"
      [error]="error()"
      [pagination]="pagination()"
      (pageChange)="onPageChange($event)"
    >
      <ng-template #rowActions let-row>
        <button class="btn btn-sm btn-danger" (click)="toggleStatus(row)">
          {{
            row.status === 'active'
              ? ('delivery.suspend' | i18n)
              : ('delivery.activate' | i18n)
          }}
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
export class AdminDeliveryPartnersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected result = signal<PagedResult<DeliveryPartnerDto> | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected statusFilter = '';

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });

  protected readonly columns: DataTableColumn<DeliveryPartnerDto>[] = [
    { key: 'name', labelKey: 'delivery.name' },
    { key: 'phone', labelKey: 'delivery.phone' },
    { key: 'status', labelKey: 'delivery.status' },
    {
      key: 'isAvailable',
      labelKey: 'delivery.available',
      format: (r) => (r.isAvailable ? '✓' : '✗'),
    },
    { key: 'totalDeliveries', labelKey: 'delivery.total' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.page.set(1);
    this.fetch();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    const p: Record<string, string> = {
      page: String(this.page()),
      pageSize: String(this.pageSize),
    };
    if (this.statusFilter) p['status'] = this.statusFilter;
    this.api.listDeliveryPartners(p).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected toggleStatus(p: DeliveryPartnerDto): void {
    const newStatus = p.status === 'active' ? 'suspended' : 'active';
    this.api.updateDeliveryPartnerStatus(p.id, newStatus).subscribe({
      next: () =>
        this.result.update((r) =>
          r
            ? {
                ...r,
                items: r.items.map((x) =>
                  x.id === p.id ? { ...x, status: newStatus } : x,
                ),
              }
            : r,
        ),
    });
  }
}
