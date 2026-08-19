import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BusinessSummaryDto,
  TagBusinessDto,
  TagDto,
} from '@zitro/services';
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
      [error]="error()"
      [isRowExpanded]="isTagExpanded"
    >
      <ng-template #rowActions let-row>
        <button
          class="btn btn-sm btn-outline"
          data-testid="tag-manage-businesses-btn"
          (click)="toggleBusinesses(row)"
        >
          {{
            expandedTagId() === row.id
              ? ('tags.hideBusinesses' | i18n)
              : ('tags.manageBusinesses' | i18n)
          }}
        </button>
        <button class="btn btn-sm btn-outline" (click)="openEdit(row)">
          {{ 'common.edit' | i18n }}
        </button>
        <button class="btn btn-sm btn-danger" (click)="deactivate(row)">
          {{ 'tags.deactivate' | i18n }}
        </button>
      </ng-template>
      <ng-template #expandedRow let-row>
        <div class="tag-businesses-panel">
          <div class="tag-businesses-add">
            <select
              class="select"
              data-testid="tag-assign-business-select"
              [(ngModel)]="addBusinessId"
              [disabled]="businessesLoading()[row.id]"
            >
              <option value="">{{ 'tags.selectBusinessToAdd' | i18n }}</option>
              @for (b of assignableBusinesses(row.id); track b.id) {
                <option [value]="b.id">{{ b.name }}</option>
              }
            </select>
            <button
              class="btn btn-sm btn-primary"
              [disabled]="!addBusinessId"
              (click)="addBusiness(row)"
            >
              {{ 'tags.addBusiness' | i18n }}
            </button>
          </div>
          @if (businessesLoading()[row.id]) {
            <p class="loading">{{ 'common.loading' | i18n }}</p>
          } @else if ((businessesByTag()[row.id] ?? []).length === 0) {
            <p class="empty">{{ 'tags.noBusinessesAssigned' | i18n }}</p>
          } @else {
            <ul class="tag-businesses-list">
              @for (b of businessesByTag()[row.id]; track b.id) {
                <li>
                  <span>{{ b.name }}</span>
                  <button
                    class="btn btn-sm btn-danger"
                    (click)="removeBusiness(row, b)"
                  >
                    {{ 'common.remove' | i18n }}
                  </button>
                </li>
              }
            </ul>
          }
        </div>
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

      .tag-businesses-panel {
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-sm);
      }

      .tag-businesses-add {
        display: flex;
        gap: var(--zitro-spacing-sm);
      }

      .tag-businesses-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-xs);

        li {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--zitro-surface);
          padding: var(--zitro-spacing-xs) var(--zitro-spacing-sm);
          border-radius: var(--zitro-radius-sm);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTagsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected tags = signal<TagDto[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected showForm = signal(false);
  protected editing = signal<TagDto | null>(null);
  protected formName = '';
  protected formPriority = 0;
  protected saving = signal(false);

  protected businesses = signal<BusinessSummaryDto[]>([]);
  protected expandedTagId = signal<string | null>(null);
  protected businessesByTag = signal<
    Record<string, TagBusinessDto[] | undefined>
  >({});
  protected businessesLoading = signal<Record<string, boolean>>({});
  protected addBusinessId = '';

  /** Arrow field (not a method) so `this` stays bound when passed as [isRowExpanded]. */
  protected isTagExpanded = (row: TagDto): boolean =>
    row.id === this.expandedTagId();

  protected assignableBusinesses(tagId: string): BusinessSummaryDto[] {
    const assignedIds = new Set(
      (this.businessesByTag()[tagId] ?? []).map((b) => b.id),
    );
    return this.businesses().filter((b) => !assignedIds.has(b.id));
  }

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
    this.loading.set(true);
    this.error.set(false);
    this.api.listAdminTags().subscribe({
      next: (t) => {
        this.tags.set(t);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
    this.api.listBusinesses({ pageSize: '200' }).subscribe({
      next: (r) => this.businesses.set(r.items),
      error: () => undefined,
    });
  }

  protected toggleBusinesses(tag: TagDto): void {
    this.addBusinessId = '';
    if (this.expandedTagId() === tag.id) {
      this.expandedTagId.set(null);
      return;
    }
    this.expandedTagId.set(tag.id);
    this.loadTagBusinesses(tag.id);
  }

  private loadTagBusinesses(tagId: string): void {
    this.businessesLoading.update((m) => ({ ...m, [tagId]: true }));
    this.api.listTagBusinesses(tagId).subscribe({
      next: (businesses) => {
        this.businessesByTag.update((m) => ({ ...m, [tagId]: businesses }));
        this.businessesLoading.update((m) => ({ ...m, [tagId]: false }));
      },
      error: () => {
        this.businessesByTag.update((m) => ({ ...m, [tagId]: [] }));
        this.businessesLoading.update((m) => ({ ...m, [tagId]: false }));
      },
    });
  }

  protected addBusiness(tag: TagDto): void {
    if (!this.addBusinessId) return;
    this.api.addBusinessTag(this.addBusinessId, tag.id).subscribe({
      next: () => {
        this.addBusinessId = '';
        this.loadTagBusinesses(tag.id);
      },
    });
  }

  protected removeBusiness(tag: TagDto, business: TagBusinessDto): void {
    this.api.removeBusinessTag(business.id, tag.id).subscribe({
      next: () => this.loadTagBusinesses(tag.id),
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
