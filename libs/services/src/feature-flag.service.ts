import { Injectable, signal } from '@angular/core';
import { Observable, from, map } from 'rxjs';

export type FeatureFlag =
  | 'wallet_payments'
  | 'delivery_tracking'
  | 'ratings_reviews'
  | 'scheduled_pickup'
  | 'dine_in'
  | 'grocery_mode'
  | 'game_tab';

type FlagConfig = Record<string, unknown>;

interface FlagState {
  enabled: Set<FeatureFlag>;
  configs: FlagConfig;
  maintenanceMode: boolean;
}

const INITIAL_STATE: FlagState = {
  enabled: new Set<FeatureFlag>(),
  configs: {},
  maintenanceMode: false,
};

/**
 * Feature flag service — manages runtime flags and maintenance mode.
 *
 * Flags are loaded once at app start via `loadFlags()`.
 * The error interceptor calls `setMaintenanceMode(true)` on 503.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private readonly _state = signal<FlagState>(INITIAL_STATE);

  /**
   * Returns true if the given flag is enabled.
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this._state().enabled.has(flag);
  }

  /**
   * Observable that emits true if the given flag is enabled.
   * Wraps the signal for use in reactive contexts.
   */
  isEnabled$(flag: FeatureFlag): Observable<boolean> {
    return from(
      new Promise<boolean>(resolve => resolve(this.isEnabled(flag)))
    ).pipe(map(() => this.isEnabled(flag)));
  }

  /**
   * Returns a typed config value stored under the given key, or null.
   */
  getConfig<T>(key: string): T | null {
    const val = this._state().configs[key];
    return val !== undefined ? (val as T) : null;
  }

  /**
   * Returns true if the app is in maintenance mode (set by error interceptor on 503).
   */
  isMaintenanceMode(): boolean {
    return this._state().maintenanceMode;
  }

  /**
   * Called by the error interceptor when a 503 response is received.
   */
  setMaintenanceMode(active: boolean): void {
    this._state.update(s => ({ ...s, maintenanceMode: active }));
  }

  /**
   * Loads flags from a flat record — call once at app init from a config endpoint.
   * Keys matching FeatureFlag values are registered as enabled flags.
   * All other keys are stored as config values.
   *
   * Example payload: { "wallet_payments": true, "game_tab": false, "maxCartItems": 20 }
   */
  loadFlags(raw: Record<string, unknown>): void {
    const KNOWN_FLAGS = new Set<string>([
      'wallet_payments',
      'delivery_tracking',
      'ratings_reviews',
      'scheduled_pickup',
      'dine_in',
      'grocery_mode',
      'game_tab',
    ]);

    const enabled = new Set<FeatureFlag>();
    const configs: FlagConfig = {};

    for (const [key, value] of Object.entries(raw)) {
      if (KNOWN_FLAGS.has(key)) {
        if (value === true) {
          enabled.add(key as FeatureFlag);
        }
      } else {
        configs[key] = value;
      }
    }

    this._state.update(s => ({ ...s, enabled, configs }));
  }
}
