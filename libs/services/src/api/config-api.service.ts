import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

// Matches BusinessConfigDto returned by GET /api/businesses/{slug}/config
export interface BusinessConfig {
  businessId: string;
  businessSlug: string;
  pricingConfig: PricingConfigShape | null;
  orderConfig: OrderConfigShape | null;
  authConfig: unknown | null;
  categoryConfig: unknown | null;
  cacheConfig: unknown | null;
  versionConfig: unknown | null;
  checkoutConfig: unknown | null;
  featureFlags: unknown | null;
  isClearCacheMandatory: boolean;
  isLoginClearMandatory: boolean;
  lastSettingsUpdatedAt: string;
}

export interface PricingConfigShape {
  currency: string;
  delivery: {
    enabled: boolean;
    apply: boolean;
    base_fee: number;
    per_km_fee: number;
    free_delivery_above: number;
    surge_multiplier: number;
    max_delivery_cap: number;
  };
  platform_fee: { enabled: boolean; apply: boolean; flat_fee: number };
  packaging: {
    enabled: boolean;
    apply: boolean;
    default_fee: number;
    type: string;
  };
  gst: { enabled: boolean; apply: boolean; food_percent: number };
  rounding: { enabled: boolean; type: string };
}

export interface OrderConfigShape {
  defaultOrderType: string;
  orderTypes: {
    dineIn: { enabled: boolean; displayName: string; icon: string };
    takeout: { enabled: boolean; displayName: string; icon: string };
    delivery: { enabled: boolean; displayName: string; icon: string };
  };
  dineInConfig: {
    enabled: boolean;
    showDetails: boolean;
    defaultGuests: number;
    minGuests: number;
    maxGuests: number;
  };
  takeoutConfig: {
    enabled: boolean;
    showScheduledPickup: boolean;
    defaultPickupTime: number;
    pickupMessage: string;
  };
  deliveryConfig: { enabled: boolean; showAddressSelection: boolean };
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

export interface AppConfigResponse {
  auth: {
    sms: {
      isFast2SmsPhoneAuthentication: boolean;
      isFirebasePhoneAuthentication: boolean;
      resendOTPAllowed: boolean;
      resendOTPTime: number;
    };
    ui: {
      guestButtonLabel: string;
      guestDescription: string;
      header: string;
      headerDescription: string;
      sendOTPButtonLabel: string;
      sendOTPPlaceholder: string;
      validateOTPButtonLabel: string;
      verifyOTPPlaceholder: string;
      otpSentSuccessMessage: string;
      otpSentFailureMessage: string;
      resendOTPLabel: string;
    };
  };
  business: {
    openTime: string;
    closeTime: string;
    whatsAppLink: string;
    contactEmail: string;
    contactPhone: string;
  };
  orders: {
    deliveryTimeMinutes: number;
    cancellationTimeLimitMinutes: number;
  };
  testPhoneNumbers: string[];
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
    return this.http
      .get<BusinessConfig>(
        `${this.baseUrl}/api/businesses/${businessSlug}/config`,
      )
      .pipe(
        tap((config) => this.cache.set(cacheKey, config, { ttlHours: 1 / 6 })),
      );
  }

  getBanners(businessSlug: string): Observable<Banner[]> {
    const cacheKey = `banners:${businessSlug}`;
    const cached = this.cache.get<Banner[]>(cacheKey);
    if (cached) return of(cached);
    return this.http
      .get<Banner[]>(`${this.baseUrl}/api/businesses/${businessSlug}/banners`)
      .pipe(
        tap((banners) => this.cache.set(cacheKey, banners, { ttlHours: 1 })),
      );
  }

  getAppVersion(): Observable<AppVersionInfo> {
    const cacheKey = 'app:version';
    const cached = this.cache.get<AppVersionInfo>(cacheKey);
    if (cached) return of(cached);
    return this.http
      .get<AppVersionInfo>(`${this.baseUrl}/api/app/version`)
      .pipe(tap((info) => this.cache.set(cacheKey, info, { ttlHours: 1 })));
  }

  getAppConfig(): Observable<AppConfigResponse> {
    const cacheKey = 'app:config';
    const cached = this.cache.get<AppConfigResponse>(cacheKey);
    if (cached) return of(cached);
    return this.http
      .get<AppConfigResponse>(`${this.baseUrl}/api/app-config`)
      .pipe(tap((config) => this.cache.set(cacheKey, config, { ttlHours: 1 })));
  }
}
