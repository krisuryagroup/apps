import { Injectable, signal } from '@angular/core';

/**
 * Holds the active business slug for the current session.
 * The BusinessIdInterceptor reads this to attach X-Business-Id to every API request.
 */
@Injectable({ providedIn: 'root' })
export class BusinessContextService {
  private readonly _businessId = signal<string>('');

  readonly businessId = this._businessId.asReadonly();

  setBusinessId(slug: string): void {
    this._businessId.set(slug);
  }

  clearBusinessId(): void {
    this._businessId.set('');
  }
}
