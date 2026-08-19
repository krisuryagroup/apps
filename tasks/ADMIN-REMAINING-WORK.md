# ZITRO Admin Dashboard — Remaining Work Plan

> Planning doc only — no implementation yet. Source of gaps: `ADMIN-TEST-SCENARIOS.md`'s
> Live Execution Log (2026-08-19 full pass + quick-wins follow-up). Each item below cites the
> `AD-T-###` scenario that documents the gap. Read that doc for full repro detail before
> starting any item — don't re-derive it from scratch.
>
> Confirmed decisions (2026-08-19 planning session): phase order as below; payouts list
> endpoint is in scope (new `zitro-api` `GET`); no design mockups — match existing utilitarian
> style used across `zitro-admin`; all Phase 4 items stay in scope.

---

## Phase 1 — Shared infra (do once, benefits multiple screens)

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

Delivered: `DataTableComponent` got an `error` input (distinct error row, priority
loading > error > empty > rows) and real pagination wiring (already had `pagination`
input/`pageChange` output — just needed a `[error]` binding added alongside). Every
`lib-data-table` consumer (12 screens) now sets its `error` signal on request failure.
Pagination itself was wired for the 7 screens with a real, confirmed backend total count:
Businesses, Users, Admins, Brands, Orders, Coupons, Delivery Partners. Categories/Tags/
Banners/Delivery Zones got the error-state fix only (no backend total-count support to
paginate against); Products intentionally skipped (backend search endpoint returns no
total count at all — would need a backend change first, and CRUD itself is already a
tracked separate gap per AD-T-412).

**Two real bugs found and fixed along the way** (both are the exact "recurring bug
pattern (a)" flagged in the handoff — backend returns a paged wrapper object, frontend
types the response as a bare array):

- `listAdminOrders()` — backend returns `{ orders, totalCount, page, pageSize }`; frontend
  typed it as `OrderSummaryDto[]`. This meant `[rows]` on the Orders table was bound to a
  non-iterable object on every load — the screen was silently broken (`@for` over a
  non-array throws), not just missing pagination. Confirmed via direct API inspection and
  reproduced live before the fix.
- `listDeliveryPartners()` — same shape mismatch, `{ items, total }` vs. a typed bare
  array. Same class of bug, same fix pattern.

**A third, subtler bug surfaced only once pagination was actually wired and rendered:**
the frontend's shared `PagedResult<T>` interface (`admin-api.service.ts`) was typed with a
`total` field, but the backend's shared `Zitro.Shared.PagedResult<T>` class serializes as
`totalCount`. This was invisible before because Businesses/Users/Admins/Brands never
actually read `.total` anywhere — first real usage (this pagination work) immediately
produced `1 / NaN` in the pagination footer. Fixed by renaming the frontend interface
field to `totalCount` and updating every consumer. Caught and fixed via live verification,
not just code review — worth noting since it's exactly the kind of bug that looks fine in
isolation (both endpoints return _a_ paged shape) but breaks the moment a screen actually
uses the count field.

**Process note:** initial live verification was accidentally run against the deployed
`https://zitro-api.onrender.com` API, not local — `zitro-admin`'s
`environments/environment.ts` defaults to the deployed URL (same gotcha class as the
`zitro-restaurant` one in the handoff, just not previously called out for this app). Caught
mid-session, flipped to local, re-verified, flipped back before finishing. Worth adding to
the standing gotchas list: **check `zitro-admin`'s `environment.ts` too**, not just
`zitro-restaurant`'s.

### 1.1 Pagination wiring

**Gap:** AD-T-804/AD-T-306. `DataTableComponent` (`apps/libs/admin-ui/src/data-table/data-table.component.ts`)
already fully supports `pagination` input + `pageChange` output — confirmed by reading the
component. No screen passes it. Backend already returns paged `total`/`page`/`pageSize` on
businesses/users/admins.

**Scope:** Wire `pagination` + `(pageChange)` into each list component's template + fetch call.
Order: Businesses → Users → Admins (real paged data today) → Orders → Coupons →
Delivery Partners → Brands/Tags/Categories/Banners (consistency pass).

**Size:** S per screen, ~9 screens total.

### 1.2 Network-error vs. empty-state

**Gap:** AD-T-802/803. Every list screen except Dashboard does `error: () => this.loading.set(false)`,
which falls through to the data-table's "no results" empty message — indistinguishable from a
genuinely empty list.

**Scope:** Decide once: either add an `error` input to `DataTableComponent` (shared fix,
touches one file + every consumer's template) or a shared error-banner pattern above each
table. Recommend the `DataTableComponent` input — smallest total diff. Then apply the `error`
signal to every screen's `error:` callback (currently just sets `loading = false`; also set
`error = true`/message).

**Size:** M (component change + ~11 screen call-sites).

---

## Phase 2 — Business Management close-out (AD-004/AD-005)

### 2.1 Business detail — Users tab

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-312. `admin-business-detail.component.ts` — `activeTab` signal switches to
`'users'` but the template has no case for it.

**Backend:** `GET /api/businesses/{id}/users` already exists
(`BusinessesController.cs:323`, `ListBusinessUsersQuery`) — returns owner/manager/staff.
No backend work needed.

**Delivered:** Added a `'users'` template block rendering `listBusinessUsers()` results via
`DataTableComponent` (name/phone/email/role/active), lazy-loaded on first tab-select via a
new `switchTab()` method, cached after first load so re-switching tabs doesn't refetch.
Verified live: EFC Pizza's Users tab shows "EFC Owner" (owner) and "Ramesh Kumar" (staff) —
matches the seeded test accounts.

### 2.2 Business detail — Orders tab

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** Same AD-T-312, `'orders'` case.

**Backend:** `GET /api/admin/orders?businessId=...` already accepts the param
(`AdminOrdersController.cs:26`) — no backend work needed.

**Delivered:** Added an `'orders'` template block reusing `DataTableComponent` (order ID,
status, total, date — business column omitted since already scoped), backed by
`listAdminOrders({businessId, page, pageSize})` with its own pagination state, lazy-loaded
via the same `switchTab()` method as 2.1. Verified live via network tab: the scoped request
(`?businessId=...&page=1&pageSize=20`) fires only once per tab visit and returns only that
business's orders.

### 2.3 Orders screen — business filter

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-505. `AdminOrdersComponent` has phone/orderId/status/date filters only.

**Backend:** Already supported (same `businessId` param as 2.2).

**Delivered:** Added a business-select dropdown to `AdminOrdersComponent`, populated once
on init via `listBusinesses({pageSize: '200'})`, wired to the existing `businessId` query
param on the main orders search. Verified live: selecting a business immediately re-fires
`GET /api/admin/orders` with `businessId` set and filters the table.

### 2.4 Brands — branches drill-down

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-403. `AdminApiService.getBrandBranches()` exists and hits
`GET /api/brands/{id}/branches`, but nothing in `AdminBrandsComponent` calls it.

**Delivered:** Added generic expandable-row support to `DataTableComponent`
(`#expandedRow` template projection + `isRowExpanded(row)` input predicate — reusable by
any future screen, not brands-specific) and a "View Branches" row action on
`AdminBrandsComponent` that expands the row in place (per-brand branch cache, no
navigation, no modal). Verified live: click expands/collapses without a route change,
branches fetch fires once and is cached on toggle-back, empty-branches case renders "No
branches under this brand yet." (confirmed accurate via direct API call, not a bug —
EFC Pizza genuinely has zero linked branches in local seed data).

---

## Phase 3 — Commercial completion (highest business value)

### 3.1 Coupon form — remaining fields

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-604 — "the single most consequential gap in this document." Current create form
only has code/type/value/title/description/validFrom (validFrom etc. added in the earlier
fix pass). Missing against the 9-step validation order in `zitro-api/CLAUDE.md` §12: order-type
restriction, new-customer-only toggle, cooldown period, min-order-amount, usage-limit.

**Delivered:** Read `CreateCouponCommand`/`CreateCouponRequest` directly to confirm exact JSON
field names before wiring (avoided the name-drift bug class from fix #1/#4). Added five fields
to the create form: `minOrderAmount` (number), `usageLimit` (number, optional — empty means
unlimited), `cooldownPeriodDays` (number, optional), `isNewCustomerOnly` (checkbox),
`applicableOrderTypes` (checkbox group: dine-in/takeout/delivery/scheduled — empty selection
sends `null`, which the backend's validation treats identically to an empty array: no
restriction). Verified end-to-end live: created a coupon with all five fields set, confirmed
via direct API read that every field persisted with the exact values submitted.

Out of scope (not in the original gap list, not added): `maxDiscount`, `maxUsagePerUser`/
`usagePeriod`, `termsAndConditions`, `campaignName`, cashback fields — the coupon entity
supports these but they weren't called out in AD-T-604's own scope.

### 3.2 Delivery zones — scope per business

**Gap:** AD-T-610. `createDeliveryZone()` only sends `{ name }`. `DeliveryZoneDto` already has
an optional `businessId` field that nothing sets or filters by.

**Scope:** Add a business-select field to the create form (send `businessId`); add a
business filter to the list view. Confirm backend already accepts/persists `businessId` on
create (check `CreateDeliveryZoneCommand` — flagged as a maybe-needs-backend-check item, not
confirmed clean like 2.1–2.3).

### 3.3 Payouts — real batch-review + mark-paid UI

**Gap:** AD-T-612. `AdminPayoutsComponent` is currently just a date-range form + Generate
button with no result table — confirmed by reading the component source, it's a ~75-line
stub. `markPayoutPaid()` exists in `AdminApiService` but nothing calls it.

**Backend status (confirmed via code read):**

- `POST /api/admin/payouts/generate` already returns the full calculated rows synchronously —
  `GeneratedPayoutDto(PayoutId, BusinessId, BusinessName, GrossAmount, CommissionAmount,
NetAmount, OrderCount, Status)`. No change needed here.
- `PUT /api/admin/payouts/{id}/mark-paid` already exists — request `{ PayoutReference }`,
  response `MarkPayoutPaidDto` or a 400 with `ErrorCode` (`ALREADY_PAID`, `PAYOUT_NOT_FOUND`,
  `INVALID_REFERENCE`).
- **Missing:** a `GET /api/admin/payouts` list endpoint — needed so the review table survives
  a page reload / revisit instead of only existing in memory right after a `generate` call.
  New `zitro-api` work, in scope per this planning session.

**Scope:**

- `zitro-api`: add `GET /api/admin/payouts` (paged, filterable by date range/status) —
  small additive endpoint, same pattern as the AD-T-413 categories fix (commit `26b5954`).
- `apps`: render the rows returned by `generate()` in a table (business, gross, commission,
  net, order count, status); add a "Mark Paid" row action with a payout-reference input,
  wired to `markPayoutPaid()`; on load, call the new list endpoint so a revisit isn't empty.

**Size:** L — the biggest single item in this plan.

---

## Phase 4 — Smaller / lower-priority polish

### 4.1 Categories — business scoping on create

**Gap:** noted in the execution log §4 as "may not be intended" — the create form has no
`businessId` field, so every category created is global/unscoped.

**Scope:** First confirm with product intent whether categories should ever be
business-scoped (some may be intentionally global, e.g. shared taxonomy) before adding a
field — don't add a control that fights the data model. Flag during implementation if the
"correct" answer isn't obvious from `zitro-api/CLAUDE.md`.

### 4.2 Tag → business assignment

**Gap:** AD-T-408. No `tag-assign-business-select` anywhere in `AdminTagsComponent`, despite
being in both the testid list and acceptance criteria.

**Scope:** Add an assign-to-business control (multi-select or per-business toggle list) on
the tag row/detail; confirm backend assignment endpoint exists before building UI for it.

### 4.3 Admins screen — server-side-only permission gating

**Gap:** AD-T-707/801 tail. Nav-hiding is done (fix #6). Still missing: a `requirePermission`
route guard on `/admins` (AD-000 spec'd one, `app.routes.ts` doesn't have it), and
`AdminAdminUsersComponent` doesn't hide/disable its own Add/Deactivate buttons by role — only
the backend's `[RequirePermission]` check actually stops a non-SuperAdmin, client-side is
purely cosmetic right now.

**Scope:** Add the route guard; disable (not just hide) write actions in the component based
on the same `hasPermission()` logic already added to `AdminApiService` in fix #6.

### 4.4 Confirmation dialogs — native → shared component

**Gap:** AD-T-805. AD-000 spec'd a shared `confirmation-dialog` component; every
delete/deactivate action currently uses native `confirm()`.

**Scope:** Build/reuse a shared dialog component, swap into tags/coupons/products/banners/
brands/admins delete-deactivate actions. Cosmetic — no functional gap — but also blocks clean
Playwright coverage later (native dialogs need `page.on('dialog')` handling).

### 4.5 Banners — image upload + target-business/link field

**Gap:** AD-T-616/617. `#banner-img` is a plain URL text field, not a file-upload widget.
No target-business or link field on the create form at all.

**Scope:** (a) image upload — needs a storage/upload endpoint decision (Firebase Storage?
existing media upload pattern elsewhere in the app?) before UI work starts. (b) link/target
field — straightforward form field addition once the intended behavior (link to a business
page vs. arbitrary URL) is confirmed.

---

## Sequencing note

Phases 2 and 3 have zero blocking dependencies on Phase 1 — pagination/error-state can be
built in parallel with or after the business-logic screens if that's preferred once
implementation starts. Phase 4 items are independent of each other and can be picked up in
any order or dropped individually without affecting the rest.

Commit per logical fix (established pattern this initiative) rather than batching phases into
one diff — smaller commits stay cheaper to verify.
