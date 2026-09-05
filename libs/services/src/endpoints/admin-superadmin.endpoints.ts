/**
 * Every backend API path used by AdminApiService — shared as-is by both
 * zitro-admin and zitro-superadmin, since they run on the same backend Admin
 * JWT scheme and the same service class. Kept in one file rather than split
 * per app because the underlying service itself is shared. Functions return
 * the path only (no host) — callers prepend `ZITRO_API_BASE_URL`.
 */
export const AdminSuperadminEndpoints = {
  auth: {
    login: () => `/api/admin/auth/login`,
  },

  appConfig: {
    bundle: () => `/api/app-config/bundle`,
    supportedLanguages: () => `/api/app-config/supported-languages`,
    translations: () => `/api/translations`,
  },

  translationsAdmin: {
    list: () => `/api/admin/translations`,
    byKey: (key: string) =>
      `/api/admin/translations/${encodeURIComponent(key)}`,
  },

  featureFlagsAdmin: {
    byApp: (appSlug: string) => `/api/admin/app-feature-flags/${appSlug}`,
  },

  themesAdmin: {
    list: () => `/api/admin/themes`,
    byId: (id: string) => `/api/admin/themes/${id}`,
  },

  uiConfigAdmin: {
    byApp: (app: string) => `/api/admin/ui-config/${app}`,
  },

  dashboard: {
    get: () => `/api/admin/dashboard`,
  },

  businesses: {
    list: () => `/api/businesses`,
    byId: (id: string) => `/api/businesses/${id}`,
    approve: (id: string) => `/api/businesses/${id}/approve`,
    reactivate: (id: string) => `/api/businesses/${id}/reactivate`,
    invite: () => `/api/businesses/invite`,
    users: (businessId: string) => `/api/businesses/${businessId}/users`,
    userById: (businessId: string, userId: string) =>
      `/api/businesses/${businessId}/users/${userId}`,
    promoteToBrandMaster: (businessId: string) =>
      `/api/businesses/${businessId}/promote-to-brand-master`,
  },

  brands: {
    list: () => `/api/brands`,
    byId: (id: string) => `/api/brands/${id}`,
    branches: (brandId: string) => `/api/brands/${brandId}/branches`,
  },

  tagsAdmin: {
    list: () => `/api/admin/tags`,
    byId: (id: string) => `/api/admin/tags/${id}`,
    businesses: (tagId: string) => `/api/admin/tags/${tagId}/businesses`,
    businessTags: (businessId: string) =>
      `/api/admin/businesses/${businessId}/tags`,
    businessTagById: (businessId: string, tagId: string) =>
      `/api/admin/businesses/${businessId}/tags/${tagId}`,
  },

  products: {
    search: () => `/api/products/search`,
    byId: (id: string) => `/api/products/${id}`,
    createAdmin: () => `/api/admin/products`,
    updateAdmin: (id: string) => `/api/admin/products/${id}`,
    deleteAdmin: (id: string) => `/api/admin/products/${id}`,
    bulkPriceAdjust: () => `/api/admin/products/bulk-price-adjust`,
  },

  categoriesAdmin: {
    list: () => `/api/admin/categories`,
    byId: (id: string) => `/api/admin/categories/${id}`,
  },

  ordersAdmin: {
    list: () => `/api/admin/orders`,
  },

  customersAdmin: {
    list: () => `/api/admin/users`,
    status: (id: string) => `/api/admin/users/${id}/status`,
  },

  couponsAdmin: {
    list: () => `/api/admin/coupons`,
    byId: (id: string) => `/api/admin/coupons/${id}`,
  },

  deliveryPartnersAdmin: {
    list: () => `/api/admin/delivery/partners`,
    status: (id: string) => `/api/admin/delivery/partners/${id}/status`,
  },

  deliveryZonesAdmin: {
    list: () => `/api/admin/delivery/zones`,
  },

  payoutsAdmin: {
    list: () => `/api/admin/payouts`,
    generate: () => `/api/admin/payouts/generate`,
    markPaid: (id: string) => `/api/admin/payouts/${id}/mark-paid`,
  },

  bannersAdmin: {
    list: () => `/api/banners`,
    media: () => `/api/banners/media`,
    byId: (id: string) => `/api/banners/${id}`,
  },

  adminsSuperAdmin: {
    list: () => `/api/admin/admins`,
    byId: (id: string) => `/api/admin/admins/${id}`,
    statusAction: (id: string, action: 'activate' | 'deactivate') =>
      `/api/admin/admins/${id}/${action}`,
    resetPassword: (id: string) => `/api/admin/admins/${id}/reset-password`,
    me: () => `/api/admin/admins/me`,
    mePassword: () => `/api/admin/admins/me/password`,
  },
};
