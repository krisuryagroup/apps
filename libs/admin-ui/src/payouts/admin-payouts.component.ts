import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AdminPayoutDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-payouts',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.payouts' | i18n }}</h1>
      <div class="generate-bar">
        <input
          class="input"
          type="date"
          data-testid="payout-generate-from"
          [(ngModel)]="genFrom"
        />
        <input
          class="input"
          type="date"
          data-testid="payout-generate-to"
          [(ngModel)]="genTo"
        />
        <button
          class="btn btn-primary"
          data-testid="payout-generate-btn"
          [disabled]="!genFrom || !genTo || generating()"
          (click)="generate()"
        >
          {{
            generating()
              ? ('common.saving' | i18n)
              : ('payouts.generate' | i18n)
          }}
        </button>
      </div>
    </div>
    @if (generateMessage()) {
      <p class="success-text">{{ generateMessage() }}</p>
    }
    @if (generateError()) {
      <p class="error-text">{{ 'common.error' | i18n }}</p>
    }
    <div class="filters">
      <select
        id="payout-status"
        class="select"
        data-testid="payout-status-filter"
        [(ngModel)]="status"
        (ngModelChange)="load()"
      >
        <option value="">{{ 'payouts.allStatuses' | i18n }}</option>
        <option value="pending">pending</option>
        <option value="processing">processing</option>
        <option value="paid">paid</option>
        <option value="failed">failed</option>
      </select>
    </div>
    <lib-data-table
      data-testid="payout-batch-table"
      [columns]="columns"
      [rows]="result()?.items ?? []"
      [loading]="loading()"
      [error]="error()"
      [pagination]="pagination()"
      (pageChange)="onPageChange($event)"
    >
      <ng-template #rowActions let-row>
        @if (row.status !== 'paid') {
          <button
            class="btn btn-sm btn-primary"
            data-testid="payout-mark-paid-btn"
            (click)="openMarkPaid(row)"
          >
            {{ 'payouts.markPaid' | i18n }}
          </button>
        }
      </ng-template>
    </lib-data-table>
    @if (markPaidTarget(); as target) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{ 'payouts.markPaid' | i18n }} — {{ target.businessName }}
          </h2>
          <div class="form-grid">
            <label for="payout-reference" class="form-label">{{
              'payouts.reference' | i18n
            }}</label>
            <input
              id="payout-reference"
              class="input"
              data-testid="payout-reference-input"
              [(ngModel)]="markPaidReference"
              placeholder="{{ 'payouts.referencePlaceholder' | i18n }}"
            />
          </div>
          @if (markPaidError()) {
            <p class="error-text">{{ markPaidError() }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="payout-mark-paid-confirm-btn"
              [disabled]="!markPaidReference || markPaidSaving()"
              (click)="confirmMarkPaid(target)"
            >
              {{
                markPaidSaving()
                  ? ('common.saving' | i18n)
                  : ('common.save' | i18n)
              }}
            </button>
            <button class="btn btn-outline" (click)="markPaidTarget.set(null)">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;

      .generate-bar {
        display: flex;
        gap: var(--zitro-spacing-sm);
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPayoutsComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  protected result = signal<PagedResult<AdminPayoutDto> | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected status = '';

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });

  protected genFrom = '';
  protected genTo = '';
  protected generating = signal(false);
  protected generateMessage = signal<string | null>(null);
  protected generateError = signal(false);

  protected markPaidTarget = signal<AdminPayoutDto | null>(null);
  protected markPaidReference = '';
  protected markPaidSaving = signal(false);
  protected markPaidError = signal<string | null>(null);

  protected readonly columns: DataTableColumn<AdminPayoutDto>[] = [
    { key: 'businessName', labelKey: 'payouts.business' },
    {
      key: 'periodFrom',
      labelKey: 'payouts.period',
      format: (r) => `${r.periodFrom} — ${r.periodTo}`,
    },
    {
      key: 'grossAmount',
      labelKey: 'payouts.gross',
      format: (r) => `₹${r.grossAmount}`,
    },
    {
      key: 'commissionAmount',
      labelKey: 'payouts.commission',
      format: (r) => `₹${r.commissionAmount}`,
    },
    {
      key: 'netAmount',
      labelKey: 'payouts.net',
      format: (r) => `₹${r.netAmount}`,
    },
    { key: 'orderCount', labelKey: 'payouts.orders' },
    { key: 'status', labelKey: 'payouts.status' },
    {
      key: 'payoutReference',
      labelKey: 'payouts.reference',
      format: (r) => r.payoutReference ?? '—',
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  protected load(): void {
    this.page.set(1);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    const p: Record<string, string> = {
      page: String(this.page()),
      pageSize: String(this.pageSize),
    };
    if (this.status) p['status'] = this.status;
    this.api.listAdminPayouts(p).subscribe({
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

  protected generate(): void {
    this.generating.set(true);
    this.generateMessage.set(null);
    this.generateError.set(false);
    this.api.generatePayouts(this.genFrom, this.genTo).subscribe({
      next: (rows) => {
        this.generating.set(false);
        this.generateMessage.set(
          rows.length > 0
            ? `Generated ${rows.length} payout(s).`
            : 'No new payouts — every business already has one for this period, or none had qualifying orders.',
        );
        this.load();
      },
      error: () => {
        this.generating.set(false);
        this.generateError.set(true);
      },
    });
  }

  protected openMarkPaid(payout: AdminPayoutDto): void {
    this.markPaidTarget.set(payout);
    this.markPaidReference = '';
    this.markPaidError.set(null);
  }

  protected confirmMarkPaid(payout: AdminPayoutDto): void {
    this.markPaidSaving.set(true);
    this.markPaidError.set(null);
    this.api.markPayoutPaid(payout.id, this.markPaidReference).subscribe({
      next: () => {
        this.markPaidSaving.set(false);
        this.markPaidTarget.set(null);
        this.fetch();
      },
      error: (err) => {
        this.markPaidSaving.set(false);
        this.markPaidError.set(
          err?.error?.error ?? 'Failed to mark payout as paid.',
        );
      },
    });
  }
}
