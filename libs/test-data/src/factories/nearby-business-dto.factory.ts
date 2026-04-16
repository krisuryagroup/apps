import type { NearbyBusiness } from '@zitro/models';

// NearbyBusiness is returned directly as a model shape (no separate DTO in mappers for nearby)
const BASE: NearbyBusiness = {
  id: 'biz-001',
  slug: 'hunger_point',
  name: 'The Hunger Point',
  businessType: 'restaurant',
  rating: 4.3,
  deliveryTimeDisplay: '25-35 min',
  deliveryFee: 30,
  minOrderAmount: 150,
  isActive: true,
  isFeatured: true,
  distanceMetres: 850,
  tags: ['north-indian', 'chinese', 'fast-food'],
  imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/businesses/hunger_point.jpg',
};

export const NearbyBusinessDtoFactory = {
  build: (overrides: Partial<NearbyBusiness> = {}): NearbyBusiness => ({
    ...BASE,
    ...overrides,
  }),

  buildList: (count: number, overrides: Partial<NearbyBusiness> = {}): NearbyBusiness[] =>
    Array.from({ length: count }, (_, i) =>
      NearbyBusinessDtoFactory.build({ id: `biz-${String(i + 1).padStart(3, '0')}`, ...overrides })
    ),
};
