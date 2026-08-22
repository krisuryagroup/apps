import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BranchDto,
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
    RouterLink,
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
        <button
          class="btn btn-sm btn-outline"
          data-testid="brand-add-branch-btn"
          (click)="addBranch(row)"
        >
          {{ 'brands.addBranch' | i18n }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          data-testid="brand-link-branch-btn"
          (click)="openLinkPicker(row)"
        >
          {{ 'brands.linkExisting' | i18n }}
        </button>
        <button class="btn btn-sm btn-outline" (click)="openEdit(row)">
          {{ 'common.edit' | i18n }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          data-testid="brand-toggle-active-btn"
          [disabled]="togglingBrand()[row.id]"
          (click)="toggleBrandActive(row)"
        >
          {{
            row.isActive
              ? ('businesses.deactivate' | i18n)
              : ('businesses.activate' | i18n)
          }}
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
                  <th>{{ 'businesses.menuMode' | i18n }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (branch of branchesByBrand()[row.id]; track branch.id) {
                  <tr>
                    <td>{{ branch.name }}</td>
                    <td>{{ branch.town }}</td>
                    <td>{{ branch.isActive ? '✓' : '✗' }}</td>
                    <td>{{ branch.menuMode }}</td>
                    <td class="branch-actions">
                      @if (branch.menuMode === 'independent') {
                        <button
                          class="btn btn-sm btn-outline"
                          data-testid="branch-promote-btn"
                          [disabled]="promoting()[branch.id]"
                          (click)="requestPromote(branch)"
                        >
                          {{ 'brands.promote' | i18n }}
                        </button>
                      }
                      <a
                        class="btn btn-sm btn-outline"
                        [routerLink]="['/businesses', branch.id, 'edit']"
                      >
                        {{ 'common.edit' | i18n }}
                      </a>
                      <button
                        class="btn btn-sm btn-outline"
                        data-testid="branch-toggle-active-btn"
                        [disabled]="togglingBranch()[branch.id]"
                        (click)="toggleBranchActive(row.id, branch)"
                      >
                        {{
                          branch.isActive
                            ? ('businesses.deactivate' | i18n)
                            : ('businesses.activate' | i18n)
                        }}
                      </button>
                      <button
                        class="btn btn-sm btn-danger"
                        data-testid="branch-delete-btn"
                        (click)="requestRemoveBranch(row.id, branch)"
                      >
                        {{ 'common.delete' | i18n }}
                      </button>
                    </td>
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
    <lib-confirmation-dialog
      [isVisible]="!!pendingPromote()"
      [config]="promoteDialogConfig()"
      (confirmed)="confirmPromote()"
      (cancelled)="pendingPromote.set(null)"
    />
    <lib-confirmation-dialog
      [isVisible]="!!pendingDeleteBranch()"
      [config]="deleteBranchDialogConfig()"
      (confirmed)="confirmRemoveBranch()"
      (cancelled)="pendingDeleteBranch.set(null)"
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
    @if (linkPickerBrand(); as linkBrand) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{
              i18n.translate('brands.linkExistingTitle', {
                name: linkBrand.name,
              })
            }}
          </h2>
          <input
            class="input"
            data-testid="brand-link-search-input"
            [(ngModel)]="linkSearch"
            (ngModelChange)="onLinkSearchChange()"
            placeholder="{{ 'brands.searchBusinessPlaceholder' | i18n }}"
          />
          @if (linkSearching()) {
            <p class="loading">{{ 'common.loading' | i18n }}</p>
          } @else if (linkResults().length === 0) {
            <p class="empty">{{ 'brands.noSearchResults' | i18n }}</p>
          } @else {
            <table class="brands-branches-table">
              <tbody>
                @for (biz of linkResults(); track biz.id) {
                  <tr>
                    <td>{{ biz.name }}</td>
                    <td>{{ biz.town }}</td>
                    <td>
                      @if (biz.brandId === linkBrand.id) {
                        <span class="empty">{{
                          'brands.alreadyLinked' | i18n
                        }}</span>
                      } @else {
                        <button
                          class="btn btn-sm btn-primary"
                          data-testid="brand-link-confirm-btn"
                          [disabled]="linking()[biz.id]"
                          (click)="confirmLink(linkBrand, biz)"
                        >
                          {{ 'brands.link' | i18n }}
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
          <div class="panel-actions">
            <button class="btn btn-outline" (click)="closeLinkPicker()">
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

      .branch-actions {
        display: flex;
        gap: var(--zitro-spacing-xs);
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrandsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
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
  protected branchesByBrand = signal<Record<string, BranchDto[] | undefined>>(
    {},
  );
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
    {
      key: 'isActive',
      labelKey: 'businesses.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
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
    this.loadBranches(brand.id);
  }

  private loadBranches(brandId: string): void {
    this.branchesLoading.update((m) => ({ ...m, [brandId]: true }));
    this.api.getBrandBranches(brandId).subscribe({
      next: (branches) => {
        this.branchesByBrand.update((m) => ({ ...m, [brandId]: branches }));
        this.branchesLoading.update((m) => ({ ...m, [brandId]: false }));
      },
      error: () => {
        this.branchesByBrand.update((m) => ({ ...m, [brandId]: [] }));
        this.branchesLoading.update((m) => ({ ...m, [brandId]: false }));
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

  /** Jumps to the business-create flow with this brand pre-selected. */
  protected addBranch(brand: BrandDto): void {
    this.router.navigate(['/businesses'], {
      queryParams: { brandId: brand.id },
    });
  }

  protected promoting = signal<Record<string, boolean>>({});
  protected pendingPromote = signal<BranchDto | null>(null);
  protected promoteDialogConfig = computed<ConfirmationDialogConfig>(() => ({
    title: this.i18n.translate('businesses.promoteConfirmTitle'),
    message: this.i18n.translate('businesses.promoteConfirmMessage'),
    confirmLabel: this.i18n.translate('businesses.promoteToBrandMaster'),
    cancelLabel: this.i18n.translate('common.cancel'),
    destructive: true,
    closeOnBackdropClick: true,
  }));

  protected requestPromote(branch: BranchDto): void {
    this.pendingPromote.set(branch);
  }

  protected confirmPromote(): void {
    const branch = this.pendingPromote();
    const brandId = this.expandedBrandId();
    if (!branch || !brandId) return;
    this.pendingPromote.set(null);
    this.promoting.update((m) => ({ ...m, [branch.id]: true }));
    this.api.promoteBranchToBrandMaster(branch.id).subscribe({
      next: () => {
        this.promoting.update((m) => ({ ...m, [branch.id]: false }));
        // Re-fetch so the branches table reflects the new menuMode.
        this.loadBranches(brandId);
      },
      error: () => {
        this.promoting.update((m) => ({ ...m, [branch.id]: false }));
      },
    });
  }

  // ── Brand active/inactive toggle ─────────────────────────────────────────
  protected togglingBrand = signal<Record<string, boolean>>({});

  protected toggleBrandActive(brand: BrandDto): void {
    this.togglingBrand.update((m) => ({ ...m, [brand.id]: true }));
    this.api.updateBrand(brand.id, { isActive: !brand.isActive }).subscribe({
      next: (saved) => {
        this.togglingBrand.update((m) => ({ ...m, [brand.id]: false }));
        this.result.update((r) =>
          r
            ? {
                ...r,
                items: r.items.map((x) => (x.id === saved.id ? saved : x)),
              }
            : r,
        );
      },
      error: () => {
        this.togglingBrand.update((m) => ({ ...m, [brand.id]: false }));
      },
    });
  }

  // ── Branch active/inactive toggle ────────────────────────────────────────
  protected togglingBranch = signal<Record<string, boolean>>({});

  protected toggleBranchActive(brandId: string, branch: BranchDto): void {
    this.togglingBranch.update((m) => ({ ...m, [branch.id]: true }));
    this.api
      .updateBusiness(branch.id, { isActive: !branch.isActive })
      .subscribe({
        next: () => {
          this.togglingBranch.update((m) => ({ ...m, [branch.id]: false }));
          this.loadBranches(brandId);
        },
        error: () => {
          this.togglingBranch.update((m) => ({ ...m, [branch.id]: false }));
        },
      });
  }

  // ── Delete branch ────────────────────────────────────────────────────────
  protected pendingDeleteBranch = signal<{
    brandId: string;
    branch: BranchDto;
  } | null>(null);
  protected deleteBranchDialogConfig = computed<ConfirmationDialogConfig>(
    () => ({
      title: this.i18n.translate('common.confirmDeleteTitle'),
      message: this.i18n.translate('common.confirmDeleteMessage', {
        name: this.pendingDeleteBranch()?.branch.name ?? '',
      }),
      confirmLabel: this.i18n.translate('common.delete'),
      cancelLabel: this.i18n.translate('common.cancel'),
      destructive: true,
      closeOnBackdropClick: true,
    }),
  );

  protected requestRemoveBranch(brandId: string, branch: BranchDto): void {
    this.pendingDeleteBranch.set({ brandId, branch });
  }

  protected confirmRemoveBranch(): void {
    const pending = this.pendingDeleteBranch();
    if (!pending) return;
    this.pendingDeleteBranch.set(null);
    this.api.deleteBusiness(pending.branch.id).subscribe({
      next: () => this.loadBranches(pending.brandId),
    });
  }

  // ── Link an existing business to this brand ─────────────────────────────
  protected linkPickerBrand = signal<BrandDto | null>(null);
  protected linkSearch = '';
  protected linkSearching = signal(false);
  protected linkResults = signal<BusinessSummaryDto[]>([]);
  protected linking = signal<Record<string, boolean>>({});

  protected openLinkPicker(brand: BrandDto): void {
    this.linkPickerBrand.set(brand);
    this.linkSearch = '';
    this.linkResults.set([]);
  }

  protected closeLinkPicker(): void {
    this.linkPickerBrand.set(null);
  }

  protected onLinkSearchChange(): void {
    const search = this.linkSearch.trim();
    if (!search) {
      this.linkResults.set([]);
      return;
    }
    this.linkSearching.set(true);
    this.api.listBusinesses({ search, pageSize: '10' }).subscribe({
      next: (res) => {
        this.linkResults.set(res.items);
        this.linkSearching.set(false);
      },
      error: () => {
        this.linkResults.set([]);
        this.linkSearching.set(false);
      },
    });
  }

  protected confirmLink(brand: BrandDto, biz: BusinessSummaryDto): void {
    this.linking.update((m) => ({ ...m, [biz.id]: true }));
    this.api.updateBusiness(biz.id, { brandId: brand.id }).subscribe({
      next: () => {
        this.linking.update((m) => ({ ...m, [biz.id]: false }));
        this.linkResults.update((items) =>
          items.map((x) => (x.id === biz.id ? { ...x, brandId: brand.id } : x)),
        );
        this.loadBranches(brand.id);
      },
      error: () => {
        this.linking.update((m) => ({ ...m, [biz.id]: false }));
      },
    });
  }
}
