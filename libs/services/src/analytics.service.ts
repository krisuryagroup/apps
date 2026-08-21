import { Injectable, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { doc, getDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
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
  PAYMENT_FAILED: 'payment_failed',
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
  UNINSTALL_TIME: 'uninstall_time',
} as const;

/**
 * Analytics Service - Centralized Firebase Analytics tracking
 *
 * This service handles all analytics events for the food delivery app.
 * Focus areas: User engagement, order conversion, and revenue tracking.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private firestore = inject(Firestore);

  private isInitialized = false;
  private initializationFailed = false;
  private eventConfigs: Record<string, boolean> = {};
  private disableAllEvents = false;
  private configsLoaded = false;

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

  // App version usage recording moved to REST — see ConfigApiService.postAppVersion()
  // (POST /api/app/version), called from AppComponent on startup.

  async setupEventConfigs(): Promise<void> {
    try {
      const docRef = doc(
        this.firestore,
        'appSettings/restaurantDetails/onlineorders/analyticConfigs',
      );
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('📊 Analytics Config:', data);
        this.applyConfigs(data['toggleAnalytics']);
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
    console.log(
      '🔧 Event configs loaded:',
      Object.keys(this.eventConfigs).length,
      'flags',
    );
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
      [AnalyticsParams.INSTALL_DATE]: new Date().toISOString(),
    });
  }

  async logAppResume(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_RESUME, {
      [AnalyticsParams.RESUME_TIME]: new Date().toISOString(),
    });
  }

  async logAppUninstall(): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_UNINSTALL, {
      [AnalyticsParams.UNINSTALL_TIME]: new Date().toISOString(),
    });
  }

  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCREEN_VIEW, {
      [AnalyticsParams.SCREEN_NAME]: screenName,
      [AnalyticsParams.SCREEN_CLASS]: screenClass || screenName,
    });
  }

  // ============================================
  // USER AUTHENTICATION EVENTS
  // ============================================

  async logSignUp(method: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SIGN_UP, {
      [AnalyticsParams.METHOD]: method,
    });
  }

  async logLogin(method: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGIN, {
      [AnalyticsParams.METHOD]: method,
    });
  }

  async logLogout(): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOGOUT, {});
  }

  // ============================================
  // PRODUCT & CATEGORY EVENTS
  // ============================================

  async logViewCategory(
    categoryId: string,
    categoryName: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_ITEM_LIST, {
      [AnalyticsParams.ITEM_LIST_ID]: categoryId,
      [AnalyticsParams.ITEM_LIST_NAME]: categoryName,
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
      [AnalyticsParams.ITEM_BRAND]: product.brand || '',
    });
  }

  // ============================================
  // USER PROFILE EVENTS
  // ============================================

  async logProfileUpdate(
    hasPhotoUpdate: boolean,
    fieldsUpdated: string[],
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.PROFILE_UPDATE, {
      [AnalyticsParams.HAS_PHOTO_UPDATE]: hasPhotoUpdate,
      [AnalyticsParams.FIELDS_UPDATED]: fieldsUpdated.join(','),
      [AnalyticsParams.UPDATE_COUNT]: fieldsUpdated.length,
    });
  }

  async logProfileView(): Promise<void> {
    await this.logEvent(AnalyticsEvents.PROFILE_VIEW, {
      [AnalyticsParams.SCREEN]: 'account',
    });
  }

  // ============================================
  // USER ENGAGEMENT - SCROLL TRACKING
  // ============================================

  async logScrollToRecommended(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_RECOMMENDED, {
      [AnalyticsParams.SECTION]: 'recommended',
      [AnalyticsParams.SCREEN]: 'home',
    });
  }

  async logScrollToPopular(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_POPULAR, {
      [AnalyticsParams.SECTION]: 'popular',
      [AnalyticsParams.SCREEN]: 'home',
    });
  }

  async logScrollToCategories(): Promise<void> {
    await this.logEvent(AnalyticsEvents.SCROLL_TO_CATEGORIES, {
      [AnalyticsParams.SECTION]: 'categories',
      [AnalyticsParams.SCREEN]: 'home',
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
      [AnalyticsParams.CURRENCY]: 'INR',
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
      [AnalyticsParams.CURRENCY]: 'INR',
    });
  }

  async logViewCart(cartValue: number, itemCount: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_CART, {
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.ITEM_COUNT]: itemCount,
      [AnalyticsParams.CURRENCY]: 'INR',
    });
  }

  async logBeginCheckout(
    cartValue: number,
    itemCount: number,
    items: any[],
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.BEGIN_CHECKOUT, {
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.ITEM_COUNT]: itemCount,
      [AnalyticsParams.CURRENCY]: 'INR',
      [AnalyticsParams.ITEMS]: items.map((item) => ({
        [AnalyticsParams.ITEM_ID]: item.id,
        [AnalyticsParams.ITEM_NAME]: item.name,
        [AnalyticsParams.PRICE]: item.price,
        [AnalyticsParams.QUANTITY]: item.quantity,
      })),
    });
  }

  async logAddPaymentInfo(
    paymentMethod: string,
    cartValue: number,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_PAYMENT_INFO, {
      [AnalyticsParams.PAYMENT_TYPE]: paymentMethod,
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR',
    });
  }

  async logAddShippingInfo(
    shippingTier: string,
    cartValue: number,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_SHIPPING_INFO, {
      shipping_tier: shippingTier,
      [AnalyticsParams.VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR',
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
      [AnalyticsParams.ITEMS]: order.items.map((item) => ({
        [AnalyticsParams.ITEM_ID]: item.id,
        [AnalyticsParams.ITEM_NAME]: item.name,
        [AnalyticsParams.PRICE]: item.price,
        [AnalyticsParams.QUANTITY]: item.quantity,
      })),
    });
  }

  async logOrderCancelled(
    orderId: string,
    value: number,
    reason?: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.ORDER_CANCELLED, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.VALUE]: value,
      [AnalyticsParams.CURRENCY]: 'INR',
      cancellation_reason: reason || 'user_cancelled',
    });
  }

  async logRefund(orderId: string, value: number): Promise<void> {
    await this.logEvent(AnalyticsEvents.REFUND, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.VALUE]: value,
      [AnalyticsParams.CURRENCY]: 'INR',
    });
  }

  // ============================================
  // COUPON & PROMOTION EVENTS
  // ============================================

  async logViewPromotion(
    promotionId: string,
    promotionName: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.VIEW_PROMOTION, {
      [AnalyticsParams.PROMOTION_ID]: promotionId,
      [AnalyticsParams.PROMOTION_NAME]: promotionName,
    });
  }

  async logSelectPromotion(
    promotionId: string,
    promotionName: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.SELECT_PROMOTION, {
      [AnalyticsParams.PROMOTION_ID]: promotionId,
      [AnalyticsParams.PROMOTION_NAME]: promotionName,
    });
  }

  async logApplyCoupon(
    couponCode: string,
    discount: number,
    cartValue: number,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.APPLY_COUPON, {
      [AnalyticsParams.COUPON_CODE]: couponCode,
      [AnalyticsParams.DISCOUNT_AMOUNT]: discount,
      [AnalyticsParams.CART_VALUE]: cartValue,
      [AnalyticsParams.CURRENCY]: 'INR',
    });
  }

  async logCouponFailed(couponCode: string, reason: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.COUPON_FAILED, {
      [AnalyticsParams.COUPON_CODE]: couponCode,
      failure_reason: reason,
    });
  }

  // ============================================
  // NOTIFICATION EVENTS
  // ============================================

  async logNotificationReceived(notificationType: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.NOTIFICATION_RECEIVED, {
      [AnalyticsParams.NOTIFICATION_TYPE]: notificationType,
    });
  }

  async logNotificationOpened(
    notificationType: string,
    notificationId?: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.NOTIFICATION_OPENED, {
      [AnalyticsParams.NOTIFICATION_TYPE]: notificationType,
      [AnalyticsParams.NOTIFICATION_ID]: notificationId || '',
    });
  }

  // ============================================
  // LOCATION & BUSINESS SELECTION
  // ============================================

  async logLocationPermission(granted: boolean): Promise<void> {
    await this.logEvent(AnalyticsEvents.LOCATION_PERMISSION, {
      [AnalyticsParams.PERMISSION_GRANTED]: granted ? 'granted' : 'denied',
    });
  }

  async logSelectBusiness(
    businessId: string,
    businessName: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.SELECT_BUSINESS, {
      [AnalyticsParams.BUSINESS_ID]: businessId,
      [AnalyticsParams.BUSINESS_NAME]: businessName,
    });
  }

  // ============================================
  // APP UPDATE EVENTS
  // ============================================

  /**
   * Track app update prompt shown
   */
  async logUpdatePromptShown(
    version: string,
    isMandatory: boolean,
  ): Promise<void> {
    await this.logEvent('update_prompt_shown', {
      app_version: version,
      is_mandatory: isMandatory,
    });
  }

  /**
   * Track app update accepted
   */
  async logUpdateAccepted(version: string): Promise<void> {
    await this.logEvent('update_accepted', {
      app_version: version,
    });
  }

  /**
   * Track app update declined
   */
  async logUpdateDeclined(version: string): Promise<void> {
    await this.logEvent('update_declined', {
      app_version: version,
    });
  }

  // ============================================
  // USER ENGAGEMENT EVENTS
  // ============================================

  async logShare(contentType: string, itemId?: string): Promise<void> {
    await this.logEvent(AnalyticsEvents.SHARE, {
      [AnalyticsParams.CONTENT_TYPE]: contentType,
      [AnalyticsParams.ITEM_ID]: itemId || '',
    });
  }

  async logAddToWishlist(
    productId: string,
    productName: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.ADD_TO_WISHLIST, {
      [AnalyticsParams.ITEM_ID]: productId,
      [AnalyticsParams.ITEM_NAME]: productName,
    });
  }

  async logRateOrder(orderId: string, rating: number): Promise<void> {
    await this.logEvent('rate_order', {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      rating: rating,
    });
  }

  // ============================================
  // ERROR & TECHNICAL EVENTS
  // ============================================

  async logError(
    errorType: string,
    errorMessage: string,
    screen?: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.APP_ERROR, {
      [AnalyticsParams.ERROR_TYPE]: errorType,
      [AnalyticsParams.ERROR_MESSAGE]: errorMessage,
      [AnalyticsParams.SCREEN_NAME]: screen || '',
    });
  }

  async logPaymentFailed(
    orderId: string,
    paymentMethod: string,
    errorReason: string,
  ): Promise<void> {
    await this.logEvent(AnalyticsEvents.PAYMENT_FAILED, {
      [AnalyticsParams.TRANSACTION_ID]: orderId,
      [AnalyticsParams.PAYMENT_METHOD]: paymentMethod,
      [AnalyticsParams.ERROR_REASON]: errorReason,
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
        params,
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
    operationName: string,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Analytics operation failed: ${operationName}`, error);
      return null;
    }
  }
}
