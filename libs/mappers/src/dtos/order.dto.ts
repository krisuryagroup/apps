/** Minimal response from POST /api/orders (PlaceOrderResponse in C#). */
export interface PlaceOrderResponseDto {
  id: string;
  orderId: string; // display ID, e.g. "GRD751410483558"
  status: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  couponDiscount: number | null;
  couponCode: string | null;
  paymentMethod: string;
  orderType: string;
  createdAt: string;
}

/** Matches C# OrderDto.cs flat response shape (camelCase after JSON serialization). */
export interface OrderDto {
  id: string;
  orderId: string; // display ID, e.g. "GRD751410483558"
  userId: string;
  businessId: string;
  businessSlug: string | null;
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessAlternatePhone: string | null;
  businessFssaiLicenseNumber: string | null;
  businessGstNumber: string | null;
  businessEmail: string | null;
  status: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  paymentMethod: 'cash' | 'online';
  paymentStatus: string;
  subtotal: number;
  deliveryCharge: number;
  tax: number | null;
  couponDiscount: number | null;
  couponCode: string | null;
  walletDeducted: number | null;
  total: number;
  charges: string | null; // serialized string, not used by frontend
  customerNotes: string | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  // Flat delivery address fields
  deliveryAddressName: string | null;
  deliveryAddressPhone: string | null;
  deliveryAddressHouseAndStreet: string | null;
  deliveryAddressTown: string | null;
  deliveryAddressState: string | null;
  deliveryAddressPincode: string | null;
  deliveryAddressLandmark: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
  statusTimeline: OrderTimelineDto[];
}

/** Shared address DTO — also re-exported for user.dto.ts. */
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
  coordinatesLat?: number | null;
  coordinatesLng?: number | null;
  addressMode?: 'manual' | 'society';
  societyId?: string | null;
  societyName?: string | null;
  towerId?: string | null;
  towerName?: string | null;
  flatNumber?: string | null;
}

export interface OrderItemDto {
  id: string;
  productId: string | null;
  name: string;
  price: number;
  qty: number;
  imageUrl: string | null;
  isOfferDisabled: boolean | null;
  selectedVariationId: string | null;
  selectedVariationPrice: number | null;
}

export interface OrderTimelineDto {
  status: string;
  timestamp: string;
  note: string | null;
}

/** Summary item returned by GET /api/orders (list endpoint). */
export interface OrderListSummaryDto {
  id: string;
  orderId: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  businessAddress: string;
  status: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  total: number;
  couponCode: string | null;
  couponDiscount: number;
  createdAt: string;
  itemCount: number;
}

/** Paginated wrapper returned by GET /api/orders. */
export interface OrderListResponseDto {
  orders: OrderListSummaryDto[];
}
