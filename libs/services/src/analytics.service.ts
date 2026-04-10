import { Injectable } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { DeviceTokenService } from './device-token.service';
import { UserManagementService } from './user-management.service';
import { FIREBASE_COLLECTIONS } from '@zitro/utils';
import { SearchTermRecord } from '@zitro/models';
import { environment } from './environment';

/**
 * Analytics Event Names - Constants for all tracked events
 */
const AnalyticsEvents = {
  // Lifecycle
  APP_OPEN: 'app_open',
  APP_INSTALLED: 'app_installed',
  APP_RESUME: 'app_resume',
  APP_UNINSTALL: 'app_uninstall',
  SCREEN_VIEW: 'screen_view',
  
  // Authentication
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Product & Category
  VIEW_ITEM: 'view_item',
  VIEW_ITEM_LIST: 'view_item_list',
  SEARCH: 'search',
  
  // Profile
  PROFILE_UPDATE: 'profile_update',
  PROFILE_VIEW: 'profile_view',
  
  // Scroll Engagement
  SCROLL_TO_RECOMMENDED: 'scroll_to_recommended',
  SCROLL_TO_POPULAR: 'scroll_to_popular',
  SCROLL_TO_CATEGORIES: 'scroll_to_categories',
  
  // Cart & Checkout
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  VIEW_CART: 'view_cart',
  BEGIN_CHECKOUT: 'begin_checkout',
  ADD_PAYMENT_INFO: 'add_payment_info',
  ADD_SHIPPING_INFO: 'add_shipping_info',
  PURCHASE: 'purchase',
  
  // Coupon
  APPLY_COUPON: 'apply_coupon',
  COUPON_SUCCESS: 'coupon_success',
  COUPON_FAILED: 'coupon_failed',
  VIEW_PROMOTION: 'view_promotion',
  SELECT_PROMOTION: 'select_promotion',
  
  // Order
  ORDER_CANCELLED: 'order_cancelled',
  REFUND: 'refund',
  
  // Business & Location
  SELECT_BUSINESS: 'select_business',
  LOCATION_PERMISSION: 'location_permission',
  
  // Engagement
  SHARE: 'share',
  ADD_TO_WISHLIST: 'add_to_wishlist',
  
  // Notifications
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_OPENED: 'notification_opened',
  
  // Errors
  APP_ERROR: 'app_error',
  PAYMENT_FAILED: 'payment_failed'
} as const;

/**
 * Analytics Parameter Keys - Constants for parameter names
 */
const AnalyticsParams = {
  // Common
  METHOD: 'method',
  SCREEN_NAME: 'screen_name',
  SCREEN_CLASS: 'screen_class',
  
  // Items
  ITEM_ID: 'item_id',
  ITEM_NAME: 'item_name',
  ITEM_CATEGORY: 'item_category',
  ITEM_LIST_ID: 'item_list_id',
  ITEM_LIST_NAME: 'item_list_name',
  ITEM_BRAND: 'item_brand',
  PRICE: 'price',
  QUANTITY: 'quantity',
  
  // Search
  SEARCH_TERM: 'search_term',
  RESULTS_COUNT: 'results_count',
  
  // Profile
  HAS_PHOTO_UPDATE: 'has_photo_update',
  FIELDS_UPDATED: 'fields_updated',
  UPDATE_COUNT: 'update_count',
  
  // Scroll
  SECTION: 'section',
  SCREEN: 'screen',
  
  // Cart
  CART_VALUE: 'cart_value',
  ITEM_COUNT: 'item_count',
  
  // Transaction
  TRANSACTION_ID: 'transaction_id',
  VALUE: 'value',
  CURRENCY: 'currency',
  TAX: 'tax',
  SHIPPING: 'shipping',
  COUPON: 'coupon',
  ITEMS: 'items',
  
  // Payment
  PAYMENT_METHOD: 'payment_method',
  PAYMENT_TYPE: 'payment_type',
  DELIVERY_TYPE: 'delivery_type',
  
  // Coupon
  COUPON_CODE: 'coupon_code',
  DISCOUNT_AMOUNT: 'discount_amount',
  REASON: 'reason',
  
  // Promotion
  PROMOTION_ID: 'promotion_id',
  PROMOTION_NAME: 'promotion_name',
  
  // Business
  BUSINESS_ID: 'business_id',
  BUSINESS_NAME: 'business_name',
  
  // Location
  PERMISSION_GRANTED: 'permission_granted',
  
  // Engagement
  CONTENT_TYPE: 'content_type',
  
  // Notification
  NOTIFICATION_TYPE: 'notification_type',
  NOTIFICATION_ID: 'notification_id',
  
  // Error
  ERROR_TYPE: 'error_type',
  ERROR_MESSAGE: 'error_message',
  ERROR_REASON: 'error_reason',
  
  // Dates
  INSTALL_DATE: 'install_date',
  RESUME_TIME: 'resume_time',
  UNINSTALL_TIME: 'uninstall_time'
} as const;

/**
 * Analytics Service - Centralized Firebase Analytics tracking
 * 
 * This service handles all analytics events for the food delivery app.
 * Focus areas: User engagement, order conversion, and revenue tracking.
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private isInitialized = false;
  private initializationFailed = false;
  private eventConfigs: Record<string, boolean> = {};
  private disableAllEvents = false;
  private configsLoaded = false;

  constructor(
    private firestore: Firestore,
    private deviceTokenService: DeviceTokenService,
    private userManagementService: UserManagementService
  ) {}

  /**
   * Initialize Firebase Analytics
   * Call this method when the app starts
   */
  async initialize(): Promise<void> {
    try {
      await FirebaseAnalytics.setEnabled({ enabled: true });
      this.isInitialized = true;
      console.log('Firebase Analytics initialized');
    } catch (error) {
      this.initializationFailed = true;
      console.error('Error initializing Firebase Analytics:', error);
      // Don't throw - allow app to continue without analytics
    }
  }

  /**
   * Check if analytics is available and ready
   */
  private isAnalyticsAvailable(): boolean {
    if (this.initializationFailed) {
      return false;
    }
    if (!this.isInitialized) {
      console.warn('Analytics not initialized yet');
      return false;
    }
    return true;
  }

  /**
   * Set user ID for tracking
   */
  async setUserId(userId: string): Promise<void> {
    try {
      await FirebaseAnalytics.setUserId({ userId });
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperty(name: string, value: string): Promise<void> {
    try {
      await FirebaseAnalytics.setUserProperty({ key: name, value });
    } catch (error) {
      console.error('Error setting user property:', error);
    }
  }

  /**
   * Log app version usage - once per device per day
   * Tracks app version usage across different devices for analytics
   * Stores data in Firebase collection: appVersionUses
   * 
   * @param appVersion - The app version string (e.g., "1.0.0")
   * @param logAppVersionAnalytics - Flag to determine if app version analytics should be logged
   * @param logAppVersionFirebase - Flag to determine if app version should be logged to Firebase
   */
  async logAppVersion(appVersion: string, logAppVersionAnalytics:boolean, logAppVersionFirebase:boolean): Promise<void> {
    if (!this.isAnalyticsAvailable()) return;

    try {
      // Get device token (unique per device)
      const deviceId = await this.deviceTokenService.getDeviceToken();
      const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const versionLogKey = `app_version_logged_${deviceId}_${today}`;
      
      // Check if version was already logged today for this device
      const alreadyLogged = localStorage.getItem(versionLogKey);
      
      if (!alreadyLogged) {
        // Get user phone number from UserManagementService (more reliable)
        const userPhone = await this.userManagementService.getCurrentUserPhone() || 'guest';
        
        // Detect device type and platform
        const deviceType = this.getDeviceType();
        
        // Set user property for app version
        await this.setUserProperty('app_version', appVersion);
        
        if(logAppVersionAnalytics){
          // Log event with version info
          await FirebaseAnalytics.logEvent({
            name: 'app_version_check',
            params: {
              version: appVersion,
              platform: deviceType,
              device_id: deviceId,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        if(logAppVersionFirebase){
          // Store in Firebase collection for detailed tracking
          await this.storeAppVersionUsage({
            deviceId,
            userPhone,
            appVersion,
            deviceType,
            date: today,
            timestamp: new Date().toISOString()
          });
        }
        
        // Mark as logged for today
        localStorage.setItem(versionLogKey, 'true');
        
        // Clean up old version log keys (older than 7 days)
        this.cleanupOldVersionLogs();
        
        console.log(`📱 App version ${appVersion} logged for device ${deviceId} (${deviceType})`);
      }
    } catch (error) {
      console.error('Error logging app version:', error);
    }
  }

  /**
   * Detect device type based on platform and user agent
   * Returns: Android, iOS, Windows, MacOS, Linux, or Browser
   */
  private getDeviceType(): string {
    try {
      // Check if running as native app
      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === 'android') return 'Android';
        if (platform === 'ios') return 'iOS';
      }
      
      // Browser detection using user agent
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('android')) return 'Android Browser';
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS Browser';
      if (userAgent.includes('win')) return 'Windows Browser';
      if (userAgent.includes('mac')) return 'MacOS Browser';
      if (userAgent.includes('linux')) return 'Linux Browser';
      
      return 'Browser';
    } catch (error) {
      console.warn('Error detecting device type:', error);
      return 'Unknown';
    }
  }

  /**
   * Store app version usage data in Firebase collection
   * Collection: appVersionUses
   * Document ID: userPhone (e.g., +919643...) - one document per user
   * Maintains history of all devices and app versions used by that user
   */
  private async storeAppVersionUsage(data: {
    deviceId: string;
    userPhone: string;
    appVersion: string;
    deviceType: string;
    date: string;
    timestamp: string;
  }): Promise<void> {
    try {
      // Use userPhone as document ID to track all devices per user
      // For guest users, use 'guest' as document ID
      const documentId = data.userPhone || 'guest';
      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.APP_VERSION_USES, documentId);
      
      // Get existing document
      const userDoc = await getDoc(userDocRef);
      
      // New usage record with device information
      const usageRecord = {
        deviceId: data.deviceId,
        appVersion: data.appVersion,
        deviceType: data.deviceType,
        date: data.date,
        timestamp: data.timestamp,
        loggedAt: new Date().toISOString()
      };
      
      if (userDoc.exists()) {
        // Document exists - append to history array
        const existingData = userDoc.data();
        const history = existingData['history'] || [];
        
        await setDoc(userDocRef, {
          userPhone: data.userPhone,
          lastDeviceId: data.deviceId,
          lastDeviceType: data.deviceType,
          lastAppVersion: data.appVersion,
          lastUsedDate: data.date,
          lastUpdated: new Date().toISOString(),
          totalDevices: this.countUniqueDevices([...history, usageRecord]),
          history: [...history, usageRecord]
        }, { merge: true });
        
        console.log(`✅ App version usage updated in Firebase for user ${data.userPhone} (${history.length + 1} records)`);
      } else {
        // New document - create with first record
        await setDoc(userDocRef, {
          userPhone: data.userPhone,
          lastDeviceId: data.deviceId,
          lastDeviceType: data.deviceType,
          lastAppVersion: data.appVersion,
          lastUsedDate: data.date,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          totalDevices: 1,
          history: [usageRecord]
        });
        
        console.log(`✅ App version usage created in Firebase for user ${data.userPhone} (first record)`);
      }
    } catch (error) {
      console.error('❌ Error storing app version usage in Firebase:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Count unique devices in history
   */
  private countUniqueDevices(history: any[]): number {
    const uniqueDevices = new Set(history.map(record => record.deviceId));
    return uniqueDevices.size;
  }

  /**
   * Store search term in appVersionUses collection
   * Stores search terms with datetime and result counts
   */
  private async storeSearchTerm(searchTerm: string, resultsCount: number): Promise<void> {
    try {
      // Get user phone number
      const userPhone = await this.userManagementService.getCurrentUserPhone() || 'guest';
      
      // Get device information
      const deviceId = await this.deviceTokenService.getDeviceToken();
      const deviceType = this.getDeviceType();
      
      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.APP_VERSION_USES, userPhone);
      
      // Get existing document
      const userDoc = await getDoc(userDocRef);
      
      // Create new search term record
      const searchRecord: SearchTermRecord = {
        searchTerm,
        resultsCount,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        deviceId,
        deviceType
      };
      
      if (userDoc.exists()) {
        // Document exists - append to searchedTerms array
        const existingData = userDoc.data();
        const searchedTerms = existingData['searchedTerms'] || [];
        
        await setDoc(userDocRef, {
          searchedTerms: [...searchedTerms, searchRecord],
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Search term '${searchTerm}' stored in Firebase for user ${userPhone}`);
      } else {
        // New document - create with first search record
        await setDoc(userDocRef, {
          userPhone,
          searchedTerms: [searchRecord],
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Search term '${searchTerm}' created in Firebase for user ${userPhone} (first search)`);
      }
    } catch (error) {
      console.error('❌ Error storing search term in Firebase:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Clean up old version log keys from localStorage
   * Removes keys older than 7 days to prevent localStorage bloat
   */
  private cleanupOldVersionLogs(): void {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];
      
      // Get all keys from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('app_version_logged_')) {
          // Extract date from key (format: app_version_logged_userId_YYYY-MM-DD)
          const datePart = key.split('_').pop();
          if (datePart && datePart < cutoffDate) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning up version logs:', error);
    }
  }

  async setupEventConfigs(): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'appSettings/restaurantDetails/onlineorders/analyticConfigs');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📊 Analytics Config:', data);
        this.applyConfigs(data["toggleAnalytics"]);
      }
    } catch (error) {
      console.error('❌ Error loading analytics configurations:', error);
      console.log('✅ All events enabled by default (load failed)');
      this.disableAllEvents = false;
      this.eventConfigs = {};
      this.configsLoaded = true;
    }
  }

  /**
   * Apply configurations to service
   */
  private applyConfigs(configs: any): void {
    this.disableAllEvents = configs.disable_all_events === true;
    this.eventConfigs = { ...configs };
    this.configsLoaded = true;
    
    console.log('🔧 Disable all events:', this.disableAllEvents);
    console.log('🔧 Event configs loaded:', Object.keys(this.eventConfigs).length, 'flags');
  }

  /**
   * Check if a specific event is disabled
   */
  private isEventDisabled(eventName: string): boolean {
    // If all events are disabled, return true
    if (this.disableAllEvents) {
      return true;
    }
    
    // Check individual event config (e.g., disable_app_open for app_open event)
    const configKey = `disable_${eventName}`;
    return this.eventConfigs[configKey] === true;
  }

  // ============================================
  // APP LIFECYCLE EVENTS
  // ============================================

  async logAppOpen(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_OPEN, {});
  }

  async logAppInstalled(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_INSTALLED, {
      [AnalyticsParams.INSTALL_DATE]: new Date().toISOString()
    });
  }

  async logAppResume(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_RESUME, {
      [AnalyticsParams.RESUME_TIME]: new Date().toISOString()
    });
  }

  async logAppUninstall(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_UNINSTALL, {
      [AnalyticsParams.UNINSTALL_TIME]: new Date().toISOString()
    });
  }

  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCREEN_VIEW, {
      [AnalyticsParams.SCREEN_NAME]: screenName,
      [AnalyticsParams.SCREEN_CLASS]: screenClass || screenName
    });
  }

  // ============================================
  // USER AUTHENTICATION EVENTS
  // ============================================

  async logSignUp(method: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SIGN_UP, {
      [AnalyticsParams.METHOD]: method
    });
  }

  async logLogin(method: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGIN, {
      [AnalyticsParams.METHOD]: method
    });
  }

  async logLogout(): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGOUT, {});
  }

  // ============================================
  // PRODUCT & CATEGORY EVENTS
  // ============================================

  async logViewCategory(categoryId: string, categoryName: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_ITEM_LIST, {
      [AnalyticsParams.ITEM_LIST_ID]: categoryId,
      [AnalyticsParams.ITEM_LIST_NAME]: categoryName
    });
  }

  async logViewProduct(product: {
    id: string;
    name: string;
    category?: string;
    price?: number;
    brand?: string;
  }): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_ITEM, {
      [AnalyticsParams.ITEM_ID]: product.id,
      [AnalyticsParams.ITEM_NAME]: product.name,
      [AnalyticsParams.ITEM_CATEGORY]: product.category || '',
      [AnalyticsParams.PRICE]: product.price || 0,
      [AnalyticsParams.ITEM_BRAND]: product.brand || ''
    });
  }

  async logSearch(searchTerm: string, resultsCount?: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.SEARCH, {
      [AnalyticsParams.SEARCH_TERM]: searchTerm,
      [AnalyticsParams.RESULTS_COUNT]: resultsCount || 0
    });
    
    // Store search term in appVersionUses collection
    await this.storeSearchTerm(searchTerm, resultsCount || 0);
  }

  // ============================================
  // USER PROFILE EVENTS
  // ============================================

  async logProfileUpdate(hasPhotoUpdate: boolean, fieldsUpdated: string[]): Promise<void> {
    await this.logEvent(AnalyticsEvents.PROFILE_UPDATE, {
      [AnalyticsParams.HAS_PHOTO_UPDATE]: hasPhotoUpdate,
      [AnalyticsParams.FIELDS_UPDATED]: fieldsUpdated.join(','),
      [AnalyticsParams.UPDATE_COUNT]: fieldsUpdated.length
    });
  }

  async logProfileView(): Promise<void> {
    await this.logEvent(AnalyticsEvents.PROFILE_VIEW, {
      [AnalyticsParams.SCREEN]: 'account'
    });
  }

  // ============================================
  // USER ENGAGEMENT - SCROLL TRACKING
  // ============================================

  async logScrollToRecommended(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_RECOMMENDED, {
      [AnalyticsParams.SECTION]: 'recommended',
      [AnalyticsParams.SCREEN]: 'home'
    });
  }

  async logScrollToPopular(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_POPULAR, {
      [AnalyticsParams.SECTION]: 'popular',
      [AnalyticsParams.SCREEN]: 'home'
    });
  }

  async logScrollToCategories(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_CATEGORIES, {
      [AnalyticsParams.SECTION]: 'categories',
      [AnalyticsParams.SCREEN]: 'home'
    });
  }

  // ============================================
  // CART & CHECKOUT EVENTS (CRITICAL FOR ORDER GROWTH)
  // ============================================

  async logAddToCart(item: {
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_TO_CART, {
      [AnalyticsParams.ITEM_ID]: item.id,
      [AnalyticsParams.ITEM_NAME]: item.name,
      [AnalyticsParams.ITEM_CATEGORY]: item.category || '',
      [AnalyticsParams.PRICE]: item.price,
      [AnalyticsParams.QUANTITY]: item.quantity,
      [AnalyticsParams.VALUE]: item.price * item.quantity,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  async logRemoveFromCart(item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }): Promise<void> {
    await this.logEvent(AnalyticsEvents.REMOVE_FROM_CART, {
      [AnalyticsParams.ITEM_ID]: item.id,
      [AnalyticsParams.ITEM_NAME]: item.name,
      [AnalyticsParams.PRICE]: item.price,
      [AnalyticsParams.QUANTITY]: item.quantity,
      [AnalyticsParams.VALUE]: item.price * item.quantity,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  async logViewCart(cartValue: number, itemCount: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_CART, {
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.ITEM_COUNT]: itemCount,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  async logBeginCheckout(cartValue: number, itemCount: number, items: any[]): Promise<void> {
    await this.logEvent(AnalyticsEvents.BEGIN_CHECKOUT, {
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.ITEM_COUNT]: itemCount,
      [AnalyticsParams.CURRENCY]: 'INR',
      [AnalyticsParams.ITEMS]: items.map(item => ({
        [AnalyticsParams.ITEM_ID]: item.id,
        [AnalyticsParams.ITEM_NAME]: item.name,
        [AnalyticsParams.PRICE]: item.price,
        [AnalyticsParams.QUANTITY]: item.quantity
      }))
    });
  }

  async logAddPaymentInfo(paymentMethod: string, cartValue: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_PAYMENT_INFO, {
      [AnalyticsParams.PAYMENT_TYPE]: paymentMethod,
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  async logAddShippingInfo(shippingTier: string, cartValue: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_SHIPPING_INFO, {
      shipping_tier: shippingTier,
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  // ============================================
  // ORDER EVENTS (MOST CRITICAL)
  // ============================================

  /**
   * Track successful order - CRITICAL METRIC
   */
  async logPurchase(order: {
    orderId: string;
    value: number;
    tax?: number;
    shipping?: number;
    coupon?: string;
    paymentMethod: string;
    items: any[];
  }): Promise<void> {
    await this.logEvent(AnalyticsEvents.PURCHASE, {
      [AnalyticsParams.TRANSACTION_ID]: order.orderId,
      [AnalyticsParams.VALUE]: order.value,
      [AnalyticsParams.TAX]: order.tax || 0,
      [AnalyticsParams.SHIPPING]: order.shipping || 0,
      [AnalyticsParams.CURRENCY]: 'INR',
      [AnalyticsParams.COUPON]: order.coupon || '',
      [AnalyticsParams.PAYMENT_METHOD]: order.paymentMethod,
      [AnalyticsParams.ITEMS]: order.items.map(item => ({
        [AnalyticsParams.ITEM_ID]: item.id,
        [AnalyticsParams.ITEM_NAME]: item.name,
        [AnalyticsParams.PRICE]: item.price,
        [AnalyticsParams.QUANTITY]: item.quantity
      }))
    });
  }

  async logOrderCancelled(orderId: string, value: number, reason?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.ORDER_CANCELLED, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.VALUE]: value,
      [AnalyticsParams.CURRENCY]: 'INR',
      cancellation_reason: reason || 'user_cancelled'
    });
  }

  async logRefund(orderId: string, value: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.REFUND, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.VALUE]: value,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  // ============================================
  // COUPON & PROMOTION EVENTS
  // ============================================

  async logViewPromotion(promotionId: string, promotionName: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_PROMOTION, {
      [AnalyticsParams.PROMOTION_ID]: promotionId,
      [AnalyticsParams.PROMOTION_NAME]: promotionName
    });
  }

  async logSelectPromotion(promotionId: string, promotionName: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SELECT_PROMOTION, {
      [AnalyticsParams.PROMOTION_ID]: promotionId,
      [AnalyticsParams.PROMOTION_NAME]: promotionName
    });
  }

  async logApplyCoupon(couponCode: string, discount: number, cartValue: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.APPLY_COUPON, {
      [AnalyticsParams.COUPON_CODE]: couponCode,
      [AnalyticsParams.DISCOUNT_AMOUNT]: discount,
      [AnalyticsParams.CART_VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR'
    });
  }

  async logCouponFailed(couponCode: string, reason: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.COUPON_FAILED, {
      [AnalyticsParams.COUPON_CODE]: couponCode,
      failure_reason: reason
    });
  }

  // ============================================
  // NOTIFICATION EVENTS
  // ============================================

  async logNotificationReceived(notificationType: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.NOTIFICATION_RECEIVED, {
      [AnalyticsParams.NOTIFICATION_TYPE]: notificationType
    });
  }

  async logNotificationOpened(notificationType: string, notificationId?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.NOTIFICATION_OPENED, {
      [AnalyticsParams.NOTIFICATION_TYPE]: notificationType,
      [AnalyticsParams.NOTIFICATION_ID]: notificationId || ''
    });
  }

  // ============================================
  // LOCATION & BUSINESS SELECTION
  // ============================================

  async logLocationPermission(granted: boolean): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOCATION_PERMISSION, {
      [AnalyticsParams.PERMISSION_GRANTED]: granted ? 'granted' : 'denied'
    });
  }

  async logSelectBusiness(businessId: string, businessName: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SELECT_BUSINESS, {
      [AnalyticsParams.BUSINESS_ID]: businessId,
      [AnalyticsParams.BUSINESS_NAME]: businessName
    });
  }

  // ============================================
  // APP UPDATE EVENTS
  // ============================================

  /**
   * Track app update prompt shown
   */
  async logUpdatePromptShown(version: string, isMandatory: boolean): Promise<void> {
    await this.logEvent('update_prompt_shown', {
      app_version: version,
      is_mandatory: isMandatory
    });
  }

  /**
   * Track app update accepted
   */
  async logUpdateAccepted(version: string): Promise<void> {
    await this.logEvent('update_accepted', {
      app_version: version
    });
  }

  /**
   * Track app update declined
   */
  async logUpdateDeclined(version: string): Promise<void> {
    await this.logEvent('update_declined', {
      app_version: version
    });
  }

  // ============================================
  // USER ENGAGEMENT EVENTS
  // ============================================

  async logShare(contentType: string, itemId?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SHARE, {
      [AnalyticsParams.CONTENT_TYPE]: contentType,
      [AnalyticsParams.ITEM_ID]: itemId || ''
    });
  }

  async logAddToWishlist(productId: string, productName: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_TO_WISHLIST, {
      [AnalyticsParams.ITEM_ID]: productId,
      [AnalyticsParams.ITEM_NAME]: productName
    });
  }

  async logRateOrder(orderId: string, rating: number): Promise<void> {
    await this.logEvent('rate_order', {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      rating: rating
    });
  }

  // ============================================
  // ERROR & TECHNICAL EVENTS
  // ============================================

  async logError(errorType: string, errorMessage: string, screen?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_ERROR, {
      [AnalyticsParams.ERROR_TYPE]: errorType,
      [AnalyticsParams.ERROR_MESSAGE]: errorMessage,
      [AnalyticsParams.SCREEN_NAME]: screen || ''
    });
  }

  async logPaymentFailed(orderId: string, paymentMethod: string, errorReason: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.PAYMENT_FAILED, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.PAYMENT_METHOD]: paymentMethod,
      [AnalyticsParams.ERROR_REASON]: errorReason
    });
  }

  // ============================================
  // GENERIC EVENT LOGGER
  // ============================================

  /**
   * Log custom event with parameters
   * Auto-loads configs from Firebase/cache if not loaded yet
   * This method includes comprehensive error handling to prevent app crashes
   */
  async logEvent(name: string, params: Record<string, any>): Promise<void> {
    // Fail silently if analytics is not available
    if (!this.isAnalyticsAvailable() || environment.production === false) {
      return;
    }

    try {
      // Auto-load configs if not loaded yet (with 24h cache)
      if (!this.configsLoaded) {
        await this.setupEventConfigs();
      }

      // Check if this event is disabled via Firebase config
      if (this.configsLoaded && this.isEventDisabled(name)) {
        console.log(`📊 Analytics Event Skipped (disabled): ${name}`);
        return;
      }
      await FirebaseAnalytics.logEvent({
        name,
        params
      });
      console.log(`📊 Analytics Event Logged: ${name}`, params);
    } catch (error) {
      console.error(`❌ Error logging event ${name}:`, error);
      // Never throw - analytics failures should never crash the app
    }
  }

  /**
   * Safely execute an analytics operation with error handling
   * Use this for critical operations where you want extra safety
   */
  private async safeExecute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Analytics operation failed: ${operationName}`, error);
      return null;
    }
  }
}
