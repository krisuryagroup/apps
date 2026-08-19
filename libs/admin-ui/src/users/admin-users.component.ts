import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CustomerDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-users',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <h1 class="page-title">{{ 'nav.users' | i18n }}</h1>
    <div class="filters">
      <input
        class="input"
        [(ngModel)]="search"
        (ngModelChange)="load()"
        placeholder="{{ 'users.searchPlaceholder' | i18n }}"
      />
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
        <button class="btn btn-sm btn-danger" (click)="toggleBlock(row)">
          {{ row.isActive ? ('users.block' | i18n) : ('users.unblock' | i18n) }}
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
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected result = signal<PagedResult<CustomerDto> | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected search = '';

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });

  protected readonly columns: DataTableColumn<CustomerDto>[] = [
    { key: 'name', labelKey: 'users.name', format: (r) => r.name ?? '—' },
    { key: 'phone', labelKey: 'users.phone' },
    { key: 'totalOrders', labelKey: 'users.orders' },
    {
      key: 'isActive',
      labelKey: 'users.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
    {
      key: 'createdAt',
      labelKey: 'users.joined',
      format: (r) => new Date(r.createdAt).toLocaleDateString(),
    },
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
    if (this.search) p['search'] = this.search;
    this.api.listAdminCustomers(p).subscribe({
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

  protected toggleBlock(u: CustomerDto): void {
    this.api.updateCustomerStatus(u.id, !u.isActive).subscribe({
      next: () =>
        this.result.update((r) =>
          r
            ? {
                ...r,
                items: r.items.map((x) =>
                  x.id === u.id ? { ...x, isActive: !x.isActive } : x,
                ),
              }
            : r,
        ),
    });
  }
}
