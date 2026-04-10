import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FirebaseConfigService } from './firebase-config.service';
import { RestaurantSwitchingUtil, Restaurant } from '@zitro/utils';
import { RESTAURANTS, APP_SETTINGS_CACHE, FIREBASE_CONFIG } from '@zitro/utils';

@Injectable({
  providedIn: 'root'
})
export class RestaurantSwitchingService {
  private currentRestaurantSubject = new BehaviorSubject<Restaurant>(RESTAURANTS[0] as Restaurant);
  public currentRestaurant$ = this.currentRestaurantSubject.asObservable();
  
  private isSwitchingSubject = new BehaviorSubject<boolean>(false);
  public isSwitching$ = this.isSwitchingSubject.asObservable();

  constructor(private firebaseConfigService: FirebaseConfigService) {
    // Initialize with current restaurant from localStorage or default to first
    const currentRestaurant = this.getCurrentRestaurantFromStorage();
    this.currentRestaurantSubject.next(currentRestaurant);
  }

  /**
   * Get current restaurant from localStorage or default
   */
  private getCurrentRestaurantFromStorage(): Restaurant {
    const selectedRestaurantId = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID);
    
    if (selectedRestaurantId) {
      const restaurant = RestaurantSwitchingUtil.getRestaurantById(selectedRestaurantId);
      if (restaurant) {
        return restaurant;
      }
    }
    
    // Default to first restaurant if none selected or found
    return RESTAURANTS[0] as Restaurant;
  }

  /**
   * Get current selected restaurant
   */
  getCurrentRestaurant(): Restaurant {
    // Always get the current restaurant from localStorage to ensure accuracy
    return this.getCurrentRestaurantFromStorage();
  }

  /**
   * Switch to a different restaurant
   */
  async switchRestaurant(restaurantId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Validate restaurant ID
      if (!RestaurantSwitchingUtil.isValidRestaurantId(restaurantId)) {
        return { success: false, message: 'Invalid restaurant ID' };
      }

      const newRestaurant = RestaurantSwitchingUtil.getRestaurantById(restaurantId);
      const currentRestaurant = this.getCurrentRestaurant();

      if (!newRestaurant) {
        return { success: false, message: 'Restaurant not found' };
      }

      // Check if already on this restaurant
      if (currentRestaurant.id === restaurantId) {
        return { success: true, message: 'Already connected to this restaurant' };
      }

      // Set switching state
      this.isSwitchingSubject.next(true);

      console.log('🔄 Starting restaurant switch from', currentRestaurant.name, 'to', newRestaurant.name);

      // Switch Firebase configuration (this will also handle logout)
      await this.firebaseConfigService.switchRestaurant(restaurantId);

      // Update localStorage with new restaurant ID
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, restaurantId);

      // Update current restaurant
      this.currentRestaurantSubject.next(newRestaurant);

      // Clear switching state
      this.isSwitchingSubject.next(false);

      const successMessage = RestaurantSwitchingUtil.getSwitchSuccessMessage(newRestaurant.name);
      console.log('✅', successMessage);

      return { success: true, message: successMessage };

    } catch (error) {
      console.error('❌ Error switching restaurant:', error);
      this.isSwitchingSubject.next(false);
      return { success: false, message: 'Failed to switch restaurant. Please try again.' };
    }
  }

  /**
   * Get restaurant by ID
   */
  getRestaurantById(restaurantId: string): Restaurant | undefined {
    return RestaurantSwitchingUtil.getRestaurantById(restaurantId);
  }

  /**
   * Get all available restaurants
   */
  getAllRestaurants(): Restaurant[] {
    return [...RESTAURANTS] as Restaurant[];
  }

  /**
   * Get formatted restaurants for display
   */
  getRestaurantsForDisplay() {
    return RestaurantSwitchingUtil.getAllRestaurantsForDisplay();
  }

  /**
   * Check if currently switching restaurants
   */
  isSwitching(): boolean {
    return this.isSwitchingSubject.value;
  }

  /**
   * Get restaurant timing info
   */
  getRestaurantTiming(restaurantId?: string) {
    const id = restaurantId || this.getCurrentRestaurant().id;
    return RestaurantSwitchingUtil.getRestaurantTimingInfo(id);
  }

  /**
   * Get current restaurant Firebase config
   */
  getCurrentRestaurantConfig() {
    // Return centralized FIREBASE_CONFIG for the application
    return FIREBASE_CONFIG;
  }
}
