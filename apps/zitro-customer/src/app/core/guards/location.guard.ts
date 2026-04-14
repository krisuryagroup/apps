import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { LOCATION_STORAGE_KEY } from '../constants/app.constants';

/**
 * LocationGuard — redirects to /location-selection if no saved location exists.
 *
 * Reads `zitro_user_location` from localStorage (set by LocationSelectionComponent).
 * If absent, the user has never chosen a delivery location and must do so first.
 */
export const locationGuard: CanActivateFn = () => {
  const router = inject(Router);
  const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
  if (!stored) {
    return router.createUrlTree(['/location-selection']);
  }
  return true;
};
