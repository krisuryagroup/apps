import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  getMessaging,
  getToken,
  deleteToken,
  Messaging,
} from 'firebase/messaging';
import {
  Firestore,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  FieldValue,
} from '@angular/fire/firestore';
import { FIREBASE_COLLECTIONS } from '@zitro/utils';
import { getAppVersion } from '@zitro/utils';

/**
 * FCM Token Model
 */
export interface FCMToken {
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceId: string;
  appVersion: string;
  isActive: boolean;
  createdAt: Timestamp | Date | FieldValue;
  lastUsedAt: Timestamp | Date | FieldValue;
}

/**
 * FCM Token Manager Plugin Interface
 */
export interface FcmTokenManagerPlugin {
  /**
   * Called after successful user login
   * Saves FCM token to Firestore with user ID
   */
  onUserLogin(options: { userId: string }): Promise<void>;

  /**
   * Called on user logout
   * Removes FCM token from Firestore
   */
  onUserLogout(): Promise<void>;

  /**
   * Manually refresh FCM token
   */
  refreshToken(): Promise<void>;

  /**
   * Request notification permission (Android 13+)
   */
  requestNotificationPermission(): Promise<void>;
}

const FcmTokenManager =
  registerPlugin<FcmTokenManagerPlugin>('FcmTokenManager');

/**
 * Service to manage FCM token lifecycle
 * Supports both web (Firebase Messaging) and native Android (Capacitor plugin)
 */
@Injectable({
  providedIn: 'root',
})
export class FcmTokenService {
  private platformId = inject<object>(PLATFORM_ID);
  private firestore = inject(Firestore);

  private messaging: Messaging | null = null;
  private currentUserId: string | null = null;
  private readonly VAPID_KEY =
    'BOk-2MVemkErwEl_l6XjsmQoaE8cyJHVXUo3fjdPYrT41OWztQulUWqIW8DYYm9fLwZ4RLDg_e_s_OSedcTBkPc'; // VAPID key from Firebase Console
  private deviceId = '';
  private appVersion = '1.0.0';

  constructor() {
    this.initializeWebMessaging();
    // Initialize device info asynchronously
    this.initializeDeviceInfo().catch((error) => {
      console.error('FCM Token: Failed to initialize device info:', error);
    });
  }

  /**
   * Initialize device information
   */
  private async initializeDeviceInfo(): Promise<void> {
    // Get or generate device ID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('deviceId', deviceId);
    }
    this.deviceId = deviceId;

    // Get app version from Capacitor
    try {
      this.appVersion = await getAppVersion();
      console.log('FCM Token: App version:', this.appVersion);
    } catch (error) {
      console.warn(
        'FCM Token: Could not get app version, using default:',
        error,
      );
      this.appVersion = '1.0.0';
    }
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    return `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize Firebase Messaging for web platform
   */
  private async initializeWebMessaging(): Promise<void> {
    if (!this.isWeb()) {
      return;
    }

    try {
      // Check if browser supports notifications and service workers
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('FCM Token: Browser does not support notifications');
        return;
      }

      this.messaging = getMessaging();
      console.log('FCM Token: Web messaging initialized');
    } catch (error) {
      console.error('FCM Token: Failed to initialize web messaging:', error);
    }
  }

  /**
   * Check if running on native Android platform
   */
  private isNativeAndroid(): boolean {
    return (
      Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()
    );
  }

  /**
   * Check if running on web platform
   */
  private isWeb(): boolean {
    return isPlatformBrowser(this.platformId) && !Capacitor.isNativePlatform();
  }

  /**
   * Get platform information
   */
  private getPlatform(): string {
    if (this.isNativeAndroid()) {
      return 'android';
    } else if (this.isWeb()) {
      return 'web';
    }
    return 'unknown';
  }

  /**
   * Called after successful user login
   * Syncs FCM token to Firestore with user ID
   *
   * @param userId The authenticated user's ID (typically Firebase Auth UID or phone number)
   */
  async onUserLogin(userId: string): Promise<void> {
    if (!userId) {
      console.error('FCM Token: userId is required for onUserLogin');
      return;
    }

    this.currentUserId = userId;

    try {
      if (this.isNativeAndroid()) {
        // Use native Android plugin
        console.log(
          'FCM Token: Calling native onUserLogin for userId:',
          userId,
        );
        await FcmTokenManager.onUserLogin({ userId });
        console.log('FCM Token: Successfully synced token on login (Android)');
      } else if (this.isWeb()) {
        // Use web Firebase Messaging
        console.log('FCM Token: Syncing web FCM token for userId:', userId);
        await this.syncWebTokenToFirestore(userId);
        console.log('FCM Token: Successfully synced token on login (Web)');
      } else {
        console.log('FCM Token: Platform not supported for push notifications');
      }
    } catch (error) {
      console.error('FCM Token: Failed to sync token on login:', error);
    }
  }

  /**
   * Sync web FCM token to Firestore
   */
  private async syncWebTokenToFirestore(userId: string): Promise<void> {
    if (!this.messaging) {
      console.warn('FCM Token: Web messaging not initialized');
      return;
    }

    // Ensure device info is initialized
    if (!this.deviceId || !this.appVersion) {
      console.warn('FCM Token: Device info not ready, initializing...');
      await this.initializeDeviceInfo();
    }

    try {
      // Ensure service worker is registered
      await this.ensureServiceWorkerRegistered();

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('FCM Token: Notification permission denied');
        return;
      }

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: this.VAPID_KEY,
      });

      if (!token) {
        console.warn('FCM Token: No registration token available');
        return;
      }

      const fcmTokensRef = collection(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        userId,
        'fcmTokens',
      );

      const tokenData: FCMToken = {
        token: token,
        platform: this.getPlatform() as 'android' | 'ios' | 'web',
        deviceId: this.deviceId,
        appVersion: this.appVersion,
        isActive: true,
        createdAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
      };

      // Use token as document ID to ensure uniqueness
      const tokenDocRef = doc(fcmTokensRef, this.deviceId);
      await setDoc(tokenDocRef, tokenData);

      console.log('FCM Token: Web token saved to Firestore subcollection');
    } catch (error) {
      console.error('FCM Token: Error syncing web token:', error);
      throw error;
    }
  }

  /**
   * Called on user logout
   * Removes FCM token from Firestore
   */
  async onUserLogout(): Promise<void> {
    const userId = this.currentUserId;

    try {
      if (this.isNativeAndroid()) {
        // Use native Android plugin
        console.log('FCM Token: Calling native onUserLogout');
        await FcmTokenManager.onUserLogout();
        console.log(
          'FCM Token: Successfully removed token on logout (Android)',
        );
      } else if (this.isWeb() && userId) {
        // Use web Firebase Messaging
        console.log('FCM Token: Removing web FCM token');
        await this.removeWebTokenFromFirestore(userId);
        console.log('FCM Token: Successfully removed token on logout (Web)');
      } else {
        console.log(
          'FCM Token: Platform not supported or no user ID available',
        );
      }
    } catch (error) {
      console.error('FCM Token: Failed to remove token on logout:', error);
    } finally {
      this.currentUserId = null;
    }
  }

  /**
   * Ensure service worker is registered before getting token
   */
  private async ensureServiceWorkerRegistered(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers are not supported');
    }

    try {
      // Check if service worker is already registered
      const registration = await navigator.serviceWorker.getRegistration(
        '/firebase-messaging-sw.js',
      );

      if (registration) {
        console.log('FCM Token: Service worker already registered');
        return;
      }

      // Register service worker
      await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      console.log('FCM Token: Service worker registered successfully');
    } catch (error) {
      console.error('FCM Token: Failed to register service worker:', error);
      throw error;
    }
  }

  /**
   * Remove web FCM token from Firestore
   */
  private async removeWebTokenFromFirestore(userId: string): Promise<void> {
    try {
      // Delete token from Firebase Messaging
      if (this.messaging) {
        try {
          await deleteToken(this.messaging);
        } catch (error) {
          console.warn(
            'FCM Token: Could not delete token from Firebase:',
            error,
          );
        }
      }

      // Mark token as inactive in Firestore subcollection
      const tokenDocRef = doc(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        userId,
        'fcmTokens',
        this.deviceId,
      );

      await updateDoc(tokenDocRef, {
        isActive: false,
        lastUsedAt: serverTimestamp(),
      });

      console.log('FCM Token: Web token marked as inactive in Firestore');
    } catch (error) {
      console.error('FCM Token: Error removing web token:', error);
      // Don't throw error if token document doesn't exist
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code !== 'not-found'
      ) {
        throw error;
      }
    }
  }

  /**
   * Manually refresh FCM token
   * Useful for testing or force token refresh
   */
  async refreshToken(): Promise<void> {
    try {
      if (this.isNativeAndroid()) {
        // Use native Android plugin
        console.log('FCM Token: Manually refreshing token (Android)');
        await FcmTokenManager.refreshToken();
        console.log('FCM Token: Token refresh initiated (Android)');
      } else if (this.isWeb() && this.currentUserId) {
        // Use web Firebase Messaging
        console.log('FCM Token: Manually refreshing token (Web)');
        await this.syncWebTokenToFirestore(this.currentUserId);
        console.log('FCM Token: Token refresh completed (Web)');
      } else {
        console.log('FCM Token: Platform not supported or no user logged in');
      }
    } catch (error) {
      console.error('FCM Token: Failed to refresh token:', error);
    }
  }

  /**
   * Request notification permission (Android 13+)
   * Note: This is handled automatically by Capacitor Push Notifications plugin
   * This method is here for completeness
   */
  async requestNotificationPermission(): Promise<void> {
    try {
      if (this.isNativeAndroid()) {
        // Use native Android plugin
        console.log('FCM Token: Requesting notification permission (Android)');
        await FcmTokenManager.requestNotificationPermission();
        console.log('FCM Token: Permission request completed (Android)');
      } else if (this.isWeb()) {
        // Request web notification permission
        console.log('FCM Token: Requesting notification permission (Web)');
        const permission = await Notification.requestPermission();
        console.log('FCM Token: Permission status (Web):', permission);
      } else {
        console.log('FCM Token: Platform not supported');
      }
    } catch (error) {
      console.error(
        'FCM Token: Failed to request notification permission:',
        error,
      );
    }
  }
}
