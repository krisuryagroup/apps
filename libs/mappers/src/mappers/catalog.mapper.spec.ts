import { describe, it, expect } from 'vitest';
import { CatalogMapper } from './catalog.mapper';
import type { ProductDto, ProductVariationDto, CategoryDto } from '../dtos/catalog.dto';

const baseVariationDto: ProductVariationDto = {
  id: 'v1',
  name: 'Large',
  priceModifier: 30,
  isDefault: true,
  isAvailable: true,
  sortOrder: 1,
};

const baseProductDto: ProductDto = {
  id: 'p1',
  businessId: 'b1',
  categoryId: 'c1',
  name: 'Margherita Pizza',
  description: 'Classic pizza',
  basePrice: 199,
  imageUrl: 'https://cdn.example.com/pizza.jpg',
  foodType: 'Veg',
  isAvailable: true,
  isFeatured: false,
  isNew: false,
  sortOrder: 5,
  dietaryPreferences: ['vegetarian'],
  variations: [baseVariationDto],
};

const baseCategoryDto: CategoryDto = {
  id: 'cat1',
  businessId: 'b1',
  name: 'Pizza',
  imageUrl: 'https://cdn.example.com/pizza-cat.jpg',
  priority: 1,
  isActive: true,
  parentCategoryId: null,
};

describe('CatalogMapper.toProduct', () => {
  it('maps basePrice → price', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.price).toBe(199);
  });

  it('maps isAvailable → isEnabledForOnlineOrders', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.isEnabledForOnlineOrders).toBe(true);
  });

  it('maps isAvailable=false → isEnabledForOnlineOrders=false', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, isAvailable: false });
    expect(product.isEnabledForOnlineOrders).toBe(false);
  });

  it('maps categoryId → category', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.category).toBe('c1');
  });

  it('maps sortOrder → priority', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.priority).toBe(5);
  });

  it('maps isFeatured → isRecommended', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, isFeatured: true });
    expect(product.isRecommended).toBe(true);
  });

  it('maps imageUrl from DTO', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.imageUrl).toBe('https://cdn.example.com/pizza.jpg');
  });

  it('handles null imageUrl', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, imageUrl: null });
    expect(product.imageUrl).toBeUndefined();
  });

  it('handles null description', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, description: null });
    expect(product.description).toBeUndefined();
  });

  it('maps empty variations array', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, variations: [] });
    expect(product.variations).toHaveLength(0);
    expect(product.hasVariations).toBe(false);
  });

  it('maps dietaryPreferences', () => {
    const product = CatalogMapper.toProduct(baseProductDto);
    expect(product.dietaryPreferences).toEqual(['vegetarian']);
  });

  it('defaults empty dietaryPreferences when null', () => {
    const product = CatalogMapper.toProduct({ ...baseProductDto, dietaryPreferences: [] });
    expect(product.dietaryPreferences).toEqual([]);
  });
});

describe('CatalogMapper.toVariation', () => {
  it('maps DTO name → model label', () => {
    const variation = CatalogMapper.toVariation(baseVariationDto);
    expect(variation.label).toBe('Large');
  });

  it('maps priceModifier → price', () => {
    const variation = CatalogMapper.toVariation(baseVariationDto);
    expect(variation.price).toBe(30);
  });

  it('maps isAvailable → isEnabled', () => {
    const variation = CatalogMapper.toVariation(baseVariationDto);
    expect(variation.isEnabled).toBe(true);
  });

  it('maps sortOrder → displayOrder', () => {
    const variation = CatalogMapper.toVariation(baseVariationDto);
    expect(variation.displayOrder).toBe(1);
  });

  it('maps isDefault', () => {
    const variation = CatalogMapper.toVariation(baseVariationDto);
    expect(variation.isDefault).toBe(true);
  });
});

describe('CatalogMapper.toProductList', () => {
  it('maps array of DTOs', () => {
    const products = CatalogMapper.toProductList([baseProductDto, baseProductDto]);
    expect(products).toHaveLength(2);
    expect(products[0].id).toBe('p1');
  });

  it('handles empty array', () => {
    expect(CatalogMapper.toProductList([])).toEqual([]);
  });
});

describe('CatalogMapper.toCategory', () => {
  it('maps category fields 1:1', () => {
    const cat = CatalogMapper.toCategory(baseCategoryDto);
    expect(cat.id).toBe('cat1');
    expect(cat.name).toBe('Pizza');
    expect(cat.isActive).toBe(true);
    expect(cat.displayOrder).toBe(1);
  });

  it('handles null imageUrl', () => {
    const cat = CatalogMapper.toCategory({ ...baseCategoryDto, imageUrl: null });
    expect(cat.imageUrl).toBeUndefined();
  });
});
