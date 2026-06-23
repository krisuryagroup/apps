import { Injectable } from '@angular/core';

// Firebase v9 modular imports
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  Auth,
  ConfirmationResult,
} from 'firebase/auth';

/**
 * FirebaseOtpService
 *
 * Usage:
 * 1. Add a <div id="recaptcha-container"></div> in your component template.
 * 2. Inject FirebaseOtpService in your component.
 * 3. Call sendOtp() to trigger OTP send to the hardcoded phone number.
 *
 * Example:
 *   constructor(private otpService: FirebaseOtpService) {}
 *   this.otpService.sendOtp().then(...)
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseOtpService {
  private auth: Auth;

  constructor() {
    // Check if Firebase app already exists, use it instead of creating a new one
    try {
      if (getApps().length > 0) {
        // Use existing Firebase app
        const app = getApp();
        this.auth = getAuth(app);
        console.log('Using existing Firebase app for OTP service');
      } else {
        // Initialize new Firebase app if none exists
        const firebaseConfig = {
          apiKey: 'AIzaSyCdhvXtodLYlKsaqvaj-83rLRze0K277c4',
          authDomain: 'zitro-18f5c.firebaseapp.com',
          projectId: 'zitro-18f5c',
          storageBucket: 'zitro-18f5c.firebasestorage.app',
          messagingSenderId: '732131169680',
          appId: '1:732131169680:web:40a153176195281cbf8f15',
          measurementId: 'G-46PV73YKKT',
        };
        const app = initializeApp(firebaseConfig);
        this.auth = getAuth(app);
        console.log('Initialized new Firebase app for OTP service');
      }
    } catch (err) {
      console.error('Error initializing Firebase in OTP service:', err);
      // Fallback to default getAuth()
      this.auth = getAuth();
    }
  }

  /**
   * Sends OTP to the specified phone number using Firebase Auth
   * @param phone Phone number with country code (e.g., '+919643809268')
   * @param recaptchaContainerId The HTML element ID for reCAPTCHA
   * @returns Promise with confirmationResult or error
   */
  sendOtp(
    phone: string,
    recaptchaContainerId = 'recaptcha-container',
  ): Promise<ConfirmationResult> {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        // Ensure phone has country code
        const formattedPhone = phone.startsWith('+') ? phone : '+91' + phone;

        const verifier = new RecaptchaVerifier(
          this.auth,
          recaptchaContainerId,
          {
            size: 'invisible',
            callback: (token: any) => {
              console.log('reCAPTCHA solved');
            },
          },
        );

        try {
          const widgetId = await verifier.render();
          console.log('reCAPTCHA rendered, widgetId:', widgetId);
        } catch (err) {
          console.warn('reCAPTCHA render warning (may be fine):', err);
        }

        console.log('Sending OTP to:', formattedPhone);
        const confirmationResult = await signInWithPhoneNumber(
          this.auth,
          formattedPhone,
          verifier,
        );
        console.log(
          'OTP sent successfully, verificationId:',
          confirmationResult.verificationId,
        );
        resolve(confirmationResult);
      } catch (err: any) {
        console.error('Firebase OTP error:', err);

        // Provide specific error messages for common issues
        let errorMessage = 'Failed to send OTP';
        if (err.code === 'auth/invalid-app-credential') {
          errorMessage =
            'Firebase Phone Authentication not configured. Please enable Phone Auth in Firebase Console and add authorized domains.';
          console.error(
            'Setup required: 1) Enable Phone Auth in Firebase Console 2) Add authorized domains 3) Verify reCAPTCHA configuration',
          );
        } else if (err.code === 'auth/captcha-check-failed') {
          errorMessage = 'reCAPTCHA verification failed. Please try again.';
        } else if (err.code === 'auth/invalid-phone-number') {
          errorMessage =
            'Invalid phone number format. Please check and try again.';
        } else if (err.code === 'auth/quota-exceeded') {
          errorMessage = 'SMS quota exceeded. Please try again later.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        reject(new Error(errorMessage));
      }
    });
  }
}
