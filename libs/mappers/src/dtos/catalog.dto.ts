// Raw shapes returned by .NET API — mirrors the API response contract exactly.
// Do NOT import @zitro/models here — DTOs are API shapes, models are app shapes.

export interface ProductDto {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  foodType: 'Veg' | 'NonVeg' | 'Egg' | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isNew: boolean;
  sortOrder: number;
  dietaryPreferences: string[];
  variations: ProductVariationDto[];
}

export interface ProductVariationDto {
  id: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface CategoryDto {
  id: string;
  businessId: string;
  name: string;
  imageUrl: string | null;
  priority: number;
  isActive: boolean;
  parentCategoryId: string | null;
}

/** Product shape returned inside GET /api/businesses/{slug}/menu response. */
export interface BusinessMenuProductDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  isAvailable: boolean;
  isPureVeg: boolean;
  isActive: boolean;
  displayOrder: number;
  categoryId: string;
  foodType: 'Veg' | 'NonVeg' | 'Egg' | null;
  imageUrl: string | null;
  prepTimeMinutes: number;
  variations: ProductVariationDto[];
}

/** Top-level shape of GET /api/businesses/{slug}/menu response. */
export interface BusinessMenuResponseDto {
  businessSlug: string;
  menuMode: string;
  products: BusinessMenuProductDto[];
}
