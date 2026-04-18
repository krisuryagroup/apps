import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
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
  productSliderIntervalMs: 3000,
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

  businessClick = output<NearbyBusiness>();

  currentProductIndex = signal(0);

  private destroyRef = inject(DestroyRef);
  private sliderTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    effect(() => {
      const products = this.business().latestProducts;
      const cfg = this.config();
      this.stopSlider();
      if (cfg.showProductSlider && products && products.length > 1) {
        this.startSlider(products.length, cfg.productSliderIntervalMs);
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
