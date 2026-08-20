import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LOCATION_STORAGE_KEY } from '../constants/app.constants';

/**
 * LocationGuard — redirects to /location-selection if no saved location exists.
 *
 * Reads `zitro_user_location` from localStorage (set by LocationSelectionComponent).
 * If absent, the user has never chosen a delivery location and must do so first.
 *
 * Exception: `/add-address` is exempt. It's the only reachable page for a user with
 * no saved location to *set* one via manual search (LocationSelectionComponent's
 * "Search your Location" routes here) — without this exemption, the parent guard
 * bounces every navigation to it straight back to /location-selection, since being
 * on that page in the first place implies no location is saved yet.
 */
export const locationGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (state.url.startsWith('/add-address')) {
    return true;
  }
  const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!stored) {
    return router.createUrlTree(['/location-selection']);
  }
  return true;
};
