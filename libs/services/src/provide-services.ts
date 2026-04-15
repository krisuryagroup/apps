import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  authInterceptor,
  businessIdInterceptor,
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
}

/**
 * Call inside app.config.ts to wire up HTTP infrastructure:
 * provideZitroServices registers the HTTP client with all 4 interceptors
 * (retry → auth → business-id → error) plus the API base URL token.
 *
 * Order matters:
 *   1. retryInterceptor  — outermost, wraps everything so retries see auth headers
 *   2. authInterceptor   — attaches Bearer token
 *   3. businessIdInterceptor — attaches X-Business-Id
 *   4. errorInterceptor  — handles 401/429/503
 */
export function provideZitroServices(config: ZitroServicesConfig): EnvironmentProviders {
  const providers: EnvironmentProviders[] = [
    provideHttpClient(
      withInterceptors([
        retryInterceptor,
        authInterceptor,
        businessIdInterceptor,
        errorInterceptor,
      ])
    ),
  ];

  return makeEnvironmentProviders([
    ...providers,
    { provide: ZITRO_API_BASE_URL, useValue: config.apiBaseUrl },
    ...(config.publicEndpoints
      ? [{ provide: ZITRO_PUBLIC_ENDPOINTS, useValue: config.publicEndpoints }]
      : []),
  ]);
}
