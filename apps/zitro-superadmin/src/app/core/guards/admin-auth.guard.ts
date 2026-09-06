import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminApiService, AdminAuthTokenService } from '@zitro/services';

/** Blocks any route behind login — redirects to /login if no Admin JWT is stored. */
export const adminAuthGuard: CanActivateFn = () => {
  const tokenService = inject(AdminAuthTokenService);
  const router = inject(Router);

  if (tokenService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Blocks the entire app for any admin who isn't super_admin. zitro-superadmin was found
 * to have no role gate at all — the same shared admin login (POST /api/admin/auth/login)
 * used by zitro-admin gets an Ops/Support/Finance admin all the way into this app, and
 * (before this guard) most of its routes had no canActivate at all. Config/feature-flag/
 * translation endpoints already 403 for non-SuperAdmin at the API layer (they're
 * deliberately absent from every role's AdminRolePermissions default), but this app is
 * meant to be reachable by SuperAdmin only in the first place — redirect anyone else back
 * to /login rather than let them wander an app whose calls will mostly fail.
 */
export const superAdminOnlyGuard: CanActivateFn = () => {
  const api = inject(AdminApiService);
  const tokenService = inject(AdminAuthTokenService);
  const router = inject(Router);

  if (api.isSuperAdmin()) {
    return true;
  }

  tokenService.clearToken();
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

/**
 * Blocks a route unless the current JWT carries `permission` (or the admin is a
 * SuperAdmin, which bypasses all permission checks — matches the backend's
 * RequirePermissionAttribute). Redirects to /dashboard otherwise. Previously the
 * only real protection on e.g. /admins was the backend's own 403 — this closes the
 * client-side gap: a nav link hidden by permission was still directly reachable by URL.
 */
export const requirePermissionGuard = (permission: string): CanActivateFn => {
  return () => {
    const api = inject(AdminApiService);
    const router = inject(Router);

    if (api.hasPermission(permission)) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
};
