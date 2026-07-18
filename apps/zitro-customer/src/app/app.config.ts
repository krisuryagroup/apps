import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { APP_SETTINGS_INITIALIZER } from './core/initializers/app-settings.initializer';
import { LOCATION_INITIALIZER } from './core/initializers/location.initializer';
import { APP_VERSION_INITIALIZER } from './core/initializers/app-version.initializer';
import { CART_INITIALIZER } from './core/initializers/cart.initializer';
import { FIREBASE_CONFIG } from '@zitro/utils';
import { ImageCacheService, provideZitroServices } from '@zitro/services';
import { provideI18n } from '@zitro/i18n';
import { provideTheme } from '@zitro/theme';
import { environment } from '../environments/environment';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideZitroServices({
      apiBaseUrl: environment.apiUrl,
      publicEndpoints: [
        '/api/app-config',
        '/api/platform-tags',
        '/api/businesses/nearby',
        '/api/tags',
        '/api/businesses/', // banners — read-only, guest-browsable
        '/api/auth/otp/request',
        '/api/auth/otp/verify',
      ],
    }),
    provideI18n(),
    provideTheme(),
    provideFirebaseApp(() => initializeApp(FIREBASE_CONFIG as any)),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAuth(() => getAuth()),
    provideMessaging(() => getMessaging()),
    provideDatabase(() => getDatabase()),
    APP_VERSION_INITIALIZER,
    APP_SETTINGS_INITIALIZER,
    LOCATION_INITIALIZER,
    CART_INITIALIZER,
    {
      provide: APP_INITIALIZER,
      useFactory: (imageCacheService: ImageCacheService) => {
        return async () => {
          const t0 = performance.now();
          console.log('[STARTUP] IMAGE_CACHE cleanup start');
          await imageCacheService.cleanupExpiredCache();
          console.log(
            '[STARTUP] IMAGE_CACHE cleanup done in',
            (performance.now() - t0).toFixed(0),
            'ms',
          );
        };
      },
      deps: [ImageCacheService],
      multi: true,
    },
    // ── TIMING PROBE — remove after root cause found ──────────────────────────
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const t0 = performance.now();
        console.log(
          '[STARTUP] APP_INITIALIZER chain started at',
          t0.toFixed(0),
          'ms after page load',
        );
        return () => {
          const t1 = performance.now();
          console.log(
            '[STARTUP] All APP_INITIALIZERs finished in',
            (t1 - t0).toFixed(0),
            'ms (wall clock from this probe start)',
          );
          return Promise.resolve();
        };
      },
      deps: [],
      multi: true,
    },
  ],
};
