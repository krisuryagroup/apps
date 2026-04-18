import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import {
  LocationSelectionService,
  NearbyPlace,
  SearchSuggestion
} from '@zitro/services';
import { UserManagementService, UserAddress } from '@zitro/services';
import { LocationService } from '@zitro/services';
import { FirebaseAuthService } from '@zitro/services';

@Component({
  selector: 'app-location-bottom-sheet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-bottom-sheet.component.html',
  styleUrls: ['./location-bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationBottomSheetComponent implements OnInit, OnDestroy {

  // ── Sheet visibility ─────────────────────────────────────────────────────
  isOpen = false;
  isAnimatingIn = false;

  // ── Search ───────────────────────────────────────────────────────────────
  searchQuery = '';
  suggestions: SearchSuggestion[] = [];
  isSearching = false;
  private search$ = new Subject<string>();

  // ── GPS state ────────────────────────────────────────────────────────────
  isLocating = false;
  locationError = '';
  currentGPSAddress = '';

  // ── User addresses ───────────────────────────────────────────────────────
  savedAddresses: UserAddress[] = [];
  isLoadingAddresses = false;
  isLoggedIn = false;

  // ── Nearby places ────────────────────────────────────────────────────────
  private allNearbyPlaces: NearbyPlace[] = [];
  nearbyPlaces: NearbyPlace[] = [];          // visible slice
  private nearbyShownCount = 10;
  get hasMoreNearby(): boolean { return this.nearbyPlaces.length < this.allNearbyPlaces.length; }
  isLoadingNearby = false;
  isLoadingMoreNearby = false;
  userCoords: { lat: number; lng: number } | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private selectionService: LocationSelectionService,
    private locationService: LocationService,
    private userMgmt: UserManagementService,
    private authService: FirebaseAuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Open on every trigger — uses Subject so it always fires even if already open
    this.selectionService.openTrigger$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.openSheet());

    // Close only
    this.selectionService.sheetOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        if (!open && this.isOpen) {
          this.isOpen = false;
          this.cdr.markForCheck();
        }
      });

    // Debounced search
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => this.runSearch(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Open / Close ─────────────────────────────────────────────────────────
  private async openSheet(): Promise<void> {
    this.isOpen = true;
    this.isAnimatingIn = true;
    this.searchQuery = '';
    this.suggestions = [];
    this.locationError = '';
    this.cdr.markForCheck();

    // Slight delay then remove enter-animation class
    setTimeout(() => { this.isAnimatingIn = false; this.cdr.markForCheck(); }, 350);

    // Load data in parallel
    await Promise.all([
      this.loadSavedAddresses(),
      this.initGPSAndNearby()
    ]);
  }

  close(): void {
    this.selectionService.close();
  }

  onOverlayClick(): void {
    this.close();
  }

  // ── Search ───────────────────────────────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery = value;
    if (!value.trim()) {
      this.suggestions = [];
      this.isSearching = false;
      this.cdr.markForCheck();
      return;
    }
    this.isSearching = true;
    this.cdr.markForCheck();
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.suggestions = [];
    this.isSearching = false;
    this.cdr.markForCheck();
  }

  private async runSearch(query: string): Promise<void> {
    const results = await this.selectionService.searchAddresses(query, this.userCoords ?? undefined);
    this.suggestions = results;
    this.isSearching = false;
    this.cdr.markForCheck();
  }

  selectSuggestion(s: SearchSuggestion): void {
    this.selectionService.setLocation({
      label: s.name,
      address: s.fullAddress,
      coordinates: s.coordinates,
      type: 'nearby'
    });
    this.close();
  }

  // ── GPS ──────────────────────────────────────────────────────────────────
  private async initGPSAndNearby(): Promise<void> {
    // Use cached coords immediately so nearby can load without waiting for GPS
    const cached = this.locationService.getCachedLocation();
    if (cached.coordinates) {
      this.userCoords = cached.coordinates;
      this.cdr.markForCheck();
      this.loadNearby(this.userCoords);  // fire-and-forget
    }

    // Silently get fresh GPS + reverse geocode for the "Use current location" row text
    try {
      const coords = await this.locationService.getCurrentLocation();
      this.userCoords = coords;
      const address = await this.selectionService.reverseGeocode(coords.lat, coords.lng);
      this.currentGPSAddress = address;
      this.cdr.markForCheck();
      // Only trigger nearby load if cache wasn't available
      if (!cached.coordinates) {
        this.loadNearby(coords);
      }
    } catch {
      // GPS denied or unavailable — nearby section stays hidden, no error shown
    }
  }

  async useCurrentLocation(): Promise<void> {
    this.isLocating = true;
    this.locationError = '';
    this.cdr.markForCheck();
    try {
      const loc = await this.selectionService.useCurrentGPS();
      this.currentGPSAddress = loc.address;
      this.userCoords = loc.coordinates ?? null;
      if (this.userCoords) {
        await this.loadNearby(this.userCoords);
      }
      this.close();
    } catch (e: any) {
      this.locationError = e?.message || 'Unable to get current location. Please try again.';
    } finally {
      this.isLocating = false;
      this.cdr.markForCheck();
    }
  }

  // ── Nearby ───────────────────────────────────────────────────────────────
  private async loadNearby(coords: { lat: number; lng: number }): Promise<void> {
    this.isLoadingNearby = true;
    this.cdr.markForCheck();
    try {
      this.allNearbyPlaces = await this.selectionService.getNearbyPlaces(coords);
      this.nearbyShownCount = 10;
      this.nearbyPlaces = this.allNearbyPlaces.slice(0, this.nearbyShownCount);
    } catch {
      this.allNearbyPlaces = [];
      this.nearbyPlaces = [];
    } finally {
      this.isLoadingNearby = false;
      this.cdr.markForCheck();
    }
  }

  loadMoreNearby(): void {
    if (this.isLoadingMoreNearby || !this.hasMoreNearby) return;
    this.isLoadingMoreNearby = true;
    this.cdr.markForCheck();
    // Simulate a small delay so the spinner is visible, then slice next page
    setTimeout(() => {
      this.nearbyShownCount += 10;
      this.nearbyPlaces = this.allNearbyPlaces.slice(0, this.nearbyShownCount);
      this.isLoadingMoreNearby = false;
      this.cdr.markForCheck();
    }, 300);
  }

  selectNearby(place: NearbyPlace): void {
    this.selectionService.setLocation({
      label: place.name,
      address: place.address,
      coordinates: place.coordinates,
      type: 'nearby'
    });
    this.close();
  }

  distanceLabel(place: NearbyPlace): string {
    if (!this.userCoords) return '';
    return this.selectionService.getDistanceLabel(this.userCoords, place.coordinates);
  }

  // ── Saved addresses ───────────────────────────────────────────────────────
  private async loadSavedAddresses(): Promise<void> {
    this.isLoggedIn = await this.userMgmt.isLoggedIn();
    if (!this.isLoggedIn) { this.cdr.markForCheck(); return; }
    this.isLoadingAddresses = true;
    this.cdr.markForCheck();
    try {
      const phone = await this.userMgmt.getCurrentUserPhone();
      if (phone) {
        const data = await this.userMgmt.getUserData(phone);
        this.savedAddresses = data?.addresses || [];
      }
    } catch {
      this.savedAddresses = [];
    } finally {
      this.isLoadingAddresses = false;
      this.cdr.markForCheck();
    }
  }

  async selectSavedAddress(addr: UserAddress): Promise<void> {
    const fullAddress = [addr.houseAndStreet, addr.town, addr.state].filter(Boolean).join(', ');
    
    try {
      // Geocode the address to get coordinates
      const suggestions = await this.selectionService.searchAddresses(fullAddress);
      
      if (suggestions.length > 0) {
        // Use coordinates from the first matching suggestion
        const coords = suggestions[0].coordinates;
        this.selectionService.setLocation({
          label: addr.type || 'Home',
          address: fullAddress,
          coordinates: coords,
          type: 'saved'
        });
      } else {
        // Fallback: if no geocoding result, send without coordinates
        this.selectionService.setLocation({
          label: addr.type || 'Home',
          address: fullAddress,
          type: 'saved'
        });
      }
    } catch (error) {
      // Fallback: if geocoding fails, save address without coordinates
      console.warn('Geocoding failed for saved address in bottom sheet:', error);
      this.selectionService.setLocation({
        label: addr.type || 'Home',
        address: fullAddress,
        type: 'saved'
      });
    }
    
    this.selectionService.setSelectedSavedAddress(addr);
    this.close();
  }

  getAddressTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      Home: 'home',
      Office: 'business_center',
      Other: 'person'
    };
    return icons[type] || 'location_on';
  }

  savedAddressDistance(addr: UserAddress): string {
    if (!this.userCoords) return '';
    // We don't store coordinates in UserAddress; skip distance for saved
    return '';
  }

  // ── Navigate to Add Address ───────────────────────────────────────────────
  saveCurrentLocationAsAddress(): void {
    this.close();
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/signin']);
      return;
    }
    const queryParams: Record<string, string | number> = { mode: 'manage' };
    if (this.userCoords) {
      queryParams['lat'] = this.userCoords.lat;
      queryParams['lng'] = this.userCoords.lng;
    }
    this.router.navigate(['/add-address'], { queryParams });
  }

  goToAddAddress(): void {
    this.close();
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/signin']);
      return;
    }
    this.router.navigate(['/add-address'], { queryParams: { mode: 'manage' } });
  }
}
