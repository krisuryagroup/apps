import { http, HttpResponse } from 'msw';
import { ProductDtoFactory } from '../factories/product-dto.factory';
import { OrderDtoFactory } from '../factories/order-dto.factory';
import { AddressDtoFactory } from '../factories/address-dto.factory';
import { UserDtoFactory } from '../factories/user-dto.factory';
import { CouponDtoFactory } from '../factories/coupon-dto.factory';
import { NearbyBusinessDtoFactory } from '../factories/nearby-business-dto.factory';

const BASE_URL = 'http://localhost:8080';

export const handlers = [
  // GET /api/businesses/nearby
  http.get(`${BASE_URL}/api/businesses/nearby`, () => {
    return HttpResponse.json(
      NearbyBusinessDtoFactory.buildList(3)
    );
  }),

  // GET /api/businesses/:slug/products
  http.get(`${BASE_URL}/api/businesses/:slug/products`, ({ params }) => {
    const products = [
      ProductDtoFactory.build({ businessId: params['slug'] as string }),
      ProductDtoFactory.build({
        id: 'prod-002',
        businessId: params['slug'] as string,
        name: 'Dal Makhani',
        basePrice: 150,
        imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/dal_makhani.jpg',
        isFeatured: false,
      }),
    ];
    return HttpResponse.json(products);
  }),

  // GET /api/businesses/:slug/categories
  http.get(`${BASE_URL}/api/businesses/:slug/categories`, ({ params }) => {
    const slug = params['slug'] as string;
    return HttpResponse.json([
      {
        id: 'cat-mains',
        businessId: slug,
        name: 'Main Course',
        imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/categories/mains.jpg',
        priority: 1,
        isActive: true,
        parentCategoryId: null,
      },
      {
        id: 'cat-starters',
        businessId: slug,
        name: 'Starters',
        imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/categories/starters.jpg',
        priority: 2,
        isActive: true,
        parentCategoryId: null,
      },
    ]);
  }),

  // GET /api/businesses/:slug/coupons
  http.get(`${BASE_URL}/api/businesses/:slug/coupons`, () => {
    return HttpResponse.json([
      CouponDtoFactory.build(),
      CouponDtoFactory.buildPercentage(),
    ]);
  }),

  // POST /api/orders
  http.post(`${BASE_URL}/api/orders`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (!body || !Array.isArray(body['items']) || (body['items'] as unknown[]).length === 0) {
      return HttpResponse.json(
        { error: 'Order must contain at least one item', code: 'INVALID_ORDER' },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      OrderDtoFactory.build({ id: `ord-${Date.now()}` }),
      { status: 201 }
    );
  }),

  // GET /api/orders (order history)
  http.get(`${BASE_URL}/api/orders`, () => {
    return HttpResponse.json([
      OrderDtoFactory.buildDelivered(),
      OrderDtoFactory.build(),
    ]);
  }),

  // GET /api/orders/:id
  http.get(`${BASE_URL}/api/orders/:id`, ({ params }) => {
    const id = params['id'] as string;

    if (id === 'ord-001') {
      return HttpResponse.json(OrderDtoFactory.build());
    }
    if (id === 'ord-002') {
      return HttpResponse.json(OrderDtoFactory.buildDelivered());
    }

    return HttpResponse.json(
      { error: 'Order not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }),

  // GET /api/users/me
  http.get(`${BASE_URL}/api/users/me`, () => {
    return HttpResponse.json(UserDtoFactory.build());
  }),

  // GET /api/users/addresses
  http.get(`${BASE_URL}/api/users/addresses`, () => {
    return HttpResponse.json([
      AddressDtoFactory.build(),
      AddressDtoFactory.buildOffice(),
    ]);
  }),

  // POST /api/users/addresses
  http.post(`${BASE_URL}/api/users/addresses`, async ({ request }) => {
    const body = await request.json() as Partial<typeof AddressDtoFactory.build>;
    return HttpResponse.json(
      AddressDtoFactory.build({ id: `addr-${Date.now()}`, ...(body as object) }),
      { status: 201 }
    );
  }),

  // GET /api/config
  http.get(`${BASE_URL}/api/config`, () => {
    return HttpResponse.json({
      featureFlags: {
        wallet_payments: false,
        delivery_tracking: true,
        ratings_reviews: false,
        scheduled_pickup: false,
        dine_in: true,
        grocery_mode: false,
        game_tab: true,
      },
      apiVersion: '1.0.0',
      maintenanceMode: false,
    });
  }),
];
