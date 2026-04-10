import { RESTAURANTS, FIREBASE_CONFIG, UI_TEXT } from './app.constants';

/**
 * Restaurant data interface
 */
export interface Restaurant {
  id: string;
  name: string;
  location: string;
  title: string;
  type: string;
  rating: number;
  deliveryTime: string;
  openTime: string;
  closeTime: string;
  pincode: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  addressConfig?: any;
  [key: string]: any;
}

/**
 * Restaurant switching utilities
 */
export class RestaurantSwitchingUtil {

  /**
   * Get restaurant data by ID
   */
  static getRestaurantById(restaurantId: string): Restaurant | undefined {
    return RESTAURANTS.find((restaurant: Restaurant) => restaurant.id === restaurantId);
  }

  /**
   * Get restaurant name by ID
   */
  static getRestaurantName(restaurantId: string): string {
    const restaurant = this.getRestaurantById(restaurantId);
    return restaurant?.name || UI_TEXT.UNKNOWN_RESTAURANT;
  }

  /**
   * Validate if restaurant ID exists
   */
  static isValidRestaurantId(restaurantId: string): boolean {
    return RESTAURANTS.some((restaurant: Restaurant) => restaurant.id === restaurantId);
  }

  /**
   * Get Firebase config for restaurant
   */
  static getFirebaseConfig(restaurantId: string) {
    // App uses a centralized FIREBASE_CONFIG for all restaurants
    return FIREBASE_CONFIG || null;
  }

  /**
   * Clear all restaurant-specific local storage data
   */
  static clearRestaurantSpecificData(): void {
    // Authentication related data
    const authKeysToRemove = [
      'token',
      'isGuest',
      'guestId',
      'currentUserPhone',
      'firebase_auth_user',
      'user_session',
      'auth_token'
    ];

    // Cache keys that might be restaurant-specific
    const cacheKeysToRemove = [
      'products_cache',
      'products_cache_timestamp',
      'food_delivery_categories',
      'user_favorites',
      'guest_favorites',
      'order_history_cache',
      'last_cache_clear_timestamp',
      'last_login_clear_timestamp',
      'cache_clear_session_flag'
    ];

    // Remove all auth keys
    authKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Remove all cache keys
    cacheKeysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear session storage as well
    sessionStorage.clear();

    console.log('✅ All restaurant-specific data cleared from local storage');
  }

  /**
   * Dispatch restaurant switched event
   */
  static dispatchRestaurantSwitchedEvent(restaurantId: string): void {
    const event = new CustomEvent('restaurantSwitched', {
      detail: { restaurantId }
    });
    window.dispatchEvent(event);
    console.log('🔄 Restaurant switched event dispatched for:', restaurantId);
  }

  /**
   * Get user-friendly switching confirmation message
   */
  static getSwitchConfirmationMessage(currentRestaurant: string, newRestaurant: string): string {
    return `Switching from "${currentRestaurant}" to "${newRestaurant}" will sign you out and clear your current cart and favorites. Do you want to continue?`;
  }

  /**
   * Get restaurant switching success message
   */
  static getSwitchSuccessMessage(restaurantName: string): string {
    return `Successfully switched to ${restaurantName}! Please sign in to continue.`;
  }

  /**
   * Get restaurant timing info
   */
  static getRestaurantTimingInfo(restaurantId: string): { openTime: string; closeTime: string; isOpen: boolean } {
    const restaurant = this.getRestaurantById(restaurantId);
    if (!restaurant) {
      return { openTime: '10:00', closeTime: '21:00', isOpen: false };
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Parse open and close times
    const openParts = restaurant.openTime.split(':');
    const closeParts = restaurant.closeTime.split(':');
    const openMinutes = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
    const closeMinutes = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);

    const isOpen = currentTime >= openMinutes && currentTime <= closeMinutes;

    return {
      openTime: restaurant.openTime,
      closeTime: restaurant.closeTime,
      isOpen
    };
  }

  /**
   * Format restaurant display info for dropdowns
   */
  static formatRestaurantForDisplay(restaurant: Restaurant) {
    return {
      id: restaurant.id,
      name: restaurant.name,
      location: restaurant.location,
      title: restaurant.title,
      type: restaurant.type,
      rating: restaurant.rating,
      deliveryTime: restaurant.deliveryTime,
      displayText: `${restaurant.name} • ${restaurant.location}`,
      subtitle: `${restaurant.type} • ⭐ ${restaurant.rating} • 🚚 ${restaurant.deliveryTime}`
    };
  }

  /**
   * Get all restaurants formatted for display
   */
  static getAllRestaurantsForDisplay() {
    return RESTAURANTS.map((restaurant: Restaurant) => this.formatRestaurantForDisplay(restaurant));
  }

  /**
   * Add event listener for restaurant switching with cleanup
   */
  static addRestaurantSwitchListener(callback: (restaurantId: string) => void): () => void {
    const eventListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.restaurantId) {
        callback(customEvent.detail.restaurantId);
      }
    };

    window.addEventListener('restaurantSwitched', eventListener as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('restaurantSwitched', eventListener as EventListener);
    };
  }
}
