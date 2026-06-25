/**
 * FirebaseOtpService — production-ready Firebase Phone Auth for Angular.
 *
 * Root causes this implementation solves:
 *
 * 1. DataCloneError
 *    Firebase keeps an internal reference to `RecaptchaVerifier` inside the
 *    `ConfirmationResult` it returns. When Firebase Auth later tries to persist
 *    auth state to IndexedDB (structured-clone algorithm), it encounters the
 *    verifier's DOM references and callback functions — both non-cloneable →
 *    DataCloneError. Fix: call `verifier.clear()` IMMEDIATELY after
 *    `signInWithPhoneNumber` resolves or rejects.
 *
 * 2. reCAPTCHA 401 / Enterprise fallback noise
 *    Firebase attempts reCAPTCHA Enterprise first; if the project has no
 *    Enterprise key it gets a 401 and falls back to v2. This is harmless but
 *    noisy. Fix: add localhost to Firebase Console → Auth → Authorized Domains.
 *    The 401 log cannot be suppressed from JS.
 *
 * 3. Zone.js / Angular reactive contamination
 *    If `ConfirmationResult` is stored in a signal, BehaviorSubject, or any
 *    Angular-tracked reactive context, Angular's change detection or effect
 *    scheduler will try to serialize it → DataCloneError. Fix: store it only
 *    in a plain private class property and run all Firebase calls outside
 *    Angular's zone.
 *
 * 4. Verifier lifecycle mismanagement
 *    Creating a new `RecaptchaVerifier` without clearing the previous one
 *    leaves orphaned reCAPTCHA widgets in the DOM and Firebase's internal
 *    widget registry, causing "reCAPTCHA has already been rendered" errors on
 *    retry. Fix: always call `_clearVerifier()` before creating a new one.
 */

import { Injectable, NgZone, inject } from '@angular/core';
import { getApp, getApps } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  UserCredential,
} from 'firebase/auth';

@Injectable({ providedIn: 'root' })
export class FirebaseOtpService {
  private readonly ngZone = inject(NgZone);
  private readonly auth: Auth;

  // Plain private properties — NOT signals, NOT BehaviorSubject, NOT any Angular
  // reactive primitive. Storing ConfirmationResult in reactive state is the #1
  // cause of DataCloneError in Angular + Firebase Phone Auth.
  private _confirmationResult: ConfirmationResult | null = null;
  private _verifier: RecaptchaVerifier | null = null;

  constructor() {
    // Reuse the already-initialised Firebase app created by AngularFire/app init.
    this.auth = getApps().length ? getAuth(getApp()) : getAuth();
  }

  /**
   * Send OTP to `phone` (e.g. '+919643809268').
   *
   * Returns void — callers should not receive or store the ConfirmationResult.
   * The result is held internally and used by `verifyOtp()`.
   */
  async sendOtp(
    phone: string,
    recaptchaContainerId = 'recaptcha-container',
  ): Promise<void> {
    // Always destroy the previous verifier before creating a new one.
    // Not doing this is the #2 cause of reCAPTCHA "already rendered" errors on retry.
    this._clearVerifier();

    // Run ALL Firebase operations outside Angular's zone.
    // Zone.js patches IndexedDB, setTimeout, Promise etc. globally. Firebase's
    // auth-state persistence writes happen on internal schedules that Zone.js
    // intercepts; running outside the zone ensures those writes don't trigger
    // Angular change detection or get mixed into Angular's task queue.
    await this.ngZone.runOutsideAngular(async () => {
      this._verifier = new RecaptchaVerifier(this.auth, recaptchaContainerId, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved — nothing to do here; signInWithPhoneNumber
          // continues automatically.
        },
        'expired-callback': () => {
          // Widget expired before user submitted → clean up so a fresh one is
          // created on the next sendOtp() call.
          this._clearVerifier();
        },
      });

      try {
        const result = await signInWithPhoneNumber(
          this.auth,
          phone,
          this._verifier,
        );

        // ─────────────────────────────────────────────────────────────────────
        // CRITICAL: call verifier.clear() IMMEDIATELY after signInWithPhoneNumber
        // resolves (success OR failure).
        //
        // Firebase internally keeps a reference to the verifier inside the
        // ConfirmationResult object tree. When Firebase later serialises auth
        // state to IndexedDB, the structured-clone algorithm encounters the
        // verifier's DOM nodes and JS functions → DataCloneError.
        //
        // Clearing the verifier severs that reference before Firebase's
        // persistence layer ever tries to clone the state.
        // ─────────────────────────────────────────────────────────────────────
        this._clearVerifier();

        this._confirmationResult = result;
      } catch (err: any) {
        this._clearVerifier();
        throw this._friendlyError(err);
      }
    });
  }

  /**
   * Verify the OTP entered by the user.
   * Must be called after a successful `sendOtp()`.
   */
  async verifyOtp(otp: string): Promise<UserCredential> {
    if (!this._confirmationResult) {
      throw new Error('No pending OTP session. Call sendOtp() first.');
    }

    const pending = this._confirmationResult;

    return this.ngZone.runOutsideAngular(async () => {
      try {
        const credential = await pending.confirm(otp);
        this._confirmationResult = null;
        return credential;
      } catch (err: any) {
        throw this._friendlyError(err);
      }
    });
  }

  /** Call this when the user navigates away or cancels the OTP flow. */
  clearSession(): void {
    this._confirmationResult = null;
    this._clearVerifier();
  }

  get hasPendingSession(): boolean {
    return this._confirmationResult !== null;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _clearVerifier(): void {
    if (this._verifier) {
      try {
        this._verifier.clear();
      } catch {
        // Ignore — verifier may already be cleared or widget never rendered.
      }
      this._verifier = null;
    }
  }

  private _friendlyError(err: any): Error {
    const map: Record<string, string> = {
      'auth/invalid-phone-number': 'Invalid phone number format.',
      'auth/too-many-requests':
        'Too many attempts. Please wait before retrying.',
      'auth/quota-exceeded': 'SMS quota exceeded. Try again later.',
      'auth/captcha-check-failed': 'reCAPTCHA check failed. Please try again.',
      'auth/invalid-app-credential':
        'Firebase Phone Auth is not configured. Enable Phone sign-in and add localhost to Authorized Domains in Firebase Console.',
      'auth/operation-not-allowed':
        'Phone sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in providers.',
      'auth/invalid-verification-code':
        'Incorrect OTP. Please check and try again.',
      'auth/code-expired': 'OTP has expired. Please request a new one.',
      'auth/session-expired': 'OTP session expired. Please request a new one.',
    };
    const message =
      map[err?.code] ?? err?.message ?? 'An unexpected error occurred.';
    const out = new Error(message);
    out.name = err?.code ?? 'FirebaseAuthError';
    return out;
  }
}
