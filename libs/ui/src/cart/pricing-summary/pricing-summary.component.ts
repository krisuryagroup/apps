import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import { PricingBreakdown } from '@zitro/models';

export interface PricingSummaryConfig {
  showHeader: boolean;
  showCouponAction: boolean;
  variant: 'cart' | 'checkout' | 'confirmation';
  freeDeliveryThreshold: number;
}
export const PRICING_SUMMARY_DEFAULT_CONFIG: PricingSummaryConfig = {
  showHeader: true,
  showCouponAction: true,
  variant: 'cart',
  freeDeliveryThreshold: 500,
};

@Component({
  selector: 'lib-pricing-summary',
  standalone: true,
  imports: [I18nPipe, DecimalPipe],
  templateUrl: './pricing-summary.component.html',
  styleUrl: './pricing-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPricingSummaryComponent {
  config = input<PricingSummaryConfig>(PRICING_SUMMARY_DEFAULT_CONFIG);
  pricing = input<PricingBreakdown | null>(null);
  couponAction = output<void>();
  removeCoupon = output<void>();

  isExpanded = signal(true);

  hasPricing = computed(() => this.pricing() !== null);

  hasCoupon = computed(() => {
    const p = this.pricing();
    return !!p?.discounts.couponCode;
  });

  couponDiscount = computed(() => this.pricing()?.discounts.discountAmount ?? 0);

  hasSavings = computed(() => (this.pricing()?.savings.totalSavings ?? 0) > 0);

  freeDeliveryAmountRemaining = computed(() => {
    const p = this.pricing();
    if (!p) return 0;
    const threshold = this.config().freeDeliveryThreshold;
    const remaining = threshold - p.subtotal;
    return remaining > 0 ? remaining : 0;
  });

  showFreeDeliveryBar = computed(() => {
    const p = this.pricing();
    if (!p) return false;
    return p.visibility.showDelivery && p.charges.delivery.applied > 0 && this.freeDeliveryAmountRemaining() > 0;
  });

  freeDeliveryProgress = computed(() => {
    const threshold = this.config().freeDeliveryThreshold;
    const p = this.pricing();
    if (!p || threshold <= 0) return 100;
    const progress = (p.subtotal / threshold) * 100;
    return Math.min(progress, 100);
  });

  toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  onCouponClick(): void {
    this.couponAction.emit();
  }

  onRemoveCoupon(): void {
    this.removeCoupon.emit();
  }
}
