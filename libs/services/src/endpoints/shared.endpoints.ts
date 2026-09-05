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

  // Phone OTP — used by zitro-customer (FirebaseAuthService, phone sign-in) and by
  // zitro-restaurant (self-apply flow's identity-verification step before any
  // business/owner details are saved).
  auth: {
    otpRequest: () => `/api/auth/otp/request`,
    otpVerify: () => `/api/auth/otp/verify`,
  },
};
