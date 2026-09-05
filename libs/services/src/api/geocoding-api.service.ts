import { Injectable, inject } from '@angular/core';
import { GoogleGeocodingService } from '../google-geocoding.service';
import type {
  GeoNearbyPlace,
  GeoSearchSuggestion,
} from '../google-geocoding.service';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { ZITRO_API_BASE_URL } from '../tokens';
import { CustomerEndpoints } from '../endpoints';
import type { NearbyBusiness } from '@zitro/models';

export type { GeoNearbyPlace, GeoSearchSuggestion };

@Injectable({ providedIn: 'root' })
export class GeocodingApiService {
  private geocoding = inject(GoogleGeocodingService);
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  reverseGeocode(lat: number, lng: number): Observable<string> {
    return from(this.geocoding.reverseGeocode(lat, lng));
  }

  searchAddresses(
    query: string,
    nearLat: number,
    nearLng: number,
  ): Observable<GeoSearchSuggestion[]> {
    return from(
      this.geocoding.searchAddresses(query, { lat: nearLat, lng: nearLng }),
    );
  }

  getNearbyPlaces(lat: number, lng: number): Observable<GeoNearbyPlace[]> {
    return from(this.geocoding.getNearbyPlaces({ lat, lng }));
  }

  getNearbyBusinesses(
    lat: number,
    lng: number,
    radiusKm = 10,
  ): Observable<NearbyBusiness[]> {
    return this.http.get<NearbyBusiness[]>(
      `${this.baseUrl}${CustomerEndpoints.nearbyBusinesses.search()}`,
      {
        params: {
          lat: String(lat),
          lng: String(lng),
          radiusKm: String(radiusKm),
        },
      },
    );
  }
}
