import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError } from 'rxjs';
import { FirebaseAuthService } from '../firebase-auth.service';
import { ZITRO_PUBLIC_ENDPOINTS } from '../tokens';
import { isInternalApiRequest, isPublicEndpoint } from './url-matchers';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseAuth = inject(FirebaseAuthService);
  const publicEndpoints = inject(ZITRO_PUBLIC_ENDPOINTS);

  if (
    !isInternalApiRequest(req.url) ||
    isPublicEndpoint(req.url, publicEndpoints)
  ) {
    return next(req);
  }

  return from(firebaseAuth.getIdToken()).pipe(
    switchMap((token) => {
      const authedReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next(authedReq);
    }),
    // If no user is signed in (guest browsing), proceed without auth header.
    // The server will return 401 if the endpoint truly requires authentication.
    catchError((err) => {
      if (err?.message === 'No authenticated user') {
        return next(req);
      }
      throw err;
    }),
  );
};
