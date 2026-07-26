import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Banner } from '@zitro/models';
import { BannerService } from '@zitro/services';
import { compareApplicationVersions, getAppVersion } from '@zitro/utils';

@Component({
  selector: 'app-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss'],
})
export class BannerComponent implements OnInit, OnDestroy {
  private bannerService = inject(BannerService);
  private router = inject(Router);

  @Input() autoScroll = true;
  @Input() scrollInterval = 4000; // 4 seconds

  banners: Banner[] = [];
  currentBanner = 0;
  bannerInterval: any;
  isLoading = true;
  hasError = false;
  isPaused = false;
  private isLoadingBanners = false; // Prevent multiple simultaneous loads

  // Swipe & long-press state
  private touchStartX = 0;
  private touchStartY = 0;
  private longPressTimer: any = null;
  private readonly SWIPE_MIN_DIST = 50;
  private readonly LONG_PRESS_MS = 600;

  async ngOnInit() {
    // Add a small delay to prevent immediate loading issues
    setTimeout(async () => {
      await this.loadBanners();
      if (this.autoScroll && this.banners.length > 1) {
        this.startBannerAutoScroll();
      }
    }, 100);
  }

  ngOnDestroy() {
    this.stopBannerAutoScroll();
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.bannerService.setActiveBannerConfigs(null);
  }

  // ── Touch events (swipe + long-press) ───────────────────────────────────

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.startLongPressTimer();
  }

  onTouchMove(event: TouchEvent) {
    const dx = Math.abs(event.touches[0].clientX - this.touchStartX);
    const dy = Math.abs(event.touches[0].clientY - this.touchStartY);
    // Cancel long-press if the finger moves
    if (dx > 8 || dy > 8) {
      this.cancelLongPressTimer();
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.cancelLongPressTimer();
    if (this.isPaused) {
      this.resumeAutoScroll();
      return;
    }
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;
    if (
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) >= this.SWIPE_MIN_DIST
    ) {
      if (deltaX < 0) {
        this.nextBanner();
      } else {
        this.prevBanner();
      }
      if (this.autoScroll) {
        this.startBannerAutoScroll();
      }
    }
  }

  // Mouse events (for desktop / testing)
  onMouseDown(event: MouseEvent) {
    this.startLongPressTimer();
  }

  onMouseUp() {
    this.cancelLongPressTimer();
    if (this.isPaused) {
      this.resumeAutoScroll();
    }
  }

  onMouseLeave() {
    this.cancelLongPressTimer();
    if (this.isPaused) {
      this.resumeAutoScroll();
    }
  }

  private startLongPressTimer() {
    this.longPressTimer = setTimeout(() => {
      this.isPaused = true;
      this.stopBannerAutoScroll();
    }, this.LONG_PRESS_MS);
  }

  private cancelLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private resumeAutoScroll() {
    this.isPaused = false;
    if (this.autoScroll && this.banners.length > 1) {
      this.startBannerAutoScroll();
    }
  }

  async loadBanners() {
    // Prevent multiple simultaneous loading attempts
    if (this.isLoadingBanners) {
      console.log('Banner loading already in progress');
      return;
    }

    try {
      this.isLoadingBanners = true;
      this.isLoading = true;
      this.hasError = false;

      console.log('Loading banners...');
      this.banners = await this.bannerService.getBanners();
      console.log('Banners loaded:', this.banners.length);

      if (this.banners.length === 0) {
        console.log('No banners available');
        this.bannerService.setActiveBannerConfigs(null);
      } else {
        const appVersion = await getAppVersion();
        this.banners = this.banners.filter((banner) => {
          if (!banner.versionCondition || !banner.versionTarget) return true;
          const cmp = compareApplicationVersions(
            appVersion,
            banner.versionTarget,
          );
          switch (banner.versionCondition) {
            case 'lt':
              return cmp < 0;
            case 'gt':
              return cmp > 0;
            case 'eq':
              return cmp === 0;
            default:
              return true;
          }
        });
        // Push configs for the first (currently visible) banner
        this.bannerService.setActiveBannerConfigs(
          this.banners[this.currentBanner]?.configs,
        );
      }
    } catch (error) {
      console.error('Error loading banners:', error);
      this.hasError = true;
      this.banners = []; // Reset to empty array on error
    } finally {
      this.isLoading = false;
      this.isLoadingBanners = false;
    }
  }

  startBannerAutoScroll() {
    this.stopBannerAutoScroll();
    if (this.banners.length > 1) {
      this.bannerInterval = setInterval(() => {
        this.nextBanner();
      }, this.scrollInterval);
    }
  }

  stopBannerAutoScroll() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.bannerInterval = null;
    }
  }

  nextBanner() {
    if (this.banners.length > 0) {
      this.currentBanner = (this.currentBanner + 1) % this.banners.length;
      this.bannerService.setActiveBannerConfigs(
        this.banners[this.currentBanner]?.configs,
      );
    }
  }

  prevBanner() {
    if (this.banners.length > 0) {
      this.currentBanner =
        this.currentBanner === 0
          ? this.banners.length - 1
          : this.currentBanner - 1;
      this.bannerService.setActiveBannerConfigs(
        this.banners[this.currentBanner]?.configs,
      );
    }
  }

  goToBanner(index: number) {
    if (index >= 0 && index < this.banners.length) {
      this.currentBanner = index;
      this.bannerService.setActiveBannerConfigs(
        this.banners[this.currentBanner]?.configs,
      );
      // Reset auto-scroll timer when manually navigating
      if (this.autoScroll) {
        this.startBannerAutoScroll();
      }
    }
  }

  onBannerClick(banner: Banner) {
    if (!!banner.targetUrl && banner.targetUrl.startsWith('http')) {
      // External URL
      window.open(banner.targetUrl, '_blank');
    } else if (!!banner.targetUrl && banner.targetUrl.startsWith('/')) {
      // Internal route: parse path and query params from targetUrl
      const url = banner.targetUrl;
      const [path, queryString] = url.split('?');
      const queryParams: { [key: string]: string } = {};

      if (queryString) {
        queryString.split('&').forEach((pair) => {
          const [key, value] = pair.split('=');
          if (key) queryParams[key] = decodeURIComponent(value || '');
        });
      }

      this.router.navigate([path], { queryParams });
    }
  }
}
