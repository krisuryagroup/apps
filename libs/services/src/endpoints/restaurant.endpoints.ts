/**
 * Every backend API path used exclusively by zitro-restaurant (Business
 * Portal), grouped by domain. Functions return the path only (no host) —
 * callers prepend `ZITRO_API_BASE_URL`. Keep in sync with the actual routes
 * exposed by zitro-api's BusinessPortalController; do not invent a path here
 * that isn't in zitro-api/ZITRO-API.postman_collection.json.
 */
export const RestaurantEndpoints = {
  auth: {
    login: () => `/api/business-auth/login`,
  },

  applications: {
    submit: () => `/api/business-applications`,
    validateInvite: (token: string) => `/api/business-invite/${token}`,
    acceptInvite: (token: string) => `/api/business-invite/${token}/accept`,
  },

  dashboard: {
    get: (businessId: string) => `/api/business-portal/${businessId}/dashboard`,
  },

  orders: {
    list: (businessId: string) => `/api/business-portal/${businessId}/orders`,
    byId: (businessId: string, orderId: string) =>
      `/api/business-portal/${businessId}/orders/${orderId}`,
    updateStatus: (businessId: string, orderId: string) =>
      `/api/business-portal/${businessId}/orders/${orderId}/status`,
  },

  categories: {
    list: (businessId: string) =>
      `/api/business-portal/${businessId}/categories`,
    byId: (businessId: string, categoryId: string) =>
      `/api/business-portal/${businessId}/categories/${categoryId}`,
  },

  products: {
    list: (businessId: string) => `/api/business-portal/${businessId}/products`,
    byId: (businessId: string, productId: string) =>
      `/api/business-portal/${businessId}/products/${productId}`,
    bulk: (businessId: string) =>
      `/api/business-portal/${businessId}/products/bulk`,
    media: (businessId: string) =>
      `/api/business-portal/${businessId}/products/media`,
    bulkPriceAdjust: (businessId: string) =>
      `/api/business-portal/${businessId}/products/bulk-price-adjust`,
  },

  sharedBrandMenu: {
    brandMasterProducts: (businessId: string) =>
      `/api/business-portal/${businessId}/brand-master-products`,
    branchOverrides: (businessId: string) =>
      `/api/business-portal/${businessId}/branch-overrides`,
    branchOverrideById: (businessId: string, productId: string) =>
      `/api/business-portal/${businessId}/branch-overrides/${productId}`,
    branchOverridesBulkPriceAdjust: (businessId: string) =>
      `/api/business-portal/${businessId}/branch-overrides/bulk-price-adjust`,
  },

  menuImport: {
    parse: (businessId: string) =>
      `/api/business-portal/${businessId}/menu-import/parse`,
    commit: (businessId: string) =>
      `/api/business-portal/${businessId}/menu-import/commit`,
  },

  profile: {
    get: (businessId: string) => `/api/business-portal/${businessId}`,
  },

  staff: {
    list: (businessId: string) => `/api/business-portal/${businessId}/users`,
    byId: (businessId: string, userId: string) =>
      `/api/business-portal/${businessId}/users/${userId}`,
  },

  inventory: {
    list: (businessId: string) =>
      `/api/business-portal/${businessId}/inventory`,
    adjust: (businessId: string) =>
      `/api/business-portal/${businessId}/inventory/adjust`,
    alerts: (businessId: string) =>
      `/api/business-portal/${businessId}/inventory/alerts`,
  },

  deliveryZones: {
    list: (businessId: string) =>
      `/api/business-portal/${businessId}/delivery-zones`,
    byId: (businessId: string, zoneId: string) =>
      `/api/business-portal/${businessId}/delivery-zones/${zoneId}`,
  },

  ratings: {
    list: (businessId: string) => `/api/business-portal/${businessId}/ratings`,
    reply: (businessId: string, ratingId: string) =>
      `/api/business-portal/${businessId}/ratings/${ratingId}/reply`,
  },

  payouts: {
    list: (businessId: string) => `/api/business-portal/${businessId}/payouts`,
    orders: (businessId: string, payoutId: string) =>
      `/api/business-portal/${businessId}/payouts/${payoutId}/orders`,
  },
};
