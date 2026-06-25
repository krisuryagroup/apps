import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OtpInputComponent, OTP_INPUT_DEFAULT_CONFIG } from '@zitro/ui';
import { I18nPipe } from '@zitro/i18n';
import {
  FirebaseAuthService,
  FirebaseOtpService,
  FavoritesService,
  FcmTokenService,
  AnalyticsService,
  UserApiService,
} from '@zitro/services';
import { PHONE_CONSTANTS } from '@zitro/utils';

@Component({
  selector: 'app-otp-page',
  standalone: true,
  imports: [OtpInputComponent, I18nPipe],
  templateUrl: './otp.page.html',
  styleUrl: './otp.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly authService = inject(FirebaseAuthService);
  private readonly otpService = inject(FirebaseOtpService);
  private readonly favorites = inject(FavoritesService);
  private readonly fcmToken = inject(FcmTokenService);
  private readonly analytics = inject(AnalyticsService);
  private readonly userApi = inject(UserApiService);

  readonly otpConfig = { ...OTP_INPUT_DEFAULT_CONFIG, autoSubmit: false };

  readonly isLoading = signal(false);
  readonly statusMessage = signal('');
  readonly canResend = signal(false);
  readonly resendCountdown = signal(0);
  readonly otpValue = signal('');

  private phone: string;
  private usingFirebaseOtp: boolean;
  private resendAllowed: boolean;
  private resendTime: number;
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? {};
    this.phone =
      (state['phone'] as string) || sessionStorage.getItem('otp_phone') || '';
    // ConfirmationResult is held inside FirebaseOtpService — never pass it
    // through router state (structured-clone → DataCloneError).
    this.usingFirebaseOtp = (state['usingFirebaseOtp'] as boolean) ?? false;
    this.resendAllowed = (state['resendAllowed'] as boolean) ?? true;
    this.resendTime = PHONE_CONSTANTS.OTP_RESEND_SECONDS;

    if (!this.phone) {
      this.router.navigate(['/auth/signin']);
      return;
    }

    if (this.resendAllowed) {
      this.startResendTimer();
    }
  }

  get maskedPhone(): string {
    const digits = this.phone.replace(PHONE_CONSTANTS.INDIA_CODE, '');
    return `${PHONE_CONSTANTS.INDIA_CODE} ****${digits.slice(-4)}`;
  }

  onOtpComplete(otp: string): void {
    this.otpValue.set(otp);
    this.statusMessage.set('');
  }

  async onVerify(): Promise<void> {
    const otp = this.otpValue();
    if (otp.length !== 6 || this.isLoading()) return;
    await this.onOtpSubmit(otp);
  }

  async onOtpSubmit(otp: string): Promise<void> {
    this.isLoading.set(true);
    this.statusMessage.set('');

    try {
      let credential;
      if (this.usingFirebaseOtp) {
        // Firebase Phone Auth path — verifyOtp() calls confirmationResult.confirm()
        // outside Angular's zone, inside FirebaseOtpService. No DataCloneError.
        credential = await this.otpService.verifyOtp(otp);
        await this.authService.completeSignIn(credential, this.phone);
      } else {
        // Backend OTP path — verifies OTP + exchanges tokens
        credential = await this.authService.signInWithPhone(this.phone, otp);
      }

      if (credential?.user?.uid) {
        await this.fcmToken.onUserLogin(credential.user.uid);
      }

      await this.analytics.logLogin('phone');
      this.favorites.refreshCurrentUser();

      setTimeout(() => this.favorites.checkAndOfferFavoritesMigration(), 500);

      sessionStorage.removeItem('otp_phone');
      this.otpService.clearSession();

      this.userApi.invalidateProfileCache();
      try {
        const profile = await firstValueFrom(this.userApi.getProfile());
        this.router.navigate(profile?.name ? ['/home'] : ['/auth/signup']);
      } catch {
        this.router.navigate(['/auth/signup']);
      }
    } catch (err: unknown) {
      this.statusMessage.set(this.mapFirebaseError(err));
      this.isLoading.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    if (!this.canResend()) return;
    this.canResend.set(false);
    this.statusMessage.set('');

    try {
      if (this.usingFirebaseOtp) {
        await this.otpService.sendOtp(this.phone);
      } else {
        await this.authService.sendOtp(this.phone);
      }
      this.statusMessage.set('auth.otpSentSuccess');
      this.startResendTimer();
    } catch (err: unknown) {
      this.statusMessage.set(this.mapSendOtpError(err));
    }
  }

  goBack(): void {
    sessionStorage.removeItem('otp_phone');
    this.otpService.clearSession();
    this.router.navigate(['/auth/signin']);
  }

  private startResendTimer(): void {
    this.canResend.set(false);
    this.resendCountdown.set(this.resendTime);
    this.clearTimer();
    this.resendTimer = setInterval(() => {
      const next = this.resendCountdown() - 1;
      this.resendCountdown.set(next);
      if (next <= 0) {
        this.canResend.set(true);
        this.clearTimer();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
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

  private mapFirebaseError(err: unknown): string {
    const e = err as { error?: { errorCode?: string }; status?: number };
    const apiCode =
      e.error?.errorCode || (e.status === 429 ? 'RATE_LIMIT_EXCEEDED' : '');
    if (apiCode) {
      switch (apiCode) {
        case 'OTP_INVALID':
          return 'errors.invalidOtp';
        case 'OTP_NOT_FOUND':
          return 'errors.otpNotFound';
        case 'OTP_MAX_ATTEMPTS':
          return 'errors.otpMaxAttempts';
        case 'RATE_LIMIT_EXCEEDED':
          return 'errors.otpRateLimit';
        case 'FIREBASE_TOKEN_FAILED':
          return 'errors.authTokenFailed';
        default:
          return 'errors.invalidOtp';
      }
    }
    const code =
      (err as { code?: string; name?: string })?.code ??
      (err as { name?: string })?.name ??
      '';
    switch (code) {
      case 'auth/invalid-verification-code':
        return 'errors.invalidOtp';
      case 'auth/code-expired':
        return 'errors.otpExpired';
      case 'auth/too-many-requests':
        return 'errors.tooManyRequests';
      case 'FirebaseAuthError':
        return (err as Error).message ?? 'errors.invalidOtp';
      default:
        return 'errors.invalidOtp';
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
