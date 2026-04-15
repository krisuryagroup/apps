export interface OrderDto {
  id: string;
  displayId: string;
  userId: string;
  businessId: string;
  businessName: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  status: string;
  items: OrderItemDto[];
  charges: OrderChargesDto;
  paymentMethod: 'cash' | 'online';
  isPaid: boolean;
  deliveryAddress: AddressDto | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  appliedCouponCode: string | null;
  customerNotes: string | null;
  statusTimeline: OrderStatusEventDto[];
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderChargesDto {
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  platformFee: number;
  gst: number;
  couponDiscount: number;
  total: number;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  variationId: string | null;
  variationName: string | null;
  priceModifier: number;
  effectivePrice: number;
  specialInstructions: string | null;
  imageUrl: string | null;
}

export interface OrderStatusEventDto {
  status: string;
  timestamp: string;
  note: string | null;
}

export interface AddressDto {
  id: string;
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
}
