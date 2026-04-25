import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { CartItem } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface CartItemRowConfig {
  showImage: boolean;
  showWeight: boolean;
}
export const CART_ITEM_ROW_DEFAULT_CONFIG: CartItemRowConfig = {
  showImage: true,
  showWeight: true,
};

@Component({
  selector: 'lib-cart-item-row',
  standalone: true,
  imports: [I18nPipe, CachedImageDirective],
  templateUrl: './cart-item-row.component.html',
  styleUrl: './cart-item-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemRowComponent {
  config = input<CartItemRowConfig>(CART_ITEM_ROW_DEFAULT_CONFIG);
  item = input.required<CartItem>();
  increment = output<CartItem>();
  decrement = output<CartItem>();
  edit = output<CartItem>();

  get variationLabel(): string {
    const it = this.item();
    if (it.hasVariations && it.selectedVariationId && it.variations) {
      const v = it.variations.find(v => v.id === it.selectedVariationId);
      return v ? v.label : '';
    }
    return '';
  }

  onIncrement(): void {
    this.increment.emit(this.item());
  }

  onDecrement(): void {
    this.decrement.emit(this.item());
  }

  onEdit(): void {
    if (!this.item().hasVariations) return;
    this.edit.emit(this.item());
  }
}
