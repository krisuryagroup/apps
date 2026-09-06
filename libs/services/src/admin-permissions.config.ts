/**
 * Frontend mirror of zitro-api's AdminRolePermissions
 * (Zitro.Infrastructure/Auth/AdminRolePermissions.cs) — the default permission set
 * granted to each admin role (Ops/Support/Finance), on top of whatever an individual
 * admin is explicitly granted. Keep these two lists in sync; this one only drives
 * sidebar-nav/route visibility, the backend copy is the actual enforcement.
 *
 * SuperAdmin needs no entry — AdminApiService.hasPermission() already bypasses
 * everything for that role before this lookup is consulted.
 */
export const ADMIN_ROLE_DEFAULT_PERMISSIONS: Readonly<
  Record<string, readonly string[]>
> = {
  ops: [
    'businesses:read',
    'businesses:write',
    'brands:read',
    'brands:write',
    'tags:read',
    'tags:write',
    'products:read',
    'products:write',
    'categories:read',
    'categories:write',
    'delivery:read',
    'delivery:write',
    'banners:read',
    'banners:write',
    'subscriptions:read',
    'subscriptions:write',
    'societies:read',
    'societies:write',
    'orders:read',
  ],
  support: [
    'users:read',
    'users:write',
    'orders:read',
    'coupons:read',
    'businesses:read',
  ],
  finance: [
    'payouts:read',
    'payouts:write',
    'payments:refund',
    'cashback:read',
    'cashback:write',
    'orders:read',
    'coupons:read',
  ],
};

export function hasRoleDefaultPermission(
  role: string | null | undefined,
  permission: string,
): boolean {
  if (!role) return false;
  const granted = ADMIN_ROLE_DEFAULT_PERMISSIONS[role.toLowerCase()];
  return granted?.includes(permission) ?? false;
}
