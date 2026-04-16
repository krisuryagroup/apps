import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { OnlineOrderCoupon } from '@zitro/models';
import { CouponMapper } from '@zitro/mappers';
import type { CouponDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const CACHE_TTL_30MIN = 30 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CouponApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getCoupons(businessSlug: string): Observable<OnlineOrderCoupon[]> {
    const cacheKey = `coupons:${businessSlug}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_30MIN)) {
      const cached = this.cache.getCachedData<OnlineOrderCoupon[]>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<CouponDto[]>(`${this.baseUrl}/api/businesses/${businessSlug}/coupons`).pipe(
      map(dtos => dtos.map(dto => CouponMapper.toCoupon(dto))),
      tap(coupons => {
        this.cache.setCachedData(cacheKey, coupons);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }
}
