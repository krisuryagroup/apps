// Outbound shape for POST /api/orders — only what the API needs, not the full model.
export interface CreateOrderRequest {
  businessId: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  items: CreateOrderItemRequest[];
  paymentMethod: 'cash' | 'online';
  deliveryAddressId: string | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  couponCode: string | null;
  customerNotes: string | null;
}

export interface CreateOrderItemRequest {
  productId: string;
  variationId: string | null;
  quantity: number;
  specialInstructions: string | null;
}
