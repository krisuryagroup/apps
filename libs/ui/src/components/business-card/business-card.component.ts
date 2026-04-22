import { Component, computed, DestroyRef, effect, inject, input, output, signal, HostListener } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { NearbyBusiness, PlatformTag } from '@zitro/models';

export interface BusinessCardConfig {
  showDeliveryFee: boolean;
  showMinOrder: boolean;
  showRating: boolean;
  showDistance: boolean;
  showTags: boolean;
  showProductSlider: boolean;
  productSliderIntervalMs: number;
  productSliderAnimation: 'fade' | 'slide';
}

export const BUSINESS_CARD_DEFAULT_CONFIG: BusinessCardConfig = {
  showDeliveryFee: true,
  showMinOrder: true,
  showRating: true,
  showDistance: true,
  showTags: true,
  showProductSlider: true,
  productSliderIntervalMs: 4500,
  productSliderAnimation: 'fade',
};

@Component({
  selector: 'lib-business-card',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './business-card.component.html',
  styleUrls: ['./business-card.component.scss'],
})
export class BusinessCardComponent {
  business = input.required<NearbyBusiness>();
  tags = input<PlatformTag[]>([]);
  config = input<BusinessCardConfig>(BUSINESS_CARD_DEFAULT_CONFIG);
  index = input<number>(0);

  businessClick = output<NearbyBusiness>();

  currentProductIndex = signal(0);

  private destroyRef = inject(DestroyRef);
  private sliderTimer: ReturnType<typeof setInterval> | null = null;
  private touchStartX = 0;

  distanceKmDisplay = computed(() => {
    const metres = this.business().distanceMetres;
    if (metres == null) return null;
    const km = Math.max(1, metres / 1000);
    const rounded = Math.round(km * 10) / 10;
    return `${rounded.toFixed(1)} km away`;
  });

  constructor() {
    effect(() => {
      const products = this.business().latestProducts;
      const cfg = this.config();
      const idx = this.index();
      this.stopSlider();
      if (cfg.showProductSlider && products && products.length > 1) {
        const delay = idx * 500;
        if (delay > 0) {
          const t = setTimeout(() => this.startSlider(products.length, cfg.productSliderIntervalMs), delay);
          this.destroyRef.onDestroy(() => clearTimeout(t));
        } else {
          this.startSlider(products.length, cfg.productSliderIntervalMs);
        }
      }
    });
    this.destroyRef.onDestroy(() => this.stopSlider());
  }

  tagNames = computed(() => {
    const b = this.business();
    const allTags = this.tags();
    return allTags
      .filter(t => b.tags.includes(t.slug))
      .map(t => t.name)
      .join(', ');
  });

  onCardClick(): void {
    this.businessClick.emit(this.business());
  }

  onSliderTouchStart(e: TouchEvent): void {
    this.touchStartX = e.changedTouches[0].clientX;
  }

  onSliderTouchEnd(e: TouchEvent): void {
    const diff = e.changedTouches[0].clientX - this.touchStartX;
    const total = this.business().latestProducts?.length ?? 0;
    if (total <= 1) return;
    if (diff < -40) {
      this.currentProductIndex.update(i => (i + 1) % total);
    } else if (diff > 40) {
      this.currentProductIndex.update(i => (i - 1 + total) % total);
    }
  }

  private startSlider(total: number, intervalMs: number): void {
    this.currentProductIndex.set(0);
    this.sliderTimer = setInterval(() => {
      this.currentProductIndex.update(i => (i + 1) % total);
    }, intervalMs);
  }

  private stopSlider(): void {
    if (this.sliderTimer !== null) {
      clearInterval(this.sliderTimer);
      this.sliderTimer = null;
    }
  }
}
