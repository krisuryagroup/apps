import { Injectable, inject } from '@angular/core';
import { getAuth, signOut } from 'firebase/auth';
import { RESTAURANTS, APP_SETTINGS_CACHE, FIREBASE_CONFIG } from '@zitro/utils';
import { FirebaseAuthService } from './firebase-auth.service';

/**
 * Simplified Firebase Connection Manager
 * Only switches Firebase apps, all services continue to work with same structure
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseConnectionManager {
  private authService = inject(FirebaseAuthService);

  private currentRestaurantId: string = (RESTAURANTS[0] as any).id;

  constructor() {
    console.log(
      '🔥 Firebase Connection Manager initialized with default restaurant:',
      this.currentRestaurantId,
    );
  }

  /**
   * Switch to different restaurant's Firebase configuration
   * This will sign out current user and refresh the page to reinitialize all Firebase services
   */
  async switchRestaurant(restaurantId: string): Promise<void> {
    if (restaurantId === this.currentRestaurantId) {
      console.log('Already connected to restaurant:', restaurantId);
      return;
    }

    const restaurant = [...RESTAURANTS].find((r: any) => r.id === restaurantId);
    if (!restaurant) {
      throw new Error(`Restaurant ${restaurantId} not found`);
    }

    try {
      console.log(
        '🔄 Switching from',
        this.currentRestaurantId,
        'to',
        restaurantId,
      );

      // Sign out current user if any
      try {
        await this.authService.signOut();
        console.log('✅ User signed out');
      } catch (error) {
        console.warn('Sign out error (might not be signed in):', error);
      }

      // Clear local storage
      this.clearLocalStorage();

      // Store new restaurant ID with extra safety
      localStorage.setItem(
        APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID,
        restaurantId,
      );

      // Also store a flag indicating this is a restaurant switch (not a cache clear)
      sessionStorage.setItem('restaurant_switching', 'true');
      sessionStorage.setItem(
        'restaurant_switch_timestamp',
        Date.now().toString(),
      );

      this.currentRestaurantId = restaurantId;

      console.log('✅ Restaurant switch completed. Reloading page...');
      console.log(
        '🔧 Stored selectedRestaurantId:',
        localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID),
      );

      // Reload the page to reinitialize Firebase with new config
      window.location.reload();
    } catch (error) {
      console.error('❌ Error switching restaurant:', error);
      throw error;
    }
  }

  /**
   * Get current restaurant ID
   */
  getCurrentRestaurantId(): string {
    // Check if there's a stored restaurant ID from previous switch
    const storedId = localStorage.getItem(
      APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID,
    );
    if (storedId && [...RESTAURANTS].some((r: any) => r.id === storedId)) {
      this.currentRestaurantId = storedId;
    }
    return this.currentRestaurantId;
  }

  /**
   * Get current restaurant data
   */
  getCurrentRestaurant() {
    const id = this.getCurrentRestaurantId();
    return [...RESTAURANTS].find((r: any) => r.id === id) || RESTAURANTS[0];
  }

  /**
   * Get Firebase config for current restaurant
   */
  getCurrentFirebaseConfig() {
    // Return the centralized FIREBASE_CONFIG used by the application
    return FIREBASE_CONFIG;
  }

  /**
   * Clear all authentication and cache data
   */
  private clearLocalStorage(): void {
    const keysToKeep = ['selectedRestaurantId']; // Keep restaurant selection

    const keysToRemove = [
      // Authentication
      'token',
      'isGuest',
      'guestId',
      'currentUserPhone',
      'firebase_auth_user',
      'user_session',
      'auth_token',

      // Cache data (restaurant-specific)
      'products_cache',
      'products_cache_timestamp',
      'food_delivery_categories',
      'user_favorites',
      'guest_favorites',
      'order_history_cache',
      'last_cache_clear_timestamp',
      'last_login_clear_timestamp',
      'cache_clear_session_flag',
    ];

    keysToRemove.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Also clear session storage
    sessionStorage.clear();

    console.log('🧹 Local storage cleared for restaurant switch');
  }
}
