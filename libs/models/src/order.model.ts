export type OrderType = 'dine-in' | 'takeout' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  imageURL?: string;
  weight?: string;
  description?: string;
  isOfferDisabled?: boolean;
  // Variation support
  selectedVariationId?: string;
  selectedVariationLabel?: string;
  selectedVariationPrice?: number;
}

export interface OrderStatusTimeline {
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  timestamp: Date;
  note?: string;
}

export interface OrderCharges {
  // Packaging charges
  packagingCharges: {
    calculated: number;  // How much packaging should cost
    applied: number;     // How much was actually charged
    waived: number;      // How much was waived off
  };
  
  // Platform fee
  platformFee: {
    calculated: number;  // How much platform fee should cost
    applied: number;     // How much was actually charged
    waived: number;      // How much was waived off
  };
  
  // GST/Tax
  gst: {
    calculated: number;  // How much GST should be (5% typically)
    applied: number;     // How much GST was actually charged
    waived: number;      // How much was waived off
    percentage: number;  // GST percentage (e.g., 5)
  };
  
  // Delivery charge (only for delivery orders)
  deliveryCharge?: {
    calculated: number;  // How much delivery should cost
    applied: number;     // How much was actually charged
    waived: number;      // How much was waived off
  };
  
  // Coupon discount (if applied)
  couponDiscount?: {
    code: string;        // Coupon code used
    amount: number;      // Discount amount
  };
}

export interface Order {
  id?: string;
  // which restaurant/store this order belongs to
  restaurantId?: string;
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
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
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
  packagingChargesPerItem?: number;
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
