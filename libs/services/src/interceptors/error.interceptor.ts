import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { FirebaseAuthService } from '../firebase-auth.service';
import { ToastService } from '../toast.service';
import { FeatureFlagService } from '../feature-flag.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const firebaseAuth = inject(FirebaseAuthService);
  const toast = inject(ToastService);
  const featureFlags = inject(FeatureFlagService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401: {
          // Never redirect guests — they intentionally have no auth token.
          const isGuest = localStorage.getItem('isGuest') === 'true';
          if (!isGuest) {
            firebaseAuth.signOut();
            router.navigate(['/auth/signin']);
          }
          break;
        }

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
