import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import {
  BusinessApiService,
  ROUTE_MINIMUM_ROLE,
  hasRole,
} from '@zitro/services';

/**
 * Blocks navigation to a route that has a minimum role in ROUTE_MINIMUM_ROLE
 * (restaurant-permissions.config.ts) — e.g. a staff account is redirected away from
 * /payouts, /delivery-zones, and /staff before the component ever loads, instead of
 * loading the page and hoping every write call 403s. Routes with no entry there are
 * left untouched (open to every authenticated role).
 */
export const businessRoleGuard: CanActivateFn = (route) => {
  const api = inject(BusinessApiService);
  const router = inject(Router);

  const path = `/${route.routeConfig?.path ?? ''}`;
  const minimum = ROUTE_MINIMUM_ROLE[path];
  if (!minimum) return true;

  const role = api.currentUser()?.role;
  if (hasRole(role, minimum)) return true;

  return router.createUrlTree(['/dashboard']);
};
