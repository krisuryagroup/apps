// Flat pricing summary returned by the pricing calculation endpoint.
// Each value is the final applied amount (not calculated/applied/waived breakdown).
export interface PricingDto {
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  platformFee: number;
  gst: number;
  couponDiscount: number;
  total: number;
  // Visibility flags — which line items to display in the checkout UI
  showDeliveryCharge: boolean;
  showPackagingCharge: boolean;
  showPlatformFee: boolean;
  showGst: boolean;
  showCouponDiscount: boolean;
  showFreeDeliveryProgress: boolean;
  // Free delivery progress (if applicable)
  freeDeliveryThreshold: number;
  freeDeliveryAmountRemaining: number;
}
