export interface ApiCart {
  id: string;
  userId: string;
  businessId: string;
  businessSlug: string;
  businessName: string;
  status: 'active' | 'checked_out' | 'abandoned' | 'expired';
  couponCode: string | null;
  couponDiscountPreview: number;
  estimatedTotal: number;
  items: ApiCartItem[];
}

export interface ApiCartItem {
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

export interface CheckoutSummary {
  cartId: string;
  items: ApiCartItem[];
  unavailableItems: UnavailableCartItem[];
  subtotal: number;
  canProceed: boolean;
}

export interface UnavailableCartItem {
  productId: string;
  productName: string;
  reason: string;
}
