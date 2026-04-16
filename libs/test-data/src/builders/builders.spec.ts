import { describe, it, expect } from 'vitest';
import { CatalogBuilders } from './catalog.builders';
import { OrderBuilders } from './order.builders';
import { CartBuilders } from './cart.builders';
import { ProductDtoFactory } from '../factories/product-dto.factory';
import { OrderDtoFactory } from '../factories/order-dto.factory';

describe('CatalogBuilders', () => {
  it('paneerButterMasala() has imageUrl, no "image" or "imageURL"', () => {
    const product = CatalogBuilders.paneerButterMasala();
    expect(product.imageUrl).toBeDefined();
    expect(product).not.toHaveProperty('image');
    expect(product).not.toHaveProperty('imageURL');
  });

  it('paneerButterMasala() is enabled for online orders', () => {
    const product = CatalogBuilders.paneerButterMasala();
    expect(product.isEnabledForOnlineOrders).toBe(true);
  });

  it('unavailableItem() is NOT enabled for online orders', () => {
    const product = CatalogBuilders.unavailableItem();
    expect(product.isEnabledForOnlineOrders).toBe(false);
  });
});

describe('OrderBuilders', () => {
  it('placedOrder() has status = "pending"', () => {
    const order = OrderBuilders.placedOrder();
    expect(order.status).toBe('pending');
  });

  it('deliveredOrder() has status = "delivered"', () => {
    const order = OrderBuilders.deliveredOrder();
    expect(order.status).toBe('delivered');
  });

  it('cancelledOrder() has status = "cancelled"', () => {
    const order = OrderBuilders.cancelledOrder();
    expect(order.status).toBe('cancelled');
  });

  it('placedOrder() statusTimeline has at least one entry', () => {
    const order = OrderBuilders.placedOrder();
    expect(order.statusTimeline).toBeDefined();
    expect(order.statusTimeline!.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CartBuilders', () => {
  it('singleItemCart() has items.length = 1', () => {
    const cart = CartBuilders.singleItemCart();
    expect(cart.items.length).toBe(1);
  });

  it('emptyCart() has items.length = 0', () => {
    const cart = CartBuilders.emptyCart();
    expect(cart.items.length).toBe(0);
  });

  it('multiItemCart() has totalItems = 3 (paneer×2 + dal×1)', () => {
    const cart = CartBuilders.multiItemCart();
    expect(cart.totalItems).toBe(3);
  });
});

describe('ProductDtoFactory', () => {
  it('build() has imageUrl, isAvailable, id (all required DTO fields)', () => {
    const dto = ProductDtoFactory.build();
    expect(dto).toHaveProperty('imageUrl');
    expect(dto).toHaveProperty('isAvailable');
    expect(dto).toHaveProperty('id');
  });

  it('build() does NOT have imageURL (old field name)', () => {
    const dto = ProductDtoFactory.build();
    expect(dto).not.toHaveProperty('imageURL');
  });

  it('build(overrides) merges overrides correctly', () => {
    const dto = ProductDtoFactory.build({ name: 'Test Override', basePrice: 999 });
    expect(dto.name).toBe('Test Override');
    expect(dto.basePrice).toBe(999);
    expect(dto.id).toBe('prod-001'); // defaults preserved
  });
});

describe('OrderDtoFactory', () => {
  it('build() charges object is flat (packagingCharge is a number, not nested)', () => {
    const dto = OrderDtoFactory.build();
    expect(typeof dto.charges.packagingCharge).toBe('number');
    expect(typeof dto.charges.platformFee).toBe('number');
    expect(typeof dto.charges.gst).toBe('number');
    expect(typeof dto.charges.total).toBe('number');
  });

  it('buildDelivered() has status = "delivered" and isPaid = true', () => {
    const dto = OrderDtoFactory.buildDelivered();
    expect(dto.status).toBe('delivered');
    expect(dto.isPaid).toBe(true);
  });

  it('buildCancelled() has status = "cancelled"', () => {
    const dto = OrderDtoFactory.buildCancelled();
    expect(dto.status).toBe('cancelled');
  });
});
