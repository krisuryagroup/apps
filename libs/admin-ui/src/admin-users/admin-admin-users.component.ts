import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AdminUserDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-admin-users',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.admins' | i18n }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">
        + {{ 'admins.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      [columns]="columns"
      [rows]="result()?.items ?? []"
      [loading]="loading()"
    >
      <ng-template #rowActions let-row>
        <button class="btn btn-sm btn-danger" (click)="toggleStatus(row)">
          {{
            row.isActive
              ? ('admins.deactivate' | i18n)
              : ('admins.activate' | i18n)
          }}
        </button>
      </ng-template>
    </lib-data-table>
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'admins.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="adm-name" class="form-label">{{
              'admins.name' | i18n
            }}</label>
            <input id="adm-name" class="input" [(ngModel)]="f.name" />
            <label for="adm-email" class="form-label">{{
              'admins.email' | i18n
            }}</label>
            <input
              id="adm-email"
              class="input"
              type="email"
              [(ngModel)]="f.email"
            />
            <label for="adm-pass" class="form-label">{{
              'admins.password' | i18n
            }}</label>
            <input
              id="adm-pass"
              class="input"
              type="password"
              [(ngModel)]="f.password"
            />
            <label for="adm-role" class="form-label">{{
              'admins.role' | i18n
            }}</label>
            <select id="adm-role" class="select" [(ngModel)]="f.role">
              <option value="SuperAdmin">SuperAdmin</option>
              <option value="Ops">Ops</option>
              <option value="Support">Support</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
          @if (saveError()) {
            <p class="error-text">{{ saveError() }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.name || !f.email || !f.password || saving()"
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
export class AdminAdminUsersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected result = signal<PagedResult<AdminUserDto> | null>(null);
  protected loading = signal(true);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected f = { name: '', email: '', password: '', role: 'Ops' };

  protected readonly columns: DataTableColumn<AdminUserDto>[] = [
    { key: 'name', labelKey: 'admins.name' },
    { key: 'email', labelKey: 'admins.email' },
    { key: 'role', labelKey: 'admins.role' },
    {
      key: 'isActive',
      labelKey: 'admins.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
    {
      key: 'lastLoginAt',
      labelKey: 'admins.lastLogin',
      format: (r) =>
        r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString() : '—',
    },
  ];

  ngOnInit(): void {
    this.api.listAdmins().subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected openCreate(): void {
    this.f = { name: '', email: '', password: '', role: 'Ops' };
    this.saveError.set(null);
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.api.createAdmin({ ...this.f, permissions: [] }).subscribe({
      next: (a) => {
        this.result.update((r) =>
          r
            ? { ...r, items: [...r.items, a] }
            : { items: [a], total: 1, page: 1, pageSize: 20 },
        );
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to create admin.');
      },
    });
  }

  protected toggleStatus(a: AdminUserDto): void {
    this.api.setAdminStatus(a.id, !a.isActive).subscribe({
      next: () =>
        this.result.update((r) =>
          r
            ? {
                ...r,
                items: r.items.map((x) =>
                  x.id === a.id ? { ...x, isActive: !x.isActive } : x,
                ),
              }
            : r,
        ),
    });
  }
}
