import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AdminUserDto, PagedResult } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-admin-users',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.admins' | i18n }}</h1>
      <button
        class="btn btn-primary"
        [disabled]="!canWrite()"
        [title]="!canWrite() ? ('admins.noWritePermission' | i18n) : ''"
        (click)="openCreate()"
      >
        + {{ 'admins.add' | i18n }}
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
        <button
          class="btn btn-sm btn-danger"
          [disabled]="!canWrite()"
          [title]="!canWrite() ? ('admins.noWritePermission' | i18n) : ''"
          (click)="toggleStatus(row)"
        >
          {{
            row.isActive
              ? ('admins.deactivate' | i18n)
              : ('admins.activate' | i18n)
          }}
        </button>
        <button
          class="btn btn-sm btn-outline"
          data-testid="admin-reset-password-btn"
          [disabled]="!canWrite()"
          [title]="!canWrite() ? ('admins.noWritePermission' | i18n) : ''"
          (click)="openResetPassword(row)"
        >
          {{ 'admins.resetPassword' | i18n }}
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
              [disabled]="
                !f.name || !f.email || !f.password || saving() || !canWrite()
              "
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
    @if (resetPasswordTarget(); as target) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">
            {{ 'admins.resetPassword' | i18n }} — {{ target.name }}
          </h2>
          <div class="form-grid">
            <label for="adm-reset-pass" class="form-label">{{
              'admins.newPassword' | i18n
            }}</label>
            <input
              id="adm-reset-pass"
              class="input"
              type="password"
              data-testid="admin-reset-password-input"
              [(ngModel)]="resetPasswordValue"
            />
          </div>
          @if (resetPasswordError()) {
            <p class="error-text">{{ resetPasswordError() }}</p>
          }
          @if (resetPasswordSuccess()) {
            <p class="success-text">
              {{ 'admins.resetPasswordSuccess' | i18n }}
            </p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              data-testid="admin-reset-password-confirm-btn"
              [disabled]="
                !resetPasswordValue ||
                resetPasswordValue.length < 8 ||
                resetPasswordSaving() ||
                !canWrite()
              "
              (click)="confirmResetPassword(target)"
            >
              {{
                resetPasswordSaving()
                  ? ('common.saving' | i18n)
                  : ('common.save' | i18n)
              }}
            </button>
            <button
              class="btn btn-outline"
              (click)="resetPasswordTarget.set(null)"
            >
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
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected showForm = signal(false);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected f = { name: '', email: '', password: '', role: 'Ops' };
  protected resetPasswordTarget = signal<AdminUserDto | null>(null);
  protected resetPasswordValue = '';
  protected resetPasswordSaving = signal(false);
  protected resetPasswordError = signal<string | null>(null);
  protected resetPasswordSuccess = signal(false);

  /** Matches the backend's [RequirePermission("admins:write")] on create/activate/deactivate/reset-password. */
  protected canWrite = computed(() => this.api.hasPermission('admins:write'));

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

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });

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
      .listAdmins({
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
            : { items: [a], totalCount: 1, page: 1, pageSize: 20 },
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

  protected openResetPassword(a: AdminUserDto): void {
    this.resetPasswordTarget.set(a);
    this.resetPasswordValue = '';
    this.resetPasswordError.set(null);
    this.resetPasswordSuccess.set(false);
  }

  protected confirmResetPassword(a: AdminUserDto): void {
    this.resetPasswordSaving.set(true);
    this.resetPasswordError.set(null);
    this.api.resetAdminPassword(a.id, this.resetPasswordValue).subscribe({
      next: () => {
        this.resetPasswordSaving.set(false);
        this.resetPasswordSuccess.set(true);
      },
      error: () => {
        this.resetPasswordSaving.set(false);
        this.resetPasswordError.set('Failed to reset password.');
      },
    });
  }
}
