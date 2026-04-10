import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { getDistance } from 'geolib';
import { LocationService } from './location.service';
import { GoogleGeocodingService } from './google-geocoding.service';
import { UserAddress } from './user-management.service';

export interface SelectedLocation {
  label: string;       // e.g. 'Home', 'Set your location'
  address: string;     // short/full display address
  coordinates?: { lat: number; lng: number };
  type: 'gps' | 'saved' | 'nearby' | 'none';
}

export interface NearbyPlace {
  name: string;
  address: string;
  distanceMeters: number;
  coordinates: { lat: number; lng: number };
}

export interface SearchSuggestion {
  name: string;
  fullAddress: string;
  coordinates: { lat: number; lng: number };
}

const LS_KEY = 'zitro_selected_location_v2'; // v2: bumped to evict stale pre-fix cache

@Injectable({ providedIn: 'root' })
export class LocationSelectionService {

  // ── Public streams ──────────────────────────────────────────────────────
  private _selected$ = new BehaviorSubject<SelectedLocation>(this._loadPersisted());
  readonly selectedLocation$ = this._selected$.asObservable();

  private _sheetOpen$ = new BehaviorSubject<boolean>(false);
  readonly sheetOpen$ = this._sheetOpen$.asObservable();

  // Fires on every open() call — Subject (not BehaviorSubject) so it always
  // emits even if sheetOpen$ was already true, fixing the "second click does
  // nothing" bug when isOpen gets out of sync during async GPS/geocode flows.
  private _openTrigger$ = new Subject<void>();
  readonly openTrigger$ = this._openTrigger$.asObservable();

  // Tracks the saved address that was selected from the bottom sheet so the
  // cart can auto-sync its dropdown to match.
  private _selectedSavedAddress$ = new BehaviorSubject<UserAddress | null>(null);
  readonly selectedSavedAddress$ = this._selectedSavedAddress$.asObservable();

  setSelectedSavedAddress(addr: UserAddress | null): void {
    this._selectedSavedAddress$.next(addr);
  }

  // ── Cache ────────────────────────────────────────────────────────────────
  private _nearbyCache: NearbyPlace[] | null = null;
  private _nearbyCacheCoords: { lat: number; lng: number } | null = null;

  constructor(
    private locationService: LocationService,
    private geocodingService: GoogleGeocodingService
  ) {}

  // ── Bottom-sheet control ────────────────────────────────────────────────
  open(): void  {
    this._sheetOpen$.next(true);
    this._openTrigger$.next();   // always fires — Subject, not BehaviorSubject
  }
  close(): void { this._sheetOpen$.next(false); }

  // ── Selected location management ────────────────────────────────────────
  get snapshot(): SelectedLocation { return this._selected$.value; }

  setLocation(loc: SelectedLocation): void {
    this._selected$.next(loc);
    try { localStorage.setItem(LS_KEY, JSON.stringify(loc)); } catch { /* noop */ }
  }

  clearLocation(): void {
    const none: SelectedLocation = { label: 'Home', address: 'Set your location', type: 'none' };
    this._selected$.next(none);
    try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
  }

  // ── GPS + reverse geocode ───────────────────────────────────────────────
  async useCurrentGPS(): Promise<SelectedLocation> {
    const coords = await this.locationService.getCurrentLocation();
    const address = await this.reverseGeocode(coords.lat, coords.lng);
    const loc: SelectedLocation = {
      label: 'Current Location',
      address,
      coordinates: coords,
      type: 'gps'
    };
    this.setLocation(loc);
    return loc;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    return this.geocodingService.reverseGeocode(lat, lng);
  }

  // ── Nearby places ───────────────────────────────────────────────────────
  async getNearbyPlaces(userCoords: { lat: number; lng: number }): Promise<NearbyPlace[]> {
    // Return cache if user hasn't moved > 500m
    if (this._nearbyCache && this._nearbyCacheCoords) {
      const moved = getDistance(userCoords, this._nearbyCacheCoords);
      if (moved < 500) return this._nearbyCache;
    }

    const places = await this.geocodingService.getNearbyPlaces(userCoords);
    this._nearbyCache = places;
    this._nearbyCacheCoords = userCoords;
    return places;
  }

  // ── Address search (debounced by caller) ────────────────────────────────
  async searchAddresses(query: string, userCoords?: { lat: number; lng: number }): Promise<SearchSuggestion[]> {
    return this.geocodingService.searchAddresses(query, userCoords);
  }

  // ── Distance helpers ────────────────────────────────────────────────────
  getDistanceLabel(userCoords: { lat: number; lng: number }, targetCoords: { lat: number; lng: number }): string {
    const m = getDistance(userCoords, targetCoords);
    if (m < 1000) return `${m} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  // ── Persist / restore ───────────────────────────────────────────────────
  private _loadPersisted(): SelectedLocation {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as SelectedLocation;
    } catch { /* noop */ }
    return { label: 'Home', address: 'Set your location', type: 'none' };
  }
}
