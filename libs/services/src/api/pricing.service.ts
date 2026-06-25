import { Injectable, inject } from '@angular/core';
import type {
  PricingConfig,
  PricingBreakdown,
  ChargeDetails,
  ChargeItem,
  GstChargeItem,
  DiscountDetails,
  SavingsBreakdown,
  ChargesVisibility,
  PricingCalculationInput,
  OrderType,
  OrderCharges,
} from '@zitro/models';
import { ConfigApiService } from './config-api.service';
import { BusinessContextService } from '../business-context.service';
import { firstValueFrom } from 'rxjs';

const DEFAULT_CONFIG: PricingConfig = {
  currency: 'INR',
  delivery: {
    enabled: true,
    apply: true,
    base_fee: 40,
    per_km_fee: 0,
    free_delivery_above: 249,
    surge_multiplier: 1,
    max_delivery_cap: 0,
    applicable_order_types: ['delivery'],
  },
  platform_fee: {
    enabled: true,
    apply: true,
    flat_fee: 5,
    applicable_order_types: ['delivery', 'takeout'],
  },
  packaging: {
    enabled: true,
    apply: true,
    default_fee: 10,
    type: 'flat',
    applicable_order_types: ['delivery', 'takeout'],
  },
  gst: {
    enabled: true,
    apply: true,
    food_percent: 5,
    applicable_order_types: ['delivery', 'takeout', 'dine-in'],
  },
  rounding: { enabled: true, type: 'nearest_rupee' },
};

@Injectable({ providedIn: 'root' })
export class PricingApiService {
  private configApi = inject(ConfigApiService);
  private businessContext = inject(BusinessContextService);

  private pricingConfig: PricingConfig | null = null;

  async loadConfig(): Promise<PricingConfig> {
    if (this.pricingConfig) return this.pricingConfig;
    const slug = this.businessContext.businessId();
    if (!slug) {
      this.pricingConfig = DEFAULT_CONFIG;
      return this.pricingConfig;
    }
    try {
      const config = await firstValueFrom(
        this.configApi.getBusinessConfig(slug),
      );
      this.pricingConfig =
        (config.pricingConfig as PricingConfig) ?? DEFAULT_CONFIG;
    } catch {
      this.pricingConfig = DEFAULT_CONFIG;
    }
    return this.pricingConfig;
  }

  async calculatePricing(
    input: PricingCalculationInput,
  ): Promise<PricingBreakdown> {
    const config = input.pricingConfig ?? (await this.loadConfig());

    const deliveryCharge = this.calcDelivery(
      input.subtotal,
      input.orderType,
      config,
    );
    const packagingCharge = this.calcPackaging(input.orderType, config);
    const platformFee = this.calcPlatformFee(config, input.orderType);
    const gst = this.calcGst(input.subtotal, config, input.orderType);

    const charges: ChargeDetails = {
      delivery: deliveryCharge,
      packaging: packagingCharge,
      platformFee,
      gst,
    };

    const discounts: DiscountDetails = {
      couponCode: input.appliedCoupon?.coupon?.code,
      discountAmount: input.appliedCoupon?.discountAmount ?? 0,
      discountType: input.appliedCoupon?.coupon?.discountType,
    };

    let total =
      input.subtotal +
      charges.delivery.applied +
      charges.packaging.applied +
      charges.platformFee.applied +
      charges.gst.applied -
      discounts.discountAmount;

    total = Math.max(0, total);
    if (config.rounding.enabled && config.rounding.type === 'nearest_rupee') {
      total = Math.round(total);
    }

    return {
      subtotal: input.subtotal,
      charges,
      discounts,
      savings: this.calcSavings(charges, discounts),
      total,
      visibility: this.calcVisibility(charges, input.orderType),
    };
  }

  private calcDelivery(
    subtotal: number,
    orderType: OrderType | null,
    config: PricingConfig,
  ): ChargeItem {
    if (
      orderType === 'dine-in' ||
      orderType === 'takeout' ||
      !config.delivery.enabled
    ) {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }

    const applicable =
      !config.delivery.applicable_order_types ||
      config.delivery.applicable_order_types.includes(orderType!);
    if (!applicable)
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };

    let calculated =
      config.delivery.base_fee * (config.delivery.surge_multiplier ?? 1);
    if (config.delivery.max_delivery_cap > 0)
      calculated = Math.min(calculated, config.delivery.max_delivery_cap);
    const isFreeDelivery = subtotal >= config.delivery.free_delivery_above;
    const applied = config.delivery.apply && !isFreeDelivery ? calculated : 0;
    return {
      calculated,
      applied,
      waived: calculated - applied,
      isVisible: orderType === 'delivery',
    };
  }

  private calcPackaging(
    orderType: OrderType | null,
    config: PricingConfig,
  ): ChargeItem {
    if (!config.packaging.enabled)
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };

    const applicable =
      !config.packaging.applicable_order_types ||
      config.packaging.applicable_order_types.includes(orderType!);
    if (!applicable)
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    const calculated = config.packaging.default_fee;
    const applied = config.packaging.apply ? calculated : 0;
    return {
      calculated,
      applied,
      waived: calculated - applied,
      isVisible: true,
    };
  }

  private calcPlatformFee(
    config: PricingConfig,
    orderType: OrderType | null,
  ): ChargeItem {
    if (!config.platform_fee.enabled)
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    const calculated = config.platform_fee.flat_fee;

    const applicable =
      !config.platform_fee.applicable_order_types ||
      config.platform_fee.applicable_order_types.includes(orderType!);
    if (!applicable)
      return { calculated, applied: 0, waived: calculated, isVisible: true };
    const applied = config.platform_fee.apply ? calculated : 0;
    return {
      calculated,
      applied,
      waived: calculated - applied,
      isVisible: true,
    };
  }

  private calcGst(
    subtotal: number,
    config: PricingConfig,
    orderType: OrderType | null,
  ): GstChargeItem {
    if (!config.gst.enabled || subtotal <= 0) {
      return {
        calculated: 0,
        applied: 0,
        waived: 0,
        percentage: 0,
        isVisible: false,
      };
    }

    const applicable =
      !config.gst.applicable_order_types ||
      config.gst.applicable_order_types.includes(orderType!);
    if (!applicable)
      return {
        calculated: 0,
        applied: 0,
        waived: 0,
        percentage: 0,
        isVisible: false,
      };
    const percentage = config.gst.food_percent;
    const calculated = subtotal * (percentage / 100);
    const applied = config.gst.apply ? calculated : 0;
    return {
      calculated,
      applied,
      waived: calculated - applied,
      percentage,
      isVisible: true,
    };
  }

  private calcSavings(
    charges: ChargeDetails,
    discounts: DiscountDetails,
  ): SavingsBreakdown {
    return {
      freeDelivery: charges.delivery.waived,
      freePackaging: charges.packaging.waived,
      freePlatformFee: charges.platformFee.waived,
      freeGst: charges.gst.waived,
      couponDiscount: discounts.discountAmount,
      totalSavings:
        charges.delivery.waived +
        charges.packaging.waived +
        charges.platformFee.waived +
        charges.gst.waived +
        discounts.discountAmount,
    };
  }

  private calcVisibility(
    charges: ChargeDetails,
    orderType: OrderType | null,
  ): ChargesVisibility {
    const hasSavings =
      charges.delivery.waived > 0 ||
      charges.packaging.waived > 0 ||
      charges.platformFee.waived > 0 ||
      charges.gst.waived > 0;
    return {
      showDelivery: charges.delivery.isVisible && orderType === 'delivery',
      showPackaging:
        charges.packaging.isVisible && charges.packaging.calculated > 0,
      showPlatformFee:
        charges.platformFee.isVisible && charges.platformFee.calculated > 0,
      showGst: charges.gst.isVisible && charges.gst.calculated > 0,
      showSavings: hasSavings,
    };
  }

  isEligibleForFreeDelivery(subtotal: number, config: PricingConfig): boolean {
    return subtotal >= config.delivery.free_delivery_above;
  }

  getFreeDeliveryMessage(subtotal: number, config: PricingConfig): string {
    if (this.isEligibleForFreeDelivery(subtotal, config)) return '';
    const needed = config.delivery.free_delivery_above - subtotal;
    return `Add ₹${needed.toFixed(0)} more for free delivery`;
  }

  formatChargesForOrder(pricing: PricingBreakdown): OrderCharges {
    return {
      packagingCharge: pricing.charges.packaging.applied,
      platformFee: pricing.charges.platformFee.applied,
      gst: pricing.charges.gst.applied,
      ...(pricing.visibility.showDelivery
        ? { deliveryCharge: pricing.charges.delivery.applied }
        : {}),
      ...(pricing.discounts.couponCode && pricing.discounts.discountAmount > 0
        ? { couponDiscount: pricing.discounts.discountAmount }
        : {}),
    };
  }
}
