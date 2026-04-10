import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth, signOut } from 'firebase/auth';
import { RESTAURANTS, FIREBASE_CONFIG } from '@zitro/utils';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseConfigService {
  private currentApp: FirebaseApp | null = null;
  private currentFirestore: Firestore | null = null;
  private currentStorage: FirebaseStorage | null = null;
  private currentAuth: Auth | null = null;
  private currentRestaurantId: string = RESTAURANTS[0].id;

  // Firebase configurations for different restaurants
  private firebaseConfigs: Record<string, FirebaseConfig> = {
    // [RESTAURANTS[0].id]: {
    //   apiKey: "AIzaSyAOM49bTRY7y8kgFtxYiA772RwnvGvB0Js",
    //   authDomain: "the-hunger-point.firebaseapp.com",
    //   projectId: "the-hunger-point",
    //   storageBucket: "the-hunger-point.appspot.com",
    //   messagingSenderId: "362195111262",
    //   appId: "1:362195111262:web:17c04c5b42309ad0af53cf"
    // },
    // [RESTAURANTS[1].id]: {
    //   apiKey: "AIzaSyAEx46y6DAcPAT9iHEVYCimZd-PR16U1Xs",
    //   authDomain: "ef-casa-fa281.firebaseapp.com",
    //   projectId: "ef-casa-fa281",
    //   storageBucket: "ef-casa-fa281.appspot.com",
    //   messagingSenderId: "213252285314",
    //   appId: "1:213252285314:web:d98488fc65c02585d7659b",
    //   measurementId: "G-H5QGDQ6YD4"
    // }
  };

  constructor() {
    // Use the centralized Firebase app created at bootstrap (app.config.ts)
    try {
      if (getApps().length) {
        this.currentApp = getApp();
        this.currentFirestore = getFirestore(this.currentApp);
        this.currentStorage = getStorage(this.currentApp);
        this.currentAuth = getAuth(this.currentApp);
        console.log('[FirebaseConfigService] Using centralized Firebase app', (this.currentApp.options as any)?.projectId);
      } else {
        console.warn('[FirebaseConfigService] No Firebase app found at service construction time. Ensure provideFirebaseApp is configured in app.config.ts');
      }
    } catch (err) {
      console.error('[FirebaseConfigService] Error accessing centralized Firebase app:', err);
    }
  }
  /**
   * Switch to a different restaurant's Firebase configuration
   * This will sign out the current user and switch to new Firebase instance
   */
  async switchRestaurant(restaurantId: string): Promise<void> {
    if (restaurantId === this.currentRestaurantId) {
      console.log('Already connected to this restaurant');
      return;
    }
    // Switching Firebase projects at runtime is no longer supported in this app.
    // The application must be built with a single Firebase project (centralized init).
    // We still allow updating the currentRestaurantId for UI purposes, but the
    // underlying Firebase app will remain the one created at bootstrap.
    console.warn('[FirebaseConfigService] Runtime restaurant switching is disabled. Firebase app will remain the centralized app.');
    this.currentRestaurantId = restaurantId;
    this.clearLocalStorage();
    this.notifyRestaurantSwitch(restaurantId);
  }

  private clearLocalStorage(): void {
    // Clear all authentication related data
    const keysToRemove = [
      'token',
      'isGuest',
      'guestId',
      'currentUserPhone',
      'firebase_auth_user',
      'user_session',
      'auth_token'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Also clear any cached data that might be restaurant-specific
    const cacheKeysToRemove = [
      'products_cache',
      'products_cache_timestamp',
      'food_delivery_categories',
      'user_favorites',
      'guest_favorites',
      'order_history_cache'
    ];

    cacheKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('Local storage cleared for restaurant switch');
  }

  private notifyRestaurantSwitch(restaurantId: string): void {
    // Emit custom event for services to listen to
    const event = new CustomEvent('restaurantSwitched', {
      detail: { restaurantId }
    });
    window.dispatchEvent(event);
  }

  // Getters for current Firebase instances
  get firestore(): Firestore {
    if (!this.currentFirestore) {
      throw new Error('Firestore not initialized');
    }
    return this.currentFirestore;
  }

  get storage(): FirebaseStorage {
    if (!this.currentStorage) {
      throw new Error('Storage not initialized');
    }
    return this.currentStorage;
  }

  get auth(): Auth {
    if (!this.currentAuth) {
      throw new Error('Auth not initialized');
    }
    return this.currentAuth;
  }

  get app(): FirebaseApp {
    if (!this.currentApp) {
      throw new Error('Firebase app not initialized');
    }
    return this.currentApp;
  }

  getCurrentRestaurantId(): string {
    return this.currentRestaurantId;
  }

  getCurrentConfig(): FirebaseConfig | null {
    // Return centralized FIREBASE_CONFIG
    return (FIREBASE_CONFIG as unknown) as FirebaseConfig;
  }

  getRestaurantConfig(restaurantId: string): FirebaseConfig | null {
    return (FIREBASE_CONFIG as unknown) as FirebaseConfig;
  }

  // Method to add new restaurant configuration
  addRestaurantConfig(restaurantId: string, config: FirebaseConfig): void {
    this.firebaseConfigs[restaurantId] = config;
  }
}
