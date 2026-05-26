import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nPipe } from '@zitro/i18n';
import { AppliedCoupon } from '@zitro/models';

@Component({
  selector: 'app-coupon-selector-cart',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './coupon-selector-cart.component.html',
  styleUrl: './coupon-selector-cart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponSelectorCartComponent {
  private readonly router = inject(Router);

  orderAmount = input<number>(0);
  cartItems = input<unknown[]>([]);
  appliedCoupon = input<AppliedCoupon | null>(null);
  businessSlug = input<string>('');

  couponRemoved = output<void>();

  viewAllCoupons(): void {
    this.router.navigate(['/coupons'], {
      queryParams: { business: this.businessSlug() },
    });
  }

  removeCoupon(): void {
    this.couponRemoved.emit();
  }
}
