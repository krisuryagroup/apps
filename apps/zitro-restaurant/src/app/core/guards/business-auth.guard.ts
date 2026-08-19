import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BusinessAuthTokenService } from '@zitro/services';

/** Blocks any route behind login — redirects to /login if no Business JWT is stored. */
export const businessAuthGuard: CanActivateFn = () => {
  const tokenService = inject(BusinessAuthTokenService);
  const router = inject(Router);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** Blocks /login, /apply, /accept-invite for an already-logged-in user — redirects to /dashboard. */
export const guestOnlyGuard: CanActivateFn = () => {
  const tokenService = inject(BusinessAuthTokenService);
  const router = inject(Router);

  if (!tokenService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
