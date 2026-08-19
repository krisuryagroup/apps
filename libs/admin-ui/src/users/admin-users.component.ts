import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CustomerDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
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
  protected search = '';

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
    this.loading.set(true);
    const p: Record<string, string> = {};
    if (this.search) p['search'] = this.search;
    this.api.listAdminCustomers(p).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
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
