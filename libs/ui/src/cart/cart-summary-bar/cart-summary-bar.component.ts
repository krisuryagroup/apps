import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface CartSummaryBarConfig {
  showItemCount: boolean;
}
export const CART_SUMMARY_BAR_DEFAULT_CONFIG: CartSummaryBarConfig = {
  showItemCount: true,
};

@Component({
  selector: 'lib-cart-summary-bar',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './cart-summary-bar.component.html',
  styleUrl: './cart-summary-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryBarComponent {
  config = input<CartSummaryBarConfig>(CART_SUMMARY_BAR_DEFAULT_CONFIG);
  itemCount = input.required<number>();
  total = input.required<number>();
  viewCart = output<void>();

  isVisible = computed(() => this.itemCount() > 0);

  onViewCart(): void {
    this.viewCart.emit();
  }
}
