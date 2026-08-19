import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BusinessAuthTokenService } from '../business-auth-token.service';
import { ZITRO_PUBLIC_ENDPOINTS } from '../tokens';
import { isInternalApiRequest, isPublicEndpoint } from './url-matchers';

/** Attaches the Business JWT as a Bearer token — used by zitro-restaurant only. */
export const businessJwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(BusinessAuthTokenService);
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
