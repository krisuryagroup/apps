import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CouponDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-coupons',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.coupons' | i18n }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">
        + {{ 'coupons.add' | i18n }}
      </button>
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
        <button class="btn btn-sm btn-danger" (click)="remove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'coupons.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="cp-title" class="form-label">Title</label>
            <input id="cp-title" class="input" [(ngModel)]="f.title" />
            <label for="cp-desc" class="form-label">Description</label>
            <input id="cp-desc" class="input" [(ngModel)]="f.description" />
            <label for="cp-code" class="form-label">{{
              'coupons.code' | i18n
            }}</label>
            <input id="cp-code" class="input" [(ngModel)]="f.code" />
            <label for="cp-type" class="form-label">{{
              'coupons.type' | i18n
            }}</label>
            <select id="cp-type" class="select" [(ngModel)]="f.discountType">
              <option value="percentage">percentage</option>
              <option value="flat">flat</option>
            </select>
            <label for="cp-value" class="form-label">{{
              'coupons.value' | i18n
            }}</label>
            <input
              id="cp-value"
              class="input"
              type="number"
              [(ngModel)]="f.discountValue"
            />
            <label for="cp-validfrom" class="form-label">Valid From</label>
            <input
              id="cp-validfrom"
              class="input"
              type="date"
              [(ngModel)]="f.validFrom"
            />
            <label for="cp-validto" class="form-label">{{
              'coupons.validTo' | i18n
            }}</label>
            <input
              id="cp-validto"
              class="input"
              type="date"
              [(ngModel)]="f.validTo"
            />
            <label for="cp-minorder" class="form-label">{{
              'coupons.minOrderAmount' | i18n
            }}</label>
            <input
              id="cp-minorder"
              class="input"
              type="number"
              min="0"
              [(ngModel)]="f.minOrderAmount"
            />
            <label for="cp-usagelimit" class="form-label">{{
              'coupons.usageLimit' | i18n
            }}</label>
            <input
              id="cp-usagelimit"
              class="input"
              type="number"
              min="1"
              placeholder="{{ 'coupons.usageLimitPlaceholder' | i18n }}"
              [(ngModel)]="f.usageLimit"
            />
            <label for="cp-cooldown" class="form-label">{{
              'coupons.cooldownDays' | i18n
            }}</label>
            <input
              id="cp-cooldown"
              class="input"
              type="number"
              min="0"
              placeholder="{{ 'coupons.cooldownDaysPlaceholder' | i18n }}"
              [(ngModel)]="f.cooldownPeriodDays"
            />
            <label class="form-label checkbox-label" for="cp-newcustomer">
              <input
                id="cp-newcustomer"
                type="checkbox"
                [(ngModel)]="f.isNewCustomerOnly"
              />
              {{ 'coupons.newCustomerOnly' | i18n }}
            </label>
            <div class="form-label">{{ 'coupons.orderTypes' | i18n }}</div>
            <div class="checkbox-group">
              @for (t of ORDER_TYPES; track t) {
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="f.applicableOrderTypes.includes(t)"
                    (change)="toggleOrderType(t)"
                  />
                  {{ t }}
                </label>
              }
            </div>
          </div>
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.code || saving()"
              (click)="save()"
            >
              {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
            </button>
            <button class="btn btn-outline" (click)="showForm.set(false)">
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

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-xs);
      }

      .checkbox-group {
        display: flex;
        flex-wrap: wrap;
        gap: var(--zitro-spacing-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCouponsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected result = signal<PagedResult<CouponDto> | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected showForm = signal(false);

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });
  protected saving = signal(false);
  protected readonly ORDER_TYPES = [
    'dine-in',
    'takeout',
    'delivery',
    'scheduled',
  ];
  protected f = this.emptyForm();

  private emptyForm() {
    return {
      title: '',
      description: '',
      code: '',
      discountType: 'flat',
      discountValue: 0,
      validFrom: '',
      validTo: '',
      minOrderAmount: 0,
      usageLimit: null as number | null,
      cooldownPeriodDays: null as number | null,
      isNewCustomerOnly: false,
      applicableOrderTypes: [] as string[],
    };
  }

  protected toggleOrderType(type: string): void {
    this.f.applicableOrderTypes = this.f.applicableOrderTypes.includes(type)
      ? this.f.applicableOrderTypes.filter((t) => t !== type)
      : [...this.f.applicableOrderTypes, type];
  }

  private toPayload() {
    const today = new Date().toISOString().split('T')[0];
    return {
      ...this.f,
      validFrom: this.f.validFrom
        ? new Date(this.f.validFrom).toISOString()
        : new Date(today).toISOString(),
      validTo: this.f.validTo
        ? new Date(this.f.validTo).toISOString()
        : new Date(today).toISOString(),
      // Empty selection means "all order types" — send null for clarity (the
      // backend's validation treats null and [] identically: no restriction).
      applicableOrderTypes:
        this.f.applicableOrderTypes.length > 0
          ? this.f.applicableOrderTypes
          : null,
      isActive: true,
      isDisplayedForOnlineOrders: true,
    };
  }

  protected readonly columns: DataTableColumn<CouponDto>[] = [
    { key: 'code', labelKey: 'coupons.code' },
    { key: 'discountType', labelKey: 'coupons.type' },
    { key: 'discountValue', labelKey: 'coupons.value' },
    {
      key: 'isActive',
      labelKey: 'coupons.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
    { key: 'usedCount', labelKey: 'coupons.used' },
  ];

  ngOnInit(): void {
    this.fetch();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .listCoupons({
        page: String(this.page()),
        pageSize: String(this.pageSize),
      })
      .subscribe({
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

  protected openCreate(): void {
    this.f = this.emptyForm();
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.api
      .createCoupon(this.toPayload() as Record<string, unknown>)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  protected remove(c: CouponDto): void {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    this.api.deleteCoupon(c.id).subscribe({
      next: () =>
        this.result.update((r) =>
          r ? { ...r, items: r.items.filter((x) => x.id !== c.id) } : r,
        ),
    });
  }

  private load(): void {
    this.page.set(1);
    this.fetch();
  }
}
