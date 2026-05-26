export interface CartDto {
  id: string;
  userId: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  status: string;
  couponCode: string | null;
  couponDiscountPreview: number;
  estimatedTotal: number;
  lastActivityAt: string;
  items: CartItemDto[];
}

export interface CartItemDto {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  variationId: string | null;
  variationLabel: string | null;
  quantity: number;
  unitPrice: number;
  currentPrice: number;
  priceChanged: boolean;
  lineTotal: number;
}

export interface CheckoutSummaryDto {
  cartId: string;
  items: CartItemDto[];
  unavailableItems: UnavailableItemDto[];
  subtotal: number;
  canProceed: boolean;
}

export interface UnavailableItemDto {
  productId: string;
  productName: string;
  reason: string;
}
