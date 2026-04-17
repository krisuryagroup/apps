import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

export interface BusinessConfig {
  slug: string;
  deliveryEnabled: boolean;
  takeoutEnabled: boolean;
  dineInEnabled: boolean;
  minOrderAmount: number;
  deliveryFee: number;
  freeDeliveryAbove: number;
  packagingFee: number;
  platformFee: number;
  gstPercent: number;
  estimatedDeliveryMinutes: number;
  cancellationWindowMinutes: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  actionType: 'none' | 'product' | 'category' | 'url';
  actionValue: string | null;
  sortOrder: number;
}

export interface AppVersionInfo {
  currentVersion: string;
  minimumVersion: string;
  forceUpdate: boolean;
  releaseNotes: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConfigApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getBusinessConfig(businessSlug: string): Observable<BusinessConfig> {
    const cacheKey = `config:${businessSlug}`;
    const cached = this.cache.get<BusinessConfig>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<BusinessConfig>(`${this.baseUrl}/api/businesses/${businessSlug}/config`).pipe(
      tap(config => this.cache.set(cacheKey, config, { ttlHours: 1 / 6 })),
    );
  }

  getBanners(businessSlug: string): Observable<Banner[]> {
    const cacheKey = `banners:${businessSlug}`;
    const cached = this.cache.get<Banner[]>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<Banner[]>(`${this.baseUrl}/api/businesses/${businessSlug}/banners`).pipe(
      tap(banners => this.cache.set(cacheKey, banners, { ttlHours: 1 })),
    );
  }

  getAppVersion(): Observable<AppVersionInfo> {
    const cacheKey = 'app:version';
    const cached = this.cache.get<AppVersionInfo>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<AppVersionInfo>(`${this.baseUrl}/api/app/version`).pipe(
      tap(info => this.cache.set(cacheKey, info, { ttlHours: 1 })),
    );
  }
}
