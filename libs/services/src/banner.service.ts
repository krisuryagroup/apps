import { Injectable, inject } from '@angular/core';
import { firstValueFrom, BehaviorSubject } from 'rxjs';
import { Banner, BannerConfigs } from '@zitro/models';
import { BannerApiService } from './api/banner-api.service';
import { BusinessContextService } from './business-context.service';

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private bannerApi = inject(BannerApiService);
  private businessContext = inject(BusinessContextService);

  /** Emits the configs of the banner currently shown in the carousel.
   *  null = no banner active or no config on the current banner. */
  private _activeBannerConfigs$ = new BehaviorSubject<BannerConfigs | null>(
    null,
  );
  readonly activeBannerConfigs$ = this._activeBannerConfigs$.asObservable();

  setActiveBannerConfigs(configs: BannerConfigs | null | undefined): void {
    this._activeBannerConfigs$.next(configs ?? null);
  }

  /** Fetch global (platform-level) banners. Used on the home page. */
  async getGlobalBanners(): Promise<Banner[]> {
    try {
      return await firstValueFrom(this.bannerApi.getGlobalBanners());
    } catch {
      return [];
    }
  }

  /** Fetch banners for a specific business (listing/restaurant page). */
  async getBanners(): Promise<Banner[]> {
    const slug = this.businessContext.businessId();
    if (!slug) return [];
    try {
      return await firstValueFrom(this.bannerApi.getBanners(slug));
    } catch (error) {
      console.error('Error fetching banners:', error);
      return [];
    }
  }

  async getActiveBanners(): Promise<Banner[]> {
    return this.getBanners();
  }

  clearCache(): void {
    // Cache is managed by BannerApiService via CacheService
  }
}
