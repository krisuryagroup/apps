import type { ProductDto } from '@zitro/mappers';

const BASE: ProductDto = {
  id: 'prod-001',
  businessId: 'hunger_point',
  categoryId: 'cat-mains',
  name: 'Paneer Butter Masala',
  description: 'Rich creamy tomato-based curry with fresh cottage cheese',
  basePrice: 180,
  imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/pbm.jpg',
  foodType: 'Veg',
  isAvailable: true,
  isFeatured: true,
  isNew: false,
  sortOrder: 1,
  dietaryPreferences: ['Jain'],
  variations: [],
};

export const ProductDtoFactory = {
  build: (overrides: Partial<ProductDto> = {}): ProductDto => ({
    ...BASE,
    ...overrides,
  }),

  buildList: (count: number, overrides: Partial<ProductDto> = {}): ProductDto[] =>
    Array.from({ length: count }, (_, i) =>
      ProductDtoFactory.build({ id: `prod-${String(i + 1).padStart(3, '0')}`, ...overrides })
    ),
};
