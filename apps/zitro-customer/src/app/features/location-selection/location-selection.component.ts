import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import {
  LocationService,
  LocationSelectionService,
  UserManagementService,
  UserAddress,
} from '@zitro/services';
import {
  LOCATION_STORAGE_KEY,
  UserLocation,
} from '../../core/constants/app.constants';

@Component({
  selector: 'app-location-selection',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './location-selection.component.html',
  styleUrl: './location-selection.component.scss',
})
export class LocationSelectionComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly locationSelectionService = inject(LocationSelectionService);
  private readonly userManagement = inject(UserManagementService);

  readonly isLocating = signal(false);
  readonly locationError = signal<string | null>(null);
  readonly savedAddresses = signal<UserAddress[]>([]);

  async ngOnInit(): Promise<void> {
    const phone = await this.userManagement.getCurrentUserPhone();
    if (phone) {
      const userData = await this.userManagement.getUserData(phone);
      this.savedAddresses.set(userData?.addresses ?? []);
    }
  }

  async onEnableGps(): Promise<void> {
    this.isLocating.set(true);
    this.locationError.set(null);
    try {
      const coords = await this.locationService.getCurrentLocation();
      const address = await this.locationSelectionService.reverseGeocode(
        coords.lat,
        coords.lng,
      );
      this.saveAndNavigate({
        lat: coords.lat,
        lng: coords.lng,
        label: 'Current Location',
        address,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : null;
      const isDenied = msg?.toLowerCase().includes('denied');
      this.locationError.set(
        isDenied
          ? 'locationSelection.locationDenied'
          : 'locationSelection.locationError',
      );
    } finally {
      this.isLocating.set(false);
    }
  }

  onSelectSavedAddress(addr: UserAddress): void {
    this.saveAndNavigate({
      lat: 0,
      lng: 0,
      label: addr.type || addr.name,
      address: `${addr.houseAndStreet}, ${addr.town}, ${addr.pincode}`,
    });
  }

  onSearchLocation(): void {
    this.router.navigate(['/add-address']);
  }

  private saveAndNavigate(location: UserLocation): void {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    // Also update the app-wide header display via LocationSelectionService
    this.locationSelectionService.setLocation({
      label: location.label,
      address: location.address,
      coordinates:
        location.lat !== 0 || location.lng !== 0
          ? { lat: location.lat, lng: location.lng }
          : undefined,
      type: location.lat !== 0 ? 'gps' : 'saved',
    });
    this.router.navigate(['/home']);
  }
}
