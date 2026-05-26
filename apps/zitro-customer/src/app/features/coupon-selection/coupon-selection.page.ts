import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import {
  AnalyticsService,
  CartApiService,
  CouponApiService,
} from '@zitro/services';
import type { OnlineOrderCoupon } from '@zitro/models';

@Component({
  selector: 'app-coupon-selection-page',
  standalone: true,
  imports: [DatePipe, FormsModule, I18nPipe],
  templateUrl: './coupon-selection.page.html',
  styleUrl: './coupon-selection.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CouponSelectionPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly couponApi = inject(CouponApiService);
  private readonly cartApi = inject(CartApiService);
  private readonly analytics = inject(AnalyticsService);

  readonly availableCoupons = signal<OnlineOrderCoupon[]>([]);
  readonly couponCode = signal('');
  readonly isLoading = signal(false);
  readonly validationMessage = signal('');
  readonly isValidationError = signal(false);
  readonly businessSlug = signal('');

  readonly appliedCouponCode = computed(
    () => this.cartApi.carts().get(this.businessSlug())?.couponCode ?? null,
  );

  readonly appliedDiscount = computed(
    () =>
      this.cartApi.carts().get(this.businessSlug())?.couponDiscountPreview ?? 0,
  );

  private readonly cartSubtotal = computed(
    () => this.cartApi.carts().get(this.businessSlug())?.estimatedTotal ?? 0,
  );

  async ngOnInit(): Promise<void> {
    this.analytics.logScreenView('Coupon Selection', 'CouponSelectionPage');

    const params = await firstValueFrom(this.route.queryParams);
    const slug = (params['business'] || params['businessSlug'] || '') as string;
    this.businessSlug.set(slug);

    const applied = this.appliedCouponCode();
    if (applied) this.couponCode.set(applied);

    await this.loadCoupons();
  }

  private async loadCoupons(): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    try {
      const coupons = await firstValueFrom(this.couponApi.getCoupons(slug));
      this.availableCoupons.set(coupons);
    } catch {
      /* ignore */
    }
  }

  async applyCoupon(code?: string): Promise<void> {
    const codeToApply = (code ?? this.couponCode()).trim().toUpperCase();
    if (!codeToApply) {
      this.showMessage('Please enter a coupon code', true);
      return;
    }

    this.isLoading.set(true);
    this.validationMessage.set('');
    try {
      const result = await this.cartApi.applyCoupon(
        this.businessSlug(),
        codeToApply,
      );
      if (result.success) {
        this.analytics
          .logSelectPromotion(codeToApply, codeToApply)
          .catch(() => {
            /* no-op */
          });
        this.navigateToCart();
      } else {
        this.showMessage(result.error ?? 'Coupon could not be applied', true);
      }
    } catch {
      this.showMessage('Failed to apply coupon. Please try again.', true);
    } finally {
      this.isLoading.set(false);
    }
  }

  selectCoupon(coupon: OnlineOrderCoupon): void {
    if (!this.isCouponApplicable(coupon)) return;
    this.couponCode.set(coupon.code);
    this.applyCoupon(coupon.code);
  }

  async removeCoupon(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.cartApi.removeCoupon(this.businessSlug());
      this.navigateToCart();
    } finally {
      this.isLoading.set(false);
    }
  }

  goBack(): void {
    this.navigateToCart();
  }

  isCouponApplicable(coupon: OnlineOrderCoupon): boolean {
    const now = new Date();
    if (!coupon.isActive) return false;
    if (coupon.validTo && new Date(coupon.validTo) < now) return false;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return false;
    const subtotal = this.cartSubtotal();
    if (
      coupon.minOrderAmount &&
      subtotal > 0 &&
      subtotal < coupon.minOrderAmount
    )
      return false;
    return true;
  }

  getCouponSavings(coupon: OnlineOrderCoupon): number {
    const subtotal = this.cartSubtotal();
    if (coupon.discountType === 'percentage') {
      const raw = (subtotal * coupon.discountValue) / 100;
      return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    }
    return coupon.discountType === 'flat' ? coupon.discountValue : 0;
  }

  isCouponApplied(coupon: OnlineOrderCoupon): boolean {
    return (
      this.appliedCouponCode()?.toUpperCase() === coupon.code.toUpperCase()
    );
  }

  private navigateToCart(): void {
    this.router.navigate(['/cart'], {
      queryParams: { business: this.businessSlug() },
    });
  }

  private showMessage(message: string, isError: boolean): void {
    this.validationMessage.set(message);
    this.isValidationError.set(isError);
  }
}
