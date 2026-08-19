import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BusinessApiService, BusinessAuthTokenService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-login',
  standalone: true,
  imports: [FormsModule, RouterLink, I18nPipe],
  template: `
    <div class="login-page">
      <div class="login-card">
        <h1 class="login-title">{{ 'app.restaurantName' | i18n }}</h1>
        <form (ngSubmit)="submit()" novalidate>
          <div class="form-group">
            <label for="phone" class="form-label">{{
              'restaurant.login.phone' | i18n
            }}</label>
            <input
              id="phone"
              data-testid="phone-input"
              class="input"
              type="tel"
              [(ngModel)]="phone"
              name="phone"
              required
              autocomplete="tel"
            />
          </div>
          <div class="form-group">
            <label for="password" class="form-label">{{
              'restaurant.login.password' | i18n
            }}</label>
            <input
              id="password"
              data-testid="password-input"
              class="input"
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              autocomplete="current-password"
            />
          </div>
          @if (errorKey()) {
            <p data-testid="error-message" class="error-text" role="alert">
              {{ errorKey()! | i18n }}
            </p>
          }
          <button
            data-testid="login-btn"
            class="btn btn-primary full-width"
            type="submit"
            [disabled]="loading() || !phone || !password"
          >
            {{
              loading()
                ? ('common.loading' | i18n)
                : ('restaurant.login.signIn' | i18n)
            }}
          </button>
        </form>
        <p class="apply-link">
          {{ 'restaurant.login.noAccount' | i18n }}
          <a data-testid="apply-link" routerLink="/apply">{{
            'restaurant.login.apply' | i18n
          }}</a>
        </p>
      </div>
    </div>
  `,
  styles: `
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--zitro-surface-variant);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: var(--zitro-spacing-xl);
      background: var(--zitro-surface);
      border-radius: var(--zitro-radius-lg);
      box-shadow: var(--zitro-shadow-card);
    }
    .login-title {
      font-size: var(--zitro-font-size-xl);
      font-weight: 700;
      color: var(--zitro-primary);
      text-align: center;
      margin: 0 0 var(--zitro-spacing-xl);
    }
    .form-group {
      margin-bottom: var(--zitro-spacing-md);
    }
    .form-label {
      display: block;
      font-size: var(--zitro-font-size-sm);
      font-weight: 500;
      margin-bottom: var(--zitro-spacing-xs);
    }
    .input {
      width: 100%;
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-md);
      border: 1px solid var(--zitro-divider);
      border-radius: var(--zitro-radius-md);
      font-size: var(--zitro-font-size-md);
      box-sizing: border-box;
      background: var(--zitro-surface);
      color: var(--zitro-on-surface);
      &:focus {
        outline: none;
        border-color: var(--zitro-primary);
      }
    }
    .btn {
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-lg);
      border: none;
      border-radius: var(--zitro-radius-md);
      font-size: var(--zitro-font-size-md);
      font-weight: 500;
      cursor: pointer;
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    .btn-primary {
      background: var(--zitro-primary);
      color: #ffffff;
    }
    .full-width {
      width: 100%;
      margin-top: var(--zitro-spacing-md);
    }
    .error-text {
      color: var(--zitro-error);
      font-size: var(--zitro-font-size-sm);
      margin-bottom: var(--zitro-spacing-sm);
    }
    .apply-link {
      text-align: center;
      margin-top: var(--zitro-spacing-lg);
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
      a {
        color: var(--zitro-primary);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantLoginComponent {
  private readonly api = inject(BusinessApiService);
  private readonly tokenService = inject(BusinessAuthTokenService);
  private readonly router = inject(Router);

  protected phone = '';
  protected password = '';
  protected loading = signal(false);
  protected errorKey = signal<string | null>(null);

  protected submit(): void {
    if (!this.phone || !this.password || this.loading()) return;
    this.loading.set(true);
    this.errorKey.set(null);

    this.api.login(this.phone, this.password).subscribe({
      next: (res) => {
        this.tokenService.setToken(res.token);
        // Route based on onboarding status — we'll need to fetch profile briefly
        // For now, route to dashboard (guard will redirect to onboarding if needed)
        this.router.navigate(['/dashboard']);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const code: string = err?.error?.errorCode ?? '';
        if (code === 'ACCOUNT_DEACTIVATED') {
          this.errorKey.set('restaurant.login.errorDeactivated');
        } else {
          this.errorKey.set('restaurant.login.errorInvalidCredentials');
        }
      },
    });
  }
}
