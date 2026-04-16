import type { OnlineOrderCoupon } from '@zitro/models';

export const CouponBuilders = {
  flatFiftyCoupon: (): OnlineOrderCoupon => ({
    id: 'cpn-001',
    code: 'SAVE50',
    title: 'Save ₹50 on your order',
    description: 'Get flat ₹50 off on orders above ₹300',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 300,
    isActive: true,
    validFrom: new Date('2024-01-01T00:00:00Z'),
    validTo: new Date('2024-12-31T23:59:59Z'),
    termsAndConditions: [
      'Applicable on orders above ₹300',
      'Valid once per user per day',
      'Cannot be combined with other offers',
    ],
  }),

  percentageWelcomeCoupon: (): OnlineOrderCoupon => ({
    id: 'cpn-002',
    code: 'WELCOME20',
    title: '20% off for new customers',
    description: 'Get 20% off (up to ₹100) on your first order',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscount: 100,
    minOrderAmount: 150,
    isActive: true,
    validFrom: new Date('2024-01-01T00:00:00Z'),
    validTo: new Date('2024-12-31T23:59:59Z'),
    termsAndConditions: [
      'Valid for new customers only',
      'Maximum discount ₹100',
      'Applicable on first order',
    ],
  }),

  expiredCoupon: (): OnlineOrderCoupon => ({
    id: 'cpn-999',
    code: 'EXPIRED10',
    title: 'Expired offer',
    description: 'This offer is no longer valid',
    discountType: 'flat',
    discountValue: 10,
    isActive: false,
    validFrom: new Date('2023-01-01T00:00:00Z'),
    validTo: new Date('2023-12-31T23:59:59Z'),
    termsAndConditions: [],
  }),
};
