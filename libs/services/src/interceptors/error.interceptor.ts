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
          // Only force a sign-in redirect when a session actually existed and
          // expired/was rejected. Never redirect guests (intentionally no
          // token) or a never-authenticated visitor (no token yet, simply
          // browsing) — both are expected to get 401s on user-scoped calls
          // and should be left alone rather than kicked to /auth/signin.
          const isGuest = localStorage.getItem('isGuest') === 'true';
          const hadToken = !!localStorage.getItem('token');
          if (hadToken && !isGuest) {
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
