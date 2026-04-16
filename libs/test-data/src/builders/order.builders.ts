import type { Order, OrderItem, OrderCharges } from '@zitro/models';
import { AddressBuilders } from './address.builders';

const baseCharges: OrderCharges = {
  packagingCharge: 10,
  platformFee: 5,
  gst: 18,
  deliveryCharge: 30,
  couponDiscount: 0,
};

const paneerItem: OrderItem = {
  id: 'oi-001',
  name: 'Paneer Butter Masala',
  price: 180,
  qty: 1,
  imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/pbm.jpg',
};

export const OrderBuilders = {
  placedOrder: (): Order => ({
    orderId: 'HP-2024-0001',
    id: 'ord-001',
    restaurantId: 'hunger_point',
    userId: 'usr-001',
    userPhone: '9876543210',
    userName: 'Aarav Sharma',
    orderType: 'delivery',
    status: 'pending',
    items: [paneerItem],
    subtotal: 180,
    deliveryCharge: 30,
    couponDiscount: 0,
    charges: baseCharges,
    paymentMethod: 'cash',
    deliveryAddress: AddressBuilders.homeEtawah(),
    createdAt: '2024-04-15T12:00:00Z',
    updatedAt: '2024-04-15T12:00:00Z',
    statusTimeline: [
      { status: 'pending', timestamp: new Date('2024-04-15T12:00:00Z') },
    ],
  }),

  deliveredOrder: (): Order => ({
    orderId: 'HP-2024-0002',
    id: 'ord-002',
    restaurantId: 'hunger_point',
    userId: 'usr-001',
    userPhone: '9876543210',
    userName: 'Aarav Sharma',
    orderType: 'delivery',
    status: 'delivered',
    items: [
      { id: 'oi-002', name: 'Butter Chicken', price: 220, qty: 2, imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/butter_chicken.jpg' },
    ],
    subtotal: 440,
    deliveryCharge: 30,
    couponDiscount: 50,
    couponCode: 'SAVE50',
    charges: { ...baseCharges, couponDiscount: 50 },
    paymentMethod: 'cash',
    deliveryAddress: AddressBuilders.homeEtawah(),
    createdAt: '2024-04-10T18:30:00Z',
    updatedAt: '2024-04-10T19:25:00Z',
    statusTimeline: [
      { status: 'pending', timestamp: new Date('2024-04-10T18:30:00Z') },
      { status: 'confirmed', timestamp: new Date('2024-04-10T18:32:00Z') },
      { status: 'preparing', timestamp: new Date('2024-04-10T18:40:00Z') },
      { status: 'shipped', timestamp: new Date('2024-04-10T19:00:00Z') },
      { status: 'delivered', timestamp: new Date('2024-04-10T19:25:00Z') },
    ],
  }),

  cancelledOrder: (): Order => ({
    orderId: 'EFC-2024-0003',
    id: 'ord-003',
    restaurantId: 'efc-pizza',
    userId: 'usr-002',
    userPhone: '8765432109',
    userName: 'Priya Singh',
    orderType: 'takeout',
    status: 'cancelled',
    items: [
      { id: 'oi-003', name: 'Margherita Pizza', price: 199, qty: 1 },
    ],
    subtotal: 199,
    deliveryCharge: 0,
    couponDiscount: 0,
    charges: { packagingCharge: 15, platformFee: 5, gst: 20 },
    paymentMethod: 'online',
    customerNotes: 'Please pack neatly',
    createdAt: '2024-04-12T13:00:00Z',
    updatedAt: '2024-04-12T13:05:00Z',
    statusTimeline: [
      { status: 'pending', timestamp: new Date('2024-04-12T13:00:00Z') },
      { status: 'cancelled', timestamp: new Date('2024-04-12T13:05:00Z'), note: 'Cancelled by customer' },
    ],
  }),

  dineInOrder: (): Order => ({
    orderId: 'HP-2024-0010',
    id: 'ord-010',
    restaurantId: 'hunger_point',
    userId: 'usr-001',
    userPhone: '9876543210',
    userName: 'Aarav Sharma',
    orderType: 'dine-in',
    tableNumber: 'T5',
    numberOfGuests: 3,
    status: 'confirmed',
    items: [paneerItem],
    subtotal: 180,
    deliveryCharge: 0,
    couponDiscount: 0,
    charges: { packagingCharge: 0, platformFee: 5, gst: 18 },
    paymentMethod: 'cash',
    createdAt: '2024-04-14T20:00:00Z',
    updatedAt: '2024-04-14T20:02:00Z',
    statusTimeline: [
      { status: 'pending', timestamp: new Date('2024-04-14T20:00:00Z') },
      { status: 'confirmed', timestamp: new Date('2024-04-14T20:02:00Z') },
    ],
  }),
};
