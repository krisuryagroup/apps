import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BusinessContextService } from '../business-context.service';
import { CART_BUSINESS_SLUG } from '../tokens';

export const businessIdInterceptor: HttpInterceptorFn = (req, next) => {
  const businessContext = inject(BusinessContextService);

  if (!req.url.includes('/api/')) {
    return next(req);
  }

  // Per-request slug (set by CartApiService for multi-business concurrent calls) takes precedence
  const perRequestSlug = req.context.get(CART_BUSINESS_SLUG);
  const businessId = perRequestSlug ?? businessContext.businessId();

  if (!businessId) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-Business-Id': businessId } }));
};
