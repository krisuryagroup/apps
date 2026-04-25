import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, catchError } from 'rxjs';
import { FirebaseAuthService } from '../firebase-auth.service';
import { ZITRO_PUBLIC_ENDPOINTS } from '../tokens';

function isPublicEndpoint(url: string, publicEndpoints: string[]): boolean {
  return publicEndpoints.some((path) => url.includes(path));
}

function isInternalApiRequest(url: string): boolean {
  if (url.includes('googleapis.com') || url.includes('places.googleapis.com')) {
    return false;
  }
  return url.includes('/api/');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseAuth = inject(FirebaseAuthService);
  const publicEndpoints = inject(ZITRO_PUBLIC_ENDPOINTS);

  if (!isInternalApiRequest(req.url) || isPublicEndpoint(req.url, publicEndpoints)) {
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
    })
  );
};
