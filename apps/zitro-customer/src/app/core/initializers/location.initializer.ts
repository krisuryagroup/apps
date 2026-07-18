import { APP_INITIALIZER } from '@angular/core';
import { Router } from '@angular/router';
import { LocationService } from '@zitro/services';
import { APP_SETTINGS_CACHE } from '../constants/app.constants';

/**
 * Location initializer function that handles location permission and business selection on app startup
 */
function initializeLocationServices(
  locationService: LocationService,
  router: Router,
): () => Promise<void> {
  return async () => {
    const t0 = performance.now();
    console.log('[STARTUP] LOCATION start');
    try {
      console.log('🌍 Location Initializer: Starting location services...');

      // Check if user has a selected restaurant already
      const selectedRestaurantId = localStorage.getItem(
        APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID,
      );

      if (selectedRestaurantId) {
        console.log(
          '✅ Location Initializer: Restaurant already selected:',
          selectedRestaurantId,
        );

        // Check if user has a default business preference
        const defaultBusinessId = localStorage.getItem(
          APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID + '_default',
        );

        if (defaultBusinessId && defaultBusinessId === selectedRestaurantId) {
          console.log(
            '✅ Location Initializer: Using default business, no location check needed',
          );
          return;
        }
      }

      // For new users or when no restaurant is selected, we'll let the business-selection component handle location
      // This initializer just prepares the location service
      console.log(
        '📍 Location Initializer: Preparing location services for business selection',
      );
    } catch (error) {
      console.error(
        '❌ Location Initializer: Error during initialization:',
        error,
      );
      // Don't block app startup on location errors
    } finally {
      console.log(
        '[STARTUP] LOCATION total',
        (performance.now() - t0).toFixed(0),
        'ms',
      );
    }
  };
}

/**
 * Provider configuration for location initialization
 * This ensures location services are ready before the app fully loads
 */
export const LOCATION_INITIALIZER = {
  provide: APP_INITIALIZER,
  useFactory: initializeLocationServices,
  deps: [LocationService, Router],
  multi: true,
};
