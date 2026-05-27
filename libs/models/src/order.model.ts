export type OrderType = 'dine-in' | 'takeout' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
  weight?: string;
  description?: string;
  isOfferDisabled?: boolean;
  // Variation support
  selectedVariationId?: string;
  selectedVariationLabel?: string;
  selectedVariationPrice?: number;
}

export interface OrderStatusTimeline {
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  timestamp: Date;
  note?: string;
}

// Flat charges returned by .NET API — each field is the final applied value.
// Legacy Firebase stored nested { calculated, applied, waived } per charge because
// Cloud Functions updated sub-fields separately. The .NET API computes and returns
// only the final applied value, making the nested structure unnecessary.
export interface OrderCharges {
  packagingCharge: number; // Final packaging charge applied
  platformFee: number; // Final platform fee applied
  gst: number; // Final GST applied
  deliveryCharge?: number; // Final delivery charge applied (0 if free)
  deliveryChargeCalculated?: number; // Calculated delivery charge before waiving
  couponDiscount?: number; // Discount amount from applied coupon
  totalSavings?: number; // Sum of all waivers + coupon discount
}

export interface Order {
  id?: string;
  // which restaurant/store this order belongs to
  restaurantId?: string;
  businessSlug?: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessAlternatePhone?: string;
  businessFssaiLicenseNumber?: string;
  orderId: string;
  userId: string;
  userPhone: string;
  userName?: string | null;
  userPhotoURL?: string | null;

  // Order type
  orderType: OrderType;

  // Dine-in specific
  tableNumber?: string;
  numberOfGuests?: number;

  // Takeout specific
  scheduledPickupTime?: Date;

  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  couponDiscount?: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'cash' | 'online';
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'shipped'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  statusTimeline?: OrderStatusTimeline[];
  deliveryAddress?: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
    type: string;
  };
  customerNotes?: string;
  estimatedDeliveryTime?: Date;
  totalPackagingCharges?: number;
  tax?: number;
  deliveryFee?: number;

  // Detailed charges breakdown
  charges?: OrderCharges;
}

export interface CreateOrderData {
  // include restaurantId so orders are associated with a restaurant
  restaurantId?: string;
  orderType: OrderType;
  tableNumber?: string;
  numberOfGuests?: number;
  scheduledPickupTime?: Date;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  couponDiscount?: number;
  couponCode?: string;
  total: number;
  paymentMethod: 'cash' | 'online';
  deliveryAddress?: Order['deliveryAddress'];
  customerNotes?: string;
  charges?: OrderCharges;
}

// For displaying in UI
export interface OrderDisplay extends Order {
  date: string;
  time: string;
  statusDisplay: string;
  totalDisplay: string;
  orderTypeDisplay: string;
}
