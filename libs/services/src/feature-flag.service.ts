import { Injectable, signal } from '@angular/core';

/**
 * Minimal FeatureFlagService — manages UI-level flags (not API switching).
 * Maintenance mode is set by the ErrorInterceptor when a 503 is received.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly _maintenanceMode = signal<boolean>(false);

  readonly isMaintenanceMode = this._maintenanceMode.asReadonly();

  setMaintenanceMode(active: boolean): void {
    this._maintenanceMode.set(active);
  }
}
