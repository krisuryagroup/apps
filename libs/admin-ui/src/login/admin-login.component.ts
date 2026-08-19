import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApiService } from '@zitro/services';
import { AdminAuthTokenService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { FormFieldComponent } from '../form-field/form-field.component';

/**
 * Shared login page for zitro-admin and zitro-superadmin.
 * Both apps use the same endpoint (POST /api/admin/auth/login) and Admin JWT.
 * On success: stores the JWT and navigates to /dashboard.
 */
@Component({
  selector: 'lib-admin-login',
  standalone: true,
  imports: [FormsModule, FormFieldComponent, I18nPipe],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly tokenService = inject(AdminAuthTokenService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected loading = signal(false);
  protected errorKey = signal<string | null>(null);

  protected submit(): void {
    if (!this.email || !this.password || this.loading()) return;

    this.errorKey.set(null);
    this.loading.set(true);

    this.adminApi
      .login({ email: this.email, password: this.password })
      .subscribe({
        next: (res) => {
          this.tokenService.setToken(res.token);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          const code: string = err?.error?.errorCode ?? '';
          if (code === 'ACCOUNT_DEACTIVATED') {
            this.errorKey.set('login.errorDeactivated');
          } else {
            this.errorKey.set('login.errorInvalidCredentials');
          }
        },
      });
  }
}
