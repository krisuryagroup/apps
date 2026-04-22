export interface LatestProduct {
  id: string;
  name: string;
  price: number | null;
  imageUrl?: string | null;
}

export interface DeliveryTimeMinutes {
  min: number;
  max: number;
}

export interface ActiveOffer {
  label: string;
  type: string;
}

export interface NearbyBusiness {
  id: string;
  slug: string;
  name: string;
  businessType: string;           // "restaurant" | "grocery" | etc.
  rating: number;
  totalRatings: number;
  deliveryTimeDisplay: string | null;
  deliveryTimeMinutes: DeliveryTimeMinutes | null;
  deliveryCharge: number;
  minOrderAmount: number;
  isActive: boolean;
  isFeatured: boolean;
  isVeg: boolean;
  isPureVeg: boolean;
  isOpen: boolean;
  distanceMetres: number;
  tags: string[];                 // tag slugs e.g. ["pizza", "biryani"]
  imageUrl?: string | null;
  latestProducts?: LatestProduct[];
  activeOffer: ActiveOffer | null;
}

export interface NearbyBusinessesMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NearbyBusinessesResponse {
  businesses: NearbyBusiness[];
  meta: NearbyBusinessesMeta;
}
