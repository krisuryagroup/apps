import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
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
 *
 * `appTitle` is bound from the route's `data.appTitle` (see each app's
 * app.routes.ts — requires `withComponentInputBinding()` on provideRouter)
 * so each app shows its own name without forking this component.
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

  protected appTitle = input('ZITRO Admin');

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
          // A guard rejecting this account (e.g. zitro-superadmin's superAdminOnlyGuard)
          // redirects to a UrlTree, which the Router treats as a successful navigation —
          // this.router.navigate() resolves `true` either way. Checking the settled URL
          // is what actually tells success apart from a silent guard bounce; without it
          // the button was left stuck on "Signing in..." forever with no explanation.
          this.router.navigate(['/dashboard']).then(() => {
            if (this.router.url.startsWith('/login')) {
              this.loading.set(false);
              this.errorKey.set('login.errorNotAuthorized');
            }
          });
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
