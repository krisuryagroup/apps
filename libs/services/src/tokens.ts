import { InjectionToken } from '@angular/core';

export const ZITRO_API_BASE_URL = new InjectionToken<string>('ZITRO_API_BASE_URL');

/** List of URL paths that do not require an Authorization header. */
export const ZITRO_PUBLIC_ENDPOINTS = new InjectionToken<string[]>(
  'ZITRO_PUBLIC_ENDPOINTS',
  { providedIn: 'root', factory: () => ['/api/app-config', '/api/platform-tags'] }
);
