import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
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
        '/api/businesses/',   // banners — read-only, guest-browsable
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
    {
      provide: APP_INITIALIZER,
      useFactory: (imageCacheService: ImageCacheService) => {
        return () => imageCacheService.cleanupExpiredCache();
      },
      deps: [ImageCacheService],
      multi: true
    }
  ]
};
