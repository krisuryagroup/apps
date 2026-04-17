import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import type { NearbyBusiness } from '@zitro/models';
import { ZITRO_API_BASE_URL } from './tokens';

@Injectable({ providedIn: 'root' })
export class NearbyBusinessesService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  /** In-memory session cache: key = `${lat},${lng}` */
  private readonly sessionCache = new Map<string, NearbyBusiness[]>();

  getNearbyBusinesses(lat: number, lng: number, radiusKm = 10): Observable<NearbyBusiness[]> {
    const key = `${lat},${lng}`;
    const cached = this.sessionCache.get(key);
    if (cached) return of(cached);

    return this.http
      .get<NearbyBusiness[]>(`${this.baseUrl}/api/businesses/nearby`, {
        params: { lat: String(lat), lng: String(lng), radiusKm: String(radiusKm) },
      })
      .pipe(tap(businesses => this.sessionCache.set(key, businesses)));
  }

  getByType(businesses: NearbyBusiness[], type: string): NearbyBusiness[] {
    return businesses.filter(b => b.businessType === type);
  }
}
