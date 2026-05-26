import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Browser } from '@capacitor/browser';
import { RestaurantSwitchingService } from '@zitro/services';
import { Restaurant } from '@zitro/utils';

/**
 * Call Restaurant Button Component
 *
 * A reusable component that displays a prominent button to call the restaurant.
 * Uses Capacitor's Browser plugin to open phone dialer with tel: protocol.
 * Automatically retrieves phone number from current restaurant settings.
 *
 * Usage:
 * <app-call-restaurant-button></app-call-restaurant-button>
 */
@Component({
  selector: 'app-call-restaurant-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-restaurant-button.component.html',
  styleUrls: ['./call-restaurant-button.component.scss'],
})
export class CallRestaurantButtonComponent implements OnInit {
  restaurantPhone = '';
  restaurantName = '';
  private restaurantSwitchingService = inject(RestaurantSwitchingService);

  ngOnInit(): void {
    this.loadRestaurantInfo();
  }

  /**
   * Load current restaurant phone number
   */
  private loadRestaurantInfo(): void {
    try {
      const currentRestaurant: Restaurant =
        this.restaurantSwitchingService.getCurrentRestaurant();
      this.restaurantPhone = currentRestaurant['phone'] || '+91 9193116659';
      this.restaurantName = currentRestaurant.name || 'Restaurant';
      console.log(
        `📞 Call Restaurant Button: ${this.restaurantName} - ${this.restaurantPhone}`,
      );
    } catch (error) {
      console.error('❌ Error loading restaurant info:', error);
      // Fallback phone number
      this.restaurantPhone = '+91 9193116659';
      this.restaurantName = 'Restaurant';
    }
  }

  /**
   * Trigger phone call using Capacitor Browser plugin
   * Opens native phone dialer with restaurant number
   */
  async callRestaurant(): Promise<void> {
    try {
      if (!this.restaurantPhone) {
        console.warn('⚠️ Restaurant phone number not available');
        return;
      }

      // Remove spaces and format for tel: protocol
      const phoneNumber = this.restaurantPhone.replace(/\s+/g, '');
      const telUrl = `tel:${phoneNumber}`;

      console.log(`📞 Initiating call to: ${telUrl}`);

      // Use Capacitor Browser to open tel: URL (triggers phone dialer)
      await Browser.open({ url: telUrl });

      console.log('✅ Phone dialer opened successfully');
    } catch (error) {
      console.error('❌ Error opening phone dialer:', error);

      // Fallback: try window.location as last resort
      try {
        const phoneNumber = this.restaurantPhone.replace(/\s+/g, '');
        window.location.href = `tel:${phoneNumber}`;
      } catch (fallbackError) {
        console.error('❌ Fallback phone call also failed:', fallbackError);
      }
    }
  }
}
