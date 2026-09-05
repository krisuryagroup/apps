/**
 * Backend API paths used by a service that is consumed across more than one
 * of the customer / restaurant / admin-superadmin groups above. Currently
 * just RemoteSettingsApiService: read by zitro-superadmin's remote-settings
 * page directly, and by AppSettingsService (used via zitro-customer's
 * app-settings initializer). Functions return the path only (no host) —
 * callers prepend `ZITRO_API_BASE_URL`.
 */
export const SharedEndpoints = {
  remoteSettings: {
    get: () => `/api/app-config/remote-settings`,
    forceLogout: () => `/api/admin/remote-settings/force-logout`,
    cacheClear: () => `/api/admin/remote-settings/cache-clear`,
  },
};
