export interface NearbyBusiness {
  id: string;
  slug: string;
  name: string;
  businessType: string;           // "restaurant" | "grocery" | etc.
  rating: number;
  deliveryTimeDisplay: string | null;
  deliveryFee: number;
  minOrderAmount: number;
  isActive: boolean;
  isFeatured: boolean;
  distanceMetres: number;
  tags: string[];                 // tag slugs e.g. ["pizza", "biryani"]
  imageUrl?: string | null;
}
