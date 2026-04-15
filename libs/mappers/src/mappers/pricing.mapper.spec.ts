import { describe, it, expect } from 'vitest';
import { PricingMapper } from './pricing.mapper';
import type { PricingDto } from '../dtos/pricing.dto';

const basePricingDto: PricingDto = {
  subtotal: 400,
  deliveryCharge: 40,
  packagingCharge: 10,
  platformFee: 5,
  gst: 20,
  couponDiscount: 0,
  total: 475,
  showDeliveryCharge: true,
  showPackagingCharge: true,
  showPlatformFee: false,
  showGst: true,
  showCouponDiscount: false,
  showFreeDeliveryProgress: false,
  freeDeliveryThreshold: 500,
  freeDeliveryAmountRemaining: 100,
};

describe('PricingMapper.toBreakdown', () => {
  it('maps subtotal and total', () => {
    const breakdown = PricingMapper.toBreakdown(basePricingDto);
    expect(breakdown.subtotal).toBe(400);
    expect(breakdown.total).toBe(475);
  });

  it('maps delivery charge into ChargeItem', () => {
    const breakdown = PricingMapper.toBreakdown(basePricingDto);
    expect(breakdown.charges.delivery.applied).toBe(40);
    expect(breakdown.charges.delivery.calculated).toBe(40);
    expect(breakdown.charges.delivery.waived).toBe(0);
    expect(breakdown.charges.delivery.isVisible).toBe(true);
  });

  it('maps packaging charge with visibility', () => {
    const breakdown = PricingMapper.toBreakdown(basePricingDto);
    expect(breakdown.charges.packaging.applied).toBe(10);
    expect(breakdown.charges.packaging.isVisible).toBe(true);
  });

  it('maps platformFee visibility=false', () => {
    const breakdown = PricingMapper.toBreakdown(basePricingDto);
    expect(breakdown.charges.platformFee.isVisible).toBe(false);
  });

  it('maps visibility block', () => {
    const breakdown = PricingMapper.toBreakdown(basePricingDto);
    expect(breakdown.visibility.showDelivery).toBe(true);
    expect(breakdown.visibility.showPackaging).toBe(true);
    expect(breakdown.visibility.showPlatformFee).toBe(false);
    expect(breakdown.visibility.showGst).toBe(true);
    expect(breakdown.visibility.showSavings).toBe(false); // couponDiscount=0
  });

  it('sets showSavings=true when coupon applied', () => {
    const breakdown = PricingMapper.toBreakdown({ ...basePricingDto, couponDiscount: 50 });
    expect(breakdown.visibility.showSavings).toBe(true);
    expect(breakdown.savings.couponDiscount).toBe(50);
  });

  it('maps discount amount', () => {
    const breakdown = PricingMapper.toBreakdown({ ...basePricingDto, couponDiscount: 100 });
    expect(breakdown.discounts.discountAmount).toBe(100);
  });
});
