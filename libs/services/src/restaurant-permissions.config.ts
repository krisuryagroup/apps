/**
 * Single source of truth for zitro-restaurant's role-based access control.
 *
 * Backend enforcement lives in zitro-api's [RequireBusinessRole(...)] attribute
 * (BusinessPortalController.cs / BusinessPortalCatalogController.cs) — this file is the
 * frontend mirror of that same matrix, so route guards and per-component button hiding
 * both read from one place instead of scattering role checks per file. See
 * apps/tasks/RESTAURANT-RBAC-PLAN.md for the full reasoning and the matrix this encodes.
 *
 * Hierarchy: owner > manager > staff. `hasRole(current, minimum)` treats `minimum` as a
 * floor, not an exact match — a manager satisfies a 'manager' requirement AND an owner
 * satisfies it too.
 */

export type BusinessRole = 'owner' | 'manager' | 'staff';

const ROLE_RANK: Record<BusinessRole, number> = {
  staff: 0,
  manager: 1,
  owner: 2,
};

/** True if `current` meets or exceeds `minimum` in the owner > manager > staff hierarchy. */
export function hasRole(
  current: BusinessRole | string | null | undefined,
  minimum: BusinessRole,
): boolean {
  if (!current || !(current in ROLE_RANK)) return false;
  return ROLE_RANK[current as BusinessRole] >= ROLE_RANK[minimum];
}

/**
 * Minimum role required to *navigate to* each top-level route. A route with no entry here
 * is open to every authenticated role (Dashboard, Orders, Menu, Inventory, Ratings, Profile
 * all load for everyone — content within them is tiered separately via ACTION_PERMISSIONS
 * or, for Profile, the isOwner() check already in profile.component.ts).
 */
export const ROUTE_MINIMUM_ROLE: Partial<Record<string, BusinessRole>> = {
  '/delivery-zones': 'manager',
  '/payouts': 'manager',
  '/staff': 'manager',
  '/menu/import': 'manager',
  '/menu/bulk-add': 'manager',
};

/**
 * Minimum role required for a specific mutating action, keyed by a short dot-namespaced
 * string. Used inside a still-navigable screen to hide/disable a button rather than
 * blocking the whole route — e.g. Staff can open /menu to see what's on it, but can't see
 * the Add/Edit/Delete controls.
 */
export const ACTION_MINIMUM_ROLE: Record<string, BusinessRole> = {
  'menu.manageCategories': 'manager',
  'menu.manageProducts': 'manager',
  'sharedMenu.manageOverrides': 'manager',
  'inventory.adjust': 'manager',
  'ratings.reply': 'manager',
  'staff.create': 'manager',
  'staff.manage': 'manager',
  'deliveryZones.manage': 'manager',
};

/** Convenience wrapper for ACTION_MINIMUM_ROLE lookups — returns false for an unknown key
 * rather than throwing, so a typo fails closed (hides the control) instead of crashing. */
export function canPerform(
  current: BusinessRole | string | null | undefined,
  action: keyof typeof ACTION_MINIMUM_ROLE,
): boolean {
  const minimum = ACTION_MINIMUM_ROLE[action];
  return minimum ? hasRole(current, minimum) : false;
}
