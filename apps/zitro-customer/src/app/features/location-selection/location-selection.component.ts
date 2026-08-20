import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
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
export class LocationSelectionComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly locationSelectionService = inject(LocationSelectionService);
  private readonly userManagement = inject(UserManagementService);

  readonly isLocating = signal(false);
  readonly locationError = signal<string | null>(null);
  readonly savedAddresses = signal<UserAddress[]>([]);

  private readonly destroy$ = new Subject<void>();

  async ngOnInit(): Promise<void> {
    const phone = await this.userManagement.getCurrentUserPhone();
    if (phone) {
      const userData = await this.userManagement.getUserData(phone);
      this.savedAddresses.set(userData?.addresses ?? []);
    }

    // The bottom sheet opened by onSearchLocation() picks a location by
    // writing to LocationSelectionService's own store (zitro_selected_location_v2),
    // not the LOCATION_STORAGE_KEY (zitro_user_location) that locationGuard
    // actually checks — without this bridge, selecting a location there would
    // close the sheet but leave the user stuck on this page (or bounced back
    // to it), since the guard would still see no saved location.
    //
    // Uses persistAndNavigate(), NOT saveAndNavigate() — the location is
    // already set on locationSelectionService (that's why this subscription
    // is firing), so calling setLocation() again here would re-trigger this
    // same subscription synchronously and recurse forever (confirmed live:
    // "Maximum call stack size exceeded" before this was split out).
    this.locationSelectionService.selectedLocation$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loc) => {
        if (loc.type === 'none') return;
        this.persistAndNavigate({
          lat: loc.coordinates?.lat ?? 0,
          lng: loc.coordinates?.lng ?? 0,
          label: loc.label,
          address: loc.address,
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  async onSelectSavedAddress(addr: UserAddress): Promise<void> {
    const fullAddress = `${addr.houseAndStreet}, ${addr.town}, ${addr.pincode}`;

    try {
      // Geocode the address to get actual coordinates
      const suggestions =
        await this.locationSelectionService.searchAddresses(fullAddress);

      if (suggestions.length > 0) {
        // Use coordinates from the first matching suggestion
        const coords = suggestions[0].coordinates;
        this.saveAndNavigate({
          lat: coords.lat,
          lng: coords.lng,
          label: addr.type || addr.name,
          address: fullAddress,
        });
      } else {
        // Fallback: if no geocoding result, use 0,0 but mark as saved type
        // The system will still work, just without precise GPS
        this.saveAndNavigate({
          lat: 0,
          lng: 0,
          label: addr.type || addr.name,
          address: fullAddress,
        });
      }
    } catch (error) {
      // Fallback: if geocoding fails, save address without coordinates
      console.warn('Geocoding failed for saved address:', error);
      this.saveAndNavigate({
        lat: 0,
        lng: 0,
        label: addr.type || addr.name,
        address: fullAddress,
      });
    }
  }

  onSearchLocation(): void {
    // Opens the same global location bottom sheet used everywhere else in the
    // app (search, GPS, nearby places) — works for guests, no sign-in
    // required. Only its own "Add Address"/"Save as address" actions gate on
    // being signed in. Selecting a location there resolves through the
    // selectedLocation$ subscription in ngOnInit above.
    this.locationSelectionService.open();
  }

  private saveAndNavigate(location: UserLocation): void {
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
    this.persistAndNavigate(location);
  }

  private persistAndNavigate(location: UserLocation): void {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
    this.router.navigate(['/home']);
  }
}
