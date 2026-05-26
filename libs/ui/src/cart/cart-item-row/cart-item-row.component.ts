import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiCartItem } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface CartItemRowConfig {
  showImage: boolean;
}
export const CART_ITEM_ROW_DEFAULT_CONFIG: CartItemRowConfig = {
  showImage: true,
};

@Component({
  selector: 'lib-cart-item-row',
  standalone: true,
  imports: [DecimalPipe, CachedImageDirective],
  templateUrl: './cart-item-row.component.html',
  styleUrl: './cart-item-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemRowComponent {
  config = input<CartItemRowConfig>(CART_ITEM_ROW_DEFAULT_CONFIG);
  item = input.required<ApiCartItem>();
  increment = output<ApiCartItem>();
  decrement = output<ApiCartItem>();
  edit = output<ApiCartItem>();

  onIncrement(): void {
    this.increment.emit(this.item());
  }

  onDecrement(): void {
    this.decrement.emit(this.item());
  }

  onEdit(): void {
    this.edit.emit(this.item());
  }
}
