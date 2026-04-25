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
import { LoaderComponent } from '@zitro/ui';
import { AnalyticsService, CouponApiService } from '@zitro/services';
import type { AppliedCoupon, OnlineOrderCoupon } from '@zitro/models';

interface CartItemLike {
  price: number | string;
  qty?: number;
  isOfferDisabled?: boolean;
}

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
  private readonly analytics = inject(AnalyticsService);

  readonly availableCoupons = signal<OnlineOrderCoupon[]>([]);
  readonly couponCode = signal('');
  readonly isLoading = signal(false);
  readonly validationMessage = signal('');
  readonly isValidationError = signal(false);

  readonly orderAmount = signal(0);
  readonly cartItems = signal<CartItemLike[]>([]);
  readonly currentAppliedCoupon = signal<AppliedCoupon | null>(null);
  readonly businessSlug = signal('');

  readonly eligibleAmount = computed(() => {
    const items = this.cartItems();
    if (items.length === 0) return this.orderAmount();
    let eligible = 0;
    for (const item of items) {
      if (item.isOfferDisabled) continue;
      const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d.]/g, ''));
      eligible += price * (item.qty ?? 1);
    }
    return eligible;
  });

  readonly ineligibleAmount = computed(() => {
    const items = this.cartItems();
    let ineligible = 0;
    for (const item of items) {
      if (!item.isOfferDisabled) continue;
      const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^\d.]/g, ''));
      ineligible += price * (item.qty ?? 1);
    }
    return ineligible;
  });

  readonly hasIneligibleItems = computed(() => this.ineligibleAmount() > 0);

  readonly eligibilityMessage = computed(() => {
    if (!this.hasIneligibleItems()) return '';
    const eligible = this.eligibleAmount();
    const total = eligible + this.ineligibleAmount();
    return `Offers apply to eligible items only (₹${eligible.toFixed(2)} of ₹${total.toFixed(2)})`;
  });

  async ngOnInit(): Promise<void> {
    this.analytics.logScreenView('Coupon Selection', 'CouponSelectionPage');

    const state = history.state as Record<string, unknown>;
    if (state && Object.keys(state).length > 0 && state['orderAmount'] != null) {
      this.orderAmount.set((state['orderAmount'] as number) ?? 0);
      this.cartItems.set((state['cartItems'] as CartItemLike[]) ?? []);
      this.currentAppliedCoupon.set((state['appliedCoupon'] as AppliedCoupon | null) ?? null);
      this.businessSlug.set((state['businessSlug'] as string) ?? '');
    } else {
      this.route.queryParams.subscribe(params => {
        if (params['amount']) this.orderAmount.set(parseFloat(params['amount']));
        if (params['businessSlug']) this.businessSlug.set(params['businessSlug']);
      });
    }

    const applied = this.currentAppliedCoupon();
    if (applied) {
      this.couponCode.set(applied.coupon.code);
    }

    await this.loadCoupons();
  }

  private async loadCoupons(): Promise<void> {
    const slug = this.businessSlug();
    if (!slug) return;
    try {
      const coupons = await firstValueFrom(this.couponApi.getCoupons(slug));
      this.availableCoupons.set(coupons);
    } catch { /* ignore */ }
  }

  applyCoupon(code?: string): void {
    const codeToApply = (code ?? this.couponCode()).trim().toUpperCase();
    if (!codeToApply) {
      this.showMessage('Please enter a coupon code', true);
      return;
    }

    const coupon = this.availableCoupons().find(c => c.code.toUpperCase() === codeToApply);

    if (!coupon) {
      this.showMessage('Coupon not found or not available', true);
      return;
    }

    const now = new Date();
    if (!coupon.isActive) {
      this.showMessage('This coupon is no longer active', true);
      return;
    }
    if (coupon.validTo && new Date(coupon.validTo) < now) {
      this.showMessage('This coupon has expired', true);
      return;
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      this.showMessage('This coupon has reached its usage limit', true);
      return;
    }

    const eligible = this.eligibleAmount();
    if (coupon.minOrderAmount && eligible < coupon.minOrderAmount) {
      this.showMessage(`Minimum order amount of ₹${coupon.minOrderAmount} required for eligible items`, true);
      return;
    }

    const discountAmount = this.calculateDiscount(coupon, eligible);
    this.analytics.logSelectPromotion(coupon.id, coupon.title).catch(() => {});
    const applied: AppliedCoupon = { coupon, discountAmount };
    this.returnToCart(applied);
  }

  selectCoupon(coupon: OnlineOrderCoupon): void {
    if (!this.isCouponApplicable(coupon)) return;
    this.couponCode.set(coupon.code);
    this.applyCoupon(coupon.code);
  }

  removeCoupon(): void {
    this.returnToCart(null);
  }

  returnToCart(appliedCoupon: AppliedCoupon | null): void {
    this.router.navigate(['/cart'], {
      state: { appliedCoupon, orderAmount: this.orderAmount(), cartItems: this.cartItems() },
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  isCouponApplicable(coupon: OnlineOrderCoupon): boolean {
    const now = new Date();
    if (!coupon.isActive) return false;
    if (coupon.validTo && new Date(coupon.validTo) < now) return false;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return false;
    if (coupon.minOrderAmount && this.eligibleAmount() < coupon.minOrderAmount) return false;
    return true;
  }

  getCouponSavings(coupon: OnlineOrderCoupon): number {
    if (!this.isCouponApplicable(coupon)) return 0;
    return this.calculateDiscount(coupon, this.eligibleAmount());
  }

  isCouponApplied(coupon: OnlineOrderCoupon): boolean {
    return this.currentAppliedCoupon()?.coupon?.code === coupon?.code;
  }

  private calculateDiscount(coupon: OnlineOrderCoupon, eligible: number): number {
    if (coupon.discountType === 'percentage') {
      const raw = (eligible * coupon.discountValue) / 100;
      return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount) : raw;
    }
    return coupon.discountType === 'flat' ? coupon.discountValue : 0;
  }

  private showMessage(message: string, isError: boolean): void {
    this.validationMessage.set(message);
    this.isValidationError.set(isError);
  }
}
