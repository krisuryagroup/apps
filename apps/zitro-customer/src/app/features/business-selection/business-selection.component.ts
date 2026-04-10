import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RestaurantSwitchingService } from '@zitro/services';
import { LocationService } from '@zitro/services';
import { Restaurant } from '@zitro/utils';
import { RESTAURANTS, APP_SETTINGS_CACHE } from '../../core/constants/app.constants';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { AnalyticsService } from '@zitro/services';

interface BusinessOption {
  type: 'restaurant' | 'store';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  businesses: Restaurant[];
}

@Component({
  selector: 'app-business-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, CachedImageDirective, LoaderComponent],
  templateUrl: './business-selection.component.html',
  styleUrl: './business-selection.component.scss'
})
export class BusinessSelectionComponent implements OnInit {
  businessOptions: BusinessOption[] = [];
  selectedType: 'restaurant' | 'store' | null = null;
  availableBusinesses: Restaurant[] = [];
  isLoading = false;
  locationPermissionStatus: 'checking' | 'granted' | 'denied' | 'prompt' = 'checking';
  locationError: string | null = null;
  userPincode: string | null = null;
  pincodeFilteredBusinesses: Restaurant[] = [];
  showDefaultBusinessOption = false;
  isLocationInitialized = false; // Add this flag to prevent premature UI updates
  showManualPincodeEntry = false;
  manualPincode = '';
  imageLoading: { [key: number]: boolean } = {};

  constructor(
    private router: Router,
    private restaurantSwitchingService: RestaurantSwitchingService,
    private locationService: LocationService,
    private cdr: ChangeDetectorRef,
    private analyticsService: AnalyticsService
  ) {}

  async ngOnInit() {
    // Track screen view
    await this.analyticsService.logScreenView('Business Selection', 'BusinessSelectionComponent');
    
    await this.checkLocationAndInitialize();
  }

  private async checkLocationAndInitialize() {
    this.isLoading = true;
    console.log('🚀 Starting business selection initialization...');
    
    try {
      // Check if user has a default business set
      const defaultBusinessId = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID + '_default');
      
      if (defaultBusinessId) {
        // User has a default business, check if they want to use it
        const useDefault = confirm('Would you like to continue with your default business?');
        if (useDefault) {
          await this.selectBusinessDirectly(defaultBusinessId);
          return;
        }
      }

      // Check location permission
      console.log('🔍 Checking location permission...');
      const locationStatus = await this.locationService.checkLocationPermission();
      console.log('📍 Location status result:', locationStatus);
      
      this.locationPermissionStatus = locationStatus.permission;
      this.locationError = locationStatus.error || null;
      
      console.log('🎯 Permission status set to:', this.locationPermissionStatus);
      console.log('❗ Location error:', this.locationError);
      
      if (locationStatus.hasLocation && locationStatus.pincode) {
        this.userPincode = locationStatus.pincode;
        console.log('📍 User pincode detected:', this.userPincode);
        
        // Filter businesses by pincode
        this.pincodeFilteredBusinesses = this.locationService.getBusinessesByPincode(
          [...RESTAURANTS] as Restaurant[], 
          this.userPincode
        );
        
        console.log('🏢 Businesses in pincode:', this.pincodeFilteredBusinesses.length);
        
        if (this.pincodeFilteredBusinesses.length > 0) {
          // Show businesses matching the pincode
          this.initializeBusinessOptionsWithPincodeFilter();
        } else {
          // No businesses in user's pincode, show manual pincode entry option
          console.log('❌ No businesses found in user\'s pincode:', this.userPincode);
          this.showManualPincodeEntry = true;
          this.initializeBusinessOptions(); // Still show all businesses as fallback
        }
      } else {
        // Location not available, check if user has saved a manual pincode
        const savedPincode = this.locationService.getSavedPincode();
        if (savedPincode) {
          console.log('📍 Using saved manual pincode:', savedPincode);
          this.userPincode = savedPincode;
          this.pincodeFilteredBusinesses = this.locationService.getBusinessesByPincode(
            [...RESTAURANTS] as Restaurant[], 
            savedPincode
          );
          
          if (this.pincodeFilteredBusinesses.length > 0) {
            this.initializeBusinessOptionsWithPincodeFilter();
          } else {
            this.showManualPincodeEntry = true;
            this.initializeBusinessOptions();
          }
        } else {
          // No location and no saved pincode, show manual entry
          console.log('📍 No location available, showing manual pincode entry');
          this.showManualPincodeEntry = true;
          this.initializeBusinessOptions();
        }
      }
      
      this.showDefaultBusinessOption = true;
    } catch (error) {
      console.error('❌ Error during initialization:', error);
      this.locationError = 'Failed to initialize location services';
      this.locationPermissionStatus = 'denied';
      this.initializeBusinessOptions();
    } finally {
      this.isLoading = false;
      
      // Add a small delay before showing the location button to prevent flickering
      setTimeout(() => {
        this.isLocationInitialized = true;
        console.log('✅ Location initialization complete. Permission status:', this.locationPermissionStatus);
      }, 500); // 500ms delay
    }
  }

  private initializeBusinessOptionsWithPincodeFilter() {
    const restaurantsInPincode = this.pincodeFilteredBusinesses.filter(r => r.type === 'restaurant');
    const storesInPincode = this.pincodeFilteredBusinesses.filter(r => r.type === 'store');
    
    this.businessOptions = [
      {
        type: 'restaurant',
        title: 'Restaurants Near You',
        subtitle: `${restaurantsInPincode.length} restaurants in your area`,
        icon: 'assets/business-types/restaurant.svg',
        color: '#ff6b35',
        businesses: restaurantsInPincode
      },
      {
        type: 'store',
        title: 'Grocery Stores Near You',
        subtitle: `${storesInPincode.length} stores in your area`,
        icon: 'assets/business-types/grocery.svg',
        color: '#4ecdc4',
        businesses: storesInPincode
      }
    ];
    
    // Filter out empty business types
    this.businessOptions = this.businessOptions.filter(option => option.businesses.length > 0);
  }

  private async selectBusinessDirectly(businessId: string) {
    const business = [...RESTAURANTS].find(r => r.id === businessId) as Restaurant;
    if (business) {
      await this.selectBusiness(business);
    }
  }

  private initializeBusinessOptions() {
    // Only show businesses if no pincode filtering is active (fallback mode)
    this.businessOptions = [
      {
        type: 'restaurant',
        title: 'All Restaurants',
        subtitle: 'Order delicious food (Enter pincode for area-specific options)',
        icon: 'assets/business-types/restaurant.svg',
        color: '#ff6b35',
        businesses: [...RESTAURANTS].filter(r => r.type === 'restaurant') as Restaurant[]
      },
      {
        type: 'store',
        title: 'All Grocery Stores',
        subtitle: 'Daily essentials delivered (Enter pincode for area-specific options)',
        icon: 'assets/business-types/grocery.svg',
        color: '#4ecdc4',
        businesses: [...RESTAURANTS].filter(r => r.type === 'store') as Restaurant[]
      }
    ];
  }

  private async getLocationAndSortBusinesses() {
    try {
      // Try to get user's current location
      const userLocation = await this.locationService.getCurrentLocation();
      
      // Sort businesses by actual distance using coordinates
      this.businessOptions.forEach(option => {
        option.businesses = this.locationService.sortByProximity(option.businesses, userLocation);
      });
    } catch (error) {
      console.warn('Could not get location, falling back to pincode sorting');
      // Fallback to pincode-based sorting with a default pincode
      const defaultPincode = '209722';
      this.businessOptions.forEach(option => {
        option.businesses = this.sortBusinessesByProximity(option.businesses, defaultPincode);
      });
    }
  }

  private sortBusinessesByProximity(businesses: Restaurant[], userPincode: string): Restaurant[] {
    return businesses.sort((a, b) => {
      // Simple proximity calculation based on pincode difference
      const diffA = Math.abs(parseInt(a['pincode']) - parseInt(userPincode));
      const diffB = Math.abs(parseInt(b['pincode']) - parseInt(userPincode));
      return diffA - diffB;
    });
  }

  selectBusinessType(type: 'restaurant' | 'store') {
    this.selectedType = type;
    const selectedOption = this.businessOptions.find(option => option.type === type);
    this.availableBusinesses = selectedOption?.businesses || [];
  }

  async selectBusiness(business: Restaurant) {
    this.isLoading = true;
    
    try {
      // Switch to selected restaurant/store
      const result = await this.restaurantSwitchingService.switchRestaurant(business.id);
      
      if (result.success) {
        this.isLoading = false;
        // Navigate to home after successful switch
        this.router.navigate(['/home']);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error switching restaurant:', error);
      this.isLoading = false;
      // You could show an error message to the user here
    }
  }

  async setAsDefaultAndSelect(business: Restaurant) {
    // Set as default business
    localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID + '_default', business.id);
    
    // Select the business
    await this.selectBusiness(business);
  }

  async requestLocationPermission() {
    console.log('🙋 User clicked Enable Location button');
    this.locationPermissionStatus = 'checking';
    this.locationError = null;
    
    try {
      const locationStatus = await this.locationService.requestLocationPermission();
      console.log('📍 Permission request result:', locationStatus);
      
      // Track location permission
      await this.analyticsService.logLocationPermission(locationStatus.permission === 'granted');
      
      // Add a small delay to ensure smooth UI transition
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.locationPermissionStatus = locationStatus.permission;
      this.locationError = locationStatus.error || null;
      
      // Force change detection to update UI
      this.cdr.detectChanges();
      
      if (locationStatus.hasLocation && locationStatus.pincode) {
        this.userPincode = locationStatus.pincode;
        console.log('✅ Got pincode after permission:', this.userPincode);
        
        this.pincodeFilteredBusinesses = this.locationService.getBusinessesByPincode(
          [...RESTAURANTS] as Restaurant[], 
          this.userPincode
        );
        
        if (this.pincodeFilteredBusinesses.length > 0) {
          console.log('🏢 Updating business options with pincode filter');
          this.initializeBusinessOptionsWithPincodeFilter();
        } else {
          console.log('❌ No businesses in pincode after permission grant, showing manual entry');
          this.showManualPincodeEntry = true;
          this.initializeBusinessOptions();
        }
      } else {
        console.log('❌ No location data received');
        // Even if permission granted but no location, show all businesses
        if (this.locationPermissionStatus === 'granted') {
          this.initializeBusinessOptions();
          await this.getLocationAndSortBusinesses();
        }
      }
    } catch (error) {
      console.error('❌ Error in requestLocationPermission:', error);
      this.locationError = 'Failed to get location permission';
      this.locationPermissionStatus = 'denied';
    }
    
    console.log('🎯 Final permission status:', this.locationPermissionStatus);
    console.log('🎯 Should show location banner?', this.locationPermissionStatus !== 'granted' && !this.selectedType && !this.isLoading && this.isLocationInitialized);
  }

  goBack() {
    if (this.selectedType) {
      this.selectedType = null;
      this.availableBusinesses = [];
    }
  }

  // Manual pincode entry methods
  toggleManualPincodeEntry() {
    this.showManualPincodeEntry = !this.showManualPincodeEntry;
    this.manualPincode = '';
  }

  submitManualPincode() {
    if (this.manualPincode && this.manualPincode.length >= 5) {
      console.log('📍 User entered manual pincode:', this.manualPincode);
      
      // Save the manual pincode
      this.locationService.saveUserPincode(this.manualPincode);
      this.userPincode = this.manualPincode;
      
      // Filter businesses by the manual pincode
      this.pincodeFilteredBusinesses = this.locationService.getBusinessesByPincode(
        [...RESTAURANTS] as Restaurant[], 
        this.manualPincode
      );
      
      if (this.pincodeFilteredBusinesses.length > 0) {
        console.log('✅ Found businesses for manual pincode:', this.pincodeFilteredBusinesses.length);
        this.initializeBusinessOptionsWithPincodeFilter();
        this.showManualPincodeEntry = false;
      } else {
        alert(`No businesses found in pincode ${this.manualPincode}. Available pincodes: 276125 (Dibiyapur), 209722 (Gurshaiganj)`);
      }
    } else {
      alert('Please enter a valid pincode (at least 5 digits)');
    }
  }

  getAvailablePincodes(): string[] {
    return [...new Set([...RESTAURANTS].map(r => r.pincode))];
  }

  onImageLoad(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, 300);
  }

  onImageError(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, 300);
  }
}
