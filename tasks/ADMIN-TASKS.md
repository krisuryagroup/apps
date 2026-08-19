# ZITRO Admin Dashboard — Task Definitions (AD-000 to AD-020 + TEST-001/002)

> **Read `ADMIN-STATUS.md` first.** Same 5-stage protocol as the customer/restaurant apps.
> **Auth:** Admin JWT (`POST /api/admin/auth/login`), roles `SuperAdmin | Ops | Support |
Finance`, fine-grained permission claims (e.g. `admins:read`) enforced server-side via
> `[RequirePermission]`. Hide/show UI by permission, but never rely on that alone — every
> write action's real gate is the backend permission check.

---

## AD-000 — Scaffold `zitro-admin` Nx App + Shared Admin-UI Components

**Size:** L | **No design needed for the scaffold itself; component visual design comes per-screen**

**What this delivers:**

- `nx g @nx/angular:app zitro-admin --directory=apps/zitro-admin` — web only, no Capacitor.
- `app.config.ts`: `provideTheme()`, `provideI18n()`, HTTP client with an **admin-auth**
  interceptor variant (stores/attaches Admin JWT) + `errorInterceptor`.
- Route guards: `adminAuthGuard` (redirect to login if no valid token) and a
  `requirePermission(perm: string)` guard factory for permission-gated routes (e.g. AD-019).
- **Decide and create the shared component location** — either `libs/ui/src/admin/` inside
  the existing `@zitro/ui`, or a new `@zitro/admin-ui` lib (cleaner Nx boundary if
  `zitro-customer`/`zitro-restaurant` should never accidentally import admin-only
  components — recommend the new lib for that reason). Build:
  - `data-table` — sortable/filterable/paginated table with column config, row actions, CSV export
  - `sidebar-nav` — collapsible desktop sidebar → hamburger on mobile, permission-aware item visibility
  - `stat-card` — dashboard metric tile
  - `form-builder` or at minimum a consistent form-field wrapper (label, error, hint) reused across every CRUD form below
  - `confirmation-dialog` for destructive actions (reuse from `@zitro/ui/common` if generic enough already)
- Empty shell routes for every AD-XXX page.

**Acceptance criteria:**

- [ ] `nx serve zitro-admin` runs, shows themed shell with sidebar
- [ ] `nx build zitro-admin --configuration=production` passes clean
- [ ] `nx lint zitro-admin` passes Nx boundary rules
- [ ] The new shared admin-ui location builds/lints independently and has zero dependency on `zitro-customer` or `zitro-restaurant` app code

---

## AD-001 — Login

**Size:** S | **API:** `POST /api/admin/auth/login` — ready

Email + password. On success, route to AD-002. Error states: invalid credentials, deactivated
account. `data-testid`: `email-input`, `password-input`, `login-btn`, `error-message`.

**Acceptance criteria:**

- [ ] Deactivated admin shows a distinct message from wrong-password
- [ ] JWT stored, dashboard loads without a second auth round-trip

---

## AD-002 — Dashboard

**Size:** M | **API:** `GET /api/admin/dashboard` — ready

Platform-wide stats (whatever the endpoint returns — audit exact response shape at task
start; this doc doesn't assume specific fields since it wasn't read in detail during
planning). Quick links to businesses-pending-approval count → AD-004, low-stock alerts across
all businesses if surfaced here.

`data-testid`: `dashboard-stat-{key}` (key per actual response field), `dashboard-pending-approvals-link`.

**Acceptance criteria:**

- [ ] Every stat tile matches a real backend field, no placeholder/mock values left in
- [ ] Loading/error/empty states all handled

---

## AD-003 — Businesses: List/Search (+ Invite Partner)

**Size:** M | **API:** `GET /api/businesses` — ready, filters: `onboardingStatus`,
`businessType`, `town`, `search`, paginated. Invite action needs `zitro-api` TASK-039
(same card as RS-002b).

Table (via the shared `data-table`): name, slug, type, town, onboarding status badge, active
toggle state, created date. Filter bar matching the query params above. Row click → AD-004.

**"Invite Partner" action (new, TASK-039):** a form (business basics + owner name/phone/email)
that calls `POST /api/businesses` then `POST /api/businesses/{id}/users` with `sendInvite:
true` — creates the business + owner account and emails the owner a setup link (RS-002b).
This is the admin-initiated counterpart to RS-002's public application form. Show invite
status (sent/accepted/expired) per business, with a "resend invite" action for the
failed-email case noted in TASK-039.

`data-testid`: `business-search-input`, `business-filter-status`, `business-filter-type`, `business-table`, `business-row-{id}`, `invite-partner-btn`, `invite-form-*`, `invite-resend-btn`.

**Acceptance criteria:**

- [ ] `pending` onboarding status is visually distinct (this is the queue Ops checks daily)
- [ ] Pagination and filters combine correctly (filtered result respects page size)
- [ ] Invited business appears in this list immediately with a distinct "invited, not yet accepted" state

---

## AD-004 — Business Detail + Approve/Reject Onboarding

**Size:** L | **Backend:** KYC field display needs `zitro-api` TASK-032

**APIs:** `GET /api/businesses/{id}` (ready), `POST /api/businesses/{id}/approve` (ready —
body `{ approved: bool, rejectionReason?: string }`, this single endpoint already handles
both approve and reject)

**Expected behaviour:**

- Full profile view: identity, address, contact, hours — plus (once TASK-032 ships)
  FSSAI/GST/PAN, uploaded verification docs (viewable/downloadable), payout account
- Approve/Reject action bar, reject requires a reason (pre-fill common reasons as quick-picks:
  "incomplete documents", "invalid FSSAI", "duplicate listing", plus free text)
- Tabs or sections: Profile | Users (staff list, read-only here — editing happens in RS-016
  or via the existing `POST/PUT .../users` admin endpoints if you want admin-side staff
  management too, confirm during design) | Orders summary | Payouts summary

`data-testid`: `business-detail-profile`, `business-detail-docs`, `business-approve-btn`, `business-reject-btn`, `business-reject-reason-select`, `business-reject-reason-text`.

**Acceptance criteria:**

- [ ] Approving flips `isActive: true` and the business immediately appears on the customer app (`GET /api/businesses/nearby`) — spot check this cross-app effect during testing
- [ ] Rejecting is visible to the partner at RS-003 with the reason shown
- [ ] Document viewer handles at minimum image + PDF verification docs

---

## AD-005 — Business: Edit

**Size:** M | **Backend:** `zitro-api` TASK-032 for KYC/bank fields

**API:** `PUT /api/businesses/{id}` — ready today for non-KYC fields, extended by TASK-032

Same field set as RS-015 (name, description, address, contact, hours, min-order, delivery
fee, pure-veg) **plus** admin-only fields RS-015 excludes: `CommissionPercentage`,
`IsCommissionNegotiated`, `IsFeatured`.

`data-testid`: `business-edit-*` (mirror RS-015's ids where the field is shared), `business-edit-commission-rate`, `business-edit-featured-toggle`.

**Acceptance criteria:**

- [ ] Commission rate change is visible on the business's next payout calculation (spot-check against AD-016)
- [ ] Patch semantics — unsent fields stay unchanged

---

## AD-006 — Brands Management

**Size:** M | **APIs:** full CRUD ready (`GET/POST/PUT/DELETE /api/brands`, `GET /api/brands/{id}/branches`)

List/create/edit/delete brands, view branches under each brand (read-only list here, branch
detail is really just its own business record → AD-004).

`data-testid`: `brand-list`, `brand-add-btn`, `brand-name-input`, `brand-branches-list`.

**Acceptance criteria:**

- [ ] Deleting a brand with active branches is blocked or requires explicit confirmation of consequences (verify actual backend behavior — cascade? restrict? — during Stage 0 audit)

---

## AD-007 — Tags Management

**Size:** S | **APIs:** full CRUD ready (`GET/POST/PUT/DELETE /api/admin/tags`, business-tag assignment endpoints)

Manage the cuisine/food-type filter chips shown on the customer app's discovery screens.
Create/edit/deactivate/permanently-delete tags, assign to businesses.

`data-testid`: `tag-list`, `tag-add-btn`, `tag-priority-input`, `tag-assign-business-select`.

**Acceptance criteria:**

- [ ] Deactivated (not permanently deleted) tags disappear from customer app filters but remain assignable/reactivatable here
- [ ] Priority ordering matches what customer app's `GET /api/tags` returns

---

## AD-008 — Products: Global Catalog

**Size:** L | **APIs:** full CRUD + bulk + media ready (`/api/admin/products*`)

Cross-business product management: list/search/filter by business, create/edit/delete,
bulk-create, media upload, variation management. This is the same underlying data RS-007
manages scoped to one business — reuse the same form components if the Nx boundary rules
allow (`@zitro/ui`/`@zitro/admin-ui` shared between apps), don't reimplement the item form
twice.

`data-testid`: `product-search`, `product-filter-business`, `product-table`, `product-add-btn`, `product-bulk-import-btn`.

**Acceptance criteria:**

- [ ] Same variant/flag field set as RS-007's item form (spicy/recommended/bestseller/new, food type, variants)
- [ ] Bulk import here and RS-009's bulk import share a template format if both exist — don't diverge

---

## AD-009 — Categories: Global

**Size:** M | **APIs:** full CRUD + bulk + subtree/ancestors ready

Same pattern as AD-008 for categories, including the 3-level LTREE hierarchy (subtree/ancestors
queries already available for building a tree view).

`data-testid`: `category-tree`, `category-add-btn`, `category-parent-select`.

**Acceptance criteria:**

- [ ] Tree view correctly reflects `path` hierarchy up to 3 levels
- [ ] Reordering (`priority`) persists and reflects in the customer app menu order

---

## AD-010 — Order Oversight / Cross-Business Search

**Size:** M | **Backend:** `zitro-api` TASK-035 (pending, new — `GET /api/admin/orders` doesn't exist yet)

Support/Finance need to look up any order across every business (customer complaint,
payment dispute) without going business-by-business through `business-portal`. Filters:
business, status, date range, customer phone, order ID.

`data-testid`: `order-search-business-filter`, `order-search-status-filter`, `order-search-date-range`, `order-search-phone`, `order-search-table`.

**Acceptance criteria:**

- [ ] Search by display order ID (`ORD...`) jumps straight to that order's detail
- [ ] Phone search matches the masked/partial phone stored, not a raw full-text scan (check backend implementation for how phone privacy is handled)

---

## AD-011 — Users: List/Detail/Block

**Size:** M | **APIs:** ready (`GET /api/admin/users`, `/api/admin/users/{id}`, block/unblock)

Customer account list/search (segment filter, free-text search), detail view (orders, wallet,
addresses summary), block/unblock action.

`data-testid`: `user-search`, `user-segment-filter`, `user-table`, `user-block-btn`, `user-unblock-btn`.

**Acceptance criteria:**

- [ ] Blocked user cannot place new orders on the customer app (cross-app spot check)
- [ ] Block requires a reason (if the backend supports one — verify during Stage 0)

---

## AD-012 — Coupons Management

**Size:** M | **APIs:** full CRUD ready

Create/edit/delete/deactivate coupons — all fields matching the 9-step validation order
documented in `zitro-api/CLAUDE.md` §12 (active flag, dates, applicable order types,
new-customer-only, cooldown, max-usage, min-order-amount, usage limit, discount calc).

`data-testid`: `coupon-list`, `coupon-add-btn`, `coupon-code-input`, `coupon-discount-type`, `coupon-valid-dates`, `coupon-usage-limit`.

**Acceptance criteria:**

- [ ] Form covers every field the validation order checks — no field silently unsettable from UI
- [ ] Created coupon is immediately usable on customer app cart (`POST /api/cart/coupon`)

---

## AD-013 — Cashback Rules

**Size:** M | **APIs:** full CRUD ready

Wallet cashback rule management — matches `Wallet` config semantics from `zitro-api/CLAUDE.md`
§14 (credited only on delivered/completed, expiry days, etc.).

`data-testid`: `cashback-rule-list`, `cashback-rule-add-btn`, `cashback-rule-percent`, `cashback-rule-expiry-days`.

**Acceptance criteria:**

- [ ] Rule changes only affect orders placed after the change (no retroactive recalculation, confirm this is actual backend behavior)

---

## AD-014 — Delivery Partners Management

**Size:** M | **APIs:** ready (`GET /api/admin/delivery/partners`, status update)

List/search delivery partners, view status (active/inactive/suspended), change status.

`data-testid`: `partner-list`, `partner-status-filter`, `partner-status-select`.

**Acceptance criteria:**

- [ ] Suspending a partner mid-delivery doesn't orphan their active order (verify backend handles this gracefully — flag if not, don't paper over in UI)

---

## AD-015 — Delivery Zones: Global Admin

**Size:** S | **APIs:** ready (`GET/POST /api/admin/delivery/zones`)

Platform-wide view/creation of delivery zones (distinct from RS-012's per-business zone
management — likely the same underlying data, admin view is cross-business).

`data-testid`: `admin-zone-list`, `admin-zone-business-filter`.

**Acceptance criteria:**

- [ ] Confirm during Stage 0 whether this duplicates RS-012 functionality or is genuinely a different (read-mostly, cross-business) view — don't build two full CRUD UIs for the same data if avoidable

---

## AD-016 — Payouts: Generate/Mark Paid

**Size:** M | **APIs:** ready (`POST /api/admin/payouts/generate`, `PUT .../mark-paid`)

Generate payout batch for a period, review calculated amounts (gross/commission/tax/net) per
business, mark as paid with a reference number once bank transfer is done externally.

`data-testid`: `payout-generate-btn`, `payout-period-select`, `payout-batch-table`, `payout-mark-paid-btn`, `payout-reference-input`.

**Acceptance criteria:**

- [ ] Generated batch amounts match each business's independently-viewable order history for that period (spot-check math)
- [ ] Can't mark paid twice (idempotent / clearly disabled after first mark)

---

## AD-017 — Subscription Plans

**Size:** M | **APIs:** full CRUD ready

Manage customer-facing subscription plans (`GET/POST/PUT/DELETE /api/admin/subscriptions/plans`).

`data-testid`: `plan-list`, `plan-add-btn`, `plan-price-input`, `plan-benefits-editor`.

**Acceptance criteria:**

- [ ] Deleting/deactivating a plan doesn't break existing subscribers already on it (verify backend behavior)

---

## AD-018 — Banners Management

**Size:** M | **Backend:** `zitro-api` TASK-037 (pending — no list/delete endpoint today)

**APIs:** `POST /api/admin/banners`, `PUT /api/admin/banners/{id}` ready; list + delete need TASK-037

Create/edit banners (image, target business/link, active dates), once TASK-037 ships: list
all banners, delete.

`data-testid`: `banner-list`, `banner-add-btn`, `banner-image-upload`, `banner-link-input`, `banner-delete-btn`.

**Acceptance criteria:**

- [ ] Banner impression/click/scratch tracking (existing customer-facing endpoints) numbers are visible somewhere in this UI for basic performance visibility

---

## AD-019 — Admin Users Management (SuperAdmin-gated)

**Size:** M | **APIs:** full CRUD ready, already permission-gated server-side (`admins:read` etc., SuperAdmin bypasses all checks)

List/create/edit/deactivate/reactivate admin accounts, reset password, view own profile,
change own password. **This screen is reachable from both `zitro-admin` and
`zitro-superadmin`** — build it once as a shared component (per AD-000's strategy) since the
backend permission model, not the app, is what actually restricts non-SuperAdmin roles from
using the write actions.

`data-testid`: `admin-list`, `admin-add-btn`, `admin-role-select`, `admin-deactivate-btn`, `admin-reset-password-btn`, `my-profile-section`, `change-password-btn`.

**Acceptance criteria:**

- [ ] Non-SuperAdmin role sees the list (GET is open to all admin roles per the backend docstring) but write actions are disabled/hidden, and attempting one anyway gets a real 403 from the backend, not just a hidden button
- [ ] SuperAdmin can create another SuperAdmin

---

## AD-020 — Firebase Hosting Deploy

**Size:** S | See `DEPLOYMENT-TASKS.md` — `admin.zitro.in`.

---

## AD-TEST-001 — Unit + Integration Tests

Same standard as customer/restaurant apps.

## AD-TEST-002 — E2E Critical Journeys

Minimum set: login → approve a pending business → business appears live on customer app;
create a coupon → coupon usable on customer app cart; generate payout → mark paid.
