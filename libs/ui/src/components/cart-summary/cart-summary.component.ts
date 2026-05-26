import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CartApiService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [DecimalPipe, I18nPipe],
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartSummaryComponent {
  private cartApi = inject(CartApiService);
  private router = inject(Router);

  /** When provided, only shows the cart for that business. */
  businessSlug = input<string>('');

  private activeCart = computed(() => {
    const slug = this.businessSlug();
    return slug ? this.cartApi.getCartForBusiness(slug) : null;
  });

  readonly totalQuantity = computed(() =>
    this.activeCart()?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  );

  readonly totalAmount = computed(() => this.activeCart()?.estimatedTotal ?? 0);
  readonly businessName = computed(() => this.activeCart()?.businessName ?? '');
  readonly isVisible = computed(() => this.totalQuantity() > 0);

  onCartClick(): void {
    const slug = this.businessSlug();
    this.router.navigate(['/cart'], slug ? { queryParams: { business: slug } } : {});
  }
}

