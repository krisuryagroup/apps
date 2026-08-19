import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  authInterceptor,
  adminJwtAuthInterceptor,
  adminJwtErrorInterceptor,
  businessIdInterceptor,
  businessJwtAuthInterceptor,
  businessJwtErrorInterceptor,
  errorInterceptor,
  retryInterceptor,
} from './interceptors';
import { ZITRO_API_BASE_URL, ZITRO_PUBLIC_ENDPOINTS } from './tokens';

export interface ZitroServicesConfig {
  /** Base URL for the .NET API — e.g. 'https://api.zitroapp.in' */
  apiBaseUrl: string;
  /**
   * URL paths that skip the Authorization header.
   * Defaults to ['/api/app-config', '/api/platform-tags'] if omitted.
   */
  publicEndpoints?: string[];
  /**
   * Which auth token this app attaches to API requests:
   *  - 'firebase' (default) — Firebase ID token, for zitro-customer
   *  - 'business' — Business JWT (POST /api/business-auth/login), for zitro-restaurant
   *  - 'admin' — Admin JWT (POST /api/admin/auth/login), for zitro-admin and zitro-superadmin
   * Each mode also selects the matching 401/429/503 handling (which token store to clear,
   * which app's own /login route to redirect to).
   */
  authMode?: 'firebase' | 'business' | 'admin';
}

const INTERCEPTORS_BY_AUTH_MODE: Record<
  NonNullable<ZitroServicesConfig['authMode']>,
  HttpInterceptorFn[]
> = {
  // businessIdInterceptor (X-Business-Id) only applies to the customer app, which browses
  // a business as a guest/customer — business/admin apps carry businessId in the JWT/URL instead.
  firebase: [
    retryInterceptor,
    authInterceptor,
    businessIdInterceptor,
    errorInterceptor,
  ],
  business: [
    retryInterceptor,
    businessJwtAuthInterceptor,
    businessJwtErrorInterceptor,
  ],
  admin: [retryInterceptor, adminJwtAuthInterceptor, adminJwtErrorInterceptor],
};

/**
 * Call inside app.config.ts to wire up HTTP infrastructure: registers the HTTP client
 * with the interceptor set for this app's `authMode`, plus the API base URL token.
 */
export function provideZitroServices(
  config: ZitroServicesConfig,
): EnvironmentProviders {
  const authMode = config.authMode ?? 'firebase';

  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors(INTERCEPTORS_BY_AUTH_MODE[authMode])),
    { provide: ZITRO_API_BASE_URL, useValue: config.apiBaseUrl },
    ...(config.publicEndpoints
      ? [{ provide: ZITRO_PUBLIC_ENDPOINTS, useValue: config.publicEndpoints }]
      : []),
  ]);
}
