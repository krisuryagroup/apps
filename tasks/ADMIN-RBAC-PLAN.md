# zitro-admin / zitro-superadmin — Role-Based Access Control

**Date:** 2026-09-06
**Status:** ✅ Implemented and committed. This is a permanent reference for the admin
permission model — unlike `RESTAURANT-RBAC-PLAN.md`, keep this one in the repo.

## 1. Why this was needed

An audit (prompted by the `zitro-restaurant` RBAC work landing first) found that
`zitro-admin`/`zitro-superadmin`'s access control was mostly theoretical:

- Of ~17 admin-facing controllers, only 3 domains (admin-user management, feature flags,
  app-config/translations/themes) had any `[RequirePermission]` check at all. Everything
  else — Businesses, Brands, Tags, Products, Categories, Orders, Coupons, Cashback rules,
  Delivery, **Payouts (including marking one paid)**, **Refunds**, Subscriptions, Banners,
  Societies, and customer user block/unblock — was reachable by any authenticated admin,
  regardless of role.
- The `AdminRole` enum (SuperAdmin/Ops/Support/Finance) drove no actual access on its own.
  Permissions lived in a separate free-text `admin_permissions` table, and the
  Create-Admin UI hardcoded `permissions: []` on every new account. So every non-SuperAdmin
  admin ever created had zero permissions — the only account that could do anything on a
  gated endpoint was SuperAdmin, via its automatic bypass, not via any granted permission.
  The role label existed; the access behind it didn't.
- `zitro-superadmin` had no role gate of any kind. It's not a narrower app — it's the same
  20 routes as `zitro-admin` (businesses, orders, payouts, everything) plus 5 more
  (feature flags, translations, themes, UI config, remote settings), sharing the same
  login endpoint. Any admin of any role who knew the URL and had valid credentials could
  log in and load nearly all of it.

## 2. Role model — default permission sets

Four roles, matching the existing `AdminRole` enum. SuperAdmin needs no table entry — it
bypasses every `[RequirePermission]` check automatically (unchanged, pre-existing
behavior). The other three each get a **default** permission set; an individual admin can
still be granted extra permissions beyond their role's defaults via the existing
`admin_permissions` table (additive, never subtractive) — that mechanism was already there,
it just had nothing to build on top of.

| Role        | Default permissions                                                                                                                            | Rationale                                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ops**     | `businesses:*`, `brands:*`, `tags:*`, `products:*`, `categories:*`, `delivery:*`, `banners:*`, `subscriptions:*`, `societies:*`, `orders:read` | Day-to-day catalog/business/delivery configuration. No money movement, no customer-account actions, no admin/platform-config access.                                                                 |
| **Support** | `users:read`, `users:write`, `orders:read`, `coupons:read`, `businesses:read`                                                                  | Customer-facing issue handling: view/block customer accounts, view orders and coupons to answer questions. No catalog, delivery, or money-movement access — a refund or payout goes through Finance. |
| **Finance** | `payouts:read`, `payouts:write`, `payments:refund`, `cashback:read`, `cashback:write`, `orders:read`, `coupons:read`                           | Money movement: payouts, refunds, cashback rules. Read access to orders/coupons for reconciliation. No catalog/business/delivery config, no customer-account actions.                                |

**Deliberately excluded from every role's defaults:** `admins:read`/`admins:write`,
`feature-flags:*`, `translations:*`, `themes:*`, `app-config:*`. These stay
explicit-grant-only (or the SuperAdmin bypass) regardless of role — an Ops account should
never be able to provision other admin accounts or flip a feature flag just because it's
Ops.

These boundaries are a starting judgment call, not derived from an existing spec — revisit
if real usage shows a role needs more (or less).

## 3. Implementation

### Backend (`zitro-api`)

- **`Zitro.Infrastructure/Auth/AdminRolePermissions.cs`** (new) — the table above, keyed by
  the exact lowercase role string issued in the Admin JWT (`"ops"` | `"support"` |
  `"finance"`, from `AdminLoginHandler`), not the enum's PascalCase names.
- **`RequirePermissionAttribute`** — now checks `AdminRolePermissions.Includes(role,
permission)` in addition to the JWT's explicit `permission` claims, before the existing
  SuperAdmin bypass's fallthrough. Order: SuperAdmin bypass → role-default → explicit grant
  → 403.
- **Gated every previously-open controller**, one `[RequirePermission("domain:action")]`
  per action: `BusinessesController`, `BrandsController`, `TagsController`,
  `CategoriesController`, `ProductsController`, `AdminDeliveryController`,
  `BannersController` (both `GlobalBannersController` and the per-business one),
  `AdminSubscriptionsController`, `AdminSocietiesController`, `AdminOrdersController`,
  `AdminCouponsController`, `AdminUsersController` (Users.Module, customer accounts),
  `AdminPayoutsController`, `PaymentsController.Refund`, `AdminCashbackController`. Public/
  business-portal-facing actions in the same files (e.g. `BusinessesController.GetBySlug`,
  `BrandsController.GetBrand`) were left untouched — only the `[Authorize(AuthSchemes.Admin)]`
  actions were in scope.
- Read vs. write permission strings follow a `domain:read` / `domain:write` convention
  (`payments:refund` and the pre-existing `admins:read`/`admins:write`,
  `feature-flags:read`/`feature-flags:manage` are the exceptions, kept as they already were
  named).
- **Tests**: `AdminRolePermissionsTests.cs` (22 unit tests covering every role/permission
  combination, including confirming the platform-config exclusions hold and unknown
  roles fail closed) + integration tests in `BusinessesControllerTests.cs` (Ops can create
  a business, Finance can't) and the new `Payments/AdminPayoutsControllerTests.cs` (Finance
  can list/generate payouts and issue refunds, Ops and Support can't). Verified live via
  curl with real (test) Ops/Finance accounts — behaved exactly as designed.

### Frontend (`apps`)

- **`libs/services/src/admin-permissions.config.ts`** (new) — a frontend mirror of
  `AdminRolePermissions.cs`'s table. `AdminApiService.hasPermission()` now checks this in
  addition to the SuperAdmin bypass and explicit JWT permission claims — without it, the
  sidebar/route guards would have hidden screens an Ops/Support/Finance admin could
  actually use, since the backend now grants access the frontend didn't know about.
- **`zitro-superadmin`**: new `superAdminOnlyGuard` (`core/guards/admin-auth.guard.ts`),
  applied to the entire authenticated route tree in `app.routes.ts`. Any non-SuperAdmin
  admin who logs in is redirected straight back to `/login` with their token cleared
  (necessary to avoid a redirect loop with `guestOnlyGuard`, which would otherwise see a
  still-valid token and bounce them back to the app they were just kicked out of).
- **`zitro-admin`**: every nav item in `main-layout.component.ts` now carries a
  `permission` tag matching its backend gate (previously only `/admins` had one — every
  other item, including Payouts and Cashback Rules, was shown unconditionally). Matching
  `requirePermissionGuard('domain:read')` added to every corresponding route in
  `app.routes.ts`, so a permission-less screen is unreachable by direct URL too, not just
  hidden from the sidebar.

## 4. Known follow-ups (not done in this pass)

- **Admin permission-assignment UI is still broken**: `AdminAdminUsersComponent.save()`
  hardcodes `permissions: []` on every Create-Admin call, and there's no edit-permissions
  UI at all. Role defaults now make every account functional without this, but there's
  still no way to grant an individual admin something _beyond_ their role's baseline (e.g.
  a specific Ops admin who also needs `payouts:read` for a one-off project). Fixing this
  means wiring the existing (already-functional) `admin_permissions` table up to a real
  UI — the backend side needs no further change.
- **`zitro-superadmin`'s own nav isn't permission-filtered** — every item still renders
  unconditionally. Low priority now that `superAdminOnlyGuard` means only SuperAdmin (which
  bypasses every check) ever gets past login, but worth doing for consistency if the
  product ever wants a "delegate limited superadmin access" role.
- **Role boundaries are a first pass**, not derived from a pre-existing spec (there wasn't
  one) — the table in §2 is a reasonable starting judgment call rather than a settled
  business requirement. Revisit once real Ops/Support/Finance usage shows the split is
  wrong somewhere (e.g. if Support genuinely needs to issue refunds directly, or Ops needs
  read access to payouts for demand forecasting).
