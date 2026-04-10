import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideDatabase, getDatabase } from '@angular/fire/database';
// MT009: initializer imports added when core/initializers are copied
// import { APP_SETTINGS_INITIALIZER } from './core/initializers/app-settings.initializer';
// import { LOCATION_INITIALIZER } from './core/initializers/location.initializer';
// import { APP_VERSION_INITIALIZER } from './core/initializers/app-version.initializer';
import { FIREBASE_CONFIG } from '@zitro/utils';
import { ImageCacheService } from '@zitro/services';

import { routes } from './app.routes';

// Function to get Firebase config based on selected restaurant
function getFirebaseConfig() {
  // Centralized Firebase config (same for all restaurants)
  console.log('🔧 App Config: Using centralized Firebase config for the app');
  console.log('🔧 Firebase project ID:', FIREBASE_CONFIG.projectId);
  return FIREBASE_CONFIG as any;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(), // Add HttpClient provider for SMS API
    provideFirebaseApp(() => initializeApp(getFirebaseConfig())),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideAuth(() => getAuth()),
    provideMessaging(() => getMessaging()), // Add FCM messaging provider
    provideDatabase(() => getDatabase()), // Add Firebase Realtime Database provider
    // MT009: initializer providers added when core/initializers are copied
    // APP_VERSION_INITIALIZER, // Add the app version checker (Android app only)
    // APP_SETTINGS_INITIALIZER, // Add the APP_INITIALIZER provider for global settings
    // LOCATION_INITIALIZER, // Add the location initializer for location services
    {
      provide: APP_INITIALIZER,
      useFactory: (imageCacheService: ImageCacheService) => {
        return () => {
          console.log('🧹 Cleaning up expired image cache on app startup...');
          return imageCacheService.cleanupExpiredCache();
        };
      },
      deps: [ImageCacheService],
      multi: true
    }
  ]
};
