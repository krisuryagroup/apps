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
