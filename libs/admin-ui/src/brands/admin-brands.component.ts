import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, BrandDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-brands',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
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
      (pageChange)="onPageChange($event)"
    >
      <ng-template #rowActions let-row>
        <button class="btn btn-sm btn-outline" (click)="openEdit(row)">
          {{ 'common.edit' | i18n }}
        </button>
        <button class="btn btn-sm btn-danger" (click)="remove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrandsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
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

  protected remove(brand: BrandDto): void {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
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
