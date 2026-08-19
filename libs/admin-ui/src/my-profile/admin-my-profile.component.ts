import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, MyProfileDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'lib-admin-my-profile',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'myProfile.title' | i18n }}</h1>
    </div>
    @if (loading()) {
      <p>{{ 'common.loading' | i18n }}</p>
    } @else if (profile(); as p) {
      <div class="panel">
        <div class="form-grid">
          <span class="form-label">{{ 'admins.name' | i18n }}</span>
          <span>{{ p.name }}</span>
          <span class="form-label">{{ 'admins.email' | i18n }}</span>
          <span>{{ p.email }}</span>
          <span class="form-label">{{ 'admins.role' | i18n }}</span>
          <span>{{ p.role }}</span>
        </div>
      </div>
      <div class="panel">
        <h2 class="panel-title">{{ 'myProfile.changePassword' | i18n }}</h2>
        <div class="form-grid">
          <label for="mp-current" class="form-label">{{
            'myProfile.currentPassword' | i18n
          }}</label>
          <input
            id="mp-current"
            class="input"
            type="password"
            data-testid="my-profile-current-password"
            [(ngModel)]="currentPassword"
          />
          <label for="mp-new" class="form-label">{{
            'myProfile.newPassword' | i18n
          }}</label>
          <input
            id="mp-new"
            class="input"
            type="password"
            data-testid="my-profile-new-password"
            [(ngModel)]="newPassword"
          />
        </div>
        @if (error()) {
          <p class="error-text">{{ error() }}</p>
        }
        @if (success()) {
          <p class="success-text">{{ 'myProfile.changeSuccess' | i18n }}</p>
        }
        <div class="panel-actions">
          <button
            class="btn btn-primary"
            data-testid="my-profile-change-password-btn"
            [disabled]="!currentPassword || newPassword.length < 8 || saving()"
            (click)="changePassword()"
          >
            {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
      .panel {
        max-width: 480px;
        margin-bottom: var(--zitro-spacing-lg);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMyProfileComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected profile = signal<MyProfileDto | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);
  protected error = signal<string | null>(null);
  protected success = signal(false);
  protected currentPassword = '';
  protected newPassword = '';

  ngOnInit(): void {
    this.api.getMyProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected changePassword(): void {
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);
    this.api
      .changeMyPassword(this.currentPassword, this.newPassword)
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.success.set(true);
          this.currentPassword = '';
          this.newPassword = '';
        },
        error: () => {
          this.saving.set(false);
          this.error.set(
            'Failed to change password. Check your current password.',
          );
        },
      });
  }
}
