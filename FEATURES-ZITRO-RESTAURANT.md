# zitro-restaurant — Feature & Business-Value Reference

> **Purpose of this doc:** high-level "what's actually built and why it matters" — see
> `tasks/RESTAURANT-TEST-SCENARIOS.md` for the detailed manual test checklist and known-bug
> tracking. Keep this updated whenever a feature is added, removed, or its scope changes.

**Who uses this app:** the restaurant/grocery-store partner themselves — the business owner,
manager, or staff who logs in day-to-day to run their own single business on the platform (as
opposed to `zitro-admin`, which is platform staff managing every business).

**Stack:** Angular 19 standalone components, signals. Backend: `zitro-api`'s
`BusinessPortalController` and related module handlers — every write here is scoped to
`businessId == token.business_id`, enforced server-side (TASK-031 boundary — a business JWT can
never touch another business's data, even by guessing an ID in devtools).

---

## 1. Onboarding & Access

**Business value:** the funnel that gets a new restaurant partner from "applied" to "actively
taking orders."

- **Public apply form** (`/apply`, no login): a prospective partner applies without an account.
- **Accept invite** (`/accept-invite`): the flow when an _admin_ invites a business first (see
  `FEATURES-ZITRO-ADMIN.md` §1) — the owner sets a password to activate their account.
- **Onboarding / KYC** (`/onboarding`): document upload and profile completion after signup.
- **Login** (`/login`): phone + password. **Known gap:** login doesn't branch on
  `onboardingStatus` — a not-yet-approved partner lands on the full `/dashboard` exactly like an
  approved one; there's no route guard anywhere restricting a pending business's access. Not
  currently a security hole (see admin doc's gating note) but a UX/product gap against spec.

## 2. Dashboard & Orders — the daily operating loop

- **Dashboard** (`/dashboard`): today's order count, revenue, pending-order count, low-stock
  alerts, quick links to pending orders and "add menu item."
- **Live Orders Queue** (`/orders`): incoming orders with status transitions
  (confirmed → preparing → ready → etc).
- **Order Detail** (`/orders/:orderId`): full item list, customer info (phone masked), charges
  breakdown, status timeline.

## 3. Menu Management — two distinct modes

**Business value:** this is how a restaurant's actual product catalog gets built and kept
current — the single most important ongoing task for any partner.

- **Independent mode** (`/menu`, default): full category + product CRUD owned entirely by this
  business — add/edit/delete categories, add/edit/delete products (name, price, category, food
  type veg/non-veg, availability toggle), plus a **Bulk Price Adjust** action (added
  2026-08-22) to bump this business's own product prices by a percentage or flat amount in one
  go, optionally scoped to the currently-selected category. **Known gap:** the item form itself
  is still only 4 fields — no description, image, variants, or spicy/recommended/bestseller/new
  flags, even though the backend `Product` entity supports all of them (an admin can set these
  via the fuller form on `zitro-admin`'s `/products` screen, see `FEATURES-ZITRO-ADMIN.md` §2).
- **Shared mode** (auto-switches at `/menu` when `menuMode: shared`): the business doesn't own
  products directly — it inherits a brand's master catalog (set up by an admin, see
  `FEATURES-ZITRO-ADMIN.md` §1's "Promote to Brand Master") and can only layer branch-level
  exceptions on top: a different price here, hide an item here, mark it temporarily unavailable
  here. Editing the master item itself is an admin/brand-level action, not available here — by
  design, so ten branches under one brand don't have to re-enter the same menu ten times. Also
  has its own **Bulk Price Adjust** (added 2026-08-22): bumps the branch's _effective_ price
  (its own existing override, or the master price if none) for every master item by a
  percentage/flat amount, writing a branch-level override per item — never touches the brand's
  own master prices.
- **AI Menu Import** (`/menu/import`): upload a photo or PDF of an existing physical menu and
  have it parsed into structured categories/products automatically — the fast-onboarding path
  for a partner who doesn't want to hand-enter everything. (The behind-the-flag AI-extraction
  path itself needs external API-key/flag setup not present in every environment — the
  flag-off/manual-review path is what's been verified.)
- **Bulk spreadsheet import** and **clone menu from another branch/brand**: not yet implemented
  (routes/spec exist, no working UI).

## 4. Inventory (grocery businesses only)

- **Inventory** (`/inventory`): stock-level tracking and manual adjustment. Only meaningful for
  `business_type: grocery` — a restaurant's inventory table is intentionally always empty, not
  a bug.

## 5. Delivery Zones

**Business value:** defines where this specific business will actually deliver, and what it
costs — directly affects whether a nearby customer can even place an order.

- **Delivery Zones** (`/delivery-zones`): lets a partner draw their own delivery area on a real
  map and set a base fee, fee-per-km, and surge multiplier. **Fixed 2026-08-22** (was
  previously broken — the form only collected a name and base fee, and every save 400'd since
  the backend requires a polygon boundary with no UI anywhere to define one). Now uses
  `PolygonMapPickerComponent` (`@zitro/ui`, shared with `zitro-admin`'s own delivery-zone
  screen): click to add each boundary point, click the first point again (or "Finish Drawing")
  to close the shape, drag any point afterward to reshape, "Clear & Redraw" to start over.

## 6. Ratings, Payouts, Profile, Staff

- **Ratings & Reviews** (`/ratings`): view customer ratings, reply to reviews.
- **Payouts** (`/payouts`): view payout history — orders included, commission, reference number.
  No bank-account management (gap).
- **Profile & Settings** (`/profile`): business profile edit (name, description, phone,
  address, hours).
- **Staff** (`/staff`): add/edit/deactivate staff accounts under this business, reset a staff
  member's password. **Known gap:** no role-differentiated route guard anywhere — `owner`,
  `manager`, and `staff` roles all get identical access to every screen (e.g. payouts, profile)
  once logged in; only authentication is enforced, not role.

---

## Platform-wide gaps that affect this app (see admin doc for full detail)

- **Silent write failures**: several `error:` callbacks across this app only log, with no
  visible error message shown to the partner — a failed save can look like it succeeded.

---

## Cross-references

- Full manual test checklist + live bug-fix log: `tasks/RESTAURANT-TEST-SCENARIOS.md`
- Admin-side counterpart features (brand/business/approval): `FEATURES-ZITRO-ADMIN.md`
- Backend module contracts: `zitro-api/CLAUDE.md`
