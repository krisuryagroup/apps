import { APP_INITIALIZER } from '@angular/core';
import { AppSettingsService } from '@zitro/services';

/**
 * App initializer function that ensures app settings are checked before app starts
 * This is critical for cache management and mandatory logout functionality
 */
function initializeAppSettings(
  appSettingsService: AppSettingsService,
): () => Promise<void> {
  return async () => {
    const t0 = performance.now();
    console.log('[STARTUP] APP_SETTINGS start');

    void appSettingsService.initializeAndCheckSettings().catch((error) => {
      console.warn('[STARTUP] APP_SETTINGS background init failed:', error);
    });

    console.log(
      '[STARTUP] APP_SETTINGS initializer resolved in',
      (performance.now() - t0).toFixed(0),
      'ms',
    );

    return Promise.resolve();
  };
}

/**
 * Provider configuration using APP_INITIALIZER
 * This ensures the app settings service runs BEFORE the app fully initializes
 * Add this to the providers array in app.config.ts
 */
export const APP_SETTINGS_INITIALIZER = {
  provide: APP_INITIALIZER,
  useFactory: initializeAppSettings,
  deps: [AppSettingsService],
  multi: true,
};
