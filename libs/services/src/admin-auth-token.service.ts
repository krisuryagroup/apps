import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'zitro_admin_jwt';

/**
 * Holds the Admin JWT (from POST /api/admin/auth/login) for zitro-admin and
 * zitro-superadmin — both apps share this service since they share the same login
 * endpoint and token shape (role + permission claims decide what each app shows).
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthTokenService {
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
