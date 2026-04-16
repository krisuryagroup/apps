import type { OrderDto, OrderItemDto, OrderChargesDto } from '@zitro/mappers';
import { AddressDtoFactory } from './address-dto.factory';

const BASE_ITEM: OrderItemDto = {
  id: 'oi-001',
  productId: 'prod-001',
  productName: 'Paneer Butter Masala',
  basePrice: 180,
  quantity: 1,
  variationId: null,
  variationName: null,
  priceModifier: 0,
  effectivePrice: 180,
  specialInstructions: null,
  imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/pbm.jpg',
};

const BASE_CHARGES: OrderChargesDto = {
  subtotal: 180,
  deliveryCharge: 30,
  packagingCharge: 10,
  platformFee: 5,
  gst: 18,
  couponDiscount: 0,
  total: 243,
};

const BASE: OrderDto = {
  id: 'ord-001',
  displayId: 'HP-2024-0001',
  userId: 'usr-001',
  businessId: 'hunger_point',
  businessName: 'The Hunger Point',
  orderType: 'delivery',
  status: 'pending',
  items: [BASE_ITEM],
  charges: BASE_CHARGES,
  paymentMethod: 'cash',
  isPaid: false,
  deliveryAddress: AddressDtoFactory.build(),
  tableNumber: null,
  numberOfGuests: null,
  appliedCouponCode: null,
  customerNotes: null,
  statusTimeline: [
    { status: 'pending', timestamp: '2024-04-15T12:00:00Z', note: null },
  ],
  estimatedDeliveryMinutes: 30,
  createdAt: '2024-04-15T12:00:00Z',
  updatedAt: '2024-04-15T12:00:00Z',
};

export const OrderDtoFactory = {
  build: (overrides: Partial<OrderDto> = {}): OrderDto => ({
    ...BASE,
    ...overrides,
  }),

  buildDelivered: (overrides: Partial<OrderDto> = {}): OrderDto =>
    OrderDtoFactory.build({
      id: 'ord-002',
      displayId: 'HP-2024-0002',
      status: 'delivered',
      isPaid: true,
      estimatedDeliveryMinutes: 0,
      appliedCouponCode: 'SAVE50',
      charges: { ...BASE_CHARGES, couponDiscount: 50, total: 193 },
      statusTimeline: [
        { status: 'pending', timestamp: '2024-04-10T18:30:00Z', note: null },
        { status: 'confirmed', timestamp: '2024-04-10T18:32:00Z', note: null },
        { status: 'preparing', timestamp: '2024-04-10T18:40:00Z', note: null },
        { status: 'shipped', timestamp: '2024-04-10T19:00:00Z', note: null },
        { status: 'delivered', timestamp: '2024-04-10T19:25:00Z', note: null },
      ],
      ...overrides,
    }),

  buildCancelled: (overrides: Partial<OrderDto> = {}): OrderDto =>
    OrderDtoFactory.build({
      id: 'ord-003',
      displayId: 'EFC-2024-0003',
      businessId: 'efc-pizza',
      businessName: 'EFC Pizza',
      orderType: 'takeout',
      status: 'cancelled',
      deliveryAddress: null,
      ...overrides,
    }),
};
