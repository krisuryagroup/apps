import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { getAuth } from 'firebase/auth';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { AUTH_KEYS, FIREBASE_STORAGE_PATHS } from '@zitro/utils';
import { Router } from '@angular/router';
import { UserApiService } from './api/user-api.service';

/** Kept for backward-compat with callers — maps to the REST API User shape. */
export interface UserAddress {
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: string;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  couponCode: string;
  usedAt: string;
  orderId: string;
}

/** Backward-compat shape — callers that used Firestore OnlineUser still work. */
export interface OnlineUser {
  uid: string;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  photoURL: string | null;
  emailVerified: boolean;
  addresses: UserAddress[];
  totalOrders: number;
  couponUsageHistory: CouponUsage[];
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly router = inject(Router);
  private readonly storage = inject(Storage);
  private readonly userApi = inject(UserApiService);

  private readonly currentUserPhoneSubject = new BehaviorSubject<string | null>(
    null,
  );
  readonly currentUserPhone$ = this.currentUserPhoneSubject.asObservable();

  private readonly userProfileSubject = new BehaviorSubject<OnlineUser | null>(
    null,
  );
  readonly userProfile$ = this.userProfileSubject.asObservable();

  constructor() {
    // Populate phone from localStorage on startup — set during OTP verification.
    // No Firebase Auth listener needed: auth state is managed via JWT + localStorage.
    const storedPhone = localStorage.getItem(AUTH_KEYS.CURRENT_USER_PHONE);
    if (storedPhone && storedPhone !== 'null') {
      this.currentUserPhoneSubject.next(storedPhone);
    }
  }

  /**
   * Load and emit the current user profile from the REST API.
   * Called by AppComponent and OtpPage after sign-in.
   * Skipped for guest users — they have no profile.
   */
  async loadCurrentUserProfile(): Promise<void> {
    const isGuest = localStorage.getItem('isGuest') === 'true';
    if (isGuest) return;
    try {
      const user = await firstValueFrom(this.userApi.getProfile());
      this.userProfileSubject.next({
        uid: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        phoneNumber: user.phone,
        photoURL: user.photoUrl ?? null,
        emailVerified: false,
        addresses: [],
        totalOrders: 0,
        couponUsageHistory: [],
        created_at: user.createdAt ?? '',
        updated_at: user.updatedAt ?? '',
      });
      localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, user.phone);
      this.currentUserPhoneSubject.next(user.phone);
    } catch {
      // Not logged in or API unreachable — silent
    }
  }

  /**
   * Fetch user profile from the REST API in the legacy OnlineUser shape.
   * The phoneNumber param is kept for backward compat but ignored —
   * always returns the currently authenticated user.
   */
  async getUserData(_phoneNumber?: string): Promise<OnlineUser | null> {
    try {
      const user = await firstValueFrom(this.userApi.getProfile());
      return {
        uid: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        phoneNumber: user.phone,
        photoURL: user.photoUrl ?? null,
        emailVerified: false,
        addresses: [],
        totalOrders: 0, // server-side coupon validation handles this
        couponUsageHistory: [],
        created_at: user.createdAt ?? '',
        updated_at: user.updatedAt ?? '',
      };
    } catch {
      return null;
    }
  }

  /** Clear the in-memory profile (e.g. on sign-out). */
  clearUserProfile(): void {
    this.userProfileSubject.next(null);
    this.userApi.invalidateProfileCache();
  }

  /** Returns true if a user is currently logged in (phone in localStorage). */
  async isLoggedIn(): Promise<boolean> {
    return !!(await this.getCurrentUserPhone());
  }

  /**
   * Returns the current user's phone number from localStorage.
   * Handles 30-day session expiry with auto sign-out.
   */
  async getCurrentUserPhone(): Promise<string | null> {
    const loggedInDateTime = localStorage.getItem(
      AUTH_KEYS.LOGGED_IN_DATE_TIME,
    );
    if (loggedInDateTime) {
      const diffInDays =
        (Date.now() - new Date(loggedInDateTime).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diffInDays > AUTH_KEYS.LOGIN_SESSION_IN_DAYS) {
        this._clearAuthStorage();
        this.clearUserProfile();
        const auth = getAuth();
        await auth.signOut();
        this.router.navigate(['/signin']);
        return null;
      }
    }

    const storedPhone = localStorage.getItem(AUTH_KEYS.CURRENT_USER_PHONE);
    if (storedPhone && storedPhone !== 'null') return storedPhone;

    // Wait briefly for the subject to emit (e.g. just after sign-in)
    return new Promise((resolve) => {
      const sub = this.currentUserPhone$.subscribe((phone) => {
        if (phone) {
          resolve(phone);
          queueMicrotask(() => sub.unsubscribe());
        }
      });
      setTimeout(() => {
        resolve(null);
        sub.unsubscribe();
      }, 500);
    });
  }

  /**
   * Upload a profile photo to Firebase Storage and return the download URL.
   * Firebase Storage is intentionally retained for image hosting.
   */
  async uploadProfilePhoto(file: File, phoneNumber: string): Promise<string> {
    const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
    const storageRef = ref(
      this.storage,
      `${FIREBASE_STORAGE_PATHS.USER_PROFILE_PICS}/${cleanPhone}_${Date.now()}`,
    );
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  private _clearAuthStorage(): void {
    [
      AUTH_KEYS.TOKEN,
      AUTH_KEYS.IS_GUEST,
      AUTH_KEYS.GUEST_ID,
      AUTH_KEYS.CURRENT_USER_PHONE,
      AUTH_KEYS.LOGGED_IN_DATE_TIME,
    ].forEach((key) => localStorage.removeItem(key));
  }
}
