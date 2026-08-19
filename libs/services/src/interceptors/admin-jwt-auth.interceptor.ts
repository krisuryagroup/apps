import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminAuthTokenService } from '../admin-auth-token.service';
import { ZITRO_PUBLIC_ENDPOINTS } from '../tokens';
import { isInternalApiRequest, isPublicEndpoint } from './url-matchers';

/** Attaches the Admin JWT as a Bearer token — used by zitro-admin and zitro-superadmin. */
export const adminJwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(AdminAuthTokenService);
  const publicEndpoints = inject(ZITRO_PUBLIC_ENDPOINTS);

  if (
    !isInternalApiRequest(req.url) ||
    isPublicEndpoint(req.url, publicEndpoints)
  ) {
    return next(req);
  }

  const token = tokenService.token();
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
