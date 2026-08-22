# zitro-admin — Feature & Business-Value Reference

> **Purpose of this doc:** a high-level "what's actually built and why it matters" reference —
> not a test checklist (see `tasks/ADMIN-TEST-SCENARIOS.md` for that) and not an implementation
> guide (see `apps/CLAUDE.md` and the source itself). Read this first when picking up work on
> `zitro-admin` after time away, or when deciding whether a feature needs to be built or already
> exists. Written from the shipped code, not the original task spec — where the two disagree,
> this doc describes what actually ships. **Keep this updated** whenever a feature is added,
> removed, or its scope materially changes — a stale doc here is worse than no doc.

**Who uses this app:** platform operations staff (SuperAdmin, Ops, Support, Finance roles) who
run the day-to-day marketplace — onboarding restaurants, managing catalog, handling orders,
coupons, and payouts. Not for platform-wide configuration (that's `zitro-superadmin`, which
reuses almost every screen listed here — see `FEATURES-ZITRO-SUPERADMIN.md`).

**Stack:** Angular 19 standalone components, signals, `@zitro/admin-ui` (shared library — every
screen below actually lives in `apps/libs/admin-ui/src/`, not in this app's own `src/`, so the
same code runs in `zitro-superadmin` too). Backend: `zitro-api`, primarily the `Businesses`,
`Catalog`, `Orders`, `Delivery`, and `Admins` modules.

---

## 1. Business & Brand Management — the core onboarding funnel

**Business value:** this is how a new restaurant or grocery store actually gets onto the
platform, and how the platform enforces that nothing goes live without a human checking it
first.

- **Invite a new business** (`/businesses`, "+ Invite Partner"): creates the business record
  AND its owner's login account in one atomic step. Slug auto-generates from the name if not
  given. Optional: link to an existing brand, drop a pin on a map to capture exact
  lat/lng (auto-fills the Town field via reverse-geocode when that succeeds — see known gaps),
  search a place by name, or use current location.
- **Approve / reject a pending business** (`/businesses/:id` detail page): every new business
  starts `Pending` and `IsActive = false` — invisible to the customer app's search until an
  admin approves it. Approving flips both fields; rejecting records a reason. This is the gate
  that keeps unvetted restaurants off the live marketplace.
- **Edit a business** (`/businesses/:id/edit`): name, description, phone, town, commission %,
  featured flag, brand link, menu mode (independent/shared), lat/lng — all in one form.
- **Brands** (`/brands`): a brand (e.g. "Dominoz") is the parent umbrella multiple business
  branches can link to. Create/edit/delete a brand; see and manage all branches linked to it
  from one panel, including a one-click "Promote to Brand Master" that migrates an independent
  branch's own catalog into the brand's shared master catalog (so every other branch under that
  brand can subscribe to the same menu instead of each restaurant re-entering it by hand).
- **Tags** (`/tags`): labels attachable to businesses for filtering/discovery on the customer app.

**Known gaps** (as of 2026-08-22): no delete-business UI (backend endpoint exists,
unused); brand form doesn't expose logo/active-toggle (backend supports both); no bulk-import
of businesses.

---

## 2. Menu / Catalog Management

**Business value:** the actual products customers order. Two distinct models exist:
independent (each business owns its own catalog) and shared (a business inherits a brand's
master catalog and can only tweak price/hide/availability per branch — see
`RESTAURANT-TEST-SCENARIOS.md` RS-T-812–817 for the branch-side experience of this).

- **Categories** (`/categories`): create a category, scoped to a business.
- **Products** (`/products`): search, **create, and edit** (added 2026-08-22 — was
  read-only + delete-only before) products, plus a **Bulk Price Adjust** action (see below).
  The create/edit form covers name, price, description, image URL, category, food type, GST
  rate, HSN/SAC code, active/online-order toggles, and the four discovery flags
  (Recommended/Bestseller/New/Spicy). Create can target either a business (its own products)
  or a brand directly (its master catalog, `businessId = NULL`) — this is now also the way to
  author brand-master products by hand, not just via "Promote to Brand Master."
- **Bulk Price Adjust** (`/products`, "Bulk Price Adjust" button — added 2026-08-22): bumps
  every matching product's price by a percentage or a flat amount in one action, scoped to a
  business or a brand and optionally narrowed to a category. Backend:
  `POST /api/admin/products/bulk-price-adjust`. The restaurant app has the equivalent for a
  partner's own products/branch-overrides — see `FEATURES-ZITRO-RESTAURANT.md`.

**Known gaps:**

- Product delete exists; variation (size/option) management has no UI here (only via the
  restaurant app's own screens, indirectly).
- Category edit/delete has no UI either (backend endpoints exist, unused).

---

## 3. Order & User Management

- **Orders** (`/orders`): platform-wide order list with status/date filters. No per-business
  filter (gap).
- **Users** (`/users`): customer accounts — view, block/unblock.

---

## 4. Commercial — Coupons, Cashback, Payouts, Banners

**Business value:** the growth/marketing and money-movement side of the platform.

- **Coupons** (`/coupons`): create/list discount codes (code, type, value, validity, min order).
- **Cashback rules** (`/cashback-rules`): intentional placeholder — UI exists, no backend logic
  wired yet.
- **Subscriptions** (`/subscriptions`): same, intentional placeholder.
- **Delivery Partners** (`/delivery-partners`): activate/suspend a delivery rider account.
  No manual order-to-partner assignment UI — assignment is fully automatic
  (`Delivery.Module/Features/OrderAssigned`).
- **Delivery Zones** (`/delivery-zones`): per-business polygon delivery areas — name, base fee,
  per-km fee. As of 2026-08-22, the boundary is drawn on a real map (`PolygonMapPickerComponent`,
  `@zitro/ui`) — click to add each vertex, click the first vertex again (or "Finish Drawing") to
  close the shape, drag any vertex afterward to reshape, "Clear & Redraw" to start over. Replaces
  the previous raw-JSON-coordinates textarea.
- **Payouts** (`/payouts`): generate/review business payout runs.
- **Banners** (`/banners`): promotional banner CRUD for the customer app's home screen.

**Known gaps:**

- **Delivery zone fields are read-only config in practice** — `free_delivery_above`, base fee,
  per-km fee, surge multiplier all exist on `PricingConfigDto` but are seeded from
  `appsettings.json`, not editable from any UI. (The per-zone base fee/fee-per-km/surge
  multiplier on `/delivery-zones` itself ARE editable — this gap is specifically about the
  platform-wide `PricingConfigDto` defaults.)
- Delivery zone form has no active/inactive toggle.
- No delivery time-slot/scheduling feature, no customer-facing max-delivery-distance cutoff.

---

## 5. Platform Administration

- **Admins** (`/admins`, SuperAdmin-only): create/deactivate admin accounts, assign roles
  (SuperAdmin/Ops/Support/Finance) and permissions, reset another admin's password.
- **My Profile** (`/my-profile`): self-service change-password for the logged-in admin.
- **Dashboard** (`/dashboard`): 6 live stat tiles (today's orders/revenue, new users, active
  businesses, pending approvals, pending payouts) — available to every role, not just SuperAdmin.

---

## 6. Security note — fixed 2026-08-22

The customer-facing endpoints a business's own storefront page actually depends on —
`GET /api/businesses/{slug}`, `.../config`, `.../hours`, `.../menu` — previously had **no
approval/active-status filter** (only the discovery/search endpoint,
`GET /api/businesses/nearby`, was gated). A `Pending` or `Rejected` business was not
_discoverable_ via search, but its full storefront (address, hours, entire menu) was fully
reachable by anyone who had or guessed its slug — e.g. a shared link, QR code, or a business
that was approved and later suspended. All four handlers now filter on `IsActive`, matching
the nearby-search endpoint's existing gate; regression tests added
(`GetBusinessBySlugHandlerTests`/`GetBusinessConfigHandlerTests`/`GetBusinessHoursHandlerTests`/
`GetBusinessMenuHandlerTests`, "WhenBusinessIsNotActive" cases). Live-verified: a pending
business now 404s on all four endpoints; an approved one is unaffected; admin's own ID-based
business lookup (used by the approve/reject screen) is unaffected since it never filtered on
slug/IsActive in the first place.

---

## Cross-references

- Full manual test checklist: `tasks/ADMIN-TEST-SCENARIOS.md`
- Superadmin's reuse of these same screens: `FEATURES-ZITRO-SUPERADMIN.md`
- Restaurant partner's own menu/delivery experience: `FEATURES-ZITRO-RESTAURANT.md`
- Backend module contracts: `zitro-api/CLAUDE.md`
