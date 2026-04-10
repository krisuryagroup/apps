export type OrderType = 'dine-in' | 'takeout' | 'delivery';

export interface OnlineOrderCoupon {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number; // Global usage limit across all users
  usedCount: number;
  termsAndConditions?: string[];
  isDisplayedForOnlineOrders: boolean;
  isNewCustomerOnly?: boolean; // Flag to indicate if coupon is only for new customers
  
  // Order type restrictions
  applicableOrderTypes?: OrderType[]; // If empty/null, applies to all order types
  
  // Per-user usage restrictions
  maxUsagePerUser?: number; // Max times a single user can use this coupon (e.g., 2)
  usagePeriod?: 'day' | 'week' | 'month' | 'year' | 'lifetime'; // Period for maxUsagePerUser
  cooldownPeriodDays?: number; // Days user must wait before reusing (e.g., 7 for weekly)
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponValidationResult {
  isValid: boolean;
  message: string;
  discountAmount: number;
  finalAmount: number;
}

export interface AppliedCoupon {
  coupon: OnlineOrderCoupon;
  discountAmount: number;
}
