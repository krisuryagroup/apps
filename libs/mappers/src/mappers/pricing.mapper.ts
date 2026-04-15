import type { PricingBreakdown, ChargeItem } from '@zitro/models';
import type { PricingDto } from '../dtos/pricing.dto';

export const PricingMapper = {
  /**
   * Maps a flat PricingDto returned by the API → PricingBreakdown model.
   * The API returns only final applied values; ChargeItem.calculated and .waived
   * are set to the same value (no waiver data available from this endpoint).
   */
  toBreakdown(dto: PricingDto): PricingBreakdown {
    return {
      subtotal: dto.subtotal,
      charges: {
        delivery: PricingMapper.toChargeItem(dto.deliveryCharge, dto.showDeliveryCharge),
        packaging: PricingMapper.toChargeItem(dto.packagingCharge, dto.showPackagingCharge),
        platformFee: PricingMapper.toChargeItem(dto.platformFee, dto.showPlatformFee),
        gst: {
          ...PricingMapper.toChargeItem(dto.gst, dto.showGst),
          percentage: 0, // not returned by this endpoint — populated by PricingConfig if needed
        },
      },
      discounts: {
        discountAmount: dto.couponDiscount,
      },
      savings: {
        freeDelivery: 0,
        freePackaging: 0,
        freePlatformFee: 0,
        freeGst: 0,
        couponDiscount: dto.couponDiscount,
        totalSavings: dto.couponDiscount,
      },
      total: dto.total,
      visibility: {
        showDelivery: dto.showDeliveryCharge,
        showPackaging: dto.showPackagingCharge,
        showPlatformFee: dto.showPlatformFee,
        showGst: dto.showGst,
        showSavings: dto.couponDiscount > 0,
      },
    };
  },

  toChargeItem(applied: number, isVisible: boolean): ChargeItem {
    return { calculated: applied, applied, waived: 0, isVisible };
  },
};
