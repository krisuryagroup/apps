import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CouponService } from '@zitro/services';
import {
  OnlineOrderCoupon,
  CouponValidationResult,
  AppliedCoupon,
} from '@zitro/models';
import { AnalyticsService } from '@zitro/services';

@Component({
  selector: 'app-coupon-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-selection.component.html',
  styleUrl: './coupon-selection.component.scss',
})
export class CouponSelectionComponent implements OnInit {
  private couponService = inject(CouponService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private analyticsService = inject(AnalyticsService);

  availableCoupons: OnlineOrderCoupon[] = [];
  couponCode = '';
  isLoading = false;
  validationMessage = '';
  isValidationError = false;

  // Cart data passed via route
  orderAmount = 0;
  cartItems: any[] = [];
  currentAppliedCoupon: AppliedCoupon | null = null;

  // Eligibility calculations
  eligibleAmount = 0;
  ineligibleAmount = 0;
  totalAmount = 0;

  ngOnInit(): void {
    // Track screen view
    this.analyticsService.logScreenView(
      'Coupon Selection',
      'CouponSelectionComponent',
    );

    // Modern approach: Use history.state directly (Angular 20+)
    const state = history.state;
    if (state && Object.keys(state).length > 0) {
      this.orderAmount = state['orderAmount'] || 0;
      this.cartItems = state['cartItems'] || [];
      this.currentAppliedCoupon = state['appliedCoupon'] || null;
    } else {
      // Fallback: get from route query params
      this.route.queryParams.subscribe((params) => {
        this.orderAmount = parseFloat(params['amount']) || 0;
        // Note: cartItems would need to be passed differently in a real app
      });
    }

    this.loadActiveCoupons();
    this.calculateEligibilityAmounts();

    if (this.currentAppliedCoupon) {
      this.couponCode = this.currentAppliedCoupon.coupon.code;
    }
  }

  loadActiveCoupons(): void {
    this.couponService.getActiveCoupons().subscribe({
      next: (coupons: OnlineOrderCoupon[]) => {
        this.availableCoupons = coupons;

        // Track coupon views
        coupons.forEach((coupon) => {
          this.analyticsService.logViewPromotion(
            coupon.id || coupon.code,
            coupon.title,
          );
        });
      },
      error: (error: any) => {
        console.error('Error loading coupons:', error);
      },
    });
  }

  applyCoupon(couponCode?: string): void {
    const codeToApply = couponCode || this.couponCode.trim();

    if (!codeToApply) {
      this.showValidationMessage('Please enter a coupon code', true);
      return;
    }

    this.isLoading = true;
    this.validationMessage = '';

    this.couponService
      .validateCoupon(codeToApply, this.orderAmount, this.cartItems)
      .subscribe({
        next: (result: CouponValidationResult) => {
          this.isLoading = false;

          if (result.isValid) {
            this.couponService.getCouponByCode(codeToApply).subscribe({
              next: (coupon: OnlineOrderCoupon | null) => {
                if (coupon) {
                  // Track coupon selection
                  this.analyticsService.logSelectPromotion(
                    coupon.id || coupon.code,
                    coupon.title,
                  );

                  const appliedCoupon: AppliedCoupon = {
                    coupon: coupon,
                    discountAmount: result.discountAmount,
                  };
                  this.returnToCart(appliedCoupon);
                }
              },
            });
          } else {
            // Track coupon failure
            this.analyticsService.logCouponFailed(codeToApply, result.message);

            this.showValidationMessage(result.message, true);
          }
        },
        error: (error: any) => {
          this.isLoading = false;
          this.showValidationMessage(
            'Error validating coupon. Please try again.',
            true,
          );
          console.error('Coupon validation error:', error);
        },
      });
  }

  selectCoupon(coupon: OnlineOrderCoupon): void {
    if (!this.isCouponApplicable(coupon)) {
      return;
    }
    this.applyCoupon(coupon.code);
  }

  removeCoupon(): void {
    this.returnToCart(null);
  }

  returnToCart(appliedCoupon: AppliedCoupon | null): void {
    this.router.navigate(['/cart'], {
      state: {
        appliedCoupon: appliedCoupon,
        orderAmount: this.orderAmount,
        cartItems: this.cartItems,
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/cart']);
  }

  isCouponApplicable(coupon: OnlineOrderCoupon): boolean {
    // Check minimum order amount against eligible items only
    if (
      coupon.minOrderAmount &&
      this.getEligibleAmount() < coupon.minOrderAmount
    ) {
      return false;
    }
    return true;
  }

  getCouponSavings(coupon: OnlineOrderCoupon): number {
    if (!this.isCouponApplicable(coupon)) {
      return 0;
    }

    // Use the same eligible amount calculation
    const eligibleAmount = this.getEligibleAmount();

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (eligibleAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'flat') {
      discountAmount = coupon.discountValue;
    }

    return discountAmount;
  }

  // Helper method to calculate eligible amount
  private getEligibleAmount(): number {
    // Use the calculated eligible amount if available
    if (this.eligibleAmount > 0 || this.cartItems?.length > 0) {
      return this.eligibleAmount;
    }

    // Fallback calculation
    let eligibleAmount = this.orderAmount;
    if (this.cartItems && this.cartItems.length > 0) {
      eligibleAmount = this.cartItems.reduce((sum, item) => {
        if (item.isOfferDisabled === true) {
          return sum;
        }
        const price =
          typeof item.price === 'number'
            ? item.price
            : parseFloat(item.price.replace(/[^\d.]/g, ''));
        return sum + price * (item.qty || 1);
      }, 0);
    }
    return eligibleAmount;
  }

  // Helper methods for template null safety
  isCouponApplied(coupon: OnlineOrderCoupon): boolean {
    return this.currentAppliedCoupon?.coupon?.code === coupon?.code;
  }

  isCurrentCouponDifferent(coupon: OnlineOrderCoupon): boolean {
    return this.currentAppliedCoupon?.coupon?.code !== coupon?.code;
  }

  private showValidationMessage(message: string, isError: boolean): void {
    this.validationMessage = message;
    this.isValidationError = isError;

    // Auto-hide success messages after 3 seconds
    if (!isError) {
      setTimeout(() => {
        this.validationMessage = '';
      }, 3000);
    }
  }

  calculateEligibilityAmounts(): void {
    // Reset amounts
    this.eligibleAmount = 0;
    this.ineligibleAmount = 0;
    this.totalAmount = 0;

    if (this.cartItems && this.cartItems.length > 0) {
      this.cartItems.forEach((item) => {
        const price =
          typeof item.price === 'number'
            ? item.price
            : parseFloat(item.price.replace(/[^\d.]/g, ''));
        const itemTotal = price * (item.qty || 1);

        this.totalAmount += itemTotal; // Calculate actual total from cart items

        if (item.isOfferDisabled === true) {
          this.ineligibleAmount += itemTotal;
        } else {
          this.eligibleAmount += itemTotal;
        }
      });
    } else {
      // Fallback to orderAmount if no cart items
      this.totalAmount = this.orderAmount;
      this.eligibleAmount = this.orderAmount;
    }
  }

  hasIneligibleItems(): boolean {
    return this.ineligibleAmount > 0;
  }

  getEligibilityMessage(): string {
    if (!this.hasIneligibleItems()) {
      return '';
    }

    return `Offers apply to eligible items only (₹${this.eligibleAmount.toFixed(2)} of ₹${this.totalAmount.toFixed(2)})`;
  }
}
