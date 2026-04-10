import { Injectable } from '@angular/core';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { getApp } from 'firebase/app';

/**
 * Service to handle device token generation for device-based restrictions
 * Uses Firebase Messaging token when available, falls back to UUID stored in localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceTokenService {
  private readonly DEVICE_ID_KEY = 'game_device_id';
  private messaging: Messaging | null = null;

  constructor() {
    try {
      const app = getApp();
      this.messaging = getMessaging(app);
    } catch (error) {
      console.warn('Firebase Messaging not available, will use fallback device ID:', error);
    }
  }

  /**
   * Get device token from Firebase Messaging or generate a unique device ID
   * @returns Promise<string> - Device token or unique device ID
   */
  async getDeviceToken(): Promise<string> {
    // Try to get Firebase Messaging token first
    if (this.messaging) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(this.messaging, {
            vapidKey: 'YOUR_VAPID_KEY' // Replace with your actual VAPID key from Firebase Console
          });
          if (token) {
            console.log('✅ Using Firebase Messaging token for device identification');
            return token;
          }
        }
      } catch (error) {
        console.warn('Failed to get Firebase Messaging token, using fallback:', error);
      }
    }

    // Fallback to UUID stored in localStorage
    return this.getOrCreateDeviceId();
  }

  /**
   * Get or create a unique device ID stored in localStorage
   * @returns string - Unique device ID
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    
    if (!deviceId) {
      // Generate a new unique device ID using crypto.randomUUID()
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        // Fallback for older browsers
        deviceId = this.generateUUID();
      }
      
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      console.log('✅ Generated new device ID:', deviceId);
    } else {
      console.log('✅ Using existing device ID from localStorage');
    }
    
    return deviceId;
  }

  /**
   * Fallback UUID generator for older browsers
   * @returns string - UUID v4 format
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Clear device ID (useful for testing)
   */
  clearDeviceId(): void {
    localStorage.removeItem(this.DEVICE_ID_KEY);
    console.log('🗑️ Device ID cleared');
  }
}
