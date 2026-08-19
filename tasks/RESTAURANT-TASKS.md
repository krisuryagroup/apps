# ZITRO Restaurant Partner Portal — Task Definitions (RS-000 to RS-018 + TEST-001/002)

> **Read `RESTAURANT-STATUS.md` first** for the status board and execution order.
>
> **Auth:** Business JWT (`POST /api/business-auth/login`). Token carries `business_id` +
> `role` (owner | manager | staff) claims. Every `zitro-api` route this app calls under
> `/api/business-portal/{businessId}/...` now enforces `businessId == token.business_id`
> (fixed as `zitro-api` TASK-031 — see that repo's `TASK-STATUS.md`).
>
> **Dual-mode:** same codebase serves a full web management portal (desktop) and an Android
> APK via Capacitor (live order alerts, quick accept/reject). Every task below should be
> checked in both a desktop viewport and a mobile viewport before sign-off.
>
> **Every task follows the same 5-stage protocol as the customer app:**
> Stage 0 Audit (incl. checking `zitro-api/TASK-STATUS.md` for the backend task this screen
> needs) → Stage 1 Scaffold → Stage 2 Style (via `--zitro-*` tokens only) → Stage 3 Browser
> validation → Stage 4 Functional check → Stage 5 Handoff.
>
> **Hard rule:** if a task's backend dependency card in `zitro-api/TASK-STATUS.md` is still
> `Pending`, Claude builds the screen against `@zitro/test-data`/MSW mocks matching the
> planned response shape, and stops short of wiring the real call until you confirm the
> backend task has shipped.

---

## RS-000 — Scaffold `zitro-restaurant` Nx App

**Size:** M | **No design needed**

**What this delivers:**

- `nx g @nx/angular:app zitro-restaurant --directory=apps/zitro-restaurant` — standalone
  components, no NgModules, same generator flags used for `zitro-customer`.
- `capacitor.config.ts` with app ID `com.krisurya.zitro.restaurant` (per
  `ZITRO-APPS-ARCHITECTURE.md` §13).
- `app.config.ts` wired with the same providers as `zitro-customer`: `provideTheme()`,
  `provideI18n()`, HTTP client with `authInterceptor` (swapped for a **business-auth**
  variant — stores/attaches Business JWT, not Firebase ID token) + `errorInterceptor`. No
  `businessIdInterceptor` needed the way customer has one for `X-Business-Id` — this app's
  businessId comes from the logged-in user's own JWT claim, not a header per-request to a
  business the user is _browsing_.
- `environments/environment.ts` (`apiUrl: http://localhost:8080`) and
  `environment.prod.ts` (`apiUrl: https://api.zitroapp.in`) — same pattern as customer.
- `styles.scss` imports `@zitro/theme` tokens — **no new color values defined anywhere in
  this app**, same rule as customer.
- Route guard: `businessAuthGuard` (redirects to `/login` if no valid Business JWT), mirrors
  customer's `authGuard`.
- Empty shell routes for every RS-XXX page below, so later tasks only fill in components.

**Acceptance criteria:**

- [ ] `nx serve zitro-restaurant` runs, shows a themed empty shell
- [ ] `nx build zitro-restaurant --configuration=production` passes clean
- [ ] `nx lint zitro-restaurant` passes (Nx boundary rules respected — no `@zitro/jobs-shared`, no `@zitro/test-data` in app source)

---

## RS-001 — Login

**Size:** S

**API:** `POST /api/business-auth/login` — ready (phone + password, BCrypt-verified server-side)

**Expected behaviour:**

- Phone number + password fields (no OTP flow here — business accounts are BCrypt password
  auth, different from the customer app's Firebase phone-OTP flow)
- On success: store Business JWT, redirect based on `onboardingStatus`:
  - `pending` / `rejected` → RS-003 (onboarding/KYC screen, shows status + rejection reason if any)
  - `approved` → RS-004 (dashboard)
- Error states: invalid credentials, account deactivated (`isActive: false` on the business
  user), network error
- "Apply to become a partner" link → RS-002

**`data-testid`:** `phone-input`, `password-input`, `login-btn`, `error-message`, `apply-link`

**Acceptance criteria:**

- [ ] Wrong credentials shows `INVALID_CREDENTIALS` message via i18n, not a raw error code
- [ ] Successful login stores JWT and routes correctly based on onboarding status
- [ ] Deactivated account shows a distinct message ("contact support"), not the generic invalid-credentials one

---

## RS-002 — Partner Application (Public Signup)

**Size:** M | **Backend:** `zitro-api` TASK-039 (pending)

**Decided:** both entry paths are in scope — self-serve public application (this task) _and_
admin-sent email invite (RS-002b). Both converge on the same owner account + RS-003 KYC flow;
which one a given partner used is just how the business record and first login came to exist.

**API (new, TASK-039):** `POST /api/business-applications` — public/anonymous. Body: business
name, type (restaurant/grocery), phone, email, address fields, owner name + phone + password.
Creates the business record (`onboarding_status: pending`) and the first owner business-user
account directly — no admin action needed to create the record, admin only reviews/approves
later at AD-004. Needs basic abuse protection (rate limiting; consider a phone-OTP step before
allowing submission, reusing the existing Fast2SMS OTP infra from the customer app).

**Expected behaviour:**

- Public marketing-style landing explaining the partner program (reuse `partners.zitro.in`
  root path for this — the site's home route, not behind login)
- Multi-step form: business basics → address → owner account → submit
- On submit: success screen "Application received — we'll review within 24-48h", plus
  the owner can now log in (RS-001) and lands on RS-003 to track status / continue KYC

**`data-testid`:** `apply-business-name`, `apply-business-type`, `apply-address-*`,
`apply-owner-name`, `apply-owner-phone`, `apply-password`, `apply-submit-btn`, `apply-success`

**Acceptance criteria:**

- [ ] Form validates all required fields before submit
- [ ] Duplicate phone/business-slug shows a clear conflict error
- [ ] Submitted application is immediately visible to admin at AD-004 with `pending` status

---

## RS-002b — Accept Admin Invite

**Size:** S | **Backend:** `zitro-api` TASK-039 (pending — same card as RS-002, covers both flows)

The other entry path: an Ops/sales person creates the business directly in `zitro-admin`
(AD-003's new "Invite Partner" action) and the system emails the owner a single-use signup
link instead of the owner filling out the public form themselves. Good for white-glove
onboarding of partners who were recruited offline (a phone call, a market visit) rather than
found the platform on their own.

**API (new, TASK-039):** `GET /api/business-invite/{token}` (validate token, show business
name so the link doesn't feel generic/phishy), `POST /api/business-invite/{token}/accept` —
public, body: password. Activates the pre-created owner business-user account, marks the
invite token used (single-use, expires after a set window — e.g. 7 days, define in
`appsettings.json` alongside the other `Auth`-style options, not hardcoded).

**Expected behaviour:**

- Owner clicks the emailed link → lands on `partners.zitro.in/accept-invite?token=...` →
  sees the business name pre-filled ("You've been invited to manage **EFC Pizza** on Zitro")
  → sets a password → redirected to RS-003 (KYC) same as the RS-002 path
- Expired/already-used token shows a clear message + a "request a new invite" contact prompt
  (not a silent failure)

**`data-testid`:** `invite-business-name`, `invite-password-input`, `invite-confirm-password-input`, `invite-accept-btn`, `invite-expired-message`

**Acceptance criteria:**

- [ ] Token is single-use — a second visit after acceptance shows "already used", doesn't let a second password be set
- [ ] Expired token is rejected server-side, not just hidden client-side
- [ ] After acceptance, login (RS-001) works immediately with the new password

---

## RS-003 — Onboarding / KYC Completion

**Size:** L | **Backend:** `zitro-api` TASK-032 (pending)

**Expected behaviour:**

- Shown right after RS-001 login if `onboardingStatus !== 'approved'`
- Status banner: pending (yellow, "under review"), rejected (red, shows
  `onboardingRejectionReason`, allows re-submit), approved (shouldn't reach this screen —
  redirect to dashboard)
- KYC form: FSSAI license number, GST number, PAN number, business contact name, alternate
  phone, bank/payout account details, document uploads (FSSAI certificate, GST certificate,
  PAN card, a cancelled cheque / bank passbook photo) — each doc uploads to Firebase Storage
  (same pattern as product image upload) and its URL is appended to `verificationDocs`
  before calling `PUT /api/business-portal/{businessId}` (TASK-032 + TASK-033)
- Save-as-draft supported (partial fields, resubmit later) — don't force one giant form submit
- Once admin approves (AD-004), a push/email notification (reuse Notifications module) tells
  the owner they're live

**`data-testid`:** `kyc-status-banner`, `kyc-fssai`, `kyc-gst`, `kyc-pan`, `kyc-bank-account`,
`kyc-doc-upload-fssai`, `kyc-doc-upload-gst`, `kyc-doc-upload-pan`, `kyc-doc-upload-bank`,
`kyc-save-draft-btn`, `kyc-submit-btn`

**Acceptance criteria:**

- [ ] All fields optional-but-tracked individually — partial save works
- [ ] Document upload shows progress + preview thumbnail
- [ ] Rejected status clearly explains why and allows editing + resubmitting
- [ ] PAN/GST/bank fields are masked-by-default with a reveal toggle (sensitive data hygiene, even though this is the owner viewing their own data)

---

## RS-004 — Dashboard

**Size:** M | **Backend:** `zitro-api` TASK-034 (pending)

**API:** `GET /api/business-portal/{businessId}/dashboard` (new, TASK-034)

**Expected behaviour:**

- Today's orders count, today's revenue, pending-order count (big, glanceable — this is the
  screen an owner checks first each morning)
- This week's revenue trend (small sparkline, reuse a chart approach consistent with
  AD-002's platform dashboard if one already exists there)
- Low-stock alert count (links to RS-011)
- Quick links: "View pending orders" → RS-005, "Add menu item" → RS-007

**`data-testid`:** `dashboard-today-orders`, `dashboard-today-revenue`, `dashboard-pending-count`, `dashboard-revenue-chart`, `dashboard-stock-alert-count`

**Acceptance criteria:**

- [ ] All stats match what's independently visible on RS-005/RS-011 for the same data
- [ ] Zero-state (new partner, no orders yet) shows a helpful empty state, not a broken chart

---

## RS-005 — Live Orders Queue

**Size:** L

**APIs:** `GET /api/business-portal/{businessId}/orders?status=&page=&pageSize=` (ready,
`BusinessOrdersController`), `PUT /api/business-portal/{businessId}/orders/{orderId}/status`
(ready, same controller — validates status transitions, syncs Firestore/Realtime DB)

**Expected behaviour:**

- Tabs/filters by status: pending, confirmed, preparing, ready, shipped
- Each order card: display ID, items summary, total, customer phone (masked/partial), time
  since placed, accept/reject (from `pending`) or advance-status action per current status
- New order arrival: on web, poll or subscribe (Firestore `testonlineorders` real-time
  listener, same doc the customer app already reads for order status — reuse that read path
  client-side rather than building a new one); on Android, FCM push (RS-017) triggers a
  notification + queue refresh
- Reject requires a reason (maps to `note` field in the status-update call)
- Auto-cancel notice: orders older than 15 min still pending will be auto-cancelled by the
  existing `orderTimeoutCheck` job (zitro-jobs) — show a countdown so the owner knows

**`data-testid`:** `order-queue-tab-{status}`, `order-card-{orderId}`, `order-accept-btn`,
`order-reject-btn`, `order-advance-btn`, `order-reject-reason-input`, `order-timeout-countdown`

**Acceptance criteria:**

- [ ] Status transitions only offer the next valid state (per `OrdersOptions.StatusFlow`), not arbitrary jumps
- [ ] Reject requires a non-empty reason
- [ ] New order appears without a manual page refresh (real-time or FCM-triggered)
- [ ] Terminal-status orders (delivered/cancelled) are read-only, no action buttons

---

## RS-006 — Order Detail

**Size:** M

**API:** `GET /api/business-portal/{businessId}/orders/{orderId}` — ready

**Expected behaviour:** full line items with variations, special instructions per item,
charges breakdown, delivery address (if delivery order), status timeline, payment
method/paid status, customer contact.

**`data-testid`:** `order-detail-items`, `order-detail-charges`, `order-detail-timeline`, `order-detail-customer`

**Acceptance criteria:**

- [ ] All charge line items match `OrderCharges` shape exactly (see root `CLAUDE.md` frozen contract)
- [ ] Status timeline renders every entry in order with correct relative timestamps

---

## RS-007 — Menu Management: Category & Item List + Manual CRUD

**Size:** L | **Backend:** `zitro-api` TASK-033 (pending)

**Expected behaviour:**

- Category list (drag-to-reorder, add/edit/delete, image upload) — for `menu_mode: shared`
  businesses, categories may be brand-level (read-only here, edited at brand level) vs
  branch-level (editable) — UI must distinguish which is which
- Item list per category — table/grid toggle, shows image thumbnail, name, price, veg/non-veg
  badge, available toggle, edit/delete
- Add/Edit item form: name, description, price, category, food type, image upload, variants
  (label/price/default, add/remove rows), flags (spicy, recommended, bestseller, new),
  availability toggle
- For shared-catalog branches: items inherited from brand show a "branch override" affordance
  instead of full edit (reuses the existing branch-overrides endpoints, already ready)

**`data-testid`:** `category-list`, `category-add-btn`, `item-list`, `item-add-btn`,
`item-form-name`, `item-form-price`, `item-form-category`, `item-form-food-type`,
`item-form-variant-row`, `item-form-save-btn`

**Acceptance criteria:**

- [ ] Independent-menu businesses get full CRUD; shared-catalog branches correctly restrict to overrides
- [ ] Variant price/default logic matches `ProductVariation` entity exactly (one default per product)
- [ ] Deleting a category with items in it prompts for confirmation and shows what will happen to those items

---

## RS-008 — Menu Import: AI Photo/PDF Upload + Review & Approve

**Size:** XL | **Backend:** `zitro-api` TASK-038 (pending, new capability — see that card)

This is the flagship onboarding-acceleration feature: upload photos or a PDF of an existing
paper/other-platform menu, get it parsed into structured categories/items/variants, review
and edit before anything touches the database, approve to commit.

### Target data shape (drives both the parse response and the review UI's row model)

```json
[
  {
    "category": "Steamed Momos",
    "categoryImage": null,
    "items": [
      {
        "name": "Exotic Veggie Steam Momos",
        "price": 139,
        "description": null,
        "type": "veg",
        "spicy": false,
        "recommended": false,
        "bestseller": false,
        "new": false,
        "image": null,
        "variants": [
          { "label": "Half (5 pcs)", "price": 99, "default": true },
          { "label": "Full (8 pcs)", "price": 139, "default": false }
        ]
      }
    ]
  }
]
```

This maps directly onto existing entities — no schema change needed: `category` →
`Category.Name`, `categoryImage` → `Category.ImageUrl`, `type` → `Product.FoodType`
(veg/nonVeg/egg/vegan), `spicy`/`recommended`/`bestseller`/`new` → `Product.IsSpicy` /
`IsRecommended` / `IsBestseller` / `IsNew` (all already columns), `variants[].label/price/default`
→ `ProductVariation.Label/Price/IsDefault`.

### Flow

1. **Upload** — owner selects up to N images (JPEG/PNG/HEIC) and/or one PDF of their existing
   menu. Client uploads files to Firebase Storage first (same pattern as product media),
   then calls the parse endpoint with the storage URLs (keeps the request small, reuses
   existing upload infra rather than inventing a second one).
2. **Parse** (backend, TASK-038) — server calls a vision-capable LLM with a strict
   JSON-schema prompt, returns the structure above, each item/category tagged with a
   client-side `tempId` (assigned by the frontend after receiving the response) for the
   review step's local state — not persisted anywhere yet.
3. **Review** — every parsed category/item renders as an editable card: owner can fix a
   misread name/price, change food type, reorder, delete a wrongly-detected row entirely, or
   accept as-is. Bulk actions: "approve all", "reject all", "approve category". Nothing
   selected/left as "rejected" ever leaves the browser.
4. **Approve & Commit** — approved subset is POSTed in one call to a dedicated commit
   endpoint (`zitro-api` TASK-038) that creates categories + products + variations
   transactionally. Anything rejected is simply never sent — no backend delete/cleanup needed.
5. **Post-commit** — lands on RS-007 with the new items visible, immediately editable through
   normal manual CRUD (no special "AI-imported" mode after this point).

### Constraints / edge cases to handle

- Low-confidence parses (blurry photo, handwritten menu) — surface a visible warning per item
  rather than silently guessing; owner reviews these more carefully.
- Duplicate detection against existing menu items (by name similarity) before commit, to avoid
  creating dupes on a second import run — flag likely duplicates in the review UI, don't
  block, let the owner decide.
- File size / count limits (define with backend task — e.g. max 20 images or 1 PDF ≤ 20 pages
  per import, since each parse call has a real LLM API cost).
- Import can be abandoned at any review step with zero side effects (nothing was written yet).

**`data-testid`:** `menu-import-upload-zone`, `menu-import-file-list`, `menu-import-parse-btn`,
`menu-import-review-category-{tempId}`, `menu-import-review-item-{tempId}`,
`menu-import-approve-item-btn`, `menu-import-reject-item-btn`, `menu-import-approve-all-btn`,
`menu-import-duplicate-warning`, `menu-import-low-confidence-flag`, `menu-import-commit-btn`

**Acceptance criteria:**

- [ ] Uploading, parsing, reviewing, and abandoning the flow at any point writes nothing to the DB
- [ ] Only explicitly-approved rows are included in the commit payload
- [ ] Commit is atomic — a partial failure doesn't leave orphan categories with no items
- [ ] Duplicate-name warning appears when re-importing a menu that overlaps existing items
- [ ] Post-commit, imported items are indistinguishable from manually-created ones in RS-007's editing UI

---

## RS-009 — Menu Import: Bulk Spreadsheet

**Size:** M | **Backend:** `zitro-api` TASK-033 (pending — reuses the bulk create endpoints extended there for business-portal scope)

**Expected behaviour:**

- "Download template" button — CSV/XLSX with columns: category, item name, description,
  price, food type, spicy/recommended/bestseller/new flags, variant label/price/default
  (repeatable variant columns or one row per variant, tbd during design)
- Upload filled template → client-side parse + validation (reuse a JS CSV/XLSX parser) →
  preview table showing what will be created, with row-level validation errors highlighted
  (bad price format, unknown food type value, etc.)
- Same approve-before-commit principle as RS-008 — preview is not yet saved
- Commit reuses the same transactional endpoint as RS-008 where practical (same target shape)

**`data-testid`:** `bulk-import-template-btn`, `bulk-import-upload-zone`, `bulk-import-preview-table`, `bulk-import-row-error-{rowIndex}`, `bulk-import-commit-btn`

**Acceptance criteria:**

- [ ] Template download matches the upload parser's expected columns exactly
- [ ] Invalid rows are clearly flagged and excluded from commit until fixed or explicitly skipped
- [ ] Large files (500+ rows) don't freeze the browser tab during preview parsing

---

## RS-010 — Menu: Clone from Branch/Brand

**Size:** S | **Only relevant for `menu_mode: shared` businesses**

**APIs:** `GET /api/business-portal/{businessId}/branches` (ready) + a new copy action —
flag whether this should be a client-side "fetch brand catalog, then submit as a bulk-create"
(reuses RS-008/RS-009's commit endpoint, no new backend work) or needs its own backend
endpoint — recommend the former to avoid another one-off API.

**Expected behaviour:** pick a sibling branch (or the brand master catalog), preview its full
menu, select which categories/items to copy into this branch as local overrides or as a
starting independent catalog, confirm to commit.

**`data-testid`:** `clone-source-select`, `clone-preview-list`, `clone-item-checkbox`, `clone-commit-btn`

**Acceptance criteria:**

- [ ] Cloning never modifies the source branch/brand catalog
- [ ] Cloned items land correctly as branch overrides (shared mode) vs new independent products, per business's `menu_mode`

---

## RS-011 — Inventory Management

**Size:** M

**APIs:** `GET .../inventory`, `POST .../inventory/adjust`, `GET .../inventory/alerts` — all ready

**Expected behaviour:** stock table (product, current qty, low-stock threshold indicator),
adjust quantity with a reason (restock/correction/wastage), alerts list linking back to
affected products.

**`data-testid`:** `inventory-table`, `inventory-adjust-btn`, `inventory-adjust-qty-input`, `inventory-adjust-reason-select`, `inventory-alerts-list`

**Acceptance criteria:**

- [ ] Adjustment can't take stock negative (matches backend `INSUFFICIENT_STOCK` error, shown clearly)
- [ ] Alerts list matches items actually at/below threshold

---

## RS-012 — Delivery Zones

**Size:** M

**APIs:** full CRUD ready (`GET/POST/PUT/DELETE .../delivery-zones`)

**Expected behaviour:** map-based polygon drawing for zone boundary (or a simpler radius-based
fallback if a map component isn't already in `@zitro/ui` — check before committing to a map
library), fee configuration (base fee, per-km fee, surge multiplier) per zone, active toggle.

**`data-testid`:** `zone-list`, `zone-add-btn`, `zone-map-draw`, `zone-fee-base`, `zone-fee-per-km`, `zone-fee-surge`, `zone-save-btn`, `zone-delete-btn`

**Acceptance criteria:**

- [ ] Overlapping zone warning (if two zones cover the same area, which one applies? — flag this UX question during design review)
- [ ] Fee changes apply to new orders immediately (no caching lag beyond `CacheKeys.BusinessConfig` TTL)

---

## RS-013 — Ratings & Reviews

**Size:** S

**APIs:** `GET .../ratings`, `POST .../ratings/{ratingId}/reply` — ready

**Expected behaviour:** paginated review list with star rating, comment, reply-if-not-replied,
reply shows publicly on the customer app's business page.

**`data-testid`:** `rating-list`, `rating-reply-input`, `rating-reply-submit-btn`

**Acceptance criteria:**

- [ ] Already-replied reviews show the existing reply read-only, no double-reply
- [ ] Reply text has a sensible max length matching backend validation

---

## RS-014 — Payouts

**Size:** M | **Bank details display needs** `zitro-api` TASK-032

**API:** `GET .../payouts` — ready; bank/payout-account display needs TASK-032's exposed fields

**Expected behaviour:** payout history table (period, gross, commission, net, status, paid
date), current commission rate display (read-only — commission stays Admin-set per TASK-032's
note), linked bank/payout account (masked, matches RS-003's KYC data).

**`data-testid`:** `payout-history-table`, `payout-commission-rate`, `payout-bank-account-display`

**Acceptance criteria:**

- [ ] Net amount always equals gross minus commission minus tax deducted (matches backend calc, sanity-check in UI test)
- [ ] Pending vs paid status is visually distinct

---

## RS-015 — Business Profile & Settings

**Size:** M | **Backend:** `zitro-api` TASK-033 (pending)

**Expected behaviour:** editable business name, description, address, contact, hours,
min-order-amount, delivery fee, pure-veg flag — everything `UpdateBusinessCommand` covers
minus `CommissionPercentage`. Logo/cover image upload.

**`data-testid`:** `profile-name`, `profile-description`, `profile-address`, `profile-hours`, `profile-min-order`, `profile-delivery-fee`, `profile-save-btn`

**Acceptance criteria:**

- [ ] Save only sends changed fields (patch semantics, matching backend's optional-field command shape)
- [ ] Hours editor prevents an invalid open/close pair (close before open without `is24Hours`)

---

## RS-016 — Staff Management

**Size:** M | **Backend:** `zitro-api` TASK-033 (pending)

**Expected behaviour:** list of business-portal accounts (owner/manager/staff), add new staff
(name, phone, password, role), edit role/active status/reset password. Owner role cannot be
created by a manager/staff account (permission rule — confirm this is enforced server-side in
TASK-033, not just hidden in the UI).

**`data-testid`:** `staff-list`, `staff-add-btn`, `staff-role-select`, `staff-active-toggle`, `staff-reset-password-btn`

**Acceptance criteria:**

- [ ] A `staff`-role logged-in user cannot see/reach this screen at all (route guard by role, not just hidden buttons)
- [ ] A `manager` can add `staff` but not `owner` accounts

---

## RS-017 — Push Notifications (Android FCM)

**Size:** M | **Verify backend dependency before starting**

Need to confirm: does a `business_users` device-token registration endpoint exist (mirroring
the customer app's `POST /api/users/me/device-tokens`)? Not seen in the current Postman
collection — check `zitro-api` again at task start; if missing, this is a small addition to
flag alongside TASK-033.

**Expected behaviour:** on Android, register FCM token after login, receive push on new order
(`onOrderCreated` job, `zitro-jobs`) and on order-timeout warnings, tapping notification opens
RS-005 filtered to that order. Haptic feedback on new-order push (`@capacitor/haptics`).

**`data-testid`:** n/a (native notification, verify via manual device testing)

**Acceptance criteria:**

- [ ] New order triggers push within a few seconds on a real/emulated Android device
- [ ] Notification tap deep-links to the correct order

---

## RS-018 — Firebase Hosting Deploy

**Size:** S | See `DEPLOYMENT-TASKS.md` (DEP-001/002/003) for the full multi-site spec — this
task is just "run that setup for this specific app" once DEP-001 is done once for all three apps.

---

## RS-TEST-001 — Unit + Integration Tests

Same standard as customer app: Vitest unit tests next to source, `*.integration.spec.ts` +
MSW for API-integration tests, test data only from `@zitro/test-data` builders (extend that
lib with restaurant/business-portal fixtures as needed — never inline test objects).

## RS-TEST-002 — E2E Critical Journeys

Minimum set: login → view pending order → accept → mark ready → mark shipped; AI menu import
happy path (upload → review → approve → item appears in RS-007); KYC submission → admin
approval (cross-app journey with AD-004) → dashboard unlocks.
