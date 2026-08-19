import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AdminAuthTokenService } from '../admin-auth-token.service';
import { ToastService } from '../toast.service';
import { FeatureFlagService } from '../feature-flag.service';

/** Handles 401/429/503 for zitro-admin / zitro-superadmin — mirrors errorInterceptor but for Admin JWT. */
export const adminJwtErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenService = inject(AdminAuthTokenService);
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
