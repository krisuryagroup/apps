import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Banner } from '@zitro/models';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

/** Shape returned by GET /api/businesses/{slug}/banners */
interface BannerDto {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  bannerType: string;
  displayOrder: number;
  targetUrl: string | null;
  versionCondition: string | null;
  versionTarget: string | null;
  startDate: string | null;
  endDate: string | null;
  impressionCount: number;
  clickCount: number;
  scratchRewardType: string | null;
  scratchRewardValue: number | null;
  linkedCouponId: string | null;
}

function mapDto(dto: BannerDto): Banner {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description ?? '',
    imageURL: dto.imageUrl,
    bannerType: dto.bannerType,
    displayOrder: dto.displayOrder,
    targetUrl: dto.targetUrl ?? undefined,
    versionCondition:
      (dto.versionCondition as Banner['versionCondition']) ?? undefined,
    versionTarget: dto.versionTarget ?? undefined,
    startDate: dto.startDate ? new Date(dto.startDate) : undefined,
    endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    impressionCount: dto.impressionCount,
    clickCount: dto.clickCount,
    scratchRewardType: dto.scratchRewardType ?? undefined,
    scratchRewardValue: dto.scratchRewardValue ?? undefined,
    linkedCouponId: dto.linkedCouponId ?? undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class BannerApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  /** Platform-level banners — not scoped to any business. */
  getGlobalBanners(segment?: string): Observable<Banner[]> {
    const cacheKey = `banners:global${segment ? `:${segment}` : ''}`;
    const cached = this.cache.get<Banner[]>(cacheKey);
    if (cached) return of(cached);

    const params: Record<string, string> = {};
    if (segment) params['segment'] = segment;

    return this.http
      .get<BannerDto[]>(`${this.baseUrl}/api/banners`, { params })
      .pipe(
        map((dtos) => dtos.map(mapDto)),
        tap((banners) =>
          this.cache.set(cacheKey, banners, { ttlHours: 5 / 60 }),
        ),
      );
  }

  getBanners(businessSlug: string, segment?: string): Observable<Banner[]> {
    const cacheKey = `banners:${businessSlug}${segment ? `:${segment}` : ''}`;
    const cached = this.cache.get<Banner[]>(cacheKey);
    if (cached) return of(cached);

    const params: Record<string, string> = {};
    if (segment) params['segment'] = segment;

    return this.http
      .get<
        BannerDto[]
      >(`${this.baseUrl}/api/businesses/${businessSlug}/banners`, { params })
      .pipe(
        map((dtos) => dtos.map(mapDto)),
        tap((banners) =>
          this.cache.set(cacheKey, banners, { ttlHours: 5 / 60 }),
        ),
      );
  }

  recordImpression(businessSlug: string, bannerId: string): void {
    this.http
      .post(
        `${this.baseUrl}/api/businesses/${businessSlug}/banners/${bannerId}/impression`,
        {},
      )
      .subscribe({
        error: (_e: unknown) => {
          /* fire-and-forget */
        },
      });
  }

  recordClick(businessSlug: string, bannerId: string): void {
    this.http
      .post(
        `${this.baseUrl}/api/businesses/${businessSlug}/banners/${bannerId}/click`,
        {},
      )
      .subscribe({
        error: (_e: unknown) => {
          /* fire-and-forget */
        },
      });
  }
}
