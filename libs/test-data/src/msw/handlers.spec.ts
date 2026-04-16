import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE = 'http://0.0.0.0:8080';

describe('GET /api/businesses/nearby', () => {
  it('returns 200 with at least 1 NearbyBusiness', async () => {
    const res = await fetch(`${BASE}/api/businesses/nearby`);
    const body = await res.json() as unknown[];
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/businesses/:slug/products', () => {
  it('returns 200 with ProductDto[] where first item has imageUrl (not imageURL)', async () => {
    const res = await fetch(`${BASE}/api/businesses/hunger_point/products`);
    const body = await res.json() as Record<string, unknown>[];
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('imageUrl');
    expect(body[0]).not.toHaveProperty('imageURL');
  });
});

describe('GET /api/businesses/:slug/categories', () => {
  it('returns 200 with CategoryDto[]', async () => {
    const res = await fetch(`${BASE}/api/businesses/hunger_point/categories`);
    const body = await res.json() as Record<string, unknown>[];
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('name');
    expect(body[0]).toHaveProperty('businessId');
  });
});

describe('POST /api/orders', () => {
  it('valid body → 201 with OrderDto having id and status=pending', async () => {
    const res = await fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: 'hunger_point',
        orderType: 'delivery',
        paymentMethod: 'cash',
        items: [{ productId: 'prod-001', quantity: 1, basePrice: 180 }],
        deliveryAddressId: 'addr-001',
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(201);
    expect(body).toHaveProperty('id');
    expect(body['status']).toBe('pending');
  });

  it('missing items → 400', async () => {
    const res = await fetch(`${BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: 'hunger_point', items: [] }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders', () => {
  it('returns 200 with OrderDto[]', async () => {
    const res = await fetch(`${BASE}/api/orders`);
    const body = await res.json() as unknown[];
    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/orders/:id', () => {
  it('known id → 200 with single OrderDto', async () => {
    const res = await fetch(`${BASE}/api/orders/ord-001`);
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body['id']).toBe('ord-001');
  });

  it('unknown id → 404', async () => {
    const res = await fetch(`${BASE}/api/orders/unknown-id`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/users/addresses', () => {
  it('returns 201 with AddressDto with generated id', async () => {
    const res = await fetch(`${BASE}/api/users/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ananya Joshi',
        phone: '9654321087',
        houseAndStreet: '5, Ram Nagar',
        landmark: '',
        pincode: '206244',
        town: 'Etawah',
        state: 'Uttar Pradesh',
        type: 'Home',
        isDefault: false,
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(201);
    expect(body).toHaveProperty('id');
  });
});

describe('GET /api/config', () => {
  it('returns 200 with featureFlags map and apiVersion string', async () => {
    const res = await fetch(`${BASE}/api/config`);
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('featureFlags');
    expect(typeof body['apiVersion']).toBe('string');
  });
});
