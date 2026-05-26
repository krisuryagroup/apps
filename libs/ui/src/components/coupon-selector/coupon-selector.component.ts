import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CouponService } from '@zitro/services';
import {
  OnlineOrderCoupon,
  CouponValidationResult,
  AppliedCoupon,
} from '@zitro/models';
import { UserManagementService } from '@zitro/services';

@Component({
  selector: 'app-coupon-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './coupon-selector.component.html',
  styleUrl: './coupon-selector.component.scss',
})
export class CouponSelectorComponent implements OnInit, OnChanges {
  private couponService = inject(CouponService);
  private userManagementService = inject(UserManagementService);

  @Input() orderAmount = 0;
  @Input() cartItems: any[] = [];
  @Input() appliedCoupon: AppliedCoupon | null = null;
  @Output() couponApplied = new EventEmitter<AppliedCoupon>();
  @Output() couponRemoved = new EventEmitter<void>();

  availableCoupons: OnlineOrderCoupon[] = [];
  couponCode = '';
  isLoading = false;
  validationMessage = '';
  isValidationError = false;
  showCouponList = false;
  isNewCustomer = true;

  ngOnInit(): void {
    this.loadActiveCoupons();
    this.checkNewCustomerStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to changes in cart items or order amount
    if (changes['cartItems'] || changes['orderAmount']) {
      // If there's an applied coupon, recalculate it
      if (this.appliedCoupon) {
        this.validateAppliedCoupon();
      }
    }
  }

  async checkNewCustomerStatus(): Promise<void> {
    try {
      const currentUserPhone =
        await this.userManagementService.getCurrentUserPhone();
      if (currentUserPhone) {
        const userData = await this.userManagementService.getUserData(
          currentUserPhone,
          true,
        );
        if (userData) {
          this.isNewCustomer = userData.totalOrders === 0;
        }
      }
    } catch (error) {
      console.error('Error checking new customer status:', error);
      this.isNewCustomer = true; // Default to new customer on error
    }
  }

  loadActiveCoupons(): void {
    this.couponService.getActiveCoupons().subscribe({
      next: (coupons: OnlineOrderCoupon[]) => {
        this.availableCoupons = coupons;
      },
      error: (error: any) => {
        console.error('Error loading coupons:', error);
      },
    });
  }

  applyCoupon(): void {
    if (!this.couponCode.trim()) {
      this.showValidationMessage('Please enter a coupon code', true);
      return;
    }

    this.isLoading = true;
    this.validationMessage = '';

    this.couponService
      .validateCoupon(this.couponCode.trim(), this.orderAmount, this.cartItems)
      .subscribe({
        next: (result: CouponValidationResult) => {
          this.isLoading = false;

          if (result.isValid) {
            this.couponService
              .getCouponByCode(this.couponCode.trim())
              .subscribe({
                next: (coupon: OnlineOrderCoupon | null) => {
                  if (coupon) {
                    const appliedCoupon: AppliedCoupon = {
                      coupon: coupon,
                      discountAmount: result.discountAmount,
                    };
                    this.couponApplied.emit(appliedCoupon);
                    this.showValidationMessage(result.message, false);
                    this.couponCode = '';
                    this.showCouponList = false;
                  }
                },
              });
          } else {
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

  removeCoupon(): void {
    this.couponRemoved.emit();
    this.validationMessage = '';
    this.showValidationMessage('Coupon removed successfully', false);
  }

  selectCoupon(coupon: OnlineOrderCoupon): void {
    this.couponCode = coupon.code;
    this.showCouponList = false;
    this.applyCoupon();
  }

  toggleCouponList(): void {
    this.showCouponList = !this.showCouponList;
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

  isCouponApplicable(coupon: OnlineOrderCoupon): boolean {
    // Check if it's a new customer-only coupon and user is not a new customer
    if (coupon.isNewCustomerOnly && !this.isNewCustomer) {
      return false;
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && this.orderAmount < coupon.minOrderAmount) {
      return false;
    }

    return true;
  }

  getCouponSavings(coupon: OnlineOrderCoupon): number {
    if (!this.isCouponApplicable(coupon)) {
      return 0;
    }

    // Calculate eligible amount (only items where isOfferDisabled is not true)
    let eligibleAmount = this.orderAmount;
    if (this.cartItems && this.cartItems.length > 0) {
      eligibleAmount = this.cartItems.reduce((sum, item) => {
        // If isOfferDisabled is not set, default to false (offer enabled)
        // If isOfferDisabled is explicitly true, exclude from discount calculation
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

  get eligibleOrderAmount(): number {
    if (!this.cartItems || this.cartItems.length === 0) {
      return this.orderAmount;
    }

    return this.cartItems.reduce((sum, item) => {
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

  get nonOfferItemsAmount(): number {
    if (!this.cartItems || this.cartItems.length === 0) {
      return 0;
    }

    return this.cartItems.reduce((sum, item) => {
      if (item.isOfferDisabled === true) {
        const price =
          typeof item.price === 'number'
            ? item.price
            : parseFloat(item.price.replace(/[^\d.]/g, ''));
        return sum + price * (item.qty || 1);
      }
      return sum;
    }, 0);
  }

  get hasNonOfferItems(): boolean {
    return this.nonOfferItemsAmount > 0;
  }

  private validateAppliedCoupon(): void {
    if (!this.appliedCoupon) {
      return;
    }

    const coupon = this.appliedCoupon.coupon;
    this.couponService
      .validateCoupon(coupon.code, this.orderAmount, this.cartItems)
      .subscribe({
        next: (result: CouponValidationResult) => {
          if (result.isValid) {
            // Update discount amount if it has changed
            const newAppliedCoupon: AppliedCoupon = {
              coupon: coupon,
              discountAmount: result.discountAmount,
            };

            // Check if discount amount has changed
            if (
              Math.abs(
                this.appliedCoupon!.discountAmount - result.discountAmount,
              ) > 0.01
            ) {
              this.appliedCoupon = newAppliedCoupon;
              this.couponApplied.emit(newAppliedCoupon);
              console.log('Coupon discount updated:', result.discountAmount);
            }
          } else {
            // Coupon is no longer valid, remove it
            this.appliedCoupon = null;
            this.couponRemoved.emit();
            this.showValidationMessage(
              result.message || 'Coupon is no longer applicable',
              true,
            );
            console.log(
              'Applied coupon removed due to cart changes:',
              result.message,
            );
          }
        },
        error: (error: any) => {
          console.error('Error validating applied coupon:', error);
          // Remove coupon in case of error
          this.appliedCoupon = null;
          this.couponRemoved.emit();
        },
      });
  }
}
