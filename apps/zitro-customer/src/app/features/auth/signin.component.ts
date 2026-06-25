import {
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseAuthService } from '@zitro/services';
import { FavoritesService } from '@zitro/services';
import { UserManagementService } from '@zitro/services';
import { Router } from '@angular/router';
import { ValidatorsUtil } from '@zitro/utils';
import { PHONE_CONSTANTS } from '../../core/constants/app.constants';
import { WhatsappButtonComponent } from '@zitro/ui';
import { AnalyticsService } from '@zitro/services';
import { FirebaseOtpService } from '@zitro/services';
import { AppSettingsService } from '@zitro/services';
import { AuthConfig, DEFAULT_AUTH_CONFIG } from '@zitro/models';
import { FcmTokenService } from '@zitro/services';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, FormsModule, WhatsappButtonComponent],
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
})
export class SigninComponent implements OnDestroy, AfterViewInit {
  private authService = inject(FirebaseAuthService);
  private favoritesService = inject(FavoritesService);
  private userManagementService = inject(UserManagementService);
  private router = inject(Router);
  private analyticsService = inject(AnalyticsService);
  private firebaseOtpService = inject(FirebaseOtpService);
  private appSettingsService = inject(AppSettingsService);
  private fcmTokenService = inject(FcmTokenService);

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild('otpInput') otpInput!: ElementRef<HTMLInputElement>;
  email = '';
  password = '';
  rememberMe = false;

  // Phone login state
  phone = '';
  otp = '';
  showOtp = false;
  phoneError = '';
  otpError = '';
  loginWithPhone = true;
  errorMsg = '';
  emailError = '';

  // ConfirmationResult is intentionally NOT stored here.
  // Storing it in a component property risks it entering Angular's change-detection
  // or reactive context → DataCloneError. It lives only in FirebaseOtpService.

  // Retry timer for OTP
  canResendOtp = false;
  resendCountdown = 0;
  private resendTimer: any = null;

  // Track which OTP method is being used
  private usingFirebaseOtp = false;

  // Auth configuration from Firebase
  authConfig: AuthConfig = DEFAULT_AUTH_CONFIG;

  constructor() {
    this.loadAuthConfig();
  }

  /**
   * Load auth configuration from Firebase on component init
   */
  private async loadAuthConfig(): Promise<void> {
    try {
      this.authConfig = await this.appSettingsService.getAuthConfig();
      console.log('Auth config loaded:', this.authConfig);
    } catch (error) {
      console.error('Failed to load auth config, using defaults:', error);
      this.authConfig = DEFAULT_AUTH_CONFIG;
    }
  }

  ngAfterViewInit() {
    // Auto-focus on phone input when component loads
    if (this.loginWithPhone && this.phoneInput) {
      setTimeout(() => {
        this.phoneInput.nativeElement.focus();
      }, 100);
    }
  }

  /**
   * Handle navigation after successful login
   * Check if user has addresses, redirect to address page if none exist
   */
  private async handlePostLoginNavigation(): Promise<void> {
    const isPendingCheckout =
      localStorage.getItem('pendingCheckout') === 'true';

    if (isPendingCheckout) {
      // Clear the flag
      localStorage.removeItem('pendingCheckout');

      try {
        // Check if user has any addresses
        const phoneNumber =
          await this.userManagementService.getCurrentUserPhone();
        if (phoneNumber) {
          const userData =
            await this.userManagementService.getUserData(phoneNumber);
          const hasAddresses =
            userData?.addresses && userData.addresses.length > 0;

          if (!hasAddresses) {
            // No addresses, redirect to address management page
            localStorage.setItem('redirectAfterAddress', 'checkout');
            this.router.navigate(['/addresses']);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking user addresses:', error);
      }

      // Has addresses or error occurred, go to cart
      this.router.navigate(['/cart']);
    } else {
      // Normal login, go to home
      this.router.navigate(['/home']);
    }
  }

  validatePhone() {
    this.phoneError = ValidatorsUtil.getPhoneValidationError(this.phone);
    return this.phoneError === '';
  }

  validateOtp() {
    this.otpError = ValidatorsUtil.getOtpValidationError(this.otp);
    return this.otpError === '';
  }

  onOtpInput(event: any) {
    // Allow only numeric input for OTP
    const input = event.target.value.replace(/[^0-9]/g, '');
    this.otp = input;
    this.validateOtp();
  }

  validateEmail() {
    this.emailError = ValidatorsUtil.getEmailValidationError(this.email);
    return this.emailError === '';
  }

  // Helper methods for UI state
  isEmailValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.email, this.emailError);
  }

  isEmailInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.email, this.emailError);
  }

  isPhoneValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.phone, this.phoneError);
  }

  isPhoneInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.phone, this.phoneError);
  }

  isOtpValid(): boolean {
    return ValidatorsUtil.isFieldValid(this.otp, this.otpError);
  }

  isOtpInvalid(): boolean {
    return ValidatorsUtil.isFieldInvalid(this.otp, this.otpError);
  }

  async onPhoneSubmit() {
    if (!this.validatePhone()) {
      return;
    }

    const phoneWithCode = PHONE_CONSTANTS.INDIA_CODE + this.phone;

    // Try Firebase OTP first if enabled
    if (this.authConfig.sms.isFirebasePhoneAuthentication) {
      try {
        this.errorMsg = 'Validating device and sending OTP';
        // sendOtp() stores the ConfirmationResult internally — we deliberately
        // do NOT receive or store it here to prevent DataCloneError.
        await this.firebaseOtpService.sendOtp(phoneWithCode);
        this.usingFirebaseOtp = true;
        this.showOtp = true;
        if (this.authConfig.sms.resendOTPAllowed) {
          this.startResendTimer(this.authConfig.sms.resendOTPTime);
        }
        this.errorMsg = this.authConfig.ui.otpSentSuccessMessage;
        console.log('Firebase OTP sent to:', phoneWithCode);

        setTimeout(() => {
          if (this.otpInput) {
            this.otpInput.nativeElement.focus();
          }
        }, 100);
        return;
      } catch (firebaseErr: any) {
        console.warn('Firebase OTP failed:', firebaseErr.message);
        this.usingFirebaseOtp = false;

        if (!this.authConfig.sms.isFast2SmsPhoneAuthentication) {
          this.errorMsg =
            firebaseErr.message ?? this.authConfig.ui.otpSentFailureMessage;
          this.showOtp = false;
          return;
        }
      }
    }

    // Fallback to Fast2SMS if enabled and Firebase failed or not enabled
    if (this.authConfig.sms.isFast2SmsPhoneAuthentication) {
      try {
        this.errorMsg = 'Sending OTP...';
        await this.authService.sendOtp(phoneWithCode);
        this.showOtp = true;
        if (this.authConfig.sms.resendOTPAllowed) {
          this.startResendTimer(this.authConfig.sms.resendOTPTime);
        }
        this.errorMsg = this.authConfig.ui.otpSentSuccessMessage;
        console.log('Fast2SMS OTP sent to:', phoneWithCode);

        // Auto-focus OTP input after successful send
        setTimeout(() => {
          if (this.otpInput) {
            this.otpInput.nativeElement.focus();
          }
        }, 100);
      } catch (fast2smsErr: any) {
        console.error('Fast2SMS OTP failed:', fast2smsErr);
        this.errorMsg = this.authConfig.ui.otpSentFailureMessage;
        this.showOtp = false;
      }
    } else if (!this.authConfig.sms.isFirebasePhoneAuthentication) {
      // If both methods are disabled
      this.errorMsg = 'OTP service is currently unavailable.';
      this.showOtp = false;
    }
  }

  async onOtpSubmit() {
    if (!this.validateOtp()) {
      return;
    }

    try {
      this.errorMsg = 'Verifying OTP...';

      let userCredential;

      if (this.usingFirebaseOtp) {
        // Firebase Phone Auth path: service holds ConfirmationResult internally,
        // verifyOtp() calls .confirm() outside Angular's zone → no DataCloneError.
        try {
          userCredential = await this.firebaseOtpService.verifyOtp(this.otp);
          await this.authService.completeSignIn(
            userCredential,
            PHONE_CONSTANTS.INDIA_CODE + this.phone,
          );
        } catch (firebaseErr: any) {
          console.error('Firebase OTP verification error:', firebaseErr);
          this.errorMsg =
            firebaseErr.message ?? this.getFriendlyOtpErrorMessage(firebaseErr);
          return;
        }
      } else {
        // Fast2SMS path: backend verifies OTP → issues Firebase custom token
        userCredential = await this.authService.signInWithPhone(
          PHONE_CONSTANTS.INDIA_CODE + this.phone,
          this.otp,
        );
      }

      this.errorMsg = 'Login successful!';
      console.log(
        'Login successful for phone: ' +
          PHONE_CONSTANTS.INDIA_CODE +
          this.phone,
      );

      // Sync FCM token with user account
      if (userCredential?.user?.uid) {
        await this.fcmTokenService.onUserLogin(userCredential.user.uid);
      }

      // Clear timer on successful login
      this.clearResendTimer();

      // Track login event
      await this.analyticsService.logLogin('phone');

      // Refresh the favorites service user context
      this.favoritesService.refreshCurrentUser();

      // Check for guest favorites migration after successful login
      setTimeout(() => {
        this.favoritesService.checkAndOfferFavoritesMigration();
      }, 500);

      this.router.navigate(['/home']);
    } catch (err: any) {
      console.error('OTP verification error:', err);
      this.errorMsg = 'Verification failed. Please try again.';
    }
  }

  async onEmailLogin(form: any) {
    if (this.validateEmail() && form.valid) {
      try {
        const user = await this.authService.signInWithEmail(
          this.email,
          this.password,
        );
        if (user) {
          // Clear guest mode when user logs in
          localStorage.removeItem('isGuest');
          localStorage.removeItem('guestId');

          // Set a token for AuthGuard
          localStorage.setItem('token', user.user?.uid || '1');
          this.errorMsg = '';

          // Sync FCM token with user account
          if (user.user?.uid) {
            await this.fcmTokenService.onUserLogin(user.user.uid);
          }

          // Track login event
          await this.analyticsService.logLogin('email');

          // Refresh the favorites service user context
          this.favoritesService.refreshCurrentUser();

          // Check for guest favorites migration after successful login
          setTimeout(() => {
            this.favoritesService.checkAndOfferFavoritesMigration();
          }, 500);

          // Check if user was trying to checkout
          await this.handlePostLoginNavigation();
        } else {
          this.errorMsg = 'Login failed';
        }
      } catch (err: any) {
        console.log(err);
        this.errorMsg = err?.message || 'Login failed';
      }
    }
  }

  continueAsGuest() {
    this.authService.continueAsGuest();
    this.router.navigate(['/home']);
  }

  /**
   * Start the countdown timer for resending OTP
   * @param seconds Number of seconds to wait before allowing resend
   */
  private startResendTimer(seconds = 60) {
    this.canResendOtp = false;
    this.resendCountdown = seconds;

    this.clearResendTimer();

    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResendOtp = true;
        this.clearResendTimer();
      }
    }, 1000);
  }

  /**
   * Clear the resend timer
   */
  private clearResendTimer() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  /**
   * Resend OTP (called when user clicks resend button)
   */
  async resendOtp() {
    if (!this.canResendOtp) {
      return;
    }

    // Reset OTP state
    this.otp = '';
    this.otpError = '';
    this.firebaseOtpService.clearSession();

    // Resend OTP
    await this.onPhoneSubmit();
  }

  /**
   * Convert technical Firebase error messages to user-friendly messages
   */
  private getFriendlyOtpErrorMessage(err: any): string {
    const errorCode = err?.code || '';

    switch (errorCode) {
      case 'auth/invalid-verification-code':
        return 'Invalid OTP. Please check and try again.';
      case 'auth/code-expired':
        return 'OTP has expired. Please request a new one.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again after some time.';
      case 'auth/invalid-phone-number':
        return 'Invalid phone number. Please check and try again.';
      case 'auth/missing-verification-code':
        return 'Please enter the OTP.';
      default:
        return 'Invalid OTP. Please try again.';
    }
  }

  ngOnDestroy() {
    this.clearResendTimer();
    // Release Firebase phone auth session and reCAPTCHA widget
    this.firebaseOtpService.clearSession();
  }
}
