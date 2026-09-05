import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { OnlineOrderCoupon } from '@zitro/models';
import { CouponMapper } from '@zitro/mappers';
import type { CouponDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';
import { CustomerEndpoints } from '../endpoints';

@Injectable({ providedIn: 'root' })
export class CouponApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getCoupons(businessSlug: string): Observable<OnlineOrderCoupon[]> {
    const cacheKey = `coupons:${businessSlug}`;
    const cached = this.cache.get<OnlineOrderCoupon[]>(cacheKey);
    if (cached) return of(cached);
    return this.http
      .get<
        CouponDto[]
      >(`${this.baseUrl}${CustomerEndpoints.coupons.list(businessSlug)}`)
      .pipe(
        map((dtos) => dtos.map((dto) => CouponMapper.toCoupon(dto))),
        tap((coupons) => this.cache.set(cacheKey, coupons, { ttlHours: 0.5 })),
      );
  }
}
