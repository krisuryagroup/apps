// Maps .NET API response DTOs → @zitro/models interfaces.
// Field name differences between DTO and legacy model are resolved here.
import type { Product, ProductVariation, Category } from '@zitro/models';
import type { ProductDto, ProductVariationDto, CategoryDto, BusinessMenuProductDto, BusinessMenuResponseDto } from '../dtos/catalog.dto';

export const CatalogMapper = {
  /**
   * Maps a ProductDto from GET /api/businesses/{slug}/menu → Product model.
   * Key name changes:
   *   DTO.basePrice       → model.price
   *   DTO.isAvailable     → model.isEnabledForOnlineOrders
   *   DTO.categoryId      → model.category
   *   DTO.sortOrder       → model.priority
   *   DTO.isFeatured      → model.isRecommended
   */
  toProduct(dto: ProductDto): Product {
    return {
      id: dto.id,
      name: dto.name,
      price: dto.basePrice,
      imageUrl: dto.imageUrl ?? undefined,
      description: dto.description ?? undefined,
      category: dto.categoryId,
      isEnabledForOnlineOrders: dto.isAvailable,
      isNew: dto.isNew || undefined,
      isRecommended: dto.isFeatured || undefined,
      priority: dto.sortOrder,
      dietaryPreferences: dto.dietaryPreferences ?? [],
      hasVariations: dto.variations.length > 0,
      variations: dto.variations.map(CatalogMapper.toVariation),
    };
  },

  /**
   * Maps a ProductVariationDto → ProductVariation model.
   * Key name changes:
   *   DTO.name            → model.label
   *   DTO.priceModifier   → model.price  (absolute delta from base; resolved at call site)
   *   DTO.isAvailable     → model.isEnabled
   *   DTO.sortOrder       → model.displayOrder
   */
  toVariation(dto: ProductVariationDto): ProductVariation {
    return {
      id: dto.id,
      label: dto.name,
      price: dto.priceModifier,
      isDefault: dto.isDefault,
      isEnabled: dto.isAvailable,
      displayOrder: dto.sortOrder,
    };
  },

  /** Maps a CategoryDto → Category model. Currently 1:1. */
  toCategory(dto: CategoryDto): Category {
    return {
      id: dto.id,
      name: dto.name,
      imageUrl: dto.imageUrl ?? undefined,
      displayOrder: dto.priority,
      isActive: dto.isActive,
    };
  },

  toProductList(dtos: ProductDto[]): Product[] {
    return dtos.map(CatalogMapper.toProduct);
  },

  toCategoryList(dtos: CategoryDto[]): Category[] {
    return dtos.map(CatalogMapper.toCategory);
  },

  /**
   * Maps a BusinessMenuProductDto from GET /api/businesses/{slug}/menu → Product model.
   * Key differences from ProductDto:
   *   DTO.price           → model.price   (was basePrice)
   *   DTO.displayOrder    → model.priority (was sortOrder)
   */
  toBusinessMenuProduct(dto: BusinessMenuProductDto): Product {
    return {
      id: dto.id,
      name: dto.name,
      price: dto.price,
      imageUrl: dto.imageUrl ?? undefined,
      description: dto.description ?? undefined,
      category: dto.categoryId,
      isEnabledForOnlineOrders: dto.isAvailable,
      hasVariations: dto.variations.length > 0,
      variations: dto.variations.map(CatalogMapper.toVariation),
      foodType: dto.foodType ?? null,
    };
  },

  toBusinessMenuProductList(dtos: BusinessMenuProductDto[]): Product[] {
    return dtos.map(CatalogMapper.toBusinessMenuProduct);
  },

  /**
   * Extracts both products and unique categories from a BusinessMenuResponseDto.
   * Categories are derived from the nested `category` object on each product,
   * deduplicated by id, and sorted by priority.
   */
  toBusinessMenuProductsAndCategories(dto: BusinessMenuResponseDto): { products: Product[]; categories: Category[] } {
    const categoryMap = new Map<string, { category: Category; priority: number }>();

    const products = dto.products.map(productDto => {
      const cat = productDto.category;
      if (cat && !categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, {
          priority: cat.priority,
          category: {
            id: cat.id,
            name: cat.name,
            imageUrl: cat.imageUrl ?? undefined,
            displayOrder: cat.priority,
            isActive: cat.status,
          },
        });
      }
      return CatalogMapper.toBusinessMenuProduct(productDto);
    });

    const categories = Array.from(categoryMap.values())
      .sort((a, b) => a.priority - b.priority)
      .map(e => e.category);

    return { products, categories };
  },
};
