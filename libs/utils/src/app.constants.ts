// Re-export CacheType enum for convenience
export { CacheType } from '@zitro/models';

// Application-wide constants
export const APP_CONSTANTS = {
  // Firebase Collections
  FIREBASE_COLLECTIONS: {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    ONLINE_ORDERS: 'onlineorders', // Fixed: was 'onlineOrders' but code uses 'onlineorders'
    ONLINE_USERS: 'onlineUsers',
    APP_SETTINGS: 'appSettings',
    USER_FAVORITES: 'favorites', // Fixed: was 'userFavorites' but code uses 'favorites'
    APP_VERSION_USES: 'appVersionUses', // Tracks app version usage per device on daily basis
  },

  // Firebase Documents
  FIREBASE_DOCUMENTS: {
    APP_SETTINGS: 'restaurantDetails',
    BANNERS: 'banners',
    COUPONS: 'coupons',
  },

  // Firebase Sub-collections
  FIREBASE_SUBCOLLECTIONS: {
    ONLINE_ORDERS_SETTINGS: 'onlineorders',
    BANNER_LIST: 'list',
    COUPON_LIST: 'list',
    USER_FAVORITES: 'favorites',
  },

  // Firebase Collection Paths (for complex nested paths)
  FIREBASE_PATHS: {
    BANNERS: 'appSettings/restaurantDetails/onlineorders/banners/list',
    COUPONS: 'appSettings/restaurantDetails/onlineorders/coupons/list',
  },

  // Cache Keys - Products
  CACHE_KEYS: {
    PRODUCTS_CACHE: 'products_cache',
    PRODUCTS_CACHE_TIMESTAMP: 'products_cache_timestamp',
    CATEGORIES_CACHE: 'food_delivery_categories',
    USER_FAVORITES: 'user_favorites',
    GUEST_FAVORITES: 'guest_favorites',
    CART_STORAGE: 'foodapp_cart',
    ORDER_HISTORY_CACHE: 'order_history_cache',
    ORDER_HISTORY_CACHE_TIMESTAMP: 'order_history_cache_timestamp',
    USER_PROFILE_CACHE: 'user_profile_cache',
    USER_PROFILE_CACHE_TIMESTAMP: 'user_profile_cache_timestamp',
    COUPONS_CACHE: 'coupons_cache',
    COUPONS_CACHE_TIMESTAMP: 'coupons_cache_timestamp',
  },

  // App Settings Cache  Keys
  APP_SETTINGS_CACHE: {
    LAST_CACHE_CLEAR: 'last_cache_clear_timestamp',
    LAST_LOGIN_CLEAR: 'last_login_clear_timestamp',
    CACHE_CLEAR_SESSION_FLAG: 'cache_clear_session_flag', // SessionStorage flag to prevent infinite loops
    SELECTED_RESTAURANT_ID: 'selectedRestaurantId',
  },

  // Version Check Keys (Android app only)
  VERSION_CHECK: {
    LAST_UPDATE_PROMPT: 'last_update_prompt_timestamp',
    UPDATE_PROMPT_COOLDOWN: 24 * 60 * 60 * 1000, // 24 hours for optional updates
  },

  // Authentication & Session Keys
  AUTH_KEYS: {
    FIREBASE_AUTH_USER: 'firebase_auth_user',
    CURRENT_USER_PHONE: 'currentUserPhone',
    TOKEN: 'token',
    IS_GUEST: 'isGuest',
    GUEST_ID: 'guestId',
    GUEST_MODE: 'guest_mode',
    USER_SESSION: 'user_session',
    AUTH_TOKEN: 'auth_token',
    LOGGED_IN_DATE_TIME: 'logged_in_date_time',
    USER_DETAILS_CACHE_KEY: 'userDetails',
    LOGIN_SESSION_IN_DAYS: 30,
  },

  // Cache Durations (in milliseconds)
  CACHE_DURATIONS: {
    PRODUCTS: 60 * 60 * 1000, // 1 hour
    CATEGORIES: 60 * 60 * 1000, // 1 hour
    FAVORITES: 60 * 60 * 1000, // 1 hour
    IMAGES: 90 * 24 * 60 * 60 * 1000, // 90 days - Firebase Storage images
    USER_PROFILE: 60000, // 1 minute - Session-based cache for user profiles
    COUPONS: 60 * 1000, // 1 minute - Persistent cache for coupons
    ORDER_HISTORY: 60 * 60 * 1000, // 1 hour - Persistent cache for order history
    DEFAULT: 30 * 24 * 60 * 60 * 1000, // 30 days
  },

  MINIMUM_IMAGE_LOAD_TIME_MS: 300, // Minimum time to show loading indicator for images
  // Firebase Storage
  FIREBASE_STORAGE: {
    GS_PREFIX: 'gs://',
    HTTPS_BASE_URL: 'https://firebasestorage.googleapis.com/v0/b',
    ALT_MEDIA_SUFFIX: '?alt=media',
  },

  // Firebase Storage Paths
  FIREBASE_STORAGE_PATHS: {
    USER_PROFILE_PICS: 'onlineusers/profile-pics',
  },

  // Phone Number
  PHONE_CONSTANTS: {
    INDIA_CODE: '+91',
    DEV_USER_PREFIX: 'dev_user_',
    TEST_OTP: '123456',
    OTP_RESEND_SECONDS: 30,
  },

  // UI Constants
  UI_CONSTANTS: {
    NOTIFICATION_DURATION: {
      SHORT: 3000,
      MEDIUM: 4000,
      LONG: 5000,
    },
    RELOAD_DELAY: 2000,
    BANNER_SCROLL_INTERVAL: 3500,
  },

  // Default Images
  DEFAULT_IMAGES: {
    CATEGORY: 'assets/foodCategories/default.png',
    PRODUCT: 'assets/foodCategories/default.png',
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    OUT_FOR_DELIVERY: 'out_for_delivery',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },

  // Start Order Utils Constants
  // Order Time Estimates (in minutes)
  ORDER_BASE_TIME_MINUTES: {
    'dine-in': 20,
    takeout: 25,
    delivery: 45,
  },

  // Order Status Time Adjustments (multipliers for ETA calculations)
  ORDER_STATUS_TIME_ADJUSTMENTS: {
    pending: 1.0,
    confirmed: 0.8,
    preparing: 0.6,
    ready: 0.3,
    shipped: 0.4,
    delivered: 0,
    completed: 0,
  },

  // Order Timeline Steps Configuration
  ORDER_TIMELINE_STEPS: {
    'dine-in': [
      { status: 'pending', label: 'Order Placed', icon: 'receipt' },
      { status: 'confirmed', label: 'Confirmed', icon: 'check_circle' },
      { status: 'preparing', label: 'Preparing', icon: 'restaurant' },
      { status: 'ready', label: 'Ready', icon: 'done_all' },
      { status: 'completed', label: 'Served', icon: 'celebration' },
    ],
    takeout: [
      { status: 'pending', label: 'Order Placed', icon: 'receipt' },
      { status: 'confirmed', label: 'Confirmed', icon: 'check_circle' },
      { status: 'preparing', label: 'Preparing', icon: 'restaurant' },
      { status: 'ready', label: 'Ready for Pickup', icon: 'shopping_bag' },
      { status: 'completed', label: 'Completed', icon: 'celebration' },
    ],
    delivery: [
      { status: 'pending', label: 'Order Placed', icon: 'receipt' },
      { status: 'confirmed', label: 'Confirmed', icon: 'check_circle' },
      { status: 'preparing', label: 'Preparing', icon: 'restaurant' },
      { status: 'shipped', label: 'Out for Delivery', icon: 'local_shipping' },
      { status: 'delivered', label: 'Delivered', icon: 'celebration' },
    ],
  },

  // Order Status Display Mappings
  ORDER_STATUS_DISPLAY: {
    pending: 'Order Placed',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    shipped: 'On the Way',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  },
  // End Order Utils Constants

  // Validation
  VALIDATION: {
    MIN_PHONE_LENGTH: 10,
    MAX_PHONE_LENGTH: 10,
    MIN_OTP_LENGTH: 6,
    MAX_OTP_LENGTH: 6,
  },

  // API Endpoints (if any)
  API_ENDPOINTS: {
    // Add any external API endpoints here
  },

  // Common constants like title, description, keywords
  COMMON_CONSTANTS: {
    OFFER_APPLICABLE_TEXT:
      'Offer is applicable to this item, apply coupon code in cart',
    VARIATION_ITEM_REMOVAL_CONFIRMATION:
      'This item has customization. To remove it from your cart, please navigate to the cart page where you can manage individual variations.',
  },

  // Error Messages
  ERROR_MESSAGES: {
    GENERIC_ERROR: 'Something went wrong. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    AUTH_ERROR: 'Authentication failed. Please try again.',
    INVALID_PHONE: 'Please enter a valid phone number.',
    INVALID_OTP: 'Please enter a valid OTP.',
    PRODUCT_NOT_FOUND: 'Product not found.',
    CATEGORY_NOT_FOUND: 'Category not found.',
    CART_EMPTY: 'Your cart is empty.',
    ORDER_NOT_FOUND: 'Order not found.',
    UNABLE_TO_GET_PHONE:
      'Unable to get user phone number, Please sign out and sign in again',
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    ORDER_PLACED: 'Order placed successfully!',
    ITEM_ADDED_TO_CART: 'Item added to cart',
    ITEM_REMOVED_FROM_CART: 'Item removed from cart',
    FAVORITE_ADDED: 'Added to favorites',
    FAVORITE_REMOVED: 'Removed from favorites',
    CACHE_CLEARED: '🔄 App data refreshed for better experience',
    LOGOUT_SUCCESS: '🔐 Session expired. Please sign in again.',
  },

  // Currency
  CURRENCY: {
    SYMBOL: '₹',
    CODE: 'INR',
  },

  // App Limits
  LIMITS: {
    MAX_CART_QUANTITY: 10,
    MAX_ORDER_ITEMS: 50,
    MAX_SEARCH_RESULTS: 100,
    MAX_POPULAR_ITEMS: 8,
    MAX_RECOMMENDED_ITEMS: 3,
    MAX_CATEGORIES_HOME: 8,
  },

  // Firebase Storage URL patterns
  STORAGE_PATTERNS: {
    GS_PROTOCOL: /^gs:\/\//,
    HTTPS_PROTOCOL: /^https:\/\//,
    FIREBASE_STORAGE: /firebasestorage\.googleapis\.com/,
  },

  // Regular Expressions
  REGEX_PATTERNS: {
    PHONE_NUMBER: /^[6-9]\d{9}$/,
    OTP: /^\d{6}$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PRICE_CLEANUP: /[^\d.]/g,
  },

  // UI Text & Labels
  UI_TEXT: {
    // Common
    WELCOME: 'Welcome',
    USER: 'User',
    LOADING: 'Loading...',
    SEARCH_PLACEHOLDER: 'Search ...',
    VIEW_ALL: 'View all',
    ADD_TO_CART: 'Add to Cart',
    NO_ITEMS_FOUND: 'No items found',
    NO_PRODUCTS_AVAILABLE: 'No products available',

    // Auth
    WELCOME_BACK: 'Welcome Back!',
    SIGN_IN_TO_CONTINUE: 'Sign in to continue',
    SIGN_IN: 'Sign In',
    SIGN_UP: 'Sign Up',
    SEND_OTP: 'Send OTP',
    VERIFY_OTP: 'Verify OTP',
    CONTINUE_AS_GUEST: 'Continue as Guest',
    DONT_HAVE_ACCOUNT: "Don't have an account?",
    ALREADY_HAVE_ACCOUNT: 'Already have an account?',
    FORGOT_PASSWORD: 'Forgot Password?',
    RESET_PASSWORD: 'Reset Password',
    BACK_TO_SIGN_IN: 'Back to Sign In',
    BACK_TO_PHONE_SIGNUP: 'Back to Phone Signup',
    SIGN_IN_WITH_EMAIL: 'Sign in with Email',

    // Variations
    SELECT_VARIATION: 'Select Variation',
    PRICE: 'Price',

    // Related Products
    RELATED_FOOD_ITEMS: 'Related Food Items',
    LOADING_RELATED_PRODUCTS: 'Loading related products...',

    // Filters
    FILTER: 'Filter',
    CATEGORY: 'Category',
    APPLY_FILTERS: 'Apply Filters',
    RESET_FILTERS: 'Reset Filters',

    // Home
    SEARCH_FOR_FOOD: 'Search for food items...',
    RECOMMENDED_FOR_YOU: 'Recommended for you',
    POPULAR_ITEMS: 'Popular Items',
    BROWSE_BY_CATEGORY: 'Browse by Category',
    LOADING_POPULAR_ITEMS: 'Loading popular items...',
    LOADING_ITEMS: 'Loading items...',

    // Coupons
    APPLY: 'APPLY',
    AVAILABLE_OFFERS: 'Available Offers',
    APPLY_COUPON: 'Apply Coupon',
    MIN_ORDER: 'Min Order:',
    VALID_TILL: 'Valid Till:',
    OFFERS_TEXT: 'offers',

    // Orders
    PROCESSING_ORDER: 'Processing your order...',
    VALIDATING: 'Validating',
    CREATING: 'Creating',
    PROCESSING: 'Processing',
    CONFIRMING: 'Confirming',
    ORDERS_CANNOT_BE_CANCELLED: 'Orders cannot be cancelled once placed',
    ORDER_PLACED: 'Order Placed',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    ON_THE_WAY: 'On the Way',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    ORDER_WAS_CANCELLED: 'Order was cancelled',
    NOT_AVAILABLE: 'Not available',
    ORDER_FAILED: 'Order Failed',
    ORDER_COMPLETED: 'Order Completed!',
    UNKNOWN: 'Unknown',

    // Zoom
    CLOSE_ESC: 'Close (Esc)',
    ZOOM_IN: 'Zoom In',
    ZOOM_OUT: 'Zoom Out',
    RESET_ZOOM: 'Reset Zoom',
    CLICK_TO_ZOOM: 'Click or pinch to zoom',

    // Sidebar/Navigation
    MY_ACCOUNT: 'My Account',
    ORDERS: 'My Orders',
    FAVORITES: 'Favorites',
    MANAGE_ADDRESSES: 'Manage Addresses',
    CONTACT_US: 'Contact Us',
    ABOUT_US: 'About Us',
    SIGN_OUT: 'Sign Out',
    LOG_IN: 'Log In',
    HOME: 'Home',
    PROFILE: 'Profile',
    MY_ORDERS: 'My Orders',

    // Misc
    STOCK: 'Stock:',
    UNKNOWN_RESTAURANT: 'Unknown Restaurant',
  },

  // Validation Messages
  VALIDATION_MESSAGES: {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    PHONE_REQUIRED: 'Phone number is required',
    PHONE_INVALID: 'Please enter a valid 10-digit phone number',
    OTP_REQUIRED: 'OTP is required',
    OTP_INVALID: 'Please enter a valid 6-digit OTP',
    PASSWORD_REQUIRED: 'Password is required',
    PASSWORD_MIN_LENGTH: 'Password must be at least {0} characters long',
    PASSWORD_CONFIRM_REQUIRED: 'Please confirm your password',
    PASSWORDS_DO_NOT_MATCH: 'Passwords do not match',
    NAME_REQUIRED: 'Name is required',
    NAME_MIN_LENGTH: 'Name must be at least 2 characters long',
    NAME_INVALID: 'Name can only contain letters and spaces',
    FIELD_REQUIRED: 'Please fill in the {0}.',
    ADDRESS_SELECT_REQUIRED:
      'Please select a delivery address before placing the order.',
    VARIATION_SELECT_REQUIRED:
      'Please select a variation before adding to cart',
  },

  // Placeholders
  PLACEHOLDERS: {
    ENTER_NAME: 'Enter your name',
    ENTER_EMAIL: 'Enter your email address',
    ENTER_PHONE: 'Enter phone number',
    ENTER_PASSWORD: 'Enter your password',
    SEARCH: 'Search ...',
    SEARCH_FOOD: 'Search for food items...',
  },

  // Fallback Values
  FALLBACK_VALUES: {
    UNKNOWN_ITEM: 'Unknown Item',
    USER_PREFIX: 'User',
  },

  // Category Order
  CATEGORY_ORDER: [
    'pizza',
    'burger',
    'chinese',
    'maggie',
    'beverages',
    'pasta',
    'desserts',
  ],

  // Filter Preferences
  FILTER_PREFERENCES: [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Nut-Free',
    'Keto',
    'Low-Fat',
    'Organic',
  ],

  // Restaurant Data
  RESTAURANTS: [
    {
      id: 'hunger_point',
      name: 'The Hunger Point',
      description:
        'Delicious North Indian & Chinese cuisine with fast delivery',
      title: 'Multi-Cuisine Restaurant',
      type: 'restaurant',
      location: 'Dibiyapur',
      pincode: '206244',
      address: 'Near Bus Stand, Dibiyapur, Uttar Pradesh',
      phone: '+91 9193116659',
      openTime: '10:00',
      closeTime: '21:00',
      rating: 4.5,
      deliveryTime: '40-45 mins',
      minOrderAmount: 250,
      deliveryFee: 40,
      coordinates: {
        lat: 26.1234,
        lng: 82.5678,
      },
      // firebaseConfig removed: app uses centralized FIREBASE_CONFIG
      addressConfig: {
        pincode: '206244',
        town: 'Dibiyapur, AURAIYA',
        state: 'Uttar Pradesh',
        defaultType: 'Home',
      },
    },
    {
      id: 'efc-pizza',
      name: 'EFC Pizza',
      description: 'Authentic Indian style pizza with fresh base',
      title: 'Multi-Cuisine Restaurant',
      type: 'restaurant',
      location: 'Gurshaiganj',
      pincode: '209722',
      address: 'Service Road, Gurshaiganj, Uttar Pradesh',
      phone: '+91 9876543211',
      openTime: '10:00',
      closeTime: '21:00',
      rating: 4.2,
      deliveryTime: '35-40 mins',
      minOrderAmount: 100,
      deliveryFee: 40,
      coordinates: {
        lat: 27.2345,
        lng: 79.9876,
      },
      // firebaseConfig removed: app uses centralized FIREBASE_CONFIG
      addressConfig: {
        pincode: '209722',
        town: 'Gurshaiganj, Kannauj',
        state: 'Uttar Pradesh',
        defaultType: 'Home',
      },
    },
    {
      id: 'tularam-kirana-store',
      name: 'Tularam Kirana Store',
      description: 'Your one-stop shop for all daily essentials',
      title: 'Grocery Store',
      type: 'store',
      location: 'Gurshaiganj',
      pincode: '209722',
      address: 'Service Road, Gurshaiganj, Uttar Pradesh',
      phone: '+91 9876543211',
      openTime: '08:00',
      closeTime: '21:00',
      rating: 4.7,
      deliveryTime: '1-2 Hour',
      minOrderAmount: 100,
      deliveryFee: 40,
      coordinates: {
        lat: 27.2345,
        lng: 79.9876,
      },
      // firebaseConfig removed: app uses centralized FIREBASE_CONFIG
    },
  ],
} as const;

// Export individual constant groups for easy importing
export const FIREBASE_COLLECTIONS = APP_CONSTANTS.FIREBASE_COLLECTIONS;
export const FIREBASE_DOCUMENTS = APP_CONSTANTS.FIREBASE_DOCUMENTS;
export const FIREBASE_SUBCOLLECTIONS = APP_CONSTANTS.FIREBASE_SUBCOLLECTIONS;
export const FIREBASE_PATHS = APP_CONSTANTS.FIREBASE_PATHS;
export const CACHE_KEYS = APP_CONSTANTS.CACHE_KEYS;
export const APP_SETTINGS_CACHE = APP_CONSTANTS.APP_SETTINGS_CACHE;
export const AUTH_KEYS = APP_CONSTANTS.AUTH_KEYS;
export const CACHE_DURATIONS = APP_CONSTANTS.CACHE_DURATIONS;
export const MINIMUM_IMAGE_LOAD_TIME_MS =
  APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS;
export const FIREBASE_STORAGE = APP_CONSTANTS.FIREBASE_STORAGE;
export const FIREBASE_STORAGE_PATHS = APP_CONSTANTS.FIREBASE_STORAGE_PATHS;
export const PHONE_CONSTANTS = APP_CONSTANTS.PHONE_CONSTANTS;
export const UI_CONSTANTS = APP_CONSTANTS.UI_CONSTANTS;
export const DEFAULT_IMAGES = APP_CONSTANTS.DEFAULT_IMAGES;
export const ORDER_STATUS = APP_CONSTANTS.ORDER_STATUS;
export const ORDER_BASE_TIME_MINUTES = APP_CONSTANTS.ORDER_BASE_TIME_MINUTES;
export const ORDER_STATUS_TIME_ADJUSTMENTS =
  APP_CONSTANTS.ORDER_STATUS_TIME_ADJUSTMENTS;
export const ORDER_TIMELINE_STEPS = APP_CONSTANTS.ORDER_TIMELINE_STEPS;
export const ORDER_STATUS_DISPLAY = APP_CONSTANTS.ORDER_STATUS_DISPLAY;
export const VALIDATION = APP_CONSTANTS.VALIDATION;
export const ERROR_MESSAGES = APP_CONSTANTS.ERROR_MESSAGES;
export const SUCCESS_MESSAGES = APP_CONSTANTS.SUCCESS_MESSAGES;
export const CURRENCY = APP_CONSTANTS.CURRENCY;
export const LIMITS = APP_CONSTANTS.LIMITS;
export const STORAGE_PATTERNS = APP_CONSTANTS.STORAGE_PATTERNS;
export const REGEX_PATTERNS = APP_CONSTANTS.REGEX_PATTERNS;
export const RESTAURANTS = APP_CONSTANTS.RESTAURANTS;
export const UI_TEXT = APP_CONSTANTS.UI_TEXT;
export const VALIDATION_MESSAGES = APP_CONSTANTS.VALIDATION_MESSAGES;
export const PLACEHOLDERS = APP_CONSTANTS.PLACEHOLDERS;
export const FALLBACK_VALUES = APP_CONSTANTS.FALLBACK_VALUES;
export const CATEGORY_ORDER = APP_CONSTANTS.CATEGORY_ORDER;
export const FILTER_PREFERENCES = APP_CONSTANTS.FILTER_PREFERENCES;
export const COMMON_CONSTANTS = APP_CONSTANTS.COMMON_CONSTANTS;

// ─────────────────────────────────────────────────────────────────────────────
// Delivery Pincode Restriction Configuration
// Set enabled: true and add allowed pincodes to restrict delivery to specific areas.
// When enabled: false, no pincode check is performed and all areas are accepted.
// ─────────────────────────────────────────────────────────────────────────────
export const DELIVERY_PINCODE_CONFIG = {
  enabled: true, // Set to false to disable pincode restriction
  allowedPincodes: ['206244', '206247', '206241', '206246'], // Pincodes where delivery is available
} as const;

// Centralized Firebase config for the whole app (use same project for all restaurants)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCdhvXtodLYlKsaqvaj-83rLRze0K277c4',
  authDomain: 'zitro-18f5c.firebaseapp.com',
  projectId: 'zitro-18f5c',
  storageBucket: 'zitro-18f5c.firebasestorage.app',
  messagingSenderId: '732131169680',
  appId: '1:732131169680:web:40a153176195281cbf8f15',
  measurementId: 'G-46PV73YKKT',
} as const;
