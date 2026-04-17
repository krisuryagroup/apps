import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { Product, ProductVariation } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface ProductCardConfig {
  layout: 'grid' | 'list' | 'pos';
  showAddButton: boolean;
  showDietaryBadge: boolean;
  showVariationPill: boolean;
}
export const PRODUCT_CARD_DEFAULT_CONFIG: ProductCardConfig = {
  layout: 'grid',
  showAddButton: true,
  showDietaryBadge: true,
  showVariationPill: true,
};

@Component({
  selector: 'lib-product-card',
  standalone: true,
  imports: [I18nPipe, CachedImageDirective],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogProductCardComponent {
  config = input<ProductCardConfig>(PRODUCT_CARD_DEFAULT_CONFIG);
  product = input.required<Product>();
  quantity = input<number>(0);

  addToCart = output<{ product: Product; variation: ProductVariation | null }>();
  viewDetails = output<Product>();
  increment = output<Product>();
  decrement = output<Product>();

  isVeg = computed(() => this.product().dietaryPreferences?.includes('Veg') ?? false);

  effectivePrice = computed(() => {
    const p = this.product();
    if (p.hasVariations && p.selectedVariationId && p.variations) {
      const v = p.variations.find(v => v.id === p.selectedVariationId);
      if (v) return v.price;
    }
    return p.price;
  });

  isAvailable = computed(() =>
    this.product().isEnabledForOnlineOrders && this.product().status !== false
  );

  onCardClick(): void {
    this.viewDetails.emit(this.product());
  }

  onAddClick(event: Event): void {
    event.stopPropagation();
    this.addToCart.emit({ product: this.product(), variation: null });
  }

  onIncrement(event: Event): void {
    event.stopPropagation();
    this.increment.emit(this.product());
  }

  onDecrement(event: Event): void {
    event.stopPropagation();
    this.decrement.emit(this.product());
  }
}
