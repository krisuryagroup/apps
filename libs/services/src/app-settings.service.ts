import { Injectable, Injector, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FirebaseAuthService } from './firebase-auth.service';
import { ProductsService } from './products.service';
import { CategoriesService } from './categories.service';
import { Router } from '@angular/router';
import { CacheManagerService } from './cache-manager.service';
import {
  CacheManagementConfig,
  AppSettingsCacheConfig,
  OrderCancellationMessages,
} from '@zitro/models';
import {
  APP_SETTINGS_CACHE,
  AUTH_KEYS,
  CACHE_KEYS,
  UI_CONSTANTS,
  SUCCESS_MESSAGES,
} from '@zitro/utils';
import { Checkout } from '@zitro/models';
import { AuthConfig, DEFAULT_AUTH_CONFIG } from '@zitro/models';
import { AnalyticsConfigModel } from '@zitro/models';
import { FcmTokenService } from './fcm-token.service';
import { ConfigApiService } from './api/config-api.service';
import { RemoteSettingsApiService } from './api/remote-settings-api.service';

export interface AppSettings {
  id: string;
  isClearCacheMandatoryForOnlineOrder: boolean;
  isLoginClearCacheMandatoryForOnlineOrder: boolean;
  lastUpdated: string;
  cacheManagement?: CacheManagementConfig;
}

export interface ContactInfo {
  contactEmail: string;
  contactPhone: string;
}

export interface SmsConfigs {
  apiUrl: string;
  authKey: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private injector = inject(Injector);
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private cacheManager = inject(CacheManagerService);
  private configApi = inject(ConfigApiService);
  private remoteSettingsApi = inject(RemoteSettingsApiService);

  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private lastCheckTimestamp = 0;
  private lastCacheClearTimestamp = 0;
  private static readonly CHECK_COOLDOWN = 5 * 60 * 1000; // 5 minutes
  private static readonly CACHE_CLEAR_COOLDOWN = 2 * 60 * 1000; // 2 minutes
  private static readonly REMOTE_TIMEOUT_MS = 5000; // 5 seconds max
  private _authService: FirebaseAuthService | null = null;
  private _fcmTokenService: FcmTokenService | null = null;

  // Cache checkout settings to avoid repeated Firebase calls
  private _checkoutSettingsCache: Checkout | null = null;
  private _checkoutSettingsCacheTime = 0;
  private static readonly CHECKOUT_CACHE_DURATION = 10 * 60 * 1000;

  // Lazy getter for auth service to avoid circular dependency during APP_INITIALIZER
  private get authService(): FirebaseAuthService {
    if (!this._authService) {
      this._authService = this.injector.get(FirebaseAuthService);
    }
    return this._authService;
  }

  // Lazy getter for FCM token service
  private get fcmTokenService(): FcmTokenService {
    if (!this._fcmTokenService) {
      this._fcmTokenService = this.injector.get(FcmTokenService);
    }
    return this._fcmTokenService;
  }

  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallbackValue: T,
    context: string,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        operation(),
        new Promise<T>((resolve) => {
          timeoutId = setTimeout(() => {
            console.warn(
              `[STARTUP] ${context} timed out after ${timeoutMs}ms, using fallback`,
            );
            resolve(fallbackValue);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Generate restaurant-specific cache key by appending restaurant ID
   */
  private getRestaurantSpecificCacheKey(baseKey: string): string {
    const restaurantId =
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
      'default';
    return `${baseKey}_${restaurantId}`;
  }

  /**
   * Get all restaurant-specific cache keys for cleanup
   */
  private getAllRestaurantCacheKeys(): string[] {
    const baseKeys = [
      CACHE_KEYS.PRODUCTS_CACHE,
      CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP,
      CACHE_KEYS.CATEGORIES_CACHE,
      CACHE_KEYS.USER_FAVORITES,
      CACHE_KEYS.GUEST_FAVORITES,
      CACHE_KEYS.CART_STORAGE,
      CACHE_KEYS.ORDER_HISTORY_CACHE,
      APP_SETTINGS_CACHE.LAST_CACHE_CLEAR,
      APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR,
    ];

    const restaurantId =
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
      'default';
    return baseKeys.map((key) => `${key}_${restaurantId}`);
  }

  async getAnalyticConfigs(): Promise<AnalyticsConfigModel | null> {
    // Analytics config has been removed from Firestore.
    // Return null — callers already handle null gracefully.
    return null;
  }

  /**
   * Fetch open/close time and the cancellation window from the backend config API.
   * Migrated off Firestore (appSettings/restaurantDetails/onlineorders/checkout).
   * deliveryFee/packagingChargesPerItem are zeroed — pricing now comes from the
   * business pricingConfig, and this was their only remaining reader.
   * orderCancellationMessages/orderCancellationConfig have no REST source yet —
   * left undefined, which every downstream cancellation-message method already
   * falls back from safely.
   */
  async getCheckoutSettings(): Promise<Checkout> {
    // Return cached value if available and not expired
    const now = Date.now();
    if (
      this._checkoutSettingsCache &&
      now - this._checkoutSettingsCacheTime <
        AppSettingsService.CHECKOUT_CACHE_DURATION
    ) {
      return this._checkoutSettingsCache;
    }

    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      const settings = {
        deliveryFee: 0,
        packagingChargesPerItem: 0,
        openTime: config.business.openTime || '10:00',
        closeTime: config.business.closeTime || '21:00',
        // Backend field is misnamed "Minutes" but its configured value (90) is
        // actually seconds, matching this field's unit — see zitro-api ZitroOptions.cs.
        orderCancellationTimeLimit:
          config.orders.cancellationTimeLimitMinutes ?? 90,
      } as Checkout;

      this._checkoutSettingsCache = settings;
      this._checkoutSettingsCacheTime = now;
      return settings;
    } catch (error) {
      console.error('Error fetching checkout settings:', error);
      // Return cached value if available, even if expired
      if (this._checkoutSettingsCache) {
        return this._checkoutSettingsCache;
      }
      return {
        deliveryFee: 0,
        packagingChargesPerItem: 0,
        openTime: '10:00',
        closeTime: '21:00',
        orderCancellationTimeLimit: 90,
      } as Checkout;
    }
  }

  /**
   * Fetch delivery time in minutes from the backend API.
   */
  async getDeliveryTime(): Promise<number> {
    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      return config.orders.deliveryTimeMinutes;
    } catch (error) {
      console.error('Error fetching delivery time:', error);
      return 45;
    }
  }

  async getWhatsAppLink(): Promise<string> {
    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      return (
        config.business.whatsAppLink || 'https://wa.me/919193116659?text=Hi'
      );
    } catch (error) {
      console.error('Error fetching WhatsApp link:', error);
      return 'https://wa.me/919193116659?text=Hi';
    }
  }

  async getContactInfo(): Promise<ContactInfo> {
    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      return {
        contactEmail: config.business.contactEmail,
        contactPhone: config.business.contactPhone,
      };
    } catch (error) {
      console.error('Error fetching contact info:', error);
      return { contactEmail: '', contactPhone: '' };
    }
  }

  async getTestPhoneNumbers(): Promise<string[]> {
    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      return config.testPhoneNumbers ?? [];
    } catch (error) {
      console.error('❌ Error fetching test phone numbers:', error);
      return [];
    }
  }

  /**
   * Fetch auth configuration from the backend API (GET /api/app-config).
   * Falls back to DEFAULT_AUTH_CONFIG if the API is unreachable.
   */
  async getAuthConfig(): Promise<AuthConfig> {
    try {
      const config = await firstValueFrom(this.configApi.getAppConfig());
      return {
        sms: {
          isFast2SmsPhoneAuthentication:
            config.auth.sms.isFast2SmsPhoneAuthentication,
          isFirebasePhoneAuthentication:
            config.auth.sms.isFirebasePhoneAuthentication,
          resendOTPAllowed: config.auth.sms.resendOTPAllowed,
          resendOTPTime: config.auth.sms.resendOTPTime,
        },
        ui: {
          guestButtonLabel: config.auth.ui.guestButtonLabel,
          guestDescription: config.auth.ui.guestDescription,
          header: config.auth.ui.header,
          headerDescription: config.auth.ui.headerDescription,
          sendOTPButtonLabel: config.auth.ui.sendOTPButtonLabel,
          sendOTPPlaceholder: config.auth.ui.sendOTPPlaceholder,
          validateOTPButtonLabel: config.auth.ui.validateOTPButtonLabel,
          verifyOTPPlaceholder: config.auth.ui.verifyOTPPlaceholder,
          otpSentSuccessMessage: config.auth.ui.otpSentSuccessMessage,
          otpSentFailureMessage: config.auth.ui.otpSentFailureMessage,
          resendOTPLabel: config.auth.ui.resendOTPLabel,
        },
      };
    } catch (error) {
      console.error('❌ Error fetching auth config from API:', error);
      return DEFAULT_AUTH_CONFIG;
    }
  }

  /**
   * SMS credentials are secrets — never sent to the frontend.
   * The backend handles all SMS sending. This method now always returns null.
   */
  async getSmsConfigs(): Promise<SmsConfigs | null> {
    return null;
  }

  /**
   * Main initialization method for APP_INITIALIZER
   * Ensures settings are checked only once during app startup
   */
  async initializeAndCheckSettings(): Promise<void> {
    console.log('🚀 App Settings Service: Initializing...');

    // Prevent multiple simultaneous initializations
    if (this.isInitialized) {
      console.log('✅ App Settings Service: Already initialized, skipping');
      return Promise.resolve();
    }

    if (this.isInitializing && this.initializationPromise) {
      console.log('⏳ App Settings Service: Already initializing, waiting...');
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this.performSettingsCheck();

    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.lastCheckTimestamp = Date.now();
      console.log(
        '✅ App Settings Service: Initialization completed successfully',
      );
    } catch (error) {
      console.error('❌ App Settings Service: Failed to initialize:', error);
      // Don't block app initialization on settings failure
    } finally {
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  /**
   * Optional manual refresh - can be called during app runtime
   * Includes cooldown to prevent excessive Firebase calls
   */
  async refreshSettings(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTimestamp;

    // Respect cooldown period
    if (timeSinceLastCheck < AppSettingsService.CHECK_COOLDOWN) {
      console.log(
        `Settings check cooldown active. Try again in ${Math.ceil((AppSettingsService.CHECK_COOLDOWN - timeSinceLastCheck) / 1000)} seconds.`,
      );
      return;
    }

    this.lastCheckTimestamp = now;
    await this.performSettingsCheck();
  }

  /**
   * Core settings check logic
   */
  private async performSettingsCheck(): Promise<void> {
    try {
      const t0 = performance.now();
      console.log(
        '[STARTUP] AppSettings.performSettingsCheck — remote-settings fetch start',
      );
      const settings = await this.getAppSettings();
      console.log(
        '[STARTUP] AppSettings.getAppSettings done in',
        (performance.now() - t0).toFixed(0),
        'ms — found?',
        !!settings,
      );

      if (settings) {
        // Update cache manager with new configuration
        if (settings.cacheManagement) {
          this.cacheManager.updateCacheConfig(settings.cacheManagement);
        }

        const t1 = performance.now();
        await this.handleCacheClearRequirement(settings);
        console.log(
          '[STARTUP] AppSettings.handleCacheClear done in',
          (performance.now() - t1).toFixed(0),
          'ms',
        );
        await this.handleLoginClearRequirement(settings);
        console.log(
          '[STARTUP] AppSettings.performSettingsCheck total',
          (performance.now() - t0).toFixed(0),
          'ms',
        );
      } else {
        console.warn(
          '[STARTUP] AppSettings: No settings found in Firebase — took',
          (performance.now() - t0).toFixed(0),
          'ms',
        );
      }
    } catch (error) {
      console.error('Error checking app settings:', error);
      // Don't throw error to prevent blocking app initialization
    }
  }

  /**
   * Get remote settings from the backend (force-logout / cache-clear triggers).
   * Migrated off Firestore — GET /api/app-config/remote-settings.
   */
  private async getAppSettings(): Promise<AppSettings | null> {
    return this.withTimeout(
      async () => {
        const _tFs = performance.now();
        const settings = await firstValueFrom(
          this.remoteSettingsApi.getRemoteSettings(),
        );
        console.log(
          '[STARTUP] AppSettings remote-settings fetch took',
          (performance.now() - _tFs).toFixed(0),
          'ms',
        );

        return {
          id: 'default',
          isClearCacheMandatoryForOnlineOrder: settings.isClearCacheMandatory,
          isLoginClearCacheMandatoryForOnlineOrder:
            settings.isLoginClearCacheMandatory,
          lastUpdated: settings.updatedAt,
          cacheManagement: settings.cacheManagementJson
            ? (JSON.parse(
                settings.cacheManagementJson,
              ) as CacheManagementConfig)
            : undefined,
        } as AppSettings;
      },
      AppSettingsService.REMOTE_TIMEOUT_MS,
      null,
      'AppSettings remote-settings fetch',
    ).catch((error) => {
      console.error(
        '❌ App Settings Service: Error fetching remote settings:',
        error,
      );
      return null;
    });
  }

  /**
   * Handle cache clear requirement
   */
  private async handleCacheClearRequirement(
    settings: AppSettings,
  ): Promise<void> {
    console.log('🧹 App Settings Service: Checking cache clear requirement...');

    // Check if we're in the middle of a restaurant switch
    const isRestaurantSwitching =
      sessionStorage.getItem('restaurant_switching') === 'true';
    const restaurantSwitchTimestamp = sessionStorage.getItem(
      'restaurant_switch_timestamp',
    );

    if (isRestaurantSwitching && restaurantSwitchTimestamp) {
      const switchTime = parseInt(restaurantSwitchTimestamp);
      const timeSinceSwitch = Date.now() - switchTime;

      // If restaurant switch happened recently (within 10 seconds), skip cache clear to avoid conflicts
      if (timeSinceSwitch < 10000) {
        console.log(
          '🔄 App Settings Service: Restaurant switch in progress - skipping cache clear to preserve restaurant selection',
        );
        // Clear the restaurant switching flags after checking
        sessionStorage.removeItem('restaurant_switching');
        sessionStorage.removeItem('restaurant_switch_timestamp');
        return;
      }
    }

    if (!settings.isClearCacheMandatoryForOnlineOrder) {
      console.log(
        'ℹ️ App Settings Service: Cache clear not required by settings',
      );
      return;
    }

    // Get the timestamp when we last cleared cache locally (restaurant-specific)
    const lastCacheClearTimestamp = localStorage.getItem(
      this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_CACHE_CLEAR),
    );
    const settingsTimestamp = new Date(settings.lastUpdated).getTime();

    // If no previous cache clear timestamp exists, consider it as never cleared (0)
    const lastLocalClearTime = lastCacheClearTimestamp
      ? parseInt(lastCacheClearTimestamp)
      : 0;

    console.log('📅 App Settings Service: Timestamp comparison:', {
      firebaseLastUpdated: new Date(settingsTimestamp).toISOString(),
      localLastClearTime: lastLocalClearTime
        ? new Date(lastLocalClearTime).toISOString()
        : 'Never cleared',
      shouldClearCache: settingsTimestamp > lastLocalClearTime,
      restaurantId:
        localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
        'default',
    });

    // If Firebase settings were updated AFTER our last local cache clear, perform cache clear
    if (settingsTimestamp > lastLocalClearTime) {
      console.log(
        '🚨 App Settings Service: Cache clear required - Firebase settings updated after last local clear',
      );

      // Check if we already cleared cache in this session to prevent infinite loops
      const sessionFlag = sessionStorage.getItem(
        APP_SETTINGS_CACHE.CACHE_CLEAR_SESSION_FLAG,
      );
      if (sessionFlag) {
        console.log(
          '🛑 App Settings Service: Cache already cleared in this session - skipping to prevent infinite loop',
        );
        return;
      }

      // Check if we recently cleared cache to prevent rapid multiple clears
      const now = Date.now();
      const timeSinceLastClear = now - this.lastCacheClearTimestamp;

      if (timeSinceLastClear < AppSettingsService.CACHE_CLEAR_COOLDOWN) {
        console.log(
          `⏳ App Settings Service: Cache clear cooldown active. Skipping clear (${Math.ceil((AppSettingsService.CACHE_CLEAR_COOLDOWN - timeSinceLastClear) / 1000)}s remaining)`,
        );
        return;
      }

      try {
        // Set session flag BEFORE clearing to prevent repeated attempts
        sessionStorage.setItem(
          APP_SETTINGS_CACHE.CACHE_CLEAR_SESSION_FLAG,
          Date.now().toString(),
        );

        this.lastCacheClearTimestamp = now;
        await this.clearAllCacheExceptLogin();

        // Save the FIREBASE TIMESTAMP as the cache clear timestamp ONLY AFTER successful cache clear
        // This ensures future Firebase updates will be properly detected
        localStorage.setItem(
          this.getRestaurantSpecificCacheKey(
            APP_SETTINGS_CACHE.LAST_CACHE_CLEAR,
          ),
          settingsTimestamp.toString(),
        );
        console.log(
          '✅ App Settings Service: Cache cleared successfully, saved Firebase timestamp:',
          new Date(settingsTimestamp).toISOString(),
          'for restaurant:',
          localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
            'default',
        );
      } catch (error) {
        console.error('❌ App Settings Service: Failed to clear cache:', error);
        // Clear the session flag if cache clear failed so we can try again
        sessionStorage.removeItem(APP_SETTINGS_CACHE.CACHE_CLEAR_SESSION_FLAG);
        this.lastCacheClearTimestamp = 0;
      }
    } else {
      console.log(
        '✅ App Settings Service: Cache is up to date - no clear needed',
      );
      console.log(
        `   Last Firebase update: ${new Date(settingsTimestamp).toISOString()}`,
      );
      console.log(
        `   Last local cache clear: ${new Date(lastLocalClearTime).toISOString()}`,
      );
    }
  }

  /**
   * Handle login clear requirement (force logout)
   * Force logout is triggered ONCE per device when enabled in Firebase
   * Admin controls this through the cache management component
   */
  private async handleLoginClearRequirement(
    settings: AppSettings,
  ): Promise<void> {
    console.log('🔐 App Settings Service: Checking login clear requirement...');

    // **CRITICAL: Only proceed if force logout is explicitly enabled**
    if (!settings.isLoginClearCacheMandatoryForOnlineOrder) {
      console.log(
        'ℹ️ App Settings Service: Force logout is DISABLED in Firebase - users will stay logged in',
      );
      return;
    }

    console.log(
      '⚠️ App Settings Service: Force logout is ENABLED in Firebase - checking if logout is needed for this device...',
    );

    // Check if we're in the middle of a restaurant switch
    const isRestaurantSwitching =
      sessionStorage.getItem('restaurant_switching') === 'true';
    const restaurantSwitchTimestamp = sessionStorage.getItem(
      'restaurant_switch_timestamp',
    );

    if (isRestaurantSwitching && restaurantSwitchTimestamp) {
      const switchTime = parseInt(restaurantSwitchTimestamp);
      const timeSinceSwitch = Date.now() - switchTime;

      // If restaurant switch happened recently (within 10 seconds), skip login clear to avoid conflicts
      if (timeSinceSwitch < 10000) {
        console.log(
          '🔄 App Settings Service: Restaurant switch in progress - skipping login clear to preserve restaurant selection',
        );
        return;
      }
    }

    // Get the timestamp when we last cleared login locally (restaurant-specific)
    const lastLoginClearTimestamp = localStorage.getItem(
      this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR),
    );
    const settingsTimestamp = new Date(settings.lastUpdated).getTime();

    // **KEY LOGIC: First time or app update - initialize without logout**
    if (!lastLoginClearTimestamp) {
      console.log(
        '📱 App Settings Service: First launch or new installation detected',
      );
      console.log(
        '   Initializing login timestamp to prevent unnecessary logout',
      );

      // Save current Firebase timestamp to prevent logout on first launch
      localStorage.setItem(
        this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR),
        settingsTimestamp.toString(),
      );

      console.log(
        '✅ App Settings Service: Login timestamp initialized:',
        new Date(settingsTimestamp).toISOString(),
      );
      console.log(
        '   Device will only logout if Firebase timestamp is updated in future',
      );
      return;
    }

    const lastLocalLoginClearTime = parseInt(lastLoginClearTimestamp);

    console.log('📅 App Settings Service: Login clear timestamp comparison:', {
      firebaseLastUpdated: new Date(settingsTimestamp).toISOString(),
      localLastLoginClearTime: new Date(lastLocalLoginClearTime).toISOString(),
      shouldForceLogout: settingsTimestamp > lastLocalLoginClearTime,
      timeDifference: `${Math.round((settingsTimestamp - lastLocalLoginClearTime) / 1000)}s`,
      forceLogoutEnabled: settings.isLoginClearCacheMandatoryForOnlineOrder,
    });

    // **FORCE LOGOUT: Only if Firebase timestamp is NEWER than local timestamp**
    // This means admin intentionally updated Firebase to trigger logout
    if (settingsTimestamp > lastLocalLoginClearTime) {
      console.log(
        '🚨 App Settings Service: Force logout required - Firebase timestamp is newer',
      );
      console.log(
        '   Admin triggered force logout by updating Firebase timestamp',
      );
      console.log(
        "   This device will logout ONCE and won't logout again unless Firebase is updated",
      );

      try {
        await this.forceLogout();

        // **CRITICAL: Save Firebase timestamp AFTER successful logout**
        // This prevents the same device from logging out again
        localStorage.setItem(
          this.getRestaurantSpecificCacheKey(
            APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR,
          ),
          settingsTimestamp.toString(),
        );

        console.log('✅ App Settings Service: Logout completed successfully');
        console.log(
          '   Saved Firebase timestamp:',
          new Date(settingsTimestamp).toISOString(),
        );
        console.log(
          '   Device will not logout again unless Firebase timestamp is updated',
        );
      } catch (error) {
        console.error(
          '❌ App Settings Service: Failed to force logout:',
          error,
        );
        // Don't save timestamp if logout failed - device will retry on next app launch
      }
    } else {
      console.log(
        '✅ App Settings Service: Device is up to date - no logout needed',
      );
      console.log(
        '   This device already logged out for the current Firebase timestamp',
      );
      console.log(
        '   Last logout was at:',
        new Date(lastLocalLoginClearTime).toISOString(),
      );
    }
  }

  /**
   * Clear all cache except login-related data
   */
  private async clearAllCacheExceptLogin(): Promise<void> {
    try {
      console.log('🧽 App Settings Service: Starting cache clear process...');

      // List of base cache keys to preserve (login-related, cache management, AND restaurant selection keys)
      const preserveBaseKeys: string[] = [
        AUTH_KEYS.FIREBASE_AUTH_USER,
        AUTH_KEYS.GUEST_MODE,
        AUTH_KEYS.USER_SESSION,
        AUTH_KEYS.AUTH_TOKEN,
        APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, // CRITICAL: Preserve restaurant selection during cache clear
      ];

      // Add restaurant-specific cache management keys
      const restaurantSpecificKeys: string[] = [
        this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_CACHE_CLEAR), // CRITICAL: Preserve this to prevent infinite loop
        this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR),
      ];

      const preserveKeys = [...preserveBaseKeys, ...restaurantSpecificKeys];

      // Get all localStorage keys BEFORE starting the clear process
      const allKeys = Object.keys(localStorage);
      console.log(
        '🔑 App Settings Service: Found localStorage keys:',
        allKeys.length,
        'Will preserve keys:',
        preserveKeys,
      );

      // Create a backup of keys we want to preserve
      const preservedData: { [key: string]: string } = {};
      preserveKeys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          preservedData[key] = value;
        }
      });

      console.log(
        '💾 App Settings Service: Preserving keys:',
        Object.keys(preservedData),
      );

      // Remove all keys except preserved ones
      let removedKeysCount = 0;
      allKeys.forEach((key) => {
        if (!preserveKeys.includes(key)) {
          localStorage.removeItem(key);
          removedKeysCount++;
        }
      });

      console.log(
        '🗑️ App Settings Service: Removed',
        removedKeysCount,
        'localStorage keys',
      );

      // Restore the preserved keys (in case they were accidentally removed)
      Object.keys(preservedData).forEach((key) => {
        localStorage.setItem(key, preservedData[key]);
      });

      // Clear sessionStorage (usually doesn't contain login data)
      const sessionKeysCount = Object.keys(sessionStorage).length;
      sessionStorage.clear();
      console.log(
        '🗑️ App Settings Service: Cleared',
        sessionKeysCount,
        'sessionStorage keys',
      );

      // Clear application caches
      await this.clearApplicationCaches();

      // Clear service-specific caches
      this.productsService.clearCache();
      this.categoriesService.clearCache();
      console.log('🧹 App Settings Service: Service caches cleared');

      console.log(
        '✅ App Settings Service: Cache cleared successfully (except login data and timestamps)',
      );

      // Show user notification
      this.showCacheClearNotification();

      // SAFER: Instead of immediate reload, let the app naturally refresh its data
      // The cleared cache will force fresh data loading on next requests
      console.log(
        'ℹ️ App Settings Service: Cache cleared - data will be refreshed on next requests',
      );

      // Optional: Only reload after a significant delay and with additional safety checks
      console.log(
        '🔄 App Settings Service: Scheduling optional page reload in',
        UI_CONSTANTS.RELOAD_DELAY + 5000,
        'ms',
      );
      setTimeout(() => {
        // Check if user is still on the page and if app is stable
        if (document.hidden) {
          console.log(
            '⚠️ App Settings Service: Page is hidden - skipping reload',
          );
          return;
        }

        // Check if we have the session flag (meaning we're in the reload cycle)
        const sessionFlag = sessionStorage.getItem(
          APP_SETTINGS_CACHE.CACHE_CLEAR_SESSION_FLAG,
        );
        if (sessionFlag) {
          const flagTime = parseInt(sessionFlag);
          const timeSinceFlag = Date.now() - flagTime;
          if (timeSinceFlag < 30000) {
            // Less than 30 seconds
            console.log(
              '⚠️ App Settings Service: Recently cleared cache - skipping reload to prevent loops',
            );
            return;
          }
        }

        console.log(
          '🔄 App Settings Service: Executing cautious page reload now',
        );
        window.location.reload();
      }, UI_CONSTANTS.RELOAD_DELAY + 5000); // Add extra 5 seconds for safety
    } catch (error) {
      console.error('❌ App Settings Service: Error clearing cache:', error);
    }
  }

  /**
   * Clear application-specific caches
   */
  private async clearApplicationCaches(): Promise<void> {
    // Clear any service-specific caches
    const cacheKeysToRemove = [
      CACHE_KEYS.PRODUCTS_CACHE,
      CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP,
      CACHE_KEYS.CATEGORIES_CACHE,
      CACHE_KEYS.USER_FAVORITES,
      CACHE_KEYS.CART_STORAGE,
      CACHE_KEYS.ORDER_HISTORY_CACHE,
    ];

    cacheKeysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Force logout user
   */
  private async forceLogout(): Promise<void> {
    try {
      // Remove FCM token from Firestore before logout
      await this.fcmTokenService.onUserLogout();

      // Preserve restaurant selection during force logout
      const selectedRestaurantId = localStorage.getItem(
        APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID,
      );

      // Clear all localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Restore restaurant selection
      if (selectedRestaurantId) {
        localStorage.setItem(
          APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID,
          selectedRestaurantId,
        );
      }

      // Sign out from Firebase Auth
      await this.authService.signOut();

      // Show logout notification
      this.showLogoutNotification();

      // Navigate to signin page
      setTimeout(() => {
        this.router.navigate(['/auth/signin']);
      }, UI_CONSTANTS.RELOAD_DELAY);
    } catch (error) {
      console.error('Error during force logout:', error);
    }
  }

  /**
   * Show cache clear notification to user
   */
  private showCacheClearNotification(): void {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 90%;
      ">
        ${SUCCESS_MESSAGES.CACHE_CLEARED}
      </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, UI_CONSTANTS.NOTIFICATION_DURATION.SHORT);
  }

  /**
   * Show logout notification to user
   */
  private showLogoutNotification(): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF9800;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 90%;
      ">
        ${SUCCESS_MESSAGES.LOGOUT_SUCCESS}
      </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, UI_CONSTANTS.NOTIFICATION_DURATION.MEDIUM);
  }

  /**
   * Manual cache clear for testing purposes
   */
  async manualCacheClear(): Promise<void> {
    await this.clearAllCacheExceptLogin();
  }

  /**
   * Manual logout for testing purposes
   */
  async manualLogout(): Promise<void> {
    await this.forceLogout();
  }

  /**
   * Get cache clear status for debugging (restaurant-specific)
   */
  getCacheStatus(): any {
    const lastCacheClearTimestamp = localStorage.getItem(
      this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_CACHE_CLEAR),
    );
    const lastLoginClearTimestamp = localStorage.getItem(
      this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR),
    );
    const restaurantId =
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
      'default';

    return {
      restaurantId,
      lastCacheClear: lastCacheClearTimestamp
        ? {
            timestamp: parseInt(lastCacheClearTimestamp),
            date: new Date(parseInt(lastCacheClearTimestamp)).toISOString(),
          }
        : 'Never',
      lastLoginClear: lastLoginClearTimestamp
        ? {
            timestamp: parseInt(lastLoginClearTimestamp),
            date: new Date(parseInt(lastLoginClearTimestamp)).toISOString(),
          }
        : 'Never',
      currentTime: {
        timestamp: Date.now(),
        date: new Date().toISOString(),
      },
    };
  }

  /**
   * Reset cache timestamps for testing (use with caution) - restaurant specific
   */
  resetCacheTimestamps(): void {
    localStorage.removeItem(APP_SETTINGS_CACHE.LAST_CACHE_CLEAR);
    localStorage.removeItem(APP_SETTINGS_CACHE.LAST_LOGIN_CLEAR);
    localStorage.removeItem('last_cache_clear_restaurant-123');

    console.log(
      '🔄 App Settings Service: Cache timestamps reset for restaurant:',
      localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID) ||
        'default',
    );
  }

  /**
   * Force cache clear with proper timestamp update (for testing/manual triggers)
   */
  async forceCacheClear(): Promise<void> {
    try {
      const settings = await this.getAppSettings();
      if (!settings) {
        console.error(
          '❌ App Settings Service: Cannot force cache clear - no settings available',
        );
        return;
      }

      const settingsTimestamp = new Date(settings.lastUpdated).getTime();

      console.log('🔧 App Settings Service: Force clearing cache...');
      await this.clearAllCacheExceptLogin();

      // Save Firebase timestamp to prevent future unnecessary clears (restaurant-specific)
      localStorage.setItem(
        this.getRestaurantSpecificCacheKey(APP_SETTINGS_CACHE.LAST_CACHE_CLEAR),
        settingsTimestamp.toString(),
      );
      console.log(
        '✅ App Settings Service: Force cache clear completed, saved Firebase timestamp:',
        new Date(settingsTimestamp).toISOString(),
      );
    } catch (error) {
      console.error(
        '❌ App Settings Service: Force cache clear failed:',
        error,
      );
    }
  }

  // ============================================================================
  // ORDER CANCELLATION CONFIGURATION METHODS
  // ============================================================================

  /**
   * Get order cancellation time limit in seconds from Firebase config
   */
  async getOrderCancellationTimeLimit(): Promise<number> {
    try {
      const checkout = await this.getCheckoutSettings();
      return checkout?.orderCancellationTimeLimit || 90; // Default 90 seconds
    } catch (error) {
      console.error('Error getting order cancellation time limit:', error);
      return 90; // Default fallback
    }
  }

  /**
   * Get order cancellation message with time placeholder replaced
   * @param key - Message key from OrderCancellationMessages interface
   * @param remainingSeconds - Optional: remaining seconds to replace {time} placeholder
   */
  async getOrderCancellationMessage(
    key: keyof OrderCancellationMessages,
    remainingSeconds?: number,
  ): Promise<string> {
    try {
      const checkout = await this.getCheckoutSettings();
      const messages = checkout?.orderCancellationMessages;

      if (!messages || !messages[key]) {
        return this.getDefaultCancellationMessage(key, remainingSeconds);
      }

      let message = messages[key];

      // Replace {time} placeholder with formatted time
      if (remainingSeconds !== undefined && typeof message === 'string') {
        const formattedTime = this.formatRemainingTime(remainingSeconds);
        message = message.replace('{time}', formattedTime);
      }

      return message as string;
    } catch (error) {
      console.error('Error getting order cancellation message:', error);
      return this.getDefaultCancellationMessage(key, remainingSeconds);
    }
  }

  /**
   * Get all refund info messages with time placeholder replaced
   * @param remainingSeconds - Optional: remaining seconds to replace {time} placeholder
   */
  async getRefundInfoMessages(remainingSeconds?: number): Promise<string[]> {
    try {
      const checkout = await this.getCheckoutSettings();
      const messages = checkout?.orderCancellationMessages;
      const refundInfo = messages?.refundInfo || this.getDefaultRefundInfo();

      if (remainingSeconds !== undefined) {
        const formattedTime = this.formatRemainingTime(remainingSeconds);
        return refundInfo.map((info) => info.replace('{time}', formattedTime));
      }

      return refundInfo;
    } catch (error) {
      console.error('Error getting refund info messages:', error);
      return this.getDefaultRefundInfo();
    }
  }

  /**
   * Check if order cancellation is enabled from Firebase config
   */
  async isOrderCancellationEnabled(): Promise<boolean> {
    try {
      const checkout = await this.getCheckoutSettings();
      const config = checkout?.orderCancellationConfig;
      return config?.enabled ?? true; // Default enabled
    } catch (error) {
      console.error('Error checking if order cancellation is enabled:', error);
      return true; // Default enabled
    }
  }

  /**
   * Check if countdown should be shown from Firebase config
   */
  async shouldShowCancellationCountdown(): Promise<boolean> {
    try {
      const checkout = await this.getCheckoutSettings();
      const config = checkout?.orderCancellationConfig;
      return config?.showCountdown ?? true; // Default show
    } catch (error) {
      console.error('Error checking if countdown should be shown:', error);
      return true; // Default show
    }
  }

  /**
   * Get allowed order statuses for cancellation from Firebase config
   */
  async getAllowedCancellationStatuses(): Promise<string[]> {
    try {
      const checkout = await this.getCheckoutSettings();
      const config = checkout?.orderCancellationConfig;
      return config?.allowedStatuses || ['pending', 'confirmed'];
    } catch (error) {
      console.error('Error getting allowed cancellation statuses:', error);
      return ['pending', 'confirmed'];
    }
  }

  /**
   * Format remaining time in human-readable format
   */
  formatRemainingTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return remainingSeconds > 0
        ? `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`
        : `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  /**
   * Get default message fallback
   */
  private getDefaultCancellationMessage(
    key: keyof OrderCancellationMessages,
    remainingSeconds?: number,
  ): string {
    const defaults: Record<string, string | string[]> = {
      canCancelWithin: 'Order can be cancelled within {time}',
      noChargesMessage:
        'No charges will be applied for cancellation within this time frame',
      confirmationPrompt: 'Are you sure you want to cancel this order?',
      successMessage: 'Your order has been cancelled successfully',
      timeExpiredMessage:
        'The cancellation window has expired. Please contact restaurant for assistance.',
      refundInfo: this.getDefaultRefundInfo(),
      policyNotice:
        'Order can be cancelled within {time} of order placement without any charges. If you face any issue contact restaurant, check contact us page for contact details.',
    };

    let message = defaults[key] as string;

    // Replace {time} placeholder if seconds provided
    if (remainingSeconds !== undefined && typeof message === 'string') {
      const formattedTime = this.formatRemainingTime(remainingSeconds);
      message = message.replace('{time}', formattedTime);
    }

    return message;
  }

  /**
   * Get default refund info
   */
  private getDefaultRefundInfo(): string[] {
    return [
      'Orders can only be cancelled within {time} of placing',
      'Your refund will be processed if payment was made online',
      'This action cannot be undone',
    ];
  }

  /**
   * Get policy notice message for order placement modal
   * Displays during order processing with time placeholder replaced
   */
  async getPolicyNoticeMessage(): Promise<string> {
    try {
      const checkout = await this.getCheckoutSettings();
      const messages = checkout?.orderCancellationMessages;
      const timeLimit = checkout?.orderCancellationTimeLimit || 90;

      if (messages?.policyNotice) {
        const formattedTime = this.formatRemainingTime(timeLimit);
        return messages.policyNotice.replace('{time}', formattedTime);
      }

      // Default fallback with formatted time
      const formattedTime = this.formatRemainingTime(timeLimit);
      return `Order can be cancelled within ${formattedTime} of order placement without any charges. If you face any issue contact restaurant, check contact us page for contact details.`;
    } catch (error) {
      console.error('Error getting policy notice message:', error);
      return 'Order can be cancelled within 90 seconds of order placement without any charges. If you face any issue contact restaurant, check contact us page for contact details.';
    }
  }

  // ============================================================================
  // END ORDER CANCELLATION CONFIGURATION METHODS
  // ============================================================================

  /**
   * Trigger force logout for all devices (Admin function).
   * Migrated off Firestore — POST /api/admin/remote-settings/force-logout.
   * Each device will logout ONCE when they detect the new timestamp.
   */
  async triggerForceLogoutAllDevices(): Promise<void> {
    try {
      console.log(
        '🚨 App Settings Service: Triggering force logout for all devices...',
      );
      const result = await firstValueFrom(
        this.remoteSettingsApi.triggerForceLogout(),
      );
      console.log(
        '✅ App Settings Service: Force logout triggered successfully, updatedAt:',
        result.updatedAt,
      );
    } catch (error) {
      console.error(
        '❌ App Settings Service: Failed to trigger force logout:',
        error,
      );
      throw error;
    }
  }

  /**
   * Trigger a cache clear for all devices (Admin function).
   * Migrated off Firestore — POST /api/admin/remote-settings/cache-clear.
   * Each device will clear its local cache ONCE when it detects the new timestamp.
   */
  async triggerCacheClearAllDevices(
    cacheManagement?: CacheManagementConfig,
  ): Promise<void> {
    try {
      console.log(
        '🚨 App Settings Service: Triggering cache clear for all devices...',
      );
      const result = await firstValueFrom(
        this.remoteSettingsApi.triggerCacheClear(
          cacheManagement ? JSON.stringify(cacheManagement) : undefined,
        ),
      );
      console.log(
        '✅ App Settings Service: Cache clear triggered successfully, updatedAt:',
        result.updatedAt,
      );
    } catch (error) {
      console.error(
        '❌ App Settings Service: Failed to trigger cache clear:',
        error,
      );
      throw error;
    }
  }
}
