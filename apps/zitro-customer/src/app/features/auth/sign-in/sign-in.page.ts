import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationResult } from 'firebase/auth';
import {
  PhoneInputComponent,
  PHONE_INPUT_DEFAULT_CONFIG,
} from '@zitro/ui';
import { I18nPipe } from '@zitro/i18n';
import { FirebaseAuthService, FirebaseOtpService, AppSettingsService, FavoritesService, FcmTokenService, AnalyticsService } from '@zitro/services';
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
  private readonly favorites = inject(FavoritesService);
  private readonly fcmToken = inject(FcmTokenService);
  private readonly analytics = inject(AnalyticsService);

  readonly phoneConfig = PHONE_INPUT_DEFAULT_CONFIG;

  readonly isLoading = signal(false);
  readonly statusMessage = signal('');
  readonly authConfig = signal<AuthConfig>(DEFAULT_AUTH_CONFIG);

  private phone = '';
  private confirmationResult: ConfirmationResult | null = null;
  private usingFirebaseOtp = false;

  constructor() {
    this.appSettings.getAuthConfig()
      .then(cfg => this.authConfig.set(cfg))
      .catch(() => this.authConfig.set(DEFAULT_AUTH_CONFIG));
  }

  onPhoneChange(phone: string): void {
    this.phone = phone;
  }

  async onSendOtp(): Promise<void> {
    if (!this.phone) return;
    this.isLoading.set(true);
    this.statusMessage.set('auth.sendingOtp');
    const phoneWithCode = PHONE_CONSTANTS.INDIA_CODE + this.phone;
    const cfg = this.authConfig();

    if (cfg.sms.isFirebasePhoneAuthentication) {
      try {
        this.confirmationResult = await this.otpService.sendOtp(phoneWithCode);
        this.usingFirebaseOtp = true;
        this.isLoading.set(false);
        this.navigateToOtp(phoneWithCode);
        return;
      } catch {
        this.usingFirebaseOtp = false;
        if (!cfg.sms.isFast2SmsPhoneAuthentication) {
          this.statusMessage.set('auth.otpSentFailure');
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
    } catch {
      this.statusMessage.set('auth.otpSentFailure');
      this.isLoading.set(false);
    }
  }

  continueAsGuest(): void {
    this.authService.continueAsGuest();
    this.router.navigate(['/home']);
  }

  private navigateToOtp(phoneWithCode: string): void {
    sessionStorage.setItem('otp_phone', phoneWithCode);
    this.router.navigate(['/auth/otp'], {
      state: {
        phone: phoneWithCode,
        confirmationResult: this.confirmationResult,
        usingFirebaseOtp: this.usingFirebaseOtp,
        resendTime: this.authConfig().sms.resendOTPTime,
        resendAllowed: this.authConfig().sms.resendOTPAllowed,
      },
    });
  }

  ngOnDestroy(): void {
    sessionStorage.removeItem('otp_phone');
  }
}
