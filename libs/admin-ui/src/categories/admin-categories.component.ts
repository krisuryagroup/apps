import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, CategoryDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-categories',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.categories' | i18n }}</h1>
      <button
        class="btn btn-primary"
        data-testid="category-add-btn"
        (click)="openCreate()"
      >
        + {{ 'categories.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      data-testid="category-tree"
      [columns]="columns"
      [rows]="categories()"
      [loading]="loading()"
    />
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'categories.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="cat-name" class="form-label">{{
              'categories.name' | i18n
            }}</label>
            <input id="cat-name" class="input" [(ngModel)]="formName" />
            <label for="cat-parent" class="form-label">{{
              'categories.parent' | i18n
            }}</label>
            <select
              id="cat-parent"
              class="select"
              data-testid="category-parent-select"
              [(ngModel)]="formParentId"
            >
              <option value="">{{ 'categories.noParent' | i18n }}</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.path }}</option>
              }
            </select>
          </div>
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
export class AdminCategoriesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected categories = signal<CategoryDto[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected formName = '';
  protected formParentId = '';
  protected saving = signal(false);

  protected readonly columns: DataTableColumn<CategoryDto>[] = [
    { key: 'name', labelKey: 'categories.name' },
    { key: 'path', labelKey: 'categories.path' },
    { key: 'displayOrder', labelKey: 'categories.order' },
  ];

  ngOnInit(): void {
    this.api.listCategories().subscribe({
      next: (c) => {
        this.categories.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected openCreate(): void {
    this.formName = '';
    this.formParentId = '';
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    const req: Record<string, unknown> = { name: this.formName };
    if (this.formParentId) req['parentId'] = this.formParentId;
    this.api.createCategory(req).subscribe({
      next: (c) => {
        this.categories.update((cs) => [...cs, c]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
