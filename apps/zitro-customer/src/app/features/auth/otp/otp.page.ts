import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationResult } from 'firebase/auth';
import { OtpInputComponent, OTP_INPUT_DEFAULT_CONFIG } from '@zitro/ui';
import { I18nPipe } from '@zitro/i18n';
import {
  FirebaseAuthService,
  FavoritesService,
  FcmTokenService,
  AnalyticsService,
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
  private readonly favorites = inject(FavoritesService);
  private readonly fcmToken = inject(FcmTokenService);
  private readonly analytics = inject(AnalyticsService);

  readonly otpConfig = OTP_INPUT_DEFAULT_CONFIG;

  readonly isLoading = signal(false);
  readonly statusMessage = signal('');
  readonly canResend = signal(false);
  readonly resendCountdown = signal(0);

  private phone: string;
  private confirmationResult: ConfirmationResult | null;
  private usingFirebaseOtp: boolean;
  private resendAllowed: boolean;
  private resendTime: number;
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state ?? {};
    this.phone = (state['phone'] as string) || sessionStorage.getItem('otp_phone') || '';
    this.confirmationResult = (state['confirmationResult'] as ConfirmationResult) ?? null;
    this.usingFirebaseOtp = (state['usingFirebaseOtp'] as boolean) ?? false;
    this.resendAllowed = (state['resendAllowed'] as boolean) ?? true;
    this.resendTime = (state['resendTime'] as number) ?? 60;

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

  async onOtpSubmit(otp: string): Promise<void> {
    this.isLoading.set(true);
    this.statusMessage.set('');

    try {
      if (this.usingFirebaseOtp && this.confirmationResult) {
        await this.confirmationResult.confirm(otp);
      } else {
        const valid = this.authService.verifyOtp(this.phone, otp);
        if (!valid) {
          this.statusMessage.set('errors.invalidOtp');
          this.isLoading.set(false);
          return;
        }
      }

      const credential = await this.authService.signInWithPhone(this.phone, otp);

      if (credential?.user?.uid) {
        await this.fcmToken.onUserLogin(credential.user.uid);
      }

      await this.analytics.logLogin('phone');
      this.favorites.refreshCurrentUser();

      setTimeout(() => this.favorites.checkAndOfferFavoritesMigration(), 500);

      sessionStorage.removeItem('otp_phone');
      this.router.navigate(['/home']);
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
      await this.authService.sendOtp(this.phone);
      this.statusMessage.set('auth.otpSentSuccess');
      this.startResendTimer();
    } catch {
      this.statusMessage.set('auth.otpSentFailure');
    }
  }

  goBack(): void {
    sessionStorage.removeItem('otp_phone');
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

  private mapFirebaseError(err: unknown): string {
    const code = (err as { code?: string })?.code ?? '';
    switch (code) {
      case 'auth/invalid-verification-code': return 'errors.invalidOtp';
      case 'auth/code-expired': return 'errors.otpExpired';
      case 'auth/too-many-requests': return 'errors.tooManyRequests';
      default: return 'errors.invalidOtp';
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
