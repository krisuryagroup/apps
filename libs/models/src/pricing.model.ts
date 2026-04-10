/**
 * Pricing Models
 * Centralized data structures for order pricing and charges
 */

import { OrderType } from './order.model';

/**
 * Configuration for pricing fetched from Firebase
 */
export interface PricingConfig {
  currency: string;
  delivery: DeliveryPricingConfig;
  platform_fee: PlatformFeePricingConfig;
  packaging: PackagingPricingConfig;
  gst: GstPricingConfig;
  rounding: RoundingPricingConfig;
}

export interface DeliveryPricingConfig {
  enabled: boolean;
  apply: boolean;
  base_fee: number;
  per_km_fee: number;
  free_delivery_above: number;
  surge_multiplier: number;
  max_delivery_cap: number;
  applicable_order_types?: OrderType[]; // Which order types this charge applies to
}

export interface PlatformFeePricingConfig {
  enabled: boolean;
  apply: boolean;
  flat_fee: number;
  applicable_order_types?: OrderType[]; // Which order types this charge applies to
}

export interface PackagingPricingConfig {
  enabled: boolean;
  apply: boolean;
  default_fee: number;
  type: string;
  applicable_order_types?: OrderType[]; // Which order types this charge applies to
}

export interface GstPricingConfig {
  enabled: boolean;
  apply: boolean;
  food_percent: number;
  applicable_order_types?: OrderType[]; // Which order types this charge applies to
}

export interface RoundingPricingConfig {
  enabled: boolean;
  type: 'nearest_rupee' | 'none';
}

/**
 * Main pricing breakdown structure
 */
export interface PricingBreakdown {
  subtotal: number;
  charges: ChargeDetails;
  discounts: DiscountDetails;
  savings: SavingsBreakdown;
  total: number;
  visibility: ChargesVisibility;
}

/**
 * All charges in the order
 */
export interface ChargeDetails {
  delivery: ChargeItem;
  packaging: ChargeItem;
  platformFee: ChargeItem;
  gst: GstChargeItem;
}

/**
 * Individual charge item with calculated and applied amounts
 */
export interface ChargeItem {
  calculated: number;    // Original amount before any waivers
  applied: number;        // Actual amount being charged
  waived: number;         // Amount waived/discounted
  isVisible: boolean;     // Should this charge be shown in UI
}

/**
 * GST charge with additional percentage info
 */
export interface GstChargeItem extends ChargeItem {
  percentage: number;
}

/**
 * Discount details from coupons
 */
export interface DiscountDetails {
  couponCode?: string;
  discountAmount: number;
  discountType?: 'percentage' | 'fixed' | 'free_delivery';
  applicableOn?: 'subtotal' | 'delivery' | 'total';
}

/**
 * Total savings breakdown
 */
export interface SavingsBreakdown {
  freeDelivery: number;
  freePackaging: number;
  freePlatformFee: number;
  freeGst: number;
  couponDiscount: number;
  totalSavings: number;
}

/**
 * Visibility rules for charges
 */
export interface ChargesVisibility {
  showDelivery: boolean;
  showPackaging: boolean;
  showPlatformFee: boolean;
  showGst: boolean;
  showSavings: boolean;
}

/**
 * Input parameters for pricing calculation
 */
export interface PricingCalculationInput {
  cartItems: any[];
  subtotal: number;
  orderType: OrderType | null;
  deliveryAddress?: any;
  appliedCoupon?: {
    coupon: any;
    discountAmount: number;
  } | null;
  pricingConfig: PricingConfig;
}

/**
 * Order charges for Firebase storage
 */
export interface OrderCharges {
  packagingCharges: {
    calculated: number;
    applied: number;
    waived: number;
  };
  platformFee: {
    calculated: number;
    applied: number;
    waived: number;
  };
  gst: {
    calculated: number;
    applied: number;
    waived: number;
    percentage: number;
  };
  deliveryCharge?: {
    calculated: number;
    applied: number;
    waived: number;
  };
  couponDiscount?: {
    code: string;
    amount: number;
  };
}
