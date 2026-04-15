import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BusinessContextService } from '../business-context.service';

export const businessIdInterceptor: HttpInterceptorFn = (req, next) => {
  const businessContext = inject(BusinessContextService);

  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const businessId = businessContext.businessId();
  if (!businessId) {
    return next(req);
  }

  const reqWithBusinessId = req.clone({
    setHeaders: { 'X-Business-Id': businessId },
  });

  return next(reqWithBusinessId);
};
