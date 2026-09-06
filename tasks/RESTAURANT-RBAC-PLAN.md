# zitro-restaurant — Role-Based Access Control Plan

**Date:** 2026-09-06
**Status:** ✅ **Implemented** (same day, once the user said "make the changes"). §7 below
records the actual mechanism used (matches the plan) and §8 records what shipped vs. what's
still open.

**Not committed to git** — planning doc for this working session, matching the convention
of `RESTAURANT-ONBOARDING-GAP-ANALYSIS.md`; delete once folded into
`RESTAURANT-TASKS.md`/`RESTAURANT-STATUS.md`, or keep as a living reference for the matrix.

## 8. Implementation record (2026-09-06)

**Backend** (`zitro-api`): `RequireBusinessRoleAttribute` (Zitro.Infrastructure/Auth/) reuses
the existing `BusinessUserRole` enum with an explicit rank table (Staff=0 < Manager=1 <
Owner=2, deliberately not the enum's own declared order). Applied via
`[RequireBusinessRole(BusinessUserRole.Manager)]` to: Delivery Zones (view + all writes),
Inventory adjust, Payouts (both endpoints), Ratings reply, Staff management
(list/create/update/delete), and every Menu-write endpoint in
`BusinessPortalCatalogController`/`BusinessPortalMenuImportController` (categories, bulk
create, media upload, bulk price adjust, branch-overrides upsert/delete/bulk-adjust, AI
import parse/commit). Menu-view, Orders, Dashboard, Inventory-view, Ratings-view were left
open to every role, per the matrix in §3.

**Two deliberate exceptions to the blanket attribute, found live-testing:**

- `UpdateProduct` (independent-menu items) is NOT gated by the attribute — a field-level
  check in the controller allows staff through only when the request touches exclusively
  `Status`/`IsEnabledForOnlineOrders` (the existing per-row "mark unavailable" toggle,
  already used by staff before this session), and requires Manager+ for any other field.
  This was necessary because the toggle and full edit share one endpoint — gating the whole
  thing would have silently removed a working staff feature.
- Shared-menu branch-overrides (`UpsertBranchOverride`) did NOT get the same field-level
  carve-out — that screen's price/hidden/available fields save together in one combined
  action with no separate lightweight toggle, so distinguishing "just a toggle" from "a real
  edit" isn't expressible from the request shape alone. **Known gap**: staff on a
  `shared`-mode branch loses the availability toggle entirely (sees a read-only table
  instead), unlike staff on an `independent`-mode branch who keeps it. Fixing this properly
  would need either a diff-against-current-state check or a dedicated narrow endpoint —
  deferred as a follow-up, not attempted in this pass.

Staff-management peer-restriction: extended the existing `RestrictOwnerRoleAssignment`/
`RestrictOwnerDeletion` pattern with matching `RestrictManagerRoleAssignment` (Create) and
`RestrictToStaffTargets` (Update/Delete) flags — a manager can create/edit/deactivate/delete
only staff-role accounts, never a peer manager or the owner (previously a manager could
freely touch another manager's or even the owner's account).

19 new integration tests added across `BusinessPortalControllerTests.cs` and
`BusinessPortalCatalogControllerTests.cs`. Verified zero regressions against the pre-existing
~15-failure integration baseline (confirmed via `git stash` diff — same failing test names,
timestamps only differ; the observed 15↔16 fluctuation between runs is pre-existing
shared-collection test-order flakiness, not something this work introduced).

**Frontend** (`apps`): `libs/services/src/restaurant-permissions.config.ts` is the single
source of truth — `BusinessRole` type, `hasRole()` hierarchy check, `ROUTE_MINIMUM_ROLE` (used
by the new `businessRoleGuard` in `app.routes.ts`, applied to `/payouts`, `/delivery-zones`,
`/staff`, `/menu/import`, `/menu/bulk-add`), and `ACTION_MINIMUM_ROLE`/`canPerform()` for
finer-grained in-page checks (not yet consumed anywhere — components currently call
`hasRole()` directly with an inline `canManage()`/`canAdjust()`/`canReply()` method matching
the pattern already established in `profile.component.ts`'s `isOwner()`, rather than importing
`canPerform()` — worth revisiting for consistency in a follow-up). Sidebar nav links for the
three guarded routes are hidden via the same check in `restaurant-layout.component.ts`.

Per-component changes: `menu.component.ts` hides Add/Edit/Delete/Bulk-Adjust/AI-Import/
Bulk-Add controls for staff, keeps the availability toggle; `shared-menu.component.ts` shows
a read-only table (see the known gap above) and hides Bulk Price Adjust for staff;
`restaurant-features.component.ts` hides the Inventory Adjust button, the Ratings reply
form, and — in Staff Management — restricts the role dropdown to "staff" for a manager caller
and hides every row action (Edit/Deactivate/Reset Password/Delete) on any row whose target
role isn't staff, for a manager caller.

**Verified live** through the actual UI (not just curl) as staff, manager, and owner:
nav links, route-guard redirects, menu button visibility, and staff-management row-level
restrictions all behaved exactly as designed in both directions (nothing over-hidden for
manager/owner, nothing under-hidden for staff).

---

## 1. Why this is needed

Live-testing the onboarding gap-closing phases (see `RESTAURANT-TEST-SCENARIOS.md`,
2026-09-06 entries) surfaced that `BusinessPortalController`'s `Profile`/KYC/cover-photo
endpoints had **no role check at all** — any authenticated business user (`owner`, `manager`,
or `staff`) could read and write the business's legal/compliance identity. That got fixed
(RS-T-1616–1622). The user then asked to audit the rest of the portal, and the answer is:
**the same gap exists almost everywhere else.**

Grepping `BusinessPortalController.cs` for every action confirms only 6 of ~30 endpoints
have any role check at all — the 6 fixed today (`UpdateProfile`, `UploadDocument`,
`UploadCoverPhoto`, `Deactivate`, `Reactivate`, `AcceptCommission`) plus `CreateUser`/
`UpdateUser`/`DeleteUser`'s partial owner-role-protection (can't create/edit/delete an
_owner_-role account, but can freely touch manager/staff accounts). Every other action —
Dashboard, Orders, Menu CRUD, Menu Import, Inventory, Delivery Zones, Ratings replies,
Payouts, Branch overrides — only checks `businessId == token.business_id`, never `role`.
**A `staff` account today can do literally everything a `manager` or `owner` can, except the
6 things fixed today.**

This matches the user's own observation: staff can create/edit other staff, staff can see
Payouts, staff can manage Delivery Zones, staff can do everything on Orders/Ratings/etc. —
all true, all currently unrestricted.

## 2. Role model (proposed, industry-standard for a restaurant/food-delivery partner portal)

Modeled on how Zomato/Swiggy-style restaurant partner portals and restaurant POS systems
(Toast, Square for Restaurants, Petpooja) typically split access — front-line staff run
day-to-day service, a manager runs the shift/location, only the owner touches money,
compliance, and who has access at all.

| Role        | Who they are                                                                                                                                                                                     | Philosophy                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**   | The business/legal entity's actual owner (or the one Business JWT account created at signup/invite-accept). Exactly one per business today (a second owner account isn't creatable from the UI). | Full control. The only role that can touch legal identity, money, and account security.                                                                                                                       |
| **Manager** | A trusted shift/location lead.                                                                                                                                                                   | Full **operational** control (orders, menu, inventory, delivery zones, replying to reviews) so they can run the business day-to-day without the owner — but no financial, legal, or account-security actions. |
| **Staff**   | Front-line kitchen/counter/delivery-coordination staff.                                                                                                                                          | Execute the operational work in front of them (take orders, mark items 86'd/unavailable) — cannot change business configuration, cannot see money, cannot manage other accounts.                              |

## 3. Full permission matrix

**Full** = unrestricted access (read + all writes). **Partial** = read + a narrow write (called
out explicitly). **View** = read-only. **None** = no access — route hidden/guarded on the
frontend, `403` from the backend if called directly.

| Screen / Feature                                                                                                          | Backend endpoint(s)                                                                                                                                                 | Owner                                           | Manager                                                  | Staff                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| **Dashboard**                                                                                                             | `GET .../dashboard`                                                                                                                                                 | Full                                            | Full                                                     | Full                                                         |
| **Orders — queue & detail**                                                                                               | `GET .../orders`, `GET .../orders/{id}`                                                                                                                             | Full                                            | Full                                                     | Full                                                         |
| **Orders — accept/reject/advance status**                                                                                 | `PUT .../orders/{id}/status` (Orders.Module)                                                                                                                        | Full                                            | Full                                                     | Full                                                         |
| **Menu — view categories/products**                                                                                       | `GET .../categories`, `GET .../products`                                                                                                                            | Full                                            | Full                                                     | Full                                                         |
| **Menu — create/edit/delete category or product**                                                                         | `POST/PUT/DELETE .../categories`, `.../products`                                                                                                                    | Full                                            | Full                                                     | **None**                                                     |
| **Menu — toggle item availability only** ("86" an item)                                                                   | _(needs a new narrow endpoint, or reuse `UpdateProduct` with a role check that only permits the `isAvailable`/`isEnabledForOnlineOrders` field to change — see §5)_ | Full                                            | Full                                                     | **Partial** — availability toggle only, nothing else         |
| **Menu Import (AI bulk import)**                                                                                          | `POST .../menu-import/parse`, `.../commit`                                                                                                                          | Full                                            | Full                                                     | **None**                                                     |
| **Shared-menu branch overrides** (price/hide/available on a brand's master item)                                          | `GET/PUT .../branch-overrides`, `DELETE .../branch-overrides/{id}`, `.../bulk-price-adjust`                                                                         | Full                                            | Full                                                     | **Partial** — same availability-only carve-out as menu items |
| **Inventory — view stock & alerts**                                                                                       | `GET .../inventory`, `.../inventory/alerts`                                                                                                                         | Full                                            | Full                                                     | Full                                                         |
| **Inventory — adjust stock**                                                                                              | `POST .../inventory/adjust`                                                                                                                                         | Full                                            | Full                                                     | **None**                                                     |
| **Delivery Zones — view**                                                                                                 | `GET .../delivery-zones`                                                                                                                                            | Full                                            | Full                                                     | **None** (not operationally relevant to floor staff)         |
| **Delivery Zones — create/edit/delete**                                                                                   | `POST/PUT/DELETE .../delivery-zones`                                                                                                                                | Full                                            | Full                                                     | **None**                                                     |
| **Ratings & Reviews — view**                                                                                              | `GET .../ratings`                                                                                                                                                   | Full                                            | Full                                                     | Full (useful service-quality feedback)                       |
| **Ratings & Reviews — reply**                                                                                             | `POST .../ratings/{id}/reply`                                                                                                                                       | Full                                            | Full                                                     | **None** (public-facing reply is a brand/reputation action)  |
| **Payouts — view**                                                                                                        | `GET .../payouts`, `.../payouts/{id}/orders`                                                                                                                        | Full                                            | **View**                                                 | **None**                                                     |
| **Staff Management — view list**                                                                                          | `GET .../users`                                                                                                                                                     | Full                                            | Full                                                     | **None**                                                     |
| **Staff Management — create `staff`-role account**                                                                        | `POST .../users`                                                                                                                                                    | Full                                            | Full                                                     | **None**                                                     |
| **Staff Management — create `manager`-role account**                                                                      | `POST .../users`                                                                                                                                                    | Full                                            | **None**                                                 | **None**                                                     |
| **Staff Management — create `owner`-role account**                                                                        | `POST .../users`                                                                                                                                                    | _(not creatable via this UI today — unchanged)_ | None                                                     | None                                                         |
| **Staff Management — edit/deactivate/reset-password on a `staff`-role target**                                            | `PUT/DELETE .../users/{id}`                                                                                                                                         | Full                                            | Full                                                     | **None**                                                     |
| **Staff Management — edit/deactivate/reset-password on a `manager`-role target**                                          | `PUT/DELETE .../users/{id}`                                                                                                                                         | Full                                            | **None** (a manager can't touch a peer manager)          | **None**                                                     |
| **Staff Management — edit/deactivate the `owner`-role account**                                                           | `PUT/DELETE .../users/{id}`                                                                                                                                         | Full (self only)                                | None                                                     | None                                                         |
| **Profile & Settings — business identity fields** (name/description/phone/hours/cuisine/category — _not_ legal/financial) | `GET/PUT .../{businessId}`                                                                                                                                          | Full                                            | **View** _(see §4 — refinement over today's binary fix)_ | **None** _(already shipped today)_                           |
| **Profile & Settings — legal/compliance fields** (FSSAI/GST/PAN, KYC docs)                                                | same endpoint, redacted fields; `POST .../documents`                                                                                                                | Full                                            | **None**                                                 | **None** _(already shipped today)_                           |
| **Profile & Settings — payout account / commission terms**                                                                | same endpoint, redacted fields; `POST .../accept-commission`                                                                                                        | Full                                            | **None**                                                 | **None** _(already shipped today)_                           |
| **Profile & Settings — cover photo**                                                                                      | `POST .../cover-photo`                                                                                                                                              | Full                                            | **None** _(view is fine — see §4)_                       | **None** _(already shipped today)_                           |
| **Deactivate / Reactivate business**                                                                                      | `POST .../deactivate`, `.../reactivate`                                                                                                                             | Full                                            | **None**                                                 | **None** _(already correct before this session)_             |

## 4. Refinement over what shipped today

Today's fix (RS-T-1616–1622) made Profile a strict binary: owner sees everything, everyone
else sees a minimal "Your account" card. That's safe but coarser than the matrix above — a
manager arguably should be able to _see_ (not edit) the business's basic operating details
(name, description, phone, hours, cuisine, cover photo) since they run day-to-day ops and
might need to reference them, while still never seeing FSSAI/GST/PAN/payout/commission or
being able to save changes. If/when this plan is implemented, `GetProfile`'s redaction
should become **role-tiered** (owner: nothing redacted; manager: legal/financial fields
redacted but operating details visible; staff: current fully-restricted view unchanged)
rather than the current owner-vs-everyone binary. Not urgent — the current binary fix already
closes the actual data-exposure risk; this is a UX refinement, not a security fix.

## 5. Implementation approach (for when this is picked up)

**Backend** — `BusinessPortalController.cs` (and the Catalog-module controllers for menu/
branch-overrides):

- Add a small helper, e.g. `RequireRole(currentUser, params string[] allowedRoles)`, next to
  the existing `ValidateBusinessAccessAsync`, to avoid repeating
  `string.Equals(currentUser.BusinessRole, "...", StringComparison.OrdinalIgnoreCase)` at
  every call site (this exact repetition already happened 6 times today).
- Apply it per the matrix above. Most of this is mechanical (add one `if` line per action).
- The two **Partial** rows (menu-item availability toggle, branch-override availability
  toggle) are the only rows needing new backend work: `UpdateProductCommand`/
  `UpdateBranchOverrideCommand` currently accept every field in one PUT with no way to
  restrict _which_ fields a `staff` caller may change. Options: (a) a new, narrower endpoint
  (`PATCH .../products/{id}/availability`) that only ever touches the availability flag, used
  by a lighter "toggle in place" UI control for staff, or (b) keep the existing endpoint but
  have the controller strip/ignore any non-availability field when the caller is `staff`
  (silently, or `400` if they tried to change something else — silently-ignoring risks
  confusing an owner/manager using the same endpoint by mistake, so prefer explicit rejection
  or a dedicated endpoint). Recommend (a) — cleaner, and gives the frontend a natural place to
  render a staff-specific "mark unavailable" toggle instead of the full edit form.
- `GetProfile`'s redaction (already shipped) would change from a binary `isOwner` check to a
  role-tiered one per §4, if that refinement is taken on.

**Frontend** (`zitro-restaurant`):

- Route guards: add a role-aware guard (extending the existing `businessAuthGuard` or a new
  `roleGuard(allowedRoles)`) to `app.routes.ts` for **None**-access screens per role — e.g.
  `/delivery-zones`, `/payouts`, `/staff` should redirect a `staff` account away entirely
  (this is RS-T-1902/RS-T-1704's original ask, never implemented). This is what actually
  closes the frontend half of the gap — today Profile shows a restricted card _after_
  loading the route; a proper guard would redirect before the component even renders,
  matching the pattern already established for `guestOnlyGuard`.
- Per-component conditional rendering (the `isOwner()` pattern already used in
  `profile.component.ts`) for the **Partial**/**View** rows — e.g. `menu.component.ts` hides
  the Add/Edit/Delete buttons for `staff` and shows only an availability toggle per row;
  `payouts.component.ts` hides nothing for `manager` (view-only screen already) but the route
  guard blocks `staff` before they'd ever see it.
- `staff.component.ts` (Staff Management): hide the "+ Add Staff" button and any target row's
  action buttons when the current user can't act on that row per the matrix (a `manager`
  should still see their own account and every `staff`-role row's actions, but not another
  `manager`-role row's actions, and not the `owner` row's actions at all).

**Testing** — every new/changed backend check needs the same pattern already used today:
an integration test asserting `403` for a disallowed role and the original success code for
an allowed one, per endpoint. Given the matrix touches ~20 endpoints, this is the bulk of the
implementation effort, not the `if` checks themselves.

## 6. Suggested rollout order (if/when implemented)

Roughly highest-risk (real money/legal/account-security exposure) to lowest:

1. **Payouts** (Manager: view, Staff: none) — financial data, currently fully open to staff.
2. **Staff Management** (tiered: owner > manager > staff, no peer-editing) — account-security
   surface; a `manager` currently being able to edit/deactivate another `manager` or promote
   confusion around who manages whom is the next-highest-risk gap after Profile (already fixed).
3. **Delivery Zones** (Manager: full, Staff: none) — business-configuration, not staff's job.
4. **Inventory adjust** (Manager: full, Staff: none) — stock/shrinkage control, should require
   supervisor-level access per standard POS practice.
5. **Menu CRUD vs. availability-only** (Manager: full, Staff: partial) — the one row needing
   actual new backend work (§5), do last since it's the most involved.
6. **Ratings reply** (Manager: full, Staff: none) — lower risk (no money/legal exposure, but a
   public-facing brand action) — cheap one-line fix, could actually be done early alongside #1.
7. **Frontend route guards** — can be done incrementally alongside each backend fix above,
   or as one pass at the end once all backend checks exist (cleaner: guard config can then
   just mirror the finished backend matrix exactly).

Orders/Dashboard/Ratings-view/Menu-view/Inventory-view need **no change** — they're already
correctly open to every role per the matrix, matching how this portal's core day-to-day
workflow (staff processing orders) is supposed to work.
