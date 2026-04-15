export interface Business {
  id: string;
  slug: string;
  name: string;
  businessType: string;
  isActive: boolean;
  tags: string[];           // tag slugs
}

export interface BusinessConfig {
  slug: string;
  name: string;
  businessType: string;
  openTime: string;         // "HH:mm"
  closeTime: string;        // "HH:mm"
  deliveryFee: number;
  minOrderAmount: number;
  packagingChargesPerItem: number;
  orderCancellationTimeLimit: number;
  isAcceptingOrders: boolean;
}
