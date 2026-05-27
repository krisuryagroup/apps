/**
 * Firebase Auth Configuration Model
 * Fetched from: /appSettings/restaurantDetails/onlineorders/auh
 */

export interface AuthSmsConfig {
  isFast2SmsPhoneAuthentication: boolean;
  isFirebasePhoneAuthentication: boolean;
  resendOTPAllowed: boolean;
  resendOTPTime: number;
}

export interface AuthUiConfig {
  guestButtonLabel: string;
  guestDescription: string;
  header: string;
  headerDescription: string;
  sendOTPButtonLabel: string;
  sendOTPPlaceholder: string;
  validateOTPButtonLabel: string;
  verifyOTPPlaceholder: string;
  otpSentSuccessMessage: string;
  otpSentFailureMessage: string;
  resendOTPLabel: string;
}

export interface AuthConfig {
  sms: AuthSmsConfig;
  ui: AuthUiConfig;
}

/**
 * Default auth configuration (fallback if Firebase fetch fails)
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  sms: {
    isFast2SmsPhoneAuthentication: false,
    isFirebasePhoneAuthentication: false,
    resendOTPAllowed: true,
    resendOTPTime: 30,
  },
  ui: {
    guestButtonLabel: 'Continue as Guest',
    guestDescription: 'Browse and explore our menu without creating an account',
    header: 'Welcome Back!',
    headerDescription: 'Sign in to continue',
    sendOTPButtonLabel: 'Send OTP',
    sendOTPPlaceholder: 'Enter phone number',
    validateOTPButtonLabel: 'Verify OTP',
    verifyOTPPlaceholder: 'Enter 6-digit OTP',
    otpSentSuccessMessage: 'OTP sent successfully. Please check your SMS',
    otpSentFailureMessage: 'OTP Send Failed, Try sending in sometime',
    resendOTPLabel: 'Resend OTP',
  },
};
