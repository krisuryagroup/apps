import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, TagDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-tags',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.tags' | i18n }}</h1>
      <button
        class="btn btn-primary"
        data-testid="tag-add-btn"
        (click)="openCreate()"
      >
        + {{ 'tags.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      data-testid="tag-list"
      [columns]="columns"
      [rows]="tags()"
      [loading]="loading()"
    >
      <ng-template #rowActions let-row>
        <button class="btn btn-sm btn-outline" (click)="openEdit(row)">
          {{ 'common.edit' | i18n }}
        </button>
        <button class="btn btn-sm btn-danger" (click)="deactivate(row)">
          {{ 'tags.deactivate' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{ editing() ? ('tags.edit' | i18n) : ('tags.add' | i18n) }}
          </h2>
          <div class="form-grid">
            <label for="tag-name" class="form-label">{{
              'tags.name' | i18n
            }}</label>
            <input id="tag-name" class="input" [(ngModel)]="formName" />
            <label for="tag-priority" class="form-label">{{
              'tags.priority' | i18n
            }}</label>
            <input
              id="tag-priority"
              class="input"
              data-testid="tag-priority-input"
              type="number"
              [(ngModel)]="formPriority"
            />
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
export class AdminTagsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected tags = signal<TagDto[]>([]);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected editing = signal<TagDto | null>(null);
  protected formName = '';
  protected formPriority = 0;
  protected saving = signal(false);

  protected readonly columns: DataTableColumn<TagDto>[] = [
    { key: 'name', labelKey: 'tags.name' },
    { key: 'priority', labelKey: 'tags.priority' },
    {
      key: 'isActive',
      labelKey: 'tags.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.api.listAdminTags().subscribe({
      next: (t) => {
        this.tags.set(t);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formName = '';
    this.formPriority = 0;
    this.showForm.set(true);
  }
  protected openEdit(t: TagDto): void {
    this.editing.set(t);
    this.formName = t.name;
    this.formPriority = t.priority;
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    const req = { name: this.formName, priority: this.formPriority };
    const call$ = this.editing()
      ? this.api.updateTag(this.editing()!.id, req)
      : this.api.createTag(req);
    call$.subscribe({
      next: (saved) => {
        this.tags.update((t) =>
          this.editing()
            ? t.map((x) => (x.id === saved.id ? saved : x))
            : [...t, saved],
        );
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  protected deactivate(t: TagDto): void {
    if (!confirm(`Deactivate "${t.name}"?`)) return;
    this.api.deactivateTag(t.id).subscribe({
      next: () =>
        this.tags.update((tags) =>
          tags.map((x) => (x.id === t.id ? { ...x, isActive: false } : x)),
        ),
    });
  }
}
