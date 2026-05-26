import { InjectionToken } from '@angular/core';
import { HttpContextToken } from '@angular/common/http';

export const ZITRO_API_BASE_URL = new InjectionToken<string>('ZITRO_API_BASE_URL');

/** List of URL paths that do not require an Authorization header. */
export const ZITRO_PUBLIC_ENDPOINTS = new InjectionToken<string[]>(
  'ZITRO_PUBLIC_ENDPOINTS',
  { providedIn: 'root', factory: () => ['/api/app-config', '/api/platform-tags'] }
);

/** Per-request business slug override — takes precedence over BusinessContextService.businessId().
 *  Used by CartApiService so concurrent multi-business cart calls each get the right X-Business-Id. */
export const CART_BUSINESS_SLUG = new HttpContextToken<string | null>(() => null);
