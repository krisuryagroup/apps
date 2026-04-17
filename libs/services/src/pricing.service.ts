import { Injectable } from '@angular/core';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  PricingConfig,
  PricingBreakdown,
  ChargeDetails,
  ChargeItem,
  GstChargeItem,
  DiscountDetails,
  SavingsBreakdown,
  ChargesVisibility,
  PricingCalculationInput,
  OrderCharges
} from '@zitro/models';
import { OrderType } from '@zitro/models';

/**
 * PricingService - Centralized service for all order pricing calculations
 * 
 * This service handles:
 * - Loading pricing configuration from Firebase
 * - Calculating all charges (delivery, packaging, platform fee, GST)
 * - Applying discounts and coupons
 * - Determining charge visibility
 * - Calculating total savings
 * - Formatting charges for display and Firebase storage
 */
@Injectable({
  providedIn: 'root'
})
export class PricingService {
  private pricingConfig: PricingConfig | null = null;

  constructor() {}

  /**
   * Load pricing configuration from Firebase
   * Path: /appSettings/restaurantDetails/onlineorders/checkout
   */
  async loadPricingConfig(): Promise<PricingConfig> {
    if (this.pricingConfig) {
      return this.pricingConfig;
    }

    try {
      const db = getFirestore(getApp());
      const pricingDocRef = doc(db, 'appSettings', 'restaurantDetails', 'onlineorders', 'checkout');
      const pricingSnap = await getDoc(pricingDocRef);
      
      if (pricingSnap.exists()) {
        this.pricingConfig = pricingSnap.data() as PricingConfig;
        console.log('✅ PricingService: Configuration loaded from Firebase');
        return this.pricingConfig;
      } else {
        console.warn('⚠️ PricingService: Configuration not found in Firebase, using defaults');
        this.pricingConfig = this.getDefaultPricingConfig();
        return this.pricingConfig;
      }
    } catch (error) {
      console.error('❌ PricingService: Error loading configuration:', error);
      this.pricingConfig = this.getDefaultPricingConfig();
      return this.pricingConfig;
    }
  }

  /**
   * Get current pricing configuration (loads if not already loaded)
   */
  async getPricingConfig(): Promise<PricingConfig> {
    if (!this.pricingConfig) {
      return await this.loadPricingConfig();
    }
    return this.pricingConfig;
  }

  /**
   * Refresh pricing configuration from Firebase
   */
  async refreshPricingConfig(): Promise<PricingConfig> {
    this.pricingConfig = null;
    return await this.loadPricingConfig();
  }

  /**
   * Get default pricing configuration
   */
  private getDefaultPricingConfig(): PricingConfig {
    return {
      currency: 'INR',
      delivery: {
        enabled: true,
        apply: true,
        base_fee: 40,
        per_km_fee: 0,
        free_delivery_above: 249,
        surge_multiplier: 1,
        max_delivery_cap: 0,
        applicable_order_types: ['delivery']
      },
      platform_fee: {
        enabled: true,
        apply: true, // Changed to true - actually charge platform fee
        flat_fee: 5,
        applicable_order_types: ['delivery', 'takeout'] // Don't charge dine-in
      },
      packaging: {
        enabled: true,
        apply: true, // Changed to true - actually charge packaging
        default_fee: 10,
        type: 'flat',
        applicable_order_types: ['delivery', 'takeout'] // Don't charge dine-in
      },
      gst: {
        enabled: true,
        apply: true, // Changed to true - actually charge GST
        food_percent: 5,
        applicable_order_types: ['delivery', 'takeout', 'dine-in'] // Charge all types
      },
      rounding: {
        enabled: true,
        type: 'nearest_rupee'
      }
    };
  }

  /**
   * Calculate complete pricing breakdown
   */
  async calculatePricing(input: PricingCalculationInput): Promise<PricingBreakdown> {
    const config = input.pricingConfig || await this.getPricingConfig();
    
    // Calculate all charges
    const deliveryCharge = this.calculateDeliveryCharge(input.subtotal, input.orderType, config);
    const packagingCharge = this.calculatePackagingCharge(input.orderType, config);
    const platformFee = this.calculatePlatformFee(config, input.orderType);
    const gst = this.calculateGst(input.subtotal, config, input.orderType);
    
    // Build charges object
    const charges: ChargeDetails = {
      delivery: deliveryCharge,
      packaging: packagingCharge,
      platformFee: platformFee,
      gst: gst
    };
    
    // Calculate discounts
    const discounts: DiscountDetails = {
      couponCode: input.appliedCoupon?.coupon?.code,
      discountAmount: input.appliedCoupon?.discountAmount || 0,
      discountType: input.appliedCoupon?.coupon?.discountType,
      applicableOn: input.appliedCoupon?.coupon?.applicableOn
    };
    
    // Calculate total before coupon
    let total = input.subtotal + 
                charges.delivery.applied + 
                charges.packaging.applied + 
                charges.platformFee.applied + 
                charges.gst.applied;
    
    // Apply coupon discount
    total = Math.max(0, total - discounts.discountAmount);
    
    // Apply rounding
    if (config.rounding.enabled && config.rounding.type === 'nearest_rupee') {
      total = Math.round(total);
    }
    
    // Calculate savings
    const savings = this.calculateSavings(charges, discounts);
    
    // Determine visibility
    const visibility = this.determineVisibility(charges, input.orderType);
    
    return {
      subtotal: input.subtotal,
      charges,
      discounts,
      savings,
      total,
      visibility
    };
  }

  /**
   * Calculate delivery charge
   */
  private calculateDeliveryCharge(
    subtotal: number, 
    orderType: OrderType | null, 
    config: PricingConfig
  ): ChargeItem {
    // No delivery charge for dine-in or takeout
    if (orderType === 'dine-in' || orderType === 'takeout') {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }
    
    if (!config.delivery.enabled) {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }
    
    // Check if delivery charge applies to this order type
    const isApplicable = !config.delivery.applicable_order_types || 
                        config.delivery.applicable_order_types.includes(orderType!);
    
    if (!isApplicable) {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }
    
    // Calculate base delivery charge
    const baseFee = config.delivery.base_fee;
    const surgeMultiplier = config.delivery.surge_multiplier || 1;
    let calculated = baseFee * surgeMultiplier;
    
    // Apply max cap if set
    if (config.delivery.max_delivery_cap > 0) {
      calculated = Math.min(calculated, config.delivery.max_delivery_cap);
    }
    
    // Check for free delivery eligibility
    const isEligibleForFreeDelivery = subtotal >= config.delivery.free_delivery_above;
    
    // Determine applied charge
    let applied = calculated;
    if (!config.delivery.apply || isEligibleForFreeDelivery) {
      applied = 0;
    }
    
    const waived = calculated - applied;
    
    return {
      calculated,
      applied,
      waived,
      isVisible: orderType === 'delivery'
    };
  }

  /**
   * Calculate packaging charge
   */
  private calculatePackagingCharge(
    orderType: OrderType | null, 
    config: PricingConfig
  ): ChargeItem {
    if (!config.packaging.enabled) {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }
    
    const calculated = config.packaging.default_fee;
    
    // Check if packaging charge applies to this order type
    const isApplicable = !config.packaging.applicable_order_types || 
                        config.packaging.applicable_order_types.includes(orderType!);
    
    // If not applicable to this order type, don't show it at all
    if (!isApplicable) {
      return {
        calculated: 0,
        applied: 0,
        waived: 0,
        isVisible: false
      };
    }
    
    const applied = config.packaging.apply ? calculated : 0;
    const waived = calculated - applied;
    
    return {
      calculated,
      applied,
      waived,
      isVisible: true
    };
  }

  /**
   * Calculate platform fee
   */
  private calculatePlatformFee(config: PricingConfig, orderType: OrderType | null): ChargeItem {
    if (!config.platform_fee.enabled) {
      return { calculated: 0, applied: 0, waived: 0, isVisible: false };
    }
    
    const calculated = config.platform_fee.flat_fee;
    
    // Check if platform fee applies to this order type
    const isApplicable = !config.platform_fee.applicable_order_types || 
                        config.platform_fee.applicable_order_types.includes(orderType!);
    
    // If not applicable to this order type, show as savings (waived)
    if (!isApplicable) {
      return {
        calculated,
        applied: 0,
        waived: calculated,
        isVisible: true // Show to display savings
      };
    }
    
    const applied = config.platform_fee.apply ? calculated : 0;
    const waived = calculated - applied;
    
    return {
      calculated,
      applied,
      waived,
      isVisible: true
    };
  }

  /**
   * Calculate GST
   */
  private calculateGst(subtotal: number, config: PricingConfig, orderType: OrderType | null): GstChargeItem {
    if (!config.gst.enabled || subtotal <= 0) {
      return { calculated: 0, applied: 0, waived: 0, percentage: 0, isVisible: false };
    }
    
    // Check if GST applies to this order type
    const isApplicable = !config.gst.applicable_order_types || 
                        config.gst.applicable_order_types.includes(orderType!);
    
    if (!isApplicable) {
      return { calculated: 0, applied: 0, waived: 0, percentage: 0, isVisible: false };
    }
    
    const percentage = config.gst.food_percent;
    const calculated = subtotal * (percentage / 100);
    const applied = config.gst.apply ? calculated : 0;
    const waived = calculated - applied;
    
    return {
      calculated,
      applied,
      waived,
      percentage,
      isVisible: true
    };
  }

  /**
   * Calculate total savings
   */
  private calculateSavings(charges: ChargeDetails, discounts: DiscountDetails): SavingsBreakdown {
    const freeDelivery = charges.delivery.waived;
    const freePackaging = charges.packaging.waived;
    const freePlatformFee = charges.platformFee.waived;
    const freeGst = charges.gst.waived;
    const couponDiscount = discounts.discountAmount;
    
    const totalSavings = freeDelivery + freePackaging + freePlatformFee + freeGst + couponDiscount;
    
    return {
      freeDelivery,
      freePackaging,
      freePlatformFee,
      freeGst,
      couponDiscount,
      totalSavings
    };
  }

  /**
   * Determine which charges should be visible
   */
  private determineVisibility(charges: ChargeDetails, orderType: OrderType | null): ChargesVisibility {
    return {
      showDelivery: charges.delivery.isVisible && orderType === 'delivery',
      showPackaging: charges.packaging.isVisible && (charges.packaging.calculated > 0 || charges.packaging.applied > 0),
      showPlatformFee: charges.platformFee.isVisible && (charges.platformFee.calculated > 0 || charges.platformFee.applied > 0),
      showGst: charges.gst.isVisible && (charges.gst.calculated > 0 || charges.gst.applied > 0),
      showSavings: this.shouldShowSavings(charges)
    };
  }

  /**
   * Determine if savings should be shown
   */
  private shouldShowSavings(charges: ChargeDetails): boolean {
    return charges.delivery.waived > 0 || 
           charges.packaging.waived > 0 || 
           charges.platformFee.waived > 0 || 
           charges.gst.waived > 0;
  }

  /**
   * Check if eligible for free delivery
   */
  isEligibleForFreeDelivery(subtotal: number, config: PricingConfig): boolean {
    return subtotal >= config.delivery.free_delivery_above;
  }

  /**
   * Get free delivery message
   */
  getFreeDeliveryMessage(subtotal: number, config: PricingConfig): string {
    if (this.isEligibleForFreeDelivery(subtotal, config)) {
      return '';
    }
    
    const amountNeeded = config.delivery.free_delivery_above - subtotal;
    return `Add ₹${amountNeeded.toFixed(2)} more for free delivery`;
  }

  /**
   * Format pricing breakdown for Firebase order storage
   */
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

  /**
   * Get currency symbol
   */
  getCurrencySymbol(config?: PricingConfig): string {
    const currency = config?.currency || this.pricingConfig?.currency || 'INR';
    return currency === 'INR' ? '₹' : currency;
  }
}
