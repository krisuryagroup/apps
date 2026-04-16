import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const CACHE_TTL_10MIN = 10 * 60 * 1000;
const CACHE_TTL_1HR = 60 * 60 * 1000;

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
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_10MIN)) {
      const cached = this.cache.getCachedData<BusinessConfig>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<BusinessConfig>(`${this.baseUrl}/api/businesses/${businessSlug}/config`).pipe(
      tap(config => {
        this.cache.setCachedData(cacheKey, config);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  getBanners(businessSlug: string): Observable<Banner[]> {
    const cacheKey = `banners:${businessSlug}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_1HR)) {
      const cached = this.cache.getCachedData<Banner[]>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<Banner[]>(`${this.baseUrl}/api/businesses/${businessSlug}/banners`).pipe(
      tap(banners => {
        this.cache.setCachedData(cacheKey, banners);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  getAppVersion(): Observable<AppVersionInfo> {
    const cacheKey = 'app:version';
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_1HR)) {
      const cached = this.cache.getCachedData<AppVersionInfo>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<AppVersionInfo>(`${this.baseUrl}/api/app/version`).pipe(
      tap(info => {
        this.cache.setCachedData(cacheKey, info);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }
}
