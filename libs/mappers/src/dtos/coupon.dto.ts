export interface CouponDto {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  usageLimit: number | null;
  usedCount: number;
  termsAndConditions: string[];
  isDisplayedForOnlineOrders: boolean;
  isNewCustomerOnly: boolean;
  applicableOrderTypes: string[];
  maxUsagePerUser: number | null;
  usagePeriod: 'day' | 'week' | 'month' | 'year' | 'lifetime' | null;
  cooldownPeriodDays: number | null;
  createdAt: string;
  updatedAt: string;
}
