import { Component, computed, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { NearbyBusiness, PlatformTag } from '@zitro/models';

export interface BusinessCardConfig {
  showDeliveryFee: boolean;
  showMinOrder: boolean;
  showRating: boolean;
  showDistance: boolean;
  showTags: boolean;
}

export const BUSINESS_CARD_DEFAULT_CONFIG: BusinessCardConfig = {
  showDeliveryFee: true,
  showMinOrder: true,
  showRating: true,
  showDistance: true,
  showTags: true,
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
}
