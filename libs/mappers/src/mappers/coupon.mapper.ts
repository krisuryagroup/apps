import type { OnlineOrderCoupon } from '@zitro/models';
import type { CouponDto } from '../dtos/coupon.dto';

export const CouponMapper = {
  toCoupon(dto: CouponDto): OnlineOrderCoupon {
    return {
      id: dto.id,
      code: dto.code,
      title: dto.title,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscount: dto.maxDiscount ?? undefined,
      minOrderAmount: dto.minOrderAmount ?? undefined,
      isActive: dto.isActive,
      validFrom: new Date(dto.validFrom),
      validTo: new Date(dto.validTo),
      usageLimit: dto.usageLimit ?? undefined,
      usedCount: dto.usedCount,
      termsAndConditions: dto.termsAndConditions,
      isDisplayedForOnlineOrders: dto.isDisplayedForOnlineOrders,
      isNewCustomerOnly: dto.isNewCustomerOnly || undefined,
      applicableOrderTypes:
        dto.applicableOrderTypes.length > 0
          ? (dto.applicableOrderTypes as OnlineOrderCoupon['applicableOrderTypes'])
          : undefined,
      maxUsagePerUser: dto.maxUsagePerUser ?? undefined,
      usagePeriod: dto.usagePeriod ?? undefined,
      cooldownPeriodDays: dto.cooldownPeriodDays ?? undefined,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  },

  toCouponList(dtos: CouponDto[]): OnlineOrderCoupon[] {
    return dtos.map(CouponMapper.toCoupon);
  },
};
