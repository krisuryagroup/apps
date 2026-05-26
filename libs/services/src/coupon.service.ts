import { Injectable, inject } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  collection,
  getDocs,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import {
  OnlineOrderCoupon,
  CouponValidationResult,
  OrderType,
} from '@zitro/models';
import { convertFirebaseDate } from '@zitro/utils';
import { FIREBASE_PATHS, CACHE_KEYS } from '@zitro/utils';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { CacheType } from '@zitro/models';
import { UserManagementService } from './user-management.service';

@Injectable({
  providedIn: 'root',
})
export class CouponService {
  private cacheService = inject(CacheService);
  private cacheManager = inject(CacheManagerService);
  private userManagementService = inject(UserManagementService);

  private db: Firestore;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Get all active coupons from Firebase
   */
  getActiveCoupons(manualSearch = false): Observable<OnlineOrderCoupon[]> {
    // // Check cache first
    // const cachedCoupons = this.getCachedCoupons();
    // if (cachedCoupons) {
    //   console.log('📦 Using cached coupons');
    //   // Filter cached coupons based on manualSearch flag
    //   const filtered = this.filterActiveCoupons(cachedCoupons, manualSearch);
    //   return of(filtered);
    // }

    // console.log('⬇️ Fetching coupons from Firestore');

    // Use subcollection path like banner service
    const listCollectionPath = FIREBASE_PATHS.COUPONS;

    return from(getDocs(collection(this.db, listCollectionPath))).pipe(
      map((querySnapshot) => {
        const coupons: OnlineOrderCoupon[] = [];

        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const couponData = doc.data();
            if (couponData && typeof couponData === 'object') {
              const coupon: OnlineOrderCoupon = {
                id: couponData['id'] || doc.id,
                code: couponData['code'],
                title: couponData['title'],
                description: couponData['description'],
                discountType: couponData['discountType'],
                discountValue: couponData['discountValue'],
                maxDiscount: couponData['maxDiscount'],
                minOrderAmount: couponData['minOrderAmount'],
                isActive: couponData['isActive'],
                validFrom: convertFirebaseDate(couponData['validFrom']),
                validTo: convertFirebaseDate(couponData['validTo']),
                usageLimit: couponData['usageLimit'],
                usedCount: couponData['usedCount'] || 0,
                termsAndConditions: couponData['termsAndConditions'],
                isDisplayedForOnlineOrders:
                  couponData['isDisplayedForOnlineOrders'] || false,
                isNewCustomerOnly: couponData['isNewCustomerOnly'] || false,
                maxUsagePerUser: couponData['maxUsagePerUser'],
                usagePeriod: couponData['usagePeriod'],
                cooldownPeriodDays: couponData['cooldownPeriodDays'],
                applicableOrderTypes: couponData['applicableOrderTypes'],
                createdAt: convertFirebaseDate(couponData['createdAt']),
                updatedAt: convertFirebaseDate(couponData['updatedAt']),
              };
              coupons.push(coupon);
            }
          });
        }

        // // Cache all coupons (before filtering)
        // this.setCachedCoupons(coupons);

        // Filter and return active coupons
        return this.filterActiveCoupons(coupons, manualSearch);
      }),
      catchError((error) => {
        console.error('Error fetching coupons from Firebase:', error);
        return of([]); // Return empty array on error
      }),
    );
  }

  /**
   * Validate coupon code
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

        // Check if coupon is applicable to the order type
        // If applicableOrderTypes is not provided/empty, coupon applies to all order types
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

        // Check if this is a new customer-only coupon
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

        // Check per-user usage restrictions
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

            // Check cooldown period
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

            // Check max usage per user with period
            if (coupon.maxUsagePerUser) {
              let relevantUsages = couponUsages;

              // Filter by period if specified
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

        // Check if coupon is still valid (date-only comparison)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        const validFromDate = new Date(coupon.validFrom);
        validFromDate.setHours(0, 0, 0, 0); // Set to start of day

        const validToDate = new Date(coupon.validTo);
        validToDate.setHours(23, 59, 59, 999); // Set to end of day

        if (today < validFromDate || today > validToDate) {
          return {
            isValid: false,
            message: 'Coupon has expired',
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        // Calculate eligible amount (only items where isOfferDisabled is not true)
        let eligibleAmount = orderAmount;
        if (cartItems && cartItems.length > 0) {
          eligibleAmount = cartItems.reduce((sum, item) => {
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

        // Check minimum order amount against eligible items only
        if (coupon.minOrderAmount && eligibleAmount < coupon.minOrderAmount) {
          return {
            isValid: false,
            message: `Minimum order amount of Rs ${coupon.minOrderAmount} required (excluding non-offer items)`,
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
          return {
            isValid: false,
            message: 'Coupon usage limit exceeded',
            discountAmount: 0,
            finalAmount: orderAmount,
          };
        }

        // Calculate discount on eligible amount only
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
          discountAmount: discountAmount,
          finalAmount: finalAmount,
        };
      }),
    );
  }

  /**
   * Get coupon by code
   */
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

  /**
   * Filter active coupons based on date and display settings
   */
  private filterActiveCoupons(
    coupons: OnlineOrderCoupon[],
    manualSearch: boolean,
  ): OnlineOrderCoupon[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day

    return coupons.filter((coupon) => {
      if (!coupon.isActive) return false;
      if (!coupon.isDisplayedForOnlineOrders && !manualSearch) return false;

      const validFromDate = new Date(coupon.validFrom);
      validFromDate.setHours(0, 0, 0, 0); // Set to start of day

      const validToDate = new Date(coupon.validTo);
      validToDate.setHours(23, 59, 59, 999); // Set to end of day

      return today >= validFromDate && today <= validToDate;
    });
  }

  /**
   * Get cached coupons (24-hour persistent cache)
   */
  private getCachedCoupons(): OnlineOrderCoupon[] | null {
    try {
      // Use CacheManagerService to get cached data with dynamic duration
      return this.cacheManager.getCachedData<OnlineOrderCoupon[]>(
        CacheType.COUPONS,
        CACHE_KEYS.COUPONS_CACHE,
        CACHE_KEYS.COUPONS_CACHE_TIMESTAMP,
      );
    } catch (error) {
      console.error('Error getting cached coupons:', error);
      return null;
    }
  }

  /**
   * Set cached coupons (24-hour persistent cache)
   */
  private setCachedCoupons(coupons: OnlineOrderCoupon[]): void {
    try {
      // Use CacheManagerService to set cached data with dynamic duration
      this.cacheManager.setCachedData(
        CacheType.COUPONS,
        CACHE_KEYS.COUPONS_CACHE,
        CACHE_KEYS.COUPONS_CACHE_TIMESTAMP,
        coupons,
      );
      const duration = this.cacheManager.getCacheDuration(CacheType.COUPONS);
      console.log(
        `💾 Coupons cached successfully (${Math.round(duration / 1000 / 60 / 60)} hours)`,
      );
    } catch (error) {
      console.error('Error caching coupons:', error);
    }
  }

  /**
   * Clear cached coupons
   */
  clearCouponsCache(): void {
    try {
      this.cacheManager.clearCache(
        CacheType.COUPONS,
        CACHE_KEYS.COUPONS_CACHE,
        CACHE_KEYS.COUPONS_CACHE_TIMESTAMP,
      );
    } catch (error) {
      console.error('Error clearing coupons cache:', error);
    }
  }

  /**
   * Refresh coupons (force reload from Firestore)
   */
  refreshCoupons(): Observable<OnlineOrderCoupon[]> {
    this.clearCouponsCache();
    return this.getActiveCoupons();
  }

  /**
   * Get the start date for a given period relative to current date
   */
  private getPeriodStartDate(
    currentDate: Date,
    period: 'day' | 'week' | 'month' | 'year' | 'lifetime',
  ): Date {
    const startDate = new Date(currentDate);
    startDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        // Start of today
        return startDate;

      case 'week': {
        // Start of current week (Monday)
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        return startDate;
      }

      case 'month':
        // Start of current month
        startDate.setDate(1);
        return startDate;

      case 'year':
        // Start of current year
        startDate.setMonth(0, 1);
        return startDate;

      case 'lifetime':
      default:
        // Beginning of time
        return new Date(0);
    }
  }

  /**
   * Get human-readable text for usage period
   */
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
        return 'in total';
    }
  }
}
