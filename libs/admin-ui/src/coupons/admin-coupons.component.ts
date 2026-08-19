import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CouponDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
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
      [rows]="coupons()"
      [loading]="loading()"
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCouponsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected coupons = signal<CouponDto[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected f = {
    title: '',
    description: '',
    code: '',
    discountType: 'flat',
    discountValue: 0,
    validFrom: '',
    validTo: '',
  };

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
      minOrderAmount: 0,
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
    this.api.listCoupons().subscribe({
      next: (res) => {
        this.coupons.set(
          (res as unknown as PagedResult<CouponDto>).items ??
            (res as unknown as CouponDto[]),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void {
    this.f = {
      title: '',
      description: '',
      code: '',
      discountType: 'flat',
      discountValue: 0,
      validFrom: '',
      validTo: '',
    };
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.api
      .createCoupon(this.toPayload() as Record<string, unknown>)
      .subscribe({
        next: (c) => {
          this.coupons.update((cs) => [...cs, c]);
          this.saving.set(false);
          this.showForm.set(false);
        },
        error: () => this.saving.set(false),
      });
  }

  protected remove(c: CouponDto): void {
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    this.api.deleteCoupon(c.id).subscribe({
      next: () => this.coupons.update((cs) => cs.filter((x) => x.id !== c.id)),
    });
  }
}
