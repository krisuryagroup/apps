import { describe, it, expect } from 'vitest';
import { OrderMapper } from './order.mapper';
import type { OrderDto, OrderChargesDto } from '../dtos/order.dto';
import type { CartItem } from '@zitro/models';

const baseChargesDto: OrderChargesDto = {
  subtotal: 400,
  deliveryCharge: 40,
  packagingCharge: 10,
  platformFee: 5,
  gst: 20,
  couponDiscount: 0,
  total: 475,
};

const baseOrderDto: OrderDto = {
  id: 'order-uuid',
  displayId: 'ZTR-001',
  userId: 'user-uuid',
  businessId: 'biz-uuid',
  businessName: 'EFC Pizza',
  orderType: 'delivery',
  status: 'pending',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Pizza',
      basePrice: 199,
      quantity: 2,
      variationId: null,
      variationName: null,
      priceModifier: 0,
      effectivePrice: 199,
      specialInstructions: null,
      imageUrl: null,
    },
  ],
  charges: baseChargesDto,
  paymentMethod: 'cash',
  isPaid: false,
  deliveryAddress: {
    id: 'addr-1',
    name: 'Home',
    phone: '9876543210',
    houseAndStreet: '12 MG Road',
    landmark: 'Near Park',
    pincode: '209722',
    town: 'Etawah',
    state: 'UP',
    type: 'Home',
    isDefault: true,
  },
  tableNumber: null,
  numberOfGuests: null,
  appliedCouponCode: null,
  customerNotes: null,
  statusTimeline: [
    { status: 'pending', timestamp: '2024-01-01T10:00:00Z', note: null },
  ],
  estimatedDeliveryMinutes: 30,
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:05:00Z',
};

describe('OrderMapper.toOrder', () => {
  it('maps id and displayId → id and orderId', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.id).toBe('order-uuid');
    expect(order.orderId).toBe('ZTR-001');
  });

  it('maps businessId → restaurantId', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.restaurantId).toBe('biz-uuid');
  });

  it('maps charges.subtotal → subtotal', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.subtotal).toBe(400);
  });

  it('maps charges.total → total', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.total).toBe(475);
  });

  it('parses ISO string dates to Date objects', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.createdAt).toBeInstanceOf(Date);
    expect(order.updatedAt).toBeInstanceOf(Date);
  });

  it('maps null deliveryAddress fields to undefined', () => {
    const order = OrderMapper.toOrder({ ...baseOrderDto, deliveryAddress: null });
    expect(order.deliveryAddress).toBeUndefined();
  });

  it('maps deliveryAddress houseAndStreet → street, town → city', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.deliveryAddress?.street).toBe('12 MG Road');
    expect(order.deliveryAddress?.city).toBe('Etawah');
  });

  it('maps zero couponDiscount to undefined', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.couponDiscount).toBeUndefined();
  });

  it('maps non-zero couponDiscount', () => {
    const order = OrderMapper.toOrder({
      ...baseOrderDto,
      charges: { ...baseChargesDto, couponDiscount: 50 },
    });
    expect(order.couponDiscount).toBe(50);
  });

  it('maps statusTimeline events', () => {
    const order = OrderMapper.toOrder(baseOrderDto);
    expect(order.statusTimeline).toHaveLength(1);
    expect(order.statusTimeline?.[0].status).toBe('pending');
    expect(order.statusTimeline?.[0].timestamp).toBeInstanceOf(Date);
  });
});

describe('OrderMapper.toCharges', () => {
  it('maps flat DTO to OrderCharges', () => {
    const charges = OrderMapper.toCharges(baseChargesDto);
    expect(charges.packagingCharge).toBe(10);
    expect(charges.platformFee).toBe(5);
    expect(charges.gst).toBe(20);
    expect(charges.deliveryCharge).toBe(40);
  });

  it('returns undefined for deliveryCharge=0', () => {
    const charges = OrderMapper.toCharges({ ...baseChargesDto, deliveryCharge: 0 });
    expect(charges.deliveryCharge).toBeUndefined();
  });
});

describe('OrderMapper.fromCart', () => {
  const cartItem: CartItem = {
    id: 'prod-1',
    name: 'Pizza',
    price: 199,
    qty: 2,
    isEnabledForOnlineOrders: true,
    selectedVariationId: 'var-sm',
  };

  it('produces a valid CreateOrderRequest', () => {
    const req = OrderMapper.fromCart(
      { items: [cartItem], businessId: 'biz-1' },
      {
        orderType: 'delivery',
        paymentMethod: 'cash',
        deliveryAddressId: 'addr-1',
        tableNumber: null,
        numberOfGuests: null,
        couponCode: null,
        customerNotes: null,
      }
    );
    expect(req.businessId).toBe('biz-1');
    expect(req.orderType).toBe('delivery');
    expect(req.items).toHaveLength(1);
    expect(req.items[0].productId).toBe('prod-1');
    expect(req.items[0].quantity).toBe(2);
    expect(req.items[0].variationId).toBe('var-sm');
  });

  it('sets variationId to null when no variation selected', () => {
    const item: CartItem = { ...cartItem, selectedVariationId: undefined };
    const req = OrderMapper.fromCart(
      { items: [item], businessId: 'b' },
      {
        orderType: 'takeout',
        paymentMethod: 'online',
        deliveryAddressId: null,
        tableNumber: null,
        numberOfGuests: null,
        couponCode: null,
        customerNotes: null,
      }
    );
    expect(req.items[0].variationId).toBeNull();
  });
});
