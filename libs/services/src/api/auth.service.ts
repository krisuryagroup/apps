import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../firebase-auth.service';

/**
 * Auth façade used by pages and interceptors.
 * Wraps FirebaseAuthService so pages never import Firebase directly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebaseAuth = inject(FirebaseAuthService);
  private router = inject(Router);

  private readonly _isLoggedIn = signal(false);
  readonly isLoggedIn = this._isLoggedIn.asReadonly();

  /**
   * Returns the current Firebase ID token.
   * Used by AuthInterceptor — do not call from templates.
   */
  getIdToken(): Promise<string> {
    return this.firebaseAuth.getIdToken();
  }

  async signOut(): Promise<void> {
    this._isLoggedIn.set(false);
    await this.firebaseAuth.signOut();
    this.router.navigate(['/auth/signin']);
  }

  setLoggedIn(loggedIn: boolean): void {
    this._isLoggedIn.set(loggedIn);
  }
}
