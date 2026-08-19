import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthTokenService } from '@zitro/services';

/** Blocks any route behind login — redirects to /login if no Admin JWT is stored. */
export const adminAuthGuard: CanActivateFn = () => {
  const tokenService = inject(AdminAuthTokenService);
  const router = inject(Router);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/** Blocks /login for an already-logged-in admin — redirects to /dashboard. */
export const guestOnlyGuard: CanActivateFn = () => {
  const tokenService = inject(AdminAuthTokenService);
  const router = inject(Router);

  if (!tokenService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
