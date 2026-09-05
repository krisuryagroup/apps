import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { NearbyBusinessesResponse } from '@zitro/models';
import { ZITRO_API_BASE_URL } from './tokens';
import { CustomerEndpoints } from './endpoints';

export interface NearbyBusinessesParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  businessType?: string;
  tagIds?: string;
  vegOnly?: boolean;
  sort?: string;
  openNow?: boolean;
  freeDelivery?: boolean;
  cursor?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class NearbyBusinessesService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getNearbyBusinesses(
    params: NearbyBusinessesParams,
  ): Observable<NearbyBusinessesResponse> {
    let httpParams = new HttpParams()
      .set('lat', String(params.lat))
      .set('lng', String(params.lng))
      .set('radiusKm', String(params.radiusKm ?? 10));

    if (params.businessType)
      httpParams = httpParams.set('businessType', params.businessType);
    if (params.tagIds) httpParams = httpParams.set('tagIds', params.tagIds);
    if (params.vegOnly != null)
      httpParams = httpParams.set('vegOnly', String(params.vegOnly));
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.openNow != null)
      httpParams = httpParams.set('openNow', String(params.openNow));
    if (params.freeDelivery != null)
      httpParams = httpParams.set('freeDelivery', String(params.freeDelivery));
    if (params.cursor) httpParams = httpParams.set('cursor', params.cursor);
    if (params.limit != null)
      httpParams = httpParams.set('limit', String(params.limit));

    return this.http
      .get<NearbyBusinessesResponse>(
        `${this.baseUrl}${CustomerEndpoints.nearbyBusinesses.search()}`,
        { params: httpParams },
      )
      .pipe(
        map((response) => ({
          ...response,
          businesses: response.businesses.map((b) => ({
            ...b,
            deliveryTimeDisplay: b.deliveryTimeMinutes
              ? `${b.deliveryTimeMinutes.min}-${b.deliveryTimeMinutes.max} min`
              : null,
          })),
        })),
      );
  }
}
