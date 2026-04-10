import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Restaurant } from '@zitro/utils';
import { GoogleGeocodingService } from './google-geocoding.service';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationPermissionStatus {
  permission: 'granted' | 'denied' | 'prompt';
  hasLocation: boolean;
  coordinates?: Coordinates;
  pincode?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private currentLocation: Coordinates | null = null;
  private currentPincode: string | null = null;

  constructor(private geocodingService: GoogleGeocodingService) {}

  /** True when running as a native Android/iOS app via Capacitor */
  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Wrap browser navigator.geolocation in a Promise.
   * Only called on web — never on native.
   */
  private getBrowserLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          switch (err.code) {
            case err.PERMISSION_DENIED:
              this.saveLocationPermissionPreference('denied');
              reject(new Error('Location permission denied. Please allow access in your browser settings.'));
              break;
            case err.POSITION_UNAVAILABLE:
              reject(new Error('Location unavailable. Check your device or browser settings.'));
              break;
            case err.TIMEOUT:
              reject(new Error('Location request timed out. Please try again.'));
              break;
            default:
              reject(new Error('Unable to determine your location.'));
          }
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
      );
    });
  }

  /**
   * Check location permission status and request permission if needed
   */
  async checkLocationPermission(): Promise<LocationPermissionStatus> {
    // ── Native (Android / iOS) path ───────────────────────────────────────
    if (this.isNative()) {
      try {
        console.log('🔍 [Native] Checking Capacitor location permissions...');
        const permissions = await Geolocation.checkPermissions();

        if (permissions.location === 'granted') {
          try {
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
            const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            const pincode = await this.getPincodeFromCoordinates(coordinates);
            this.currentLocation = coordinates;
            this.currentPincode = pincode;
            return { permission: 'granted', hasLocation: true, coordinates, pincode };
          } catch (err: any) {
            return { permission: 'granted', hasLocation: false, error: 'Unable to get current location' };
          }
        }

        if (permissions.location === 'denied') {
          return { permission: 'denied', hasLocation: false, error: 'Location permission denied' };
        }

        // 'prompt' — ask the user
        return await this.requestLocationPermission();
      } catch (err: any) {
        return { permission: 'denied', hasLocation: false, error: err.message || 'Location services unavailable' };
      }
    }

    // ── Browser (web) path ────────────────────────────────────────────────
    console.log('🔍 [Web] Checking browser location permissions...');
    try {
      // Use Permissions API if available (Chrome, Firefox, Edge)
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        console.log('📍 [Web] Permission state:', status.state);

        if (status.state === 'denied') {
          this.saveLocationPermissionPreference('denied');
          return { permission: 'denied', hasLocation: false, error: 'Location permission denied. Please allow it in your browser settings.' };
        }
      }

      // 'granted' or 'prompt' — attempt to get position (triggers browser prompt if needed)
      const coordinates = await this.getBrowserLocation();
      const pincode = await this.getPincodeFromCoordinates(coordinates);
      this.currentLocation = coordinates;
      this.currentPincode = pincode;
      this.saveLocationPermissionPreference('granted');
      return { permission: 'granted', hasLocation: true, coordinates, pincode };
    } catch (err: any) {
      const isDenied = err.message?.toLowerCase().includes('denied');
      return {
        permission: isDenied ? 'denied' : 'prompt',
        hasLocation: false,
        error: err.message || 'Unable to get location'
      };
    }
  }

  /**
   * Request location permission from user
   */
  async requestLocationPermission(): Promise<LocationPermissionStatus> {
    // ── Native path ───────────────────────────────────────────────────────
    if (this.isNative()) {
      try {
        console.log('🙋 [Native] Requesting Capacitor location permission...');
        const permissions = await Geolocation.requestPermissions();

        if (permissions.location === 'granted') {
          try {
            const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
            const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            const pincode = await this.getPincodeFromCoordinates(coordinates);
            this.currentLocation = coordinates;
            this.currentPincode = pincode;
            this.saveLocationPermissionPreference('granted');
            return { permission: 'granted', hasLocation: true, coordinates, pincode };
          } catch (err: any) {
            return { permission: 'granted', hasLocation: false, error: 'Unable to get current location' };
          }
        }

        this.saveLocationPermissionPreference('denied');
        return { permission: 'denied', hasLocation: false, error: 'Location permission denied by user' };
      } catch (err: any) {
        return { permission: 'denied', hasLocation: false, error: err.message || 'Unable to request location permission' };
      }
    }

    // ── Browser path ──────────────────────────────────────────────────────
    // On web, calling getCurrentPosition() IS the permission request — the browser
    // shows its own prompt automatically. No separate requestPermissions() needed.
    console.log('🙋 [Web] Requesting browser location permission...');
    try {
      const coordinates = await this.getBrowserLocation();
      const pincode = await this.getPincodeFromCoordinates(coordinates);
      this.currentLocation = coordinates;
      this.currentPincode = pincode;
      this.saveLocationPermissionPreference('granted');
      return { permission: 'granted', hasLocation: true, coordinates, pincode };
    } catch (err: any) {
      const isDenied = err.message?.toLowerCase().includes('denied');
      if (isDenied) this.saveLocationPermissionPreference('denied');
      return {
        permission: isDenied ? 'denied' : 'prompt',
        hasLocation: false,
        error: err.message || 'Location permission denied'
      };
    }
  }

  /**
   * Get pincode from coordinates using Google Geocoding API.
   * Falls back to '206244' if no postal code can be resolved.
   */
  async getPincodeFromCoordinates(coordinates: Coordinates): Promise<string> {
    return this.geocodingService.getPincodeFromCoordinates(coordinates.lat, coordinates.lng);
  }

  /**
   * Get businesses filtered by pincode
   */
  getBusinessesByPincode(businesses: Restaurant[], pincode: string): Restaurant[] {
    return businesses.filter(business => business.pincode === pincode);
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): { coordinates: Coordinates | null; pincode: string | null } {
    return {
      coordinates: this.currentLocation,
      pincode: this.currentPincode
    };
  }

  /**
   * Clear cached location data
   */
  clearLocationCache(): void {
    this.currentLocation = null;
    this.currentPincode = null;
  }

  /**
   * Save location permission preference
   */
  saveLocationPermissionPreference(permission: 'granted' | 'denied'): void {
    localStorage.setItem('location_permission_preference', permission);
  }

  /**
   * Get saved location permission preference
   */
  getLocationPermissionPreference(): 'granted' | 'denied' | null {
    return localStorage.getItem('location_permission_preference') as 'granted' | 'denied' | null;
  }

  /**
   * Check if we should skip location prompt based on user preference
   */
  shouldSkipLocationPrompt(): boolean {
    const preference = this.getLocationPermissionPreference();
    return preference === 'denied';
  }

  /**
   * Save user's pincode manually (if they provide it)
   */
  saveUserPincode(pincode: string): void {
    localStorage.setItem('user_pincode_manual', pincode);
    this.currentPincode = pincode;
  }

  /**
   * Get manually saved pincode
   */
  getSavedPincode(): string | null {
    return localStorage.getItem('user_pincode_manual');
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in kilometers
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(coord2.lat - coord1.lat);
    const dLng = this.degreesToRadians(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(coord1.lat)) * Math.cos(this.degreesToRadians(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Sort restaurants by proximity to a given location
   */
  sortByProximity(restaurants: Restaurant[], userLocation: Coordinates): Restaurant[] {
    return restaurants.sort((a, b) => {
      const distanceA = this.calculateDistance(userLocation, a.coordinates || { lat: 0, lng: 0 });
      const distanceB = this.calculateDistance(userLocation, b.coordinates || { lat: 0, lng: 0 });
      return distanceA - distanceB;
    });
  }

  /**
   * Get user's current location.
   * On native (Android/iOS): uses Capacitor Geolocation.
   * On web (browser):        uses navigator.geolocation directly.
   * Throws a user-friendly Error if location is unavailable — never returns fake coords.
   */
  async getCurrentLocation(): Promise<Coordinates> {
    if (this.isNative()) {
      // ── Native ──────────────────────────────────────────────────────────
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      this.currentLocation = coords;
      return coords;
    }

    // ── Browser ─────────────────────────────────────────────────────────
    const coords = await this.getBrowserLocation(); // throws with a clear message on failure
    this.currentLocation = coords;
    return coords;
  }

  /**
   * Sort restaurants by pincode proximity (simpler method)
   */
  sortByPincodeProximity(restaurants: Restaurant[], userPincode: string): Restaurant[] {
    return restaurants.sort((a, b) => {
      const diffA = Math.abs(parseInt(a.pincode) - parseInt(userPincode));
      const diffB = Math.abs(parseInt(b.pincode) - parseInt(userPincode));
      return diffA - diffB;
    });
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
