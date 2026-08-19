import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, DeliveryPartnerDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
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
      [rows]="partners()"
      [loading]="loading()"
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
  protected partners = signal<DeliveryPartnerDto[]>([]);
  protected loading = signal(true);
  protected statusFilter = '';

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
    this.loading.set(true);
    const p: Record<string, string> = {};
    if (this.statusFilter) p['status'] = this.statusFilter;
    this.api.listDeliveryPartners(p).subscribe({
      next: (d) => {
        this.partners.set(d);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected toggleStatus(p: DeliveryPartnerDto): void {
    const newStatus = p.status === 'active' ? 'suspended' : 'active';
    this.api.updateDeliveryPartnerStatus(p.id, newStatus).subscribe({
      next: () =>
        this.partners.update((ps) =>
          ps.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x)),
        ),
    });
  }
}
