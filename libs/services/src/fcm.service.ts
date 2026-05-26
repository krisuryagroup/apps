import { Injectable, inject } from '@angular/core';
import {
  getMessaging,
  getToken,
  onMessage,
  Messaging,
  MessagePayload,
} from 'firebase/messaging';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserManagementService } from './user-management.service';
import {
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { FIREBASE_COLLECTIONS } from '@zitro/utils';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class FcmService {
  private firestore = inject(Firestore);
  private userManagementService = inject(UserManagementService);

  private messaging: Messaging | null = null;
  private currentToken: string | null = null;
  private notificationSubject = new BehaviorSubject<NotificationPayload | null>(
    null,
  );
  public notification$: Observable<NotificationPayload | null> =
    this.notificationSubject.asObservable();

  // Firebase Cloud Messaging VAPID Key (get from Firebase Console -> Project Settings -> Cloud Messaging)
  private readonly VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual VAPID key

  constructor() {
    this.initializeMessaging();
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  private async initializeMessaging(): Promise<void> {
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('FCM: This browser does not support notifications');
        return;
      }

      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('FCM: Service workers are not supported in this browser');
        return;
      }

      this.messaging = getMessaging();
      console.log('✅ FCM: Messaging initialized');

      // Listen for foreground messages
      this.setupForegroundMessageListener();
    } catch (error) {
      console.error('❌ FCM: Error initializing messaging:', error);
    }
  }

  /**
   * Request notification permission and get FCM token
   */
  async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      if (!this.messaging) {
        console.warn('FCM: Messaging not initialized');
        return null;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.warn('FCM: Notification permission denied');
        return null;
      }

      console.log('✅ FCM: Notification permission granted');

      // Get FCM token
      const token = await getToken(this.messaging, {
        vapidKey: this.VAPID_KEY,
      });

      if (token) {
        console.log('✅ FCM: Token received');
        this.currentToken = token;

        // Save token to Firestore for the current user
        await this.saveFcmTokenToFirestore(token);

        return token;
      } else {
        console.warn('FCM: No registration token available');
        return null;
      }
    } catch (error) {
      console.error('❌ FCM: Error getting token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore
   */
  private async saveFcmTokenToFirestore(token: string): Promise<void> {
    try {
      const currentUserPhone =
        await this.userManagementService.getCurrentUserPhone();

      if (!currentUserPhone) {
        console.warn('FCM: No user phone found, cannot save token');
        return;
      }

      const userDocRef = doc(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        currentUserPhone,
      );

      await setDoc(
        userDocRef,
        {
          fcmToken: token,
          fcmTokenUpdatedAt: serverTimestamp(),
          platform: this.getPlatform(),
        },
        { merge: true },
      );

      console.log('✅ FCM: Token saved to Firestore');
    } catch (error) {
      console.error('❌ FCM: Error saving token to Firestore:', error);
    }
  }

  /**
   * Setup listener for foreground messages
   */
  private setupForegroundMessageListener(): void {
    if (!this.messaging) {
      return;
    }

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('📬 FCM: Foreground message received:', payload);

      // Extract notification data
      const notification: NotificationPayload = {
        title: payload.notification?.title || 'Notification',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        data: payload.data,
        timestamp: new Date(),
      };

      // Emit notification to subscribers
      this.notificationSubject.next(notification);

      // Show browser notification
      this.showBrowserNotification(notification);
    });
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: NotificationPayload): void {
    if (Notification.permission === 'granted') {
      const notificationOptions: NotificationOptions = {
        body: notification.body,
        icon: notification.icon || '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        data: notification.data,
        tag: 'food-delivery-notification',
        requireInteraction: false,
      };

      const browserNotification = new Notification(
        notification.title,
        notificationOptions,
      );

      // Handle notification click
      browserNotification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        browserNotification.close();

        // Handle navigation based on notification data
        if (notification.data?.url) {
          window.location.href = notification.data.url;
        }
      };
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  /**
   * Get platform information
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();

    if (/android/i.test(userAgent)) {
      return 'android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      return 'ios';
    } else {
      return 'web';
    }
  }

  /**
   * Delete FCM token (for logout)
   */
  async deleteToken(): Promise<void> {
    try {
      if (!this.messaging || !this.currentToken) {
        return;
      }

      // Note: deleteToken is not available in modular SDK
      // Token will be invalidated when user logs out
      this.currentToken = null;
      console.log('✅ FCM: Token cleared');
    } catch (error) {
      console.error('❌ FCM: Error deleting token:', error);
    }
  }

  /**
   * Refresh FCM token
   */
  async refreshToken(): Promise<string | null> {
    return await this.requestPermissionAndGetToken();
  }
}
