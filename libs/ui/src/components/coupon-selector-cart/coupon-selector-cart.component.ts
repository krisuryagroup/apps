import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AppliedCoupon } from '@zitro/models';

@Component({
  selector: 'app-coupon-selector-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coupon-selector-cart.component.html',
  styleUrl: './coupon-selector-cart.component.scss'
})
export class CouponSelectorCartComponent {
  @Input() orderAmount: number = 0;
  @Input() cartItems: any[] = [];
  @Input() appliedCoupon: AppliedCoupon | null = null;
  @Output() couponApplied = new EventEmitter<AppliedCoupon>();
  @Output() couponRemoved = new EventEmitter<void>();

  constructor(private router: Router) {}

  viewAllCoupons(): void {
    this.router.navigate(['/coupons'], {
      state: {
        orderAmount: this.orderAmount,
        cartItems: this.cartItems,
        appliedCoupon: this.appliedCoupon
      }
    });
  }

  removeCoupon(): void {
    this.couponRemoved.emit();
  }
}
