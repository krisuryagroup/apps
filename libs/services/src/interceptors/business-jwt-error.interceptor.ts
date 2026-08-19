import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { BusinessAuthTokenService } from '../business-auth-token.service';
import { ToastService } from '../toast.service';
import { FeatureFlagService } from '../feature-flag.service';

/** Handles 401/429/503 for zitro-restaurant — mirrors errorInterceptor but for Business JWT. */
export const businessJwtErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(BusinessAuthTokenService);
  const toast = inject(ToastService);
  const featureFlags = inject(FeatureFlagService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          tokenService.clearToken();
          router.navigate(['/login']);
          break;

        case 429:
          toast.show({
            message: 'Too many requests. Please slow down.',
            color: 'warning',
            duration: 4000,
          });
          break;

        case 503:
          featureFlags.setMaintenanceMode(true);
          break;
      }

      return throwError(() => error);
    }),
  );
};
