import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { getDistance } from 'geolib';

import { environment } from './environment';

// ── Public return types ─────────────────────────────────────────────────────
// Shapes are intentionally compatible with NearbyPlace / SearchSuggestion in
// location-selection.service.ts so no casting is needed at call sites.

export interface GeoNearbyPlace {
  name: string;
  address: string;
  distanceMeters: number;
  coordinates: { lat: number; lng: number };
}

export interface GeoSearchSuggestion {
  name: string;
  fullAddress: string;
  coordinates: { lat: number; lng: number };
}

// ── Constants ───────────────────────────────────────────────────────────────
const GEOCODING_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';
// New Places API v1 — uses POST + X-Goog-Api-Key header → CORS-enabled for browsers
// (Old /maps/api/place/* endpoints are server-side only and block browser CORS requests)
const PLACES_V1_BASE = 'https://places.googleapis.com/v1';
const DEFAULT_PINCODE = '206244';

@Injectable({ providedIn: 'root' })
export class GoogleGeocodingService {
  private http = inject(HttpClient);

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Returns the unique set of API keys to try for Geocoding API calls.
   * geocodingApiKey is tried first; placesApiKey is the auto-fallback in case
   * the Geocoding API is not enabled on the primary key.
   */
  private geocodingKeys(): string[] {
    const { geocodingApiKey, placesApiKey } = environment.google;
    // Deduplicate in case both keys are the same
    return [...new Set([geocodingApiKey, placesApiKey].filter(Boolean))];
  }

  /**
   * Reverse geocode using New Places API v1 searchNearby (50 m radius).
   * Used as the final fallback when the Geocoding API is not enabled on any key.
   * Returns the formattedAddress of the nearest place, cleaned up for display.
   */
  private async reverseGeocodeViaPlaces(
    lat: number,
    lng: number,
  ): Promise<string | null> {
    try {
      const body = {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 50,
          },
        },
        maxResultCount: 1,
        languageCode: 'en',
      };

      const res: any = await firstValueFrom(
        this.http.post(`${PLACES_V1_BASE}/places:searchNearby`, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': environment.google.placesApiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.addressComponents',
          },
        }),
      );

      if (res?.places?.length) {
        const place = res.places[0];
        // Prefer formattedAddress stripped of postal code and country
        if (place.formattedAddress) {
          const cleaned = place.formattedAddress
            .replace(/\d{6},\s*/g, '') // strip 6-digit PIN
            .replace(/,\s*India\s*$/i, '') // strip trailing ", India"
            .split(',')
            .slice(0, 3)
            .map((s: string) => s.trim())
            .filter(Boolean)
            .join(', ');
          if (cleaned) return cleaned;
        }
        if (place.displayName?.text) return place.displayName.text;
      }
    } catch (e) {
      console.warn('[GoogleGeocoding] reverseGeocodeViaPlaces failed:', e);
    }
    return null;
  }

  /** Extract the `long_name` of the first component that matches any of the given types */
  private getComponent(components: any[], ...types: string[]): string {
    for (const type of types) {
      const comp = components.find((c: any) => c.types.includes(type));
      if (comp) return comp.long_name;
    }
    return '';
  }

  /**
   * Build a concise, India-optimized display address from Google address_components.
   * Priority: road -> sublocality_level_2 -> sublocality_level_1 -> locality (city).
   * Never shows district / administrative_area_level_2 (avoids "Dadri"-style issues).
   */
  buildDisplayAddress(components: any[], formattedAddress: string): string {
    const route = this.getComponent(components, 'route');
    const sub2 = this.getComponent(components, 'sublocality_level_2');
    const sub1 = this.getComponent(components, 'sublocality_level_1');
    const locality = this.getComponent(components, 'locality');

    const parts = [route, sub2, sub1, locality]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

    if (parts.length >= 1) return parts.slice(0, 3).join(', ');

    // Fallback: strip 6-digit postal code + take first 3 comma tokens
    return formattedAddress
      .replace(/\d{6},\s*/g, '')
      .split(',')
      .slice(0, 3)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(', ');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Reverse geocode lat/lng -> human-readable display address (India-optimized).
   * Tries geocodingApiKey first, falls back to placesApiKey automatically
   * so a missing API enablement on one key never causes lat/lng to show.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    for (const key of this.geocodingKeys()) {
      try {
        // Targeted call: prefer street/sublocality/locality granularity
        const params = new HttpParams()
          .set('latlng', `${lat},${lng}`)
          .set('result_type', 'street_address|sublocality|locality')
          .set('language', 'en')
          .set('key', key);

        const res: any = await firstValueFrom(
          this.http.get(GEOCODING_BASE, { params }),
        );

        if (res.status === 'OK' && res.results?.length) {
          return this.buildDisplayAddress(
            res.results[0].address_components,
            res.results[0].formatted_address,
          );
        }

        // Broad fallback (no result_type filter) — still using same key
        const broad = new HttpParams()
          .set('latlng', `${lat},${lng}`)
          .set('language', 'en')
          .set('key', key);

        const fb: any = await firstValueFrom(
          this.http.get(GEOCODING_BASE, { params: broad }),
        );

        if (fb.status === 'OK' && fb.results?.length) {
          return this.buildDisplayAddress(
            fb.results[0].address_components,
            fb.results[0].formatted_address,
          );
        }

        // Key worked but returned no usable result (ZERO_RESULTS etc.) — no need to retry
        if (res.status === 'ZERO_RESULTS' || fb.status === 'ZERO_RESULTS')
          break;

        // REQUEST_DENIED / key not enabled — try next key
        console.warn(
          `[GoogleGeocoding] reverseGeocode key attempt failed (${res.status}) — trying next key`,
        );
      } catch (e) {
        console.warn(
          '[GoogleGeocoding] reverseGeocode request error — trying next key:',
          e,
        );
      }
    }
    // All Geocoding API keys failed — fall back to Places API v1 searchNearby
    const placesAddr = await this.reverseGeocodeViaPlaces(lat, lng);
    if (placesAddr) return placesAddr;
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  /**
   * Look up the 6-digit postal code for given coordinates.
   * Tries geocodingApiKey first, falls back to placesApiKey automatically.
   */
  async getPincodeFromCoordinates(lat: number, lng: number): Promise<string> {
    for (const key of this.geocodingKeys()) {
      try {
        // Targeted: only postal_code result type
        const params = new HttpParams()
          .set('latlng', `${lat},${lng}`)
          .set('result_type', 'postal_code')
          .set('language', 'en')
          .set('key', key);

        const res: any = await firstValueFrom(
          this.http.get(GEOCODING_BASE, { params }),
        );

        if (res.status === 'OK' && res.results?.length) {
          const pc = this.getComponent(
            res.results[0].address_components,
            'postal_code',
          );
          if (pc) return pc;
        }

        // Broad fallback: scan all result types for a postal_code component
        const broad = new HttpParams()
          .set('latlng', `${lat},${lng}`)
          .set('language', 'en')
          .set('key', key);

        const fb: any = await firstValueFrom(
          this.http.get(GEOCODING_BASE, { params: broad }),
        );

        if (fb.status === 'OK') {
          for (const result of fb.results) {
            const pc = this.getComponent(
              result.address_components,
              'postal_code',
            );
            if (pc) return pc;
          }
        }

        if (res.status === 'ZERO_RESULTS' || fb.status === 'ZERO_RESULTS')
          break;
        console.warn(
          `[GoogleGeocoding] getPincode key attempt failed (${res.status}) — trying next key`,
        );
      } catch (e) {
        console.warn(
          '[GoogleGeocoding] getPincode request error — trying next key:',
          e,
        );
      }
    }
    // All Geocoding API keys failed — try to extract pincode via Places API v1
    try {
      const body = {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 500,
          },
        },
        maxResultCount: 3,
        languageCode: 'en',
      };
      const res: any = await firstValueFrom(
        this.http.post(`${PLACES_V1_BASE}/places:searchNearby`, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': environment.google.placesApiKey,
            'X-Goog-FieldMask': 'places.addressComponents',
          },
        }),
      );
      for (const place of res?.places ?? []) {
        for (const comp of place.addressComponents ?? []) {
          if (comp.types?.includes('postal_code') && comp.longText) {
            return comp.longText;
          }
        }
      }
    } catch {
      /* fall through */
    }
    return DEFAULT_PINCODE;
  }

  /**
   * Search places using New Places API v1 — POST /places:searchText.
   * POST-based + X-Goog-Api-Key header = CORS-enabled in browsers.
   * Uses placesApiKey.
   */
  async searchAddresses(
    query: string,
    userCoords?: { lat: number; lng: number },
  ): Promise<GeoSearchSuggestion[]> {
    if (!query || query.trim().length < 3) return [];

    try {
      const body: Record<string, any> = {
        textQuery: query,
        languageCode: 'en',
        regionCode: 'IN',
        maxResultCount: 8,
      };

      if (userCoords) {
        body['locationBias'] = {
          circle: {
            center: { latitude: userCoords.lat, longitude: userCoords.lng },
            radius: 50000,
          },
        };
      }

      const res: any = await firstValueFrom(
        this.http.post(`${PLACES_V1_BASE}/places:searchText`, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': environment.google.placesApiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.location',
          },
        }),
      );

      if (res?.places?.length) {
        return res.places.map(
          (r: any): GeoSearchSuggestion => ({
            name:
              r.displayName?.text || r.formattedAddress?.split(',')[0] || '',
            fullAddress: r.formattedAddress || '',
            coordinates: {
              lat: r.location.latitude,
              lng: r.location.longitude,
            },
          }),
        );
      }
    } catch (e) {
      console.warn('[GoogleGeocoding] searchAddresses failed:', e);
    }
    return [];
  }

  /**
   * Get nearby places using New Places API v1 — POST /places:searchNearby.
   * POST-based + X-Goog-Api-Key header = CORS-enabled in browsers.
   * Results sorted by distance. Uses placesApiKey.
   */
  async getNearbyPlaces(userCoords: {
    lat: number;
    lng: number;
  }): Promise<GeoNearbyPlace[]> {
    try {
      const body = {
        locationRestriction: {
          circle: {
            center: { latitude: userCoords.lat, longitude: userCoords.lng },
            radius: 15000,
          },
        },
        maxResultCount: 20,
        languageCode: 'en',
      };

      const res: any = await firstValueFrom(
        this.http.post(`${PLACES_V1_BASE}/places:searchNearby`, body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': environment.google.placesApiKey,
            'X-Goog-FieldMask':
              'places.displayName,places.formattedAddress,places.location',
          },
        }),
      );

      if (res?.places?.length) {
        return (res.places as any[])
          .map((r: any): GeoNearbyPlace => {
            const coords = {
              lat: r.location.latitude,
              lng: r.location.longitude,
            };
            return {
              name: r.displayName?.text || '',
              address: r.formattedAddress || '',
              distanceMeters: getDistance(userCoords, coords),
              coordinates: coords,
            };
          })
          .sort((a, b) => a.distanceMeters - b.distanceMeters);
      }
    } catch (e) {
      console.warn('[GoogleGeocoding] getNearbyPlaces failed:', e);
    }
    return [];
  }

  /**
   * Get full address breakdown from lat/lng: pincode, town, state, formatted display address.
   * Used by the Add Address map pin drop to auto-fill and lock area fields.
   */
  async getFullAddressComponents(
    lat: number,
    lng: number,
  ): Promise<{
    pincode: string;
    town: string;
    state: string;
    landmark: string;
    formattedAddress: string;
  }> {
    for (const key of this.geocodingKeys()) {
      try {
        const params = new HttpParams()
          .set('latlng', `${lat},${lng}`)
          .set('language', 'en')
          .set('key', key);

        const res: any = await firstValueFrom(
          this.http.get(GEOCODING_BASE, { params }),
        );

        if (res.status === 'OK' && res.results?.length) {
          const comps = res.results[0].address_components;
          const pincode = this.getComponent(comps, 'postal_code');
          const town =
            this.getComponent(comps, 'locality') ||
            this.getComponent(comps, 'sublocality_level_1') ||
            this.getComponent(comps, 'administrative_area_level_3') ||
            this.getComponent(comps, 'administrative_area_level_2');
          const state = this.getComponent(comps, 'administrative_area_level_1');
          const landmark =
            this.getComponent(comps, 'neighborhood') ||
            this.getComponent(comps, 'sublocality_level_2') ||
            this.getComponent(comps, 'sublocality_level_1') ||
            '';
          const formattedAddress = this.buildDisplayAddress(
            comps,
            res.results[0].formatted_address,
          );
          return {
            pincode: pincode || DEFAULT_PINCODE,
            town,
            state,
            landmark,
            formattedAddress,
          };
        }
        if (res.status === 'ZERO_RESULTS') break;
        console.warn(
          `[GoogleGeocoding] getFullAddressComponents failed (${res.status}) — trying next key`,
        );
      } catch (e) {
        console.warn('[GoogleGeocoding] getFullAddressComponents error:', e);
      }
    }
    return {
      pincode: DEFAULT_PINCODE,
      town: '',
      state: '',
      landmark: '',
      formattedAddress: '',
    };
  }
}
