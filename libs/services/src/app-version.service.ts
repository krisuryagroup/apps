import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AppVersionConfig, VersionCheckResult } from '@zitro/models';
import { 
  FIREBASE_COLLECTIONS, 
  FIREBASE_DOCUMENTS, 
  FIREBASE_SUBCOLLECTIONS 
} from '@zitro/utils';

/**
 * Service to handle app version checking and updates
 * Only active on Android native app, skipped for web/browser
 */
@Injectable({
  providedIn: 'root'
})
export class AppVersionService {
  constructor(private firestore: Firestore) {}

  /**
   * Check if running as native Android app
   */
  isAndroidApp(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Get current app version from Capacitor (Android only)
   * Returns version from android/app/build.gradle
   */
  async getCurrentAppVersion(): Promise<string | null> {
    if (!this.isAndroidApp()) {
      console.log('ℹ️ App Version: Not Android app, skipping version check');
      return null;
    }

    try {
      const appInfo = await App.getInfo();
      console.log('📱 App Version: Current version:', appInfo.version);
      return appInfo.version;
    } catch (error) {
      console.error('❌ Error getting app version:', error);
      return null;
    }
  }

  /**
   * Fetch version config from Firebase
   * Path: appSettings/restaurantDetails/onlineorders/appSettings
   */
  async getVersionConfig(): Promise<AppVersionConfig | null> {
    try {
      const appSettingsDocRef = doc(
        this.firestore,
        FIREBASE_COLLECTIONS.APP_SETTINGS,
        FIREBASE_DOCUMENTS.APP_SETTINGS,
        FIREBASE_SUBCOLLECTIONS.ONLINE_ORDERS_SETTINGS,
        FIREBASE_COLLECTIONS.APP_SETTINGS
      );
      
      const appSettingsSnap = await getDoc(appSettingsDocRef);
      
      if (appSettingsSnap.exists()) {
        const data = appSettingsSnap.data();
        const versionConfig = data['appVersion'];
        
        if (versionConfig) {
          console.log('✅ Version config loaded from Firebase:', versionConfig);
          return versionConfig as AppVersionConfig;
        } else {
          console.warn('⚠️ No appVersion config found in Firebase');
        }
      } else {
        console.warn('⚠️ App settings document not found in Firebase');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching version config from Firebase:', error);
      return null;
    }
  }

  /**
   * Compare version strings using semantic versioning
   * @param v1 First version (e.g., "1.2.3")
   * @param v2 Second version (e.g., "1.2.4")
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Check if app update is needed
   * Returns null if no update needed or if running in browser
   */
  async checkForUpdate(): Promise<VersionCheckResult | null> {
    // Skip check if not Android app
    if (!this.isAndroidApp()) {
      console.log('🌐 Version Check: Skipped (running in browser/web)');
      return null;
    }

    try {
      console.log('🔍 Version Check: Starting...');
      
      const [currentVersion, config] = await Promise.all([
        this.getCurrentAppVersion(),
        this.getVersionConfig()
      ]);

      if (!currentVersion || !config) {
        console.warn('⚠️ Version Check: Missing version info, skipping');
        return null;
      }

      // Check if version check is enabled
      if (!config.enableVersionCheck) {
        console.log('ℹ️ Version Check: Disabled in Firebase config');
        return null;
      }

      console.log(`🔍 Comparing current version ${currentVersion} with config:`, {
        minimumVersion: config.minimumVersion,
        currentVersion: config.currentVersion,
        forceUpdateBelow: config.forceUpdateBelow
      });

      // Check force update below specific version (highest priority)
      if (config.forceUpdateBelow) {
        if (this.compareVersions(currentVersion, config.forceUpdateBelow) < 0) {
          console.log('🚫 Version Check: Force update required (below threshold)');
          return {
            needsUpdate: true,
            isMandatory: true,
            message: config.mandatoryUpdateMessage,
            storeUrl: config.playStoreUrl
          };
        }
      }

      // Check against minimum version
      if (this.compareVersions(currentVersion, config.minimumVersion) < 0) {
        console.log('🚫 Version Check: Update required (below minimum version)');
        return {
          needsUpdate: true,
          isMandatory: config.isUpdateMandatory,
          message: config.isUpdateMandatory ? config.mandatoryUpdateMessage : config.updateMessage,
          storeUrl: config.playStoreUrl
        };
      }

      // Check if newer version is available (optional update)
      if (this.compareVersions(currentVersion, config.currentVersion) < 0) {
        console.log('ℹ️ Version Check: Optional update available');
        return {
          needsUpdate: true,
          isMandatory: false,
          message: config.updateMessage,
          storeUrl: config.playStoreUrl
        };
      }

      console.log('✅ Version Check: App is up to date');
      return null; // No update needed
    } catch (error) {
      console.error('❌ Error checking for update:', error);
      // Don't block app on error
      return null;
    }
  }

  /**
   * Open Play Store for update
   * Only works on Android native app
   */
  async openPlayStore(url: string): Promise<void> {
    if (!this.isAndroidApp()) {
      console.warn('⚠️ Cannot open Play Store: Not running on Android app');
      return;
    }

    try {
      console.log('🔗 Opening Play Store:', url);
      
      // Try to use Capacitor Browser plugin
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ 
        url,
        presentationStyle: 'popover'
      });
    } catch (error) {
      console.error('❌ Error opening Play Store with Browser plugin:', error);
      
      // Fallback to window.open
      try {
        window.open(url, '_system');
      } catch (fallbackError) {
        console.error('❌ Fallback window.open also failed:', fallbackError);
      }
    }
  }
}
