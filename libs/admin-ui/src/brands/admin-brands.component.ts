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
  BrandDto,
  BusinessSummaryDto,
  PagedResult,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
} from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-brands',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DataTableComponent,
    ConfirmationDialogComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.brands' | i18n }}</h1>
      <button
        class="btn btn-primary"
        data-testid="brand-add-btn"
        (click)="openCreate()"
      >
        + {{ 'brands.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      data-testid="brand-list"
      [columns]="columns"
      [rows]="result()?.items ?? []"
      [loading]="loading()"
      [error]="error()"
      [pagination]="pagination()"
      [isRowExpanded]="isBrandExpanded"
      (pageChange)="onPageChange($event)"
    >
      <ng-template #rowActions let-row>
        <button
          class="btn btn-sm btn-outline"
          data-testid="brand-view-branches-btn"
          (click)="toggleBranches(row)"
        >
          {{
            expandedBrandId() === row.id
              ? ('brands.hideBranches' | i18n)
              : ('brands.viewBranches' | i18n)
          }}
        </button>
        <button class="btn btn-sm btn-outline" (click)="openEdit(row)">
          {{ 'common.edit' | i18n }}
        </button>
        <button class="btn btn-sm btn-danger" (click)="requestRemove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
      <ng-template #expandedRow let-row>
        <div data-testid="brand-branches-panel">
          @if (branchesLoading()[row.id]) {
            <p class="loading">{{ 'common.loading' | i18n }}</p>
          } @else if ((branchesByBrand()[row.id] ?? []).length === 0) {
            <p class="empty">{{ 'brands.noBranches' | i18n }}</p>
          } @else {
            <table class="brands-branches-table">
              <thead>
                <tr>
                  <th>{{ 'businesses.name' | i18n }}</th>
                  <th>{{ 'businesses.town' | i18n }}</th>
                  <th>{{ 'businesses.active' | i18n }}</th>
                </tr>
              </thead>
              <tbody>
                @for (branch of branchesByBrand()[row.id]; track branch.id) {
                  <tr>
                    <td>{{ branch.name }}</td>
                    <td>{{ branch.town }}</td>
                    <td>{{ branch.isActive ? '✓' : '✗' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </ng-template>
    </lib-data-table>
    <lib-confirmation-dialog
      [isVisible]="!!pendingDelete()"
      [config]="deleteDialogConfig()"
      (confirmed)="confirmRemove()"
      (cancelled)="pendingDelete.set(null)"
    />
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{ editing() ? ('brands.edit' | i18n) : ('brands.add' | i18n) }}
          </h2>
          <div class="form-grid">
            <label for="brand-name" class="form-label">{{
              'brands.name' | i18n
            }}</label>
            <input
              id="brand-name"
              class="input"
              data-testid="brand-name-input"
              [(ngModel)]="formName"
            />
            <label for="brand-desc" class="form-label">{{
              'brands.description' | i18n
            }}</label>
            <input id="brand-desc" class="input" [(ngModel)]="formDesc" />
          </div>
          @if (saveError()) {
            <p class="error-text">{{ 'common.error' | i18n }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!formName || saving()"
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

      .brands-branches-table {
        width: 100%;
        border-collapse: collapse;

        th {
          text-align: left;
          font-size: var(--zitro-font-size-sm);
          color: var(--zitro-on-surface-variant);
          padding: var(--zitro-spacing-xs) var(--zitro-spacing-sm);
        }

        td {
          padding: var(--zitro-spacing-xs) var(--zitro-spacing-sm);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrandsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly i18n = inject(I18nService);
  protected result = signal<PagedResult<BrandDto> | null>(null);
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
  protected editing = signal<BrandDto | null>(null);
  protected formName = '';
  protected formDesc = '';
  protected saving = signal(false);
  protected saveError = signal(false);

  protected expandedBrandId = signal<string | null>(null);
  protected branchesByBrand = signal<
    Record<string, BusinessSummaryDto[] | undefined>
  >({});
  protected branchesLoading = signal<Record<string, boolean>>({});

  /** Arrow field (not a method) so `this` stays bound when passed as [isRowExpanded]. */
  protected isBrandExpanded = (row: BrandDto): boolean =>
    row.id === this.expandedBrandId();

  protected readonly columns: DataTableColumn<BrandDto>[] = [
    { key: 'name', labelKey: 'brands.name' },
    {
      key: 'description',
      labelKey: 'brands.description',
      format: (r) => r.description ?? '—',
    },
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
      .listBrands({
        page: String(this.page()),
        pageSize: String(this.pageSize),
      })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formName = '';
    this.formDesc = '';
    this.showForm.set(true);
  }

  protected openEdit(brand: BrandDto): void {
    this.editing.set(brand);
    this.formName = brand.name;
    this.formDesc = brand.description ?? '';
    this.showForm.set(true);
  }

  protected toggleBranches(brand: BrandDto): void {
    if (this.expandedBrandId() === brand.id) {
      this.expandedBrandId.set(null);
      return;
    }
    this.expandedBrandId.set(brand.id);
    if (this.branchesByBrand()[brand.id]) return;
    this.branchesLoading.update((m) => ({ ...m, [brand.id]: true }));
    this.api.getBrandBranches(brand.id).subscribe({
      next: (branches) => {
        this.branchesByBrand.update((m) => ({ ...m, [brand.id]: branches }));
        this.branchesLoading.update((m) => ({ ...m, [brand.id]: false }));
      },
      error: () => {
        this.branchesByBrand.update((m) => ({ ...m, [brand.id]: [] }));
        this.branchesLoading.update((m) => ({ ...m, [brand.id]: false }));
      },
    });
  }

  protected pendingDelete = signal<BrandDto | null>(null);
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

  protected requestRemove(brand: BrandDto): void {
    this.pendingDelete.set(brand);
  }

  protected confirmRemove(): void {
    const brand = this.pendingDelete();
    if (!brand) return;
    this.pendingDelete.set(null);
    this.api.deleteBrand(brand.id).subscribe({
      next: () =>
        this.result.update((r) =>
          r ? { ...r, items: r.items.filter((x) => x.id !== brand.id) } : r,
        ),
    });
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(false);
    const req = { name: this.formName, description: this.formDesc };
    const call$ = this.editing()
      ? this.api.updateBrand(this.editing()!.id, req)
      : this.api.createBrand(req);
    call$.subscribe({
      next: (saved) => {
        this.result.update((r) =>
          r
            ? {
                ...r,
                items: this.editing()
                  ? r.items.map((x) => (x.id === saved.id ? saved : x))
                  : [...r.items, saved],
              }
            : r,
        );
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }
}
