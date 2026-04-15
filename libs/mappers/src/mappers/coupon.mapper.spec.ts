import { describe, it, expect } from 'vitest';
import { CouponMapper } from './coupon.mapper';
import type { CouponDto } from '../dtos/coupon.dto';

const baseCouponDto: CouponDto = {
  id: 'coup-1',
  code: 'FIRST50',
  title: '50% off on first order',
  description: 'Get 50% off up to ₹100 on your first order.',
  discountType: 'percentage',
  discountValue: 50,
  maxDiscount: 100,
  minOrderAmount: 200,
  isActive: true,
  validFrom: '2024-01-01T00:00:00Z',
  validTo: '2025-12-31T23:59:59Z',
  usageLimit: 1,
  usedCount: 0,
  termsAndConditions: ['Valid once per user'],
  isDisplayedForOnlineOrders: true,
  isNewCustomerOnly: true,
  applicableOrderTypes: ['delivery'],
  maxUsagePerUser: 1,
  usagePeriod: 'lifetime',
  cooldownPeriodDays: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('CouponMapper.toCoupon', () => {
  it('maps scalar fields', () => {
    const coupon = CouponMapper.toCoupon(baseCouponDto);
    expect(coupon.id).toBe('coup-1');
    expect(coupon.code).toBe('FIRST50');
    expect(coupon.discountType).toBe('percentage');
    expect(coupon.discountValue).toBe(50);
  });

  it('converts validFrom/validTo ISO strings to Dates', () => {
    const coupon = CouponMapper.toCoupon(baseCouponDto);
    expect(coupon.validFrom).toBeInstanceOf(Date);
    expect(coupon.validTo).toBeInstanceOf(Date);
  });

  it('maps null maxDiscount to undefined', () => {
    const coupon = CouponMapper.toCoupon({ ...baseCouponDto, maxDiscount: null });
    expect(coupon.maxDiscount).toBeUndefined();
  });

  it('maps null minOrderAmount to undefined', () => {
    const coupon = CouponMapper.toCoupon({ ...baseCouponDto, minOrderAmount: null });
    expect(coupon.minOrderAmount).toBeUndefined();
  });

  it('maps applicableOrderTypes', () => {
    const coupon = CouponMapper.toCoupon(baseCouponDto);
    expect(coupon.applicableOrderTypes).toEqual(['delivery']);
  });

  it('maps empty applicableOrderTypes to undefined', () => {
    const coupon = CouponMapper.toCoupon({ ...baseCouponDto, applicableOrderTypes: [] });
    expect(coupon.applicableOrderTypes).toBeUndefined();
  });
});

describe('CouponMapper.toCouponList', () => {
  it('maps an array', () => {
    const coupons = CouponMapper.toCouponList([baseCouponDto]);
    expect(coupons).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(CouponMapper.toCouponList([])).toEqual([]);
  });
});
