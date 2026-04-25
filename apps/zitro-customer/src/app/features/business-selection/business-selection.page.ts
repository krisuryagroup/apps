import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '@zitro/i18n';
import { CachedImageDirective, LoaderComponent } from '@zitro/ui';
import { RestaurantSwitchingService, LocationService, AnalyticsService } from '@zitro/services';
import { Restaurant } from '@zitro/utils';
import { RESTAURANTS, APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

interface BusinessOption {
  type: 'restaurant' | 'store';
  titleKey: string;
  subtitleKey: string;
  count: number;
  icon: string;
  businesses: Restaurant[];
}

@Component({
  selector: 'app-business-selection-page',
  standalone: true,
  imports: [FormsModule, I18nPipe, CachedImageDirective],
  templateUrl: './business-selection.page.html',
  styleUrl: './business-selection.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSelectionPage implements OnInit {
  private router = inject(Router);
  private restaurantSwitching = inject(RestaurantSwitchingService);
  private locationService = inject(LocationService);
  private analytics = inject(AnalyticsService);

  readonly isLoading = signal(false);
  readonly selectedType = signal<'restaurant' | 'store' | null>(null);
  readonly businessOptions = signal<BusinessOption[]>([]);
  readonly availableBusinesses = signal<Restaurant[]>([]);
  readonly userPincode = signal<string | null>(null);
  readonly locationStatus = signal<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  readonly locationError = signal<string | null>(null);
  readonly showManualEntry = signal(false);
  readonly isLocationReady = signal(false);
  readonly manualPincode = signal('');

  private readonly allRestaurants = [...RESTAURANTS] as Restaurant[];

  ngOnInit(): void {
    this.analytics.logScreenView('Business Selection', 'BusinessSelectionPage');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.isLoading.set(true);

    try {
      const locationResult = await this.locationService.checkLocationPermission();
      this.locationStatus.set(locationResult.permission);
      this.locationError.set(locationResult.error ?? null);

      if (locationResult.hasLocation && locationResult.pincode) {
        this.userPincode.set(locationResult.pincode);
        this.buildOptionsForPincode(locationResult.pincode);
      } else {
        const saved = this.locationService.getSavedPincode();
        if (saved) {
          this.userPincode.set(saved);
          this.buildOptionsForPincode(saved);
        } else {
          this.showManualEntry.set(true);
          this.buildFallbackOptions();
        }
      }
    } catch {
      this.locationError.set('common.error');
      this.locationStatus.set('denied');
      this.buildFallbackOptions();
    } finally {
      this.isLoading.set(false);
      setTimeout(() => this.isLocationReady.set(true), 500);
    }
  }

  private buildOptionsForPincode(pincode: string): void {
    const filtered = this.locationService.getBusinessesByPincode(this.allRestaurants, pincode);
    if (filtered.length === 0) {
      this.showManualEntry.set(true);
      this.buildFallbackOptions();
      return;
    }
    this.businessOptions.set([
      this.toOption('restaurant', 'businessSelection.restaurantsNear', filtered),
      this.toOption('store', 'businessSelection.storesNear', filtered),
    ].filter(o => o.businesses.length > 0));
  }

  private buildFallbackOptions(): void {
    this.businessOptions.set([
      this.toOption('restaurant', 'businessSelection.allRestaurants', this.allRestaurants),
      this.toOption('store', 'businessSelection.allStores', this.allRestaurants),
    ].filter(o => o.businesses.length > 0));
  }

  private toOption(type: 'restaurant' | 'store', titleKey: string, pool: Restaurant[]): BusinessOption {
    const businesses = pool.filter(r => r.type === type);
    return {
      type,
      titleKey,
      subtitleKey: type === 'restaurant' ? 'businessSelection.restaurantsSubtitle' : 'businessSelection.storesSubtitle',
      count: businesses.length,
      icon: type === 'restaurant' ? 'assets/business-types/restaurant.svg' : 'assets/business-types/grocery.svg',
      businesses,
    };
  }

  async requestLocation(): Promise<void> {
    this.locationStatus.set('checking');
    this.locationError.set(null);

    try {
      const result = await this.locationService.requestLocationPermission();
      this.analytics.logLocationPermission(result.permission === 'granted');
      this.locationStatus.set(result.permission);
      this.locationError.set(result.error ?? null);

      if (result.hasLocation && result.pincode) {
        this.userPincode.set(result.pincode);
        this.buildOptionsForPincode(result.pincode);
        this.showManualEntry.set(false);
      } else {
        this.buildFallbackOptions();
      }
    } catch {
      this.locationStatus.set('denied');
    }
  }

  selectType(type: 'restaurant' | 'store'): void {
    const option = this.businessOptions().find(o => o.type === type);
    this.selectedType.set(type);
    this.availableBusinesses.set(option?.businesses ?? []);
  }

  async selectBusiness(business: Restaurant): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.restaurantSwitching.switchRestaurant(business.id);
      if (result.success) {
        this.router.navigate(['/home']);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async setDefaultAndSelect(business: Restaurant): Promise<void> {
    localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID + '_default', business.id);
    await this.selectBusiness(business);
  }

  goBack(): void {
    this.selectedType.set(null);
    this.availableBusinesses.set([]);
  }

  onManualPincodeChange(value: string): void {
    this.manualPincode.set(value);
  }

  async submitManualPincode(): Promise<void> {
    const pincode = this.manualPincode();
    if (!pincode || pincode.length < 5) return;

    this.locationService.saveUserPincode(pincode);
    this.userPincode.set(pincode);
    const filtered = this.locationService.getBusinessesByPincode(this.allRestaurants, pincode);

    if (filtered.length > 0) {
      this.buildOptionsForPincode(pincode);
      this.showManualEntry.set(false);
    }
  }
}
