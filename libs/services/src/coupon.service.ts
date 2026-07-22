import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  OnlineOrderCoupon,
  CouponValidationResult,
  OrderType,
} from '@zitro/models';
import { CouponApiService } from './api/coupon-api.service';
import { BusinessContextService } from './business-context.service';
import { UserManagementService } from './user-management.service';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private couponApi = inject(CouponApiService);
  private businessContext = inject(BusinessContextService);
  private userManagementService = inject(UserManagementService);

  /**
   * Get all active coupons from the backend API.
   * manualSearch = true skips the isDisplayedForOnlineOrders filter.
   */
  getActiveCoupons(manualSearch = false): Observable<OnlineOrderCoupon[]> {
    const slug = this.businessContext.businessId();
    if (!slug) return of([]);

    return this.couponApi.getCoupons(slug).pipe(
      map((coupons) => this.filterActiveCoupons(coupons, manualSearch)),
      catchError((error) => {
        console.error('Error fetching coupons:', error);
        return of([]);
      }),
    );
  }

  /**
   * Validate coupon code against cart total and items.
   */
  validateCoupon(
    couponCode: string,
    orderAmount: number,
    cartItems?: any[],
    orderType?: OrderType,
  ): Observable<CouponValidationResult> {
    return this.getCouponByCode(couponCode).pipe(
      switchMap(async (coupon) => {
        if (!coupon) {
          return {
            isValid: false,
            message: 'Invalid coupon code',
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        if (
          orderType &&
          coupon.applicableOrderTypes &&
          coupon.applicableOrderTypes.length > 0
        ) {
          if (!coupon.applicableOrderTypes.includes(orderType)) {
            const typeLabels: { [key in OrderType]: string } = {
              'dine-in': 'dine-in',
              takeout: 'takeout',
              delivery: 'delivery',
            };
            return {
              isValid: false,
              message: `This coupon is not applicable for ${typeLabels[orderType]} orders`,
              discountAmount: 0,
              finalAmount: orderAmount,
            };
          }
        }

        const currentUserPhone =
          await this.userManagementService.getCurrentUserPhone();

        if (coupon.isNewCustomerOnly) {
          if (currentUserPhone) {
            const userData =
              await this.userManagementService.getUserData(currentUserPhone);
            if (userData && userData.totalOrders > 0) {
              return {
                isValid: false,
                message: 'This coupon is only valid for first-time customers',
                discountAmount: 0,
                finalAmount: orderAmount,
              };
            }
          }
        }

        if (
          currentUserPhone &&
          (coupon.maxUsagePerUser || coupon.cooldownPeriodDays)
        ) {
          const userData =
            await this.userManagementService.getUserData(currentUserPhone);
          if (userData) {
            const usageHistory = userData.couponUsageHistory || [];
            const couponUsages = usageHistory.filter(
              (usage) => usage.couponCode === coupon.code,
            );

            if (coupon.cooldownPeriodDays && couponUsages.length > 0) {
              const lastUsage = couponUsages[couponUsages.length - 1];
              const lastUsedDate = new Date(lastUsage.usedAt);
              const now = new Date();
              const daysSinceLastUse = Math.floor(
                (now.getTime() - lastUsedDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              );

              if (daysSinceLastUse < coupon.cooldownPeriodDays) {
                const daysRemaining =
                  coupon.cooldownPeriodDays - daysSinceLastUse;
                return {
                  isValid: false,
                  message: `You can use this coupon again in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
                  discountAmount: 0,
                  finalAmount: orderAmount,
                };
              }
            }

            if (coupon.maxUsagePerUser) {
              let relevantUsages = couponUsages;

              if (coupon.usagePeriod && coupon.usagePeriod !== 'lifetime') {
                const now = new Date();
                const periodStart = this.getPeriodStartDate(
                  now,
                  coupon.usagePeriod,
                );
                relevantUsages = couponUsages.filter((usage) => {
                  const usageDate = new Date(usage.usedAt);
                  return usageDate >= periodStart;
                });
              }

              if (relevantUsages.length >= coupon.maxUsagePerUser) {
                const periodText = this.getPeriodText(coupon.usagePeriod);
                return {
                  isValid: false,
                  message: `You have already used this coupon ${coupon.maxUsagePerUser} time${coupon.maxUsagePerUser > 1 ? 's' : ''} ${periodText}`,
                  discountAmount: 0,
                  finalAmount: orderAmount,
                };
              }
            }
          }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const validFromDate = new Date(coupon.validFrom);
        validFromDate.setHours(0, 0, 0, 0);

        const validToDate = new Date(coupon.validTo);
        validToDate.setHours(23, 59, 59, 999);

        if (today < validFromDate || today > validToDate) {
          return {
            isValid: false,
            message: 'Coupon has expired',
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        let eligibleAmount = orderAmount;
        if (cartItems && cartItems.length > 0) {
          eligibleAmount = cartItems.reduce((sum: number, item: any) => {
            if (item.isOfferDisabled === true) return sum;
            const price =
              typeof item.price === 'number'
                ? item.price
                : parseFloat(item.price.replace(/[^\d.]/g, ''));
            return sum + price * (item.qty || 1);
          }, 0);
        }

        if (coupon.minOrderAmount && eligibleAmount < coupon.minOrderAmount) {
          return {
            isValid: false,
            message: `Minimum order amount of Rs ${coupon.minOrderAmount} required (excluding non-offer items)`,
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return {
            isValid: false,
            message: 'Coupon usage limit exceeded',
            discountAmount: 0,
            finalAmount: orderAmount,
          };
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

        const finalAmount = Math.max(0, orderAmount - discountAmount);

        return {
          isValid: true,
          message: `Coupon applied! You saved Rs ${discountAmount.toFixed(2)}`,
          discountAmount,
          finalAmount,
        };
      }),
    );
  }

  getCouponByCode(couponCode: string): Observable<OnlineOrderCoupon | null> {
    return this.getActiveCoupons(true).pipe(
      map((coupons) => {
        const coupon = coupons.find(
          (c) => c.code.toLowerCase() === couponCode.toLowerCase(),
        );
        return coupon || null;
      }),
    );
  }

  refreshCoupons(): Observable<OnlineOrderCoupon[]> {
    return this.getActiveCoupons();
  }

  private filterActiveCoupons(
    coupons: OnlineOrderCoupon[],
    manualSearch: boolean,
  ): OnlineOrderCoupon[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return coupons.filter((coupon) => {
      if (!coupon.isActive) return false;
      if (!coupon.isDisplayedForOnlineOrders && !manualSearch) return false;

      const validFromDate = new Date(coupon.validFrom);
      validFromDate.setHours(0, 0, 0, 0);

      const validToDate = new Date(coupon.validTo);
      validToDate.setHours(23, 59, 59, 999);

      return today >= validFromDate && today <= validToDate;
    });
  }

  private getPeriodStartDate(
    currentDate: Date,
    period: 'day' | 'week' | 'month' | 'year' | 'lifetime',
  ): Date {
    const startDate = new Date(currentDate);
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        return startDate;
      case 'week': {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        return startDate;
      }
      case 'month':
        startDate.setDate(1);
        return startDate;
      case 'year':
        startDate.setMonth(0, 1);
        return startDate;
      default:
        return new Date(0);
    }
  }

  private getPeriodText(
    period?: 'day' | 'week' | 'month' | 'year' | 'lifetime',
  ): string {
    switch (period) {
      case 'day':
        return 'today';
      case 'week':
        return 'this week';
      case 'month':
        return 'this month';
      case 'year':
        return 'this year';
      case 'lifetime':
      default:
        return 'before';
    }
  }
}
