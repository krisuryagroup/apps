import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { FirebaseAuthService } from '../firebase-auth.service';
import { ZITRO_PUBLIC_ENDPOINTS } from '../tokens';

function isPublicEndpoint(url: string, publicEndpoints: string[]): boolean {
  return publicEndpoints.some((path) => url.includes(path));
}

function isInternalApiRequest(url: string): boolean {
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
    })
  );
};
