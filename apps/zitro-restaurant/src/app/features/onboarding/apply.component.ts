import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BusinessApiService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

type Step = 'business' | 'address' | 'account' | 'otp' | 'success';

@Component({
  selector: 'app-restaurant-apply',
  standalone: true,
  imports: [FormsModule, I18nPipe, RouterLink],
  template: `
    <div class="apply-page">
      <div class="apply-card">
        <h1 class="apply-title">{{ 'restaurant.apply.title' | i18n }}</h1>
        <p class="apply-subtitle">{{ 'restaurant.apply.subtitle' | i18n }}</p>

        @if (step() === 'success') {
          <div data-testid="apply-success" class="success-box">
            <p class="success-icon">✅</p>
            <h2>{{ 'restaurant.apply.successTitle' | i18n }}</h2>
            <p>{{ 'restaurant.apply.successMessage' | i18n }}</p>
            <a class="btn btn-primary" routerLink="/login">{{
              'restaurant.login.signIn' | i18n
            }}</a>
          </div>
        } @else {
          <div class="step-indicator">
            <span [class.active]="step() === 'business'">1</span>
            <span [class.active]="step() === 'address'">2</span>
            <span [class.active]="step() === 'account'">3</span>
            <span [class.active]="step() === 'otp'">4</span>
          </div>

          @if (step() === 'business') {
            <div class="form-group">
              <label for="biz-name" class="form-label">{{
                'businesses.name' | i18n
              }}</label>
              <input
                id="biz-name"
                class="input"
                data-testid="apply-business-name"
                [(ngModel)]="f.name"
              />
              <label for="biz-type" class="form-label">{{
                'businesses.type' | i18n
              }}</label>
              <select
                id="biz-type"
                class="select"
                data-testid="apply-business-type"
                [(ngModel)]="f.businessType"
              >
                <option value="restaurant">restaurant</option>
                <option value="grocery">grocery</option>
              </select>
            </div>
            <button
              class="btn btn-primary"
              [disabled]="!f.name"
              (click)="step.set('address')"
            >
              {{ 'common.next' | i18n }}
            </button>
          }

          @if (step() === 'address') {
            <div class="form-group">
              <label for="addr-town" class="form-label">{{
                'businesses.town' | i18n
              }}</label>
              <input
                id="addr-town"
                class="input"
                data-testid="apply-address-town"
                [(ngModel)]="f.town"
              />
              <label for="addr-phone" class="form-label">{{
                'restaurant.login.phone' | i18n
              }}</label>
              <input
                id="addr-phone"
                class="input"
                data-testid="apply-address-phone"
                type="tel"
                [(ngModel)]="f.phone"
              />
            </div>
            <div class="btn-row">
              <button class="btn btn-outline" (click)="step.set('business')">
                ← {{ 'common.back' | i18n }}
              </button>
              <button
                class="btn btn-primary"
                [disabled]="!f.town || !f.phone"
                (click)="step.set('account')"
              >
                {{ 'common.next' | i18n }}
              </button>
            </div>
          }

          @if (step() === 'account') {
            <div class="form-group">
              <label for="owner-name" class="form-label">{{
                'businesses.ownerName' | i18n
              }}</label>
              <input
                id="owner-name"
                class="input"
                data-testid="apply-owner-name"
                [(ngModel)]="f.ownerName"
              />
              <label for="owner-phone" class="form-label">{{
                'restaurant.login.phone' | i18n
              }}</label>
              <input
                id="owner-phone"
                class="input"
                type="tel"
                [(ngModel)]="f.ownerPhone"
              />
              <label for="owner-pass" class="form-label">{{
                'restaurant.login.password' | i18n
              }}</label>
              <input
                id="owner-pass"
                class="input"
                data-testid="apply-password"
                type="password"
                [(ngModel)]="f.password"
              />
            </div>
            <div class="btn-row">
              <button class="btn btn-outline" (click)="step.set('address')">
                ← {{ 'common.back' | i18n }}
              </button>
              <button
                class="btn btn-primary"
                data-testid="apply-account-next-btn"
                [disabled]="!f.ownerName || !f.ownerPhone || !f.password"
                (click)="step.set('otp')"
              >
                {{ 'common.next' | i18n }}
              </button>
            </div>
          }

          @if (step() === 'otp') {
            <div class="form-group">
              <p class="otp-hint">
                We need to confirm this phone number belongs to you before
                submitting your application:
                <strong>{{ f.ownerPhone }}</strong>
              </p>
              @if (!otpSent()) {
                <button
                  class="btn btn-primary"
                  data-testid="apply-send-otp-btn"
                  [disabled]="sendingOtp()"
                  (click)="sendOtp()"
                >
                  {{
                    sendingOtp()
                      ? ('common.saving' | i18n)
                      : ('restaurant.apply.sendOtp' | i18n)
                  }}
                </button>
              } @else if (!otpVerified()) {
                <label for="otp-code" class="form-label">{{
                  'restaurant.apply.enterOtp' | i18n
                }}</label>
                <input
                  id="otp-code"
                  class="input"
                  data-testid="apply-otp-input"
                  inputmode="numeric"
                  [(ngModel)]="otpCode"
                  name="otpCode"
                />
                <button
                  class="btn btn-primary"
                  data-testid="apply-verify-otp-btn"
                  [disabled]="!otpCode || verifyingOtp()"
                  (click)="verifyOtp()"
                >
                  {{
                    verifyingOtp()
                      ? ('common.saving' | i18n)
                      : ('restaurant.apply.verifyOtp' | i18n)
                  }}
                </button>
                <button
                  class="btn btn-outline btn-sm"
                  type="button"
                  [disabled]="sendingOtp()"
                  (click)="sendOtp()"
                >
                  {{ 'restaurant.apply.resendOtp' | i18n }}
                </button>
              } @else {
                <p class="otp-verified">✅ Phone number verified.</p>
              }
            </div>
            @if (errorKey()) {
              <p class="error-text">{{ errorKey()! | i18n }}</p>
            }
            <div class="btn-row">
              <button class="btn btn-outline" (click)="step.set('account')">
                ← {{ 'common.back' | i18n }}
              </button>
              <button
                class="btn btn-primary"
                data-testid="apply-submit-btn"
                [disabled]="!otpVerified() || submitting()"
                (click)="submit()"
              >
                {{
                  submitting()
                    ? ('common.saving' | i18n)
                    : ('restaurant.apply.submit' | i18n)
                }}
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .apply-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--zitro-surface-variant);
      padding: var(--zitro-spacing-lg);
    }
    .apply-card {
      width: 100%;
      max-width: 480px;
      background: var(--zitro-surface);
      border-radius: var(--zitro-radius-lg);
      padding: var(--zitro-spacing-xl);
      box-shadow: var(--zitro-shadow-card);
    }
    .apply-title {
      font-size: var(--zitro-font-size-xl);
      font-weight: 700;
      color: var(--zitro-primary);
      margin: 0 0 var(--zitro-spacing-xs);
    }
    .apply-subtitle {
      color: var(--zitro-on-surface-variant);
      margin: 0 0 var(--zitro-spacing-xl);
    }
    .step-indicator {
      display: flex;
      gap: var(--zitro-spacing-md);
      margin-bottom: var(--zitro-spacing-lg);
      span {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--zitro-surface-variant);
        color: var(--zitro-on-surface-variant);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--zitro-font-size-sm);
        &.active {
          background: var(--zitro-primary);
          color: #ffffff;
        }
      }
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--zitro-spacing-sm);
      margin-bottom: var(--zitro-spacing-lg);
    }
    .form-label {
      font-size: var(--zitro-font-size-sm);
      font-weight: 500;
    }
    .input,
    .select {
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-md);
      border: 1px solid var(--zitro-divider);
      border-radius: var(--zitro-radius-md);
      background: var(--zitro-surface);
      font-size: var(--zitro-font-size-md);
      &:focus {
        outline: none;
        border-color: var(--zitro-primary);
      }
    }
    .btn {
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-lg);
      border: 1px solid transparent;
      border-radius: var(--zitro-radius-md);
      font-size: var(--zitro-font-size-md);
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
    .btn-outline {
      background: transparent;
      color: var(--zitro-primary);
      border-color: var(--zitro-primary);
    }
    .btn-sm {
      padding: var(--zitro-spacing-xs) var(--zitro-spacing-md);
      font-size: var(--zitro-font-size-sm);
    }
    .btn-row {
      display: flex;
      gap: var(--zitro-spacing-sm);
      justify-content: space-between;
    }
    .otp-hint {
      color: var(--zitro-on-surface-variant);
      font-size: var(--zitro-font-size-sm);
      margin: 0 0 var(--zitro-spacing-md);
    }
    .otp-verified {
      color: var(--zitro-primary);
      font-weight: 500;
    }
    .error-text {
      color: var(--zitro-error);
      font-size: var(--zitro-font-size-sm);
      margin-bottom: var(--zitro-spacing-sm);
    }
    .success-box {
      text-align: center;
      .success-icon {
        font-size: 48px;
        margin-bottom: var(--zitro-spacing-md);
      }
      h2 {
        font-size: var(--zitro-font-size-xl);
        margin-bottom: var(--zitro-spacing-sm);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantApplyComponent {
  private readonly api = inject(BusinessApiService);

  protected step = signal<Step>('business');
  protected submitting = signal(false);
  protected errorKey = signal<string | null>(null);
  protected f = {
    name: '',
    businessType: 'restaurant',
    town: '',
    phone: '',
    ownerName: '',
    ownerPhone: '',
    password: '',
  };

  protected otpSent = signal(false);
  protected otpVerified = signal(false);
  protected sendingOtp = signal(false);
  protected verifyingOtp = signal(false);
  protected otpCode = '';

  protected sendOtp(): void {
    this.sendingOtp.set(true);
    this.errorKey.set(null);
    this.api.requestApplicantOtp(this.f.ownerPhone).subscribe({
      next: () => {
        this.otpSent.set(true);
        this.sendingOtp.set(false);
      },
      error: () => {
        this.sendingOtp.set(false);
        this.errorKey.set('common.error');
      },
    });
  }

  protected verifyOtp(): void {
    this.verifyingOtp.set(true);
    this.errorKey.set(null);
    this.api.verifyApplicantOtp(this.f.ownerPhone, this.otpCode).subscribe({
      next: () => {
        this.otpVerified.set(true);
        this.verifyingOtp.set(false);
      },
      error: () => {
        this.verifyingOtp.set(false);
        this.errorKey.set('restaurant.apply.otpInvalid');
      },
    });
  }

  protected submit(): void {
    this.submitting.set(true);
    this.errorKey.set(null);
    this.api
      .submitApplication({
        name: this.f.name,
        businessType: this.f.businessType,
        address: { town: this.f.town },
        phone: this.f.phone,
        ownerName: this.f.ownerName,
        ownerPhone: this.f.ownerPhone,
        ownerPassword: this.f.password,
      })
      .subscribe({
        next: () => {
          this.step.set('success');
          this.submitting.set(false);
        },
        error: (err) => {
          this.submitting.set(false);
          const code: string = err?.error?.errorCode ?? '';
          if (code === 'PHONE_NOT_VERIFIED') {
            // Verified OTP session expired between verify and submit — send them back
            // to re-verify rather than showing a dead-end error.
            this.otpVerified.set(false);
            this.otpSent.set(false);
          }
          this.errorKey.set(
            code === 'DUPLICATE_PHONE' || code === 'DUPLICATE_SLUG'
              ? 'restaurant.apply.errorConflict'
              : code === 'PHONE_NOT_VERIFIED'
                ? 'restaurant.apply.otpExpired'
                : 'common.error',
          );
        },
      });
  }
}

// ── Accept Admin Invite ───────────────────────────────────────────────────────

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-restaurant-accept-invite',
  standalone: true,
  imports: [FormsModule, I18nPipe, RouterLink],
  template: `
    <div class="apply-page">
      <div class="apply-card">
        @if (loading()) {
          <p class="loading">{{ 'common.loading' | i18n }}</p>
        } @else if (error()) {
          <p class="error-text">
            {{ 'restaurant.invite.invalidToken' | i18n }}
          </p>
        } @else if (success()) {
          <div class="success-box">
            <p class="success-icon">✅</p>
            <h2>{{ 'restaurant.invite.successTitle' | i18n }}</h2>
            <a class="btn btn-primary" routerLink="/login">{{
              'restaurant.login.signIn' | i18n
            }}</a>
          </div>
        } @else {
          <h1 class="apply-title">{{ 'restaurant.invite.title' | i18n }}</h1>
          <p>
            {{ 'restaurant.invite.forBusiness' | i18n }}:
            <strong>{{ businessName() }}</strong>
          </p>
          <div class="form-group">
            <label for="invite-pass" class="form-label">{{
              'restaurant.login.password' | i18n
            }}</label>
            <input
              id="invite-pass"
              class="input"
              type="password"
              [(ngModel)]="password"
            />
          </div>
          @if (saveError()) {
            <p class="error-text">{{ 'common.error' | i18n }}</p>
          }
          <button
            class="btn btn-primary"
            [disabled]="!password || saving()"
            (click)="accept()"
          >
            {{
              saving()
                ? ('common.saving' | i18n)
                : ('restaurant.invite.setPassword' | i18n)
            }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    .apply-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--zitro-surface-variant);
    }
    .apply-card {
      width: 100%;
      max-width: 400px;
      background: var(--zitro-surface);
      border-radius: var(--zitro-radius-lg);
      padding: var(--zitro-spacing-xl);
      box-shadow: var(--zitro-shadow-card);
    }
    .apply-title {
      font-size: var(--zitro-font-size-xl);
      font-weight: 700;
      margin: 0 0 var(--zitro-spacing-lg);
    }
    .form-group {
      margin-bottom: var(--zitro-spacing-lg);
    }
    .form-label {
      display: block;
      font-size: var(--zitro-font-size-sm);
      margin-bottom: var(--zitro-spacing-xs);
    }
    .input {
      width: 100%;
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-md);
      border: 1px solid var(--zitro-divider);
      border-radius: var(--zitro-radius-md);
      &:focus {
        outline: none;
        border-color: var(--zitro-primary);
      }
    }
    .btn {
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-lg);
      border: none;
      border-radius: var(--zitro-radius-md);
      cursor: pointer;
      &:disabled {
        opacity: 0.5;
      }
    }
    .btn-primary {
      background: var(--zitro-primary);
      color: #ffffff;
      width: 100%;
    }
    .error-text {
      color: var(--zitro-error);
      font-size: var(--zitro-font-size-sm);
    }
    .loading {
      color: var(--zitro-on-surface-variant);
      text-align: center;
      padding: var(--zitro-spacing-xl);
    }
    .success-box {
      text-align: center;
      .success-icon {
        font-size: 48px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantAcceptInviteComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  private readonly route = inject(ActivatedRoute);

  protected businessName = signal('');
  protected token = '';
  protected password = '';
  protected loading = signal(true);
  protected error = signal(false);
  protected saving = signal(false);
  protected saveError = signal(false);
  protected success = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.api.validateInviteToken(this.token).subscribe({
      next: (res) => {
        this.businessName.set(res.businessName);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  protected accept(): void {
    this.saving.set(true);
    this.api.acceptInvite(this.token, this.password).subscribe({
      next: () => {
        this.success.set(true);
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set(true);
        this.saving.set(false);
      },
    });
  }
}
