export interface AddCartItemRequest {
  productId: string;
  variationId: string | null;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface ApplyCouponRequest {
  couponCode: string | null;
}
