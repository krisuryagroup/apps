import { ChangeDetectionStrategy, Component, computed, input, OnDestroy, output, signal } from '@angular/core';
import { Banner } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface BannerCarouselConfig {
  autoPlayMs: number;
  showDots: boolean;
  showArrows: boolean;
}
export const BANNER_CAROUSEL_DEFAULT_CONFIG: BannerCarouselConfig = {
  autoPlayMs: 4000,
  showDots: true,
  showArrows: false,
};

@Component({
  selector: 'lib-banner-carousel',
  standalone: true,
  imports: [CachedImageDirective],
  templateUrl: './banner-carousel.component.html',
  styleUrl: './banner-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerCarouselComponent implements OnDestroy {
  config = input<BannerCarouselConfig>(BANNER_CAROUSEL_DEFAULT_CONFIG);
  banners = input<Banner[]>([]);

  bannerClick = output<Banner>();

  activeIndex = signal(0);
  private _timer: ReturnType<typeof setInterval> | null = null;

  activeBanners = computed(() => {
    const now = new Date();
    return this.banners().filter(b => {
      if (!b.isActive) return false;
      if (b.startDate && new Date(b.startDate) > now) return false;
      if (b.endDate && new Date(b.endDate) < now) return false;
      return true;
    });
  });

  ngOnDestroy(): void {
    this._stopTimer();
  }

  private _stopTimer(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  startAutoPlay(): void {
    this._stopTimer();
    if (this.activeBanners().length > 1 && this.config().autoPlayMs > 0) {
      this._timer = setInterval(() => {
        this.activeIndex.update(i => (i + 1) % this.activeBanners().length);
      }, this.config().autoPlayMs);
    }
  }

  goTo(index: number): void {
    this.activeIndex.set(index);
  }

  prev(): void {
    this.activeIndex.update(i => (i - 1 + this.activeBanners().length) % this.activeBanners().length);
  }

  next(): void {
    this.activeIndex.update(i => (i + 1) % this.activeBanners().length);
  }
}
