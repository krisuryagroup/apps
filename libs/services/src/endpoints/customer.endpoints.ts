/**
 * Every backend API path used exclusively by zitro-customer, grouped by the
 * domain service that calls it. Functions return the path only (no host) —
 * callers prepend `ZITRO_API_BASE_URL`. Keep in sync with the actual routes
 * exposed by zitro-api; do not invent a path here that isn't in
 * zitro-api/ZITRO-API.postman_collection.json.
 */
export const CustomerEndpoints = {
  catalog: {
    products: (businessSlug: string) =>
      `/api/businesses/${businessSlug}/products`,
    categories: () => `/api/categories`,
    menu: (businessSlug: string) => `/api/businesses/${businessSlug}/menu`,
    searchProducts: () => `/api/products/search`,
  },

  business: {
    detail: (businessSlug: string) => `/api/businesses/${businessSlug}`,
    config: (businessSlug: string) => `/api/businesses/${businessSlug}/config`,
    banners: (businessSlug: string) =>
      `/api/businesses/${businessSlug}/banners`,
  },

  app: {
    version: () => `/api/app/version`,
    config: () => `/api/app-config`,
  },

  cart: {
    get: () => `/api/cart`,
    addItem: () => `/api/cart/items`,
    updateItem: (cartItemId: string) => `/api/cart/items/${cartItemId}`,
    coupon: () => `/api/cart/coupon`,
    checkout: () => `/api/cart/checkout`,
  },

  orders: {
    create: () => `/api/orders`,
    list: () => `/api/orders`,
    byId: (orderId: string) => `/api/orders/${orderId}`,
    invoice: (orderId: string) => `/api/orders/${orderId}/invoice`,
    cancel: (orderId: string) => `/api/orders/${orderId}/cancel`,
  },

  coupons: {
    list: (businessSlug: string) => `/api/businesses/${businessSlug}/coupons`,
  },

  banners: {
    global: () => `/api/banners`,
    forBusiness: (businessSlug: string) =>
      `/api/businesses/${businessSlug}/banners`,
    impression: (businessSlug: string, bannerId: string) =>
      `/api/businesses/${businessSlug}/banners/${bannerId}/impression`,
    click: (businessSlug: string, bannerId: string) =>
      `/api/businesses/${businessSlug}/banners/${bannerId}/click`,
  },

  user: {
    me: () => `/api/users/me`,
  },

  addresses: {
    list: () => `/api/users/me/addresses`,
    byId: (id: string) => `/api/users/me/addresses/${id}`,
  },

  nearbyBusinesses: {
    search: () => `/api/businesses/nearby`,
  },

  society: {
    nearby: () => `/api/societies/nearby`,
    towers: (societyId: string) => `/api/societies/${societyId}/towers`,
  },

  game: {
    submitScore: () => `/api/game/score`,
  },

  tags: {
    list: () => `/api/tags`,
  },

  auth: {
    verify: () => `/api/auth/verify`,
  },
};
