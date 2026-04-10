import { APP_INITIALIZER } from '@angular/core';
import { AppSettingsService } from '@zitro/services';

/**
 * App initializer function that ensures app settings are checked before app starts
 * This is critical for cache management and mandatory logout functionality
 */
function initializeAppSettings(appSettingsService: AppSettingsService): () => Promise<void> {
  return () => appSettingsService.initializeAndCheckSettings();
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
  multi: true
};
