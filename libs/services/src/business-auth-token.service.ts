import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'zitro_business_jwt';

/**
 * Holds the Business JWT (from POST /api/business-auth/login) for zitro-restaurant.
 * Unlike the customer app, there is no Firebase Auth involved here — this token is
 * the entire session, stored directly in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class BusinessAuthTokenService {
  private readonly _token = signal<string | null>(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null,
  );

  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  setToken(token: string): void {
    localStorage.setItem(STORAGE_KEY, token);
    this._token.set(token);
  }

  clearToken(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._token.set(null);
  }
}
