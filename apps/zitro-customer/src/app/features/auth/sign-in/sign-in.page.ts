import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { PhoneInputComponent, PHONE_INPUT_DEFAULT_CONFIG } from '@zitro/ui';
import { I18nPipe } from '@zitro/i18n';
import {
  FirebaseAuthService,
  FirebaseOtpService,
  AppSettingsService,
  AnalyticsService,
} from '@zitro/services';
import { AuthConfig, DEFAULT_AUTH_CONFIG } from '@zitro/models';
import { PHONE_CONSTANTS } from '@zitro/utils';

@Component({
  selector: 'app-sign-in-page',
  standalone: true,
  imports: [PhoneInputComponent, I18nPipe],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(FirebaseAuthService);
  private readonly otpService = inject(FirebaseOtpService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly analytics = inject(AnalyticsService);

  readonly phoneConfig = PHONE_INPUT_DEFAULT_CONFIG;

  readonly isLoading = signal(false);
  readonly statusMessage = signal('');
  readonly phoneError = signal('');
  readonly authConfig = signal<AuthConfig>(DEFAULT_AUTH_CONFIG);

  private phone = '';
  // confirmationResult is held inside FirebaseOtpService — never stored here
  // to prevent DataCloneError via Angular router state serialisation.
  private usingFirebaseOtp = false;

  constructor() {
    this.appSettings
      .getAuthConfig()
      .then((cfg) => this.authConfig.set(cfg))
      .catch(() => this.authConfig.set(DEFAULT_AUTH_CONFIG));
  }

  onPhoneChange(phone: string): void {
    this.phone = phone;
    if (phone) this.phoneError.set('');
  }

  async onSendOtp(): Promise<void> {
    if (!this.phone) {
      this.phoneError.set('errors.invalidIndianPhone');
      return;
    }
    this.phoneError.set('');
    this.isLoading.set(true);
    this.statusMessage.set('auth.sendingOtp');
    const phoneWithCode = PHONE_CONSTANTS.INDIA_CODE + this.phone;
    const cfg = this.authConfig();

    if (cfg.sms.isFirebasePhoneAuthentication) {
      try {
        await this.otpService.sendOtp(phoneWithCode);
        this.usingFirebaseOtp = true;
        this.isLoading.set(false);
        this.navigateToOtp(phoneWithCode);
        return;
      } catch (err: unknown) {
        this.usingFirebaseOtp = false;
        if (!cfg.sms.isFast2SmsPhoneAuthentication) {
          this.statusMessage.set(this.mapSendOtpError(err));
          this.isLoading.set(false);
          return;
        }
      }
    }

    // Backend API OTP path (replaces direct Fast2SMS)
    try {
      await this.authService.sendOtp(phoneWithCode);
      this.isLoading.set(false);
      this.navigateToOtp(phoneWithCode);
    } catch (err: unknown) {
      this.statusMessage.set(this.mapSendOtpError(err));
      this.isLoading.set(false);
    }
  }

  continueAsGuest(): void {
    this.authService.continueAsGuest();
    this.router.navigate(['/home']);
  }

  private navigateToOtp(phoneWithCode: string): void {
    sessionStorage.setItem('otp_phone', phoneWithCode);
    // Do NOT pass confirmationResult through router state — it contains
    // non-serializable Firebase internals → DataCloneError. The OtpPage reads
    // it from FirebaseOtpService directly.
    this.router.navigate(['/auth/otp'], {
      state: {
        phone: phoneWithCode,
        usingFirebaseOtp: this.usingFirebaseOtp,
        resendTime: this.authConfig().sms.resendOTPTime,
        resendAllowed: this.authConfig().sms.resendOTPAllowed,
      },
    });
  }

  private mapSendOtpError(err: unknown): string {
    const e = err as { error?: { errorCode?: string }; status?: number };
    const code =
      e.error?.errorCode || (e.status === 429 ? 'RATE_LIMIT_EXCEEDED' : '');
    switch (code) {
      case 'RATE_LIMIT_EXCEEDED':
        return 'errors.otpRateLimit';
      default:
        return 'auth.otpSentFailure';
    }
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem('otp_phone');
  }
}
