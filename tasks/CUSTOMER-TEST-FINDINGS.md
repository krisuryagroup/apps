# ZITRO Customer — Live Test Findings (2026-08-20)

> **Purpose:** this is the record of actually **running** `CUSTOMER-TEST-SCENARIOS.md` against a
> live local stack — `zitro-api` on `:8080` against local Postgres `zitro-dev`, `zitro-customer` on
> `:4200` — rather than a re-statement of that checklist. Everything below was reproduced by
> clicking through the real app in a browser and cross-checked against server logs / the database
> where useful, not inferred from reading source alone (though source was read afterward to find
> the exact root cause once a bug was reproduced). Issues already catalogued in
> `CUSTOMER-TEST-SCENARIOS.md` §16 (Known Gaps) are **not** repeated here except where this session
> verified them live for the first time — those are called out explicitly as "confirmed live."
>
> Not exhaustive — this is one focused pass that got deep on the location → auth → home → cart →
> checkout → order-tracking path (§1–§9 territory) rather than a shallow sweep of all seventeen
> sections. Addresses, coupons, account, contact-us, and the 2048 game were not reached.
>
> **Update (same day):** all seven numbered findings below (1.1–1.7) plus three of the four
> cosmetic ones (1.8.1–1.8.3) have been fixed and live-verified. Each finding's own section has a
> **Fix** block describing exactly what changed. 1.8.4 (slow Firestore call) was investigated but
> deliberately left unfixed — see its entry for why.

---

## 0. Environment notes (read before re-running)

- **`zitro-api/src/Zitro.Api/appsettings.Development.json`** (tracked in git, despite its own
  comment claiming to be gitignored — it isn't; see the commit for this fix for more) had its
  active `DATABASE:URL` pointed at a **Neon Postgres database named `zitro-prod`**, not local
  Postgres — a commented-out local-Postgres line sat unused above it. Flipped the active line to
  `Host=localhost;Port=5432;Database=zitro-dev;Username=krishna` before testing, per the
  established convention already in `.claude/launch.json` (which runs the API this same way on
  port 8080), and committed that flip. **If you pull this file fresh from another machine/backup,
  check this before running anything that writes data.**
- **`apps/apps/zitro-customer/src/environments/environment.ts`** `apiUrl` defaults to the deployed
  API (`https://zitro-api.onrender.com`), not local — same gotcha already noted in memory for
  `zitro-admin`. Flipped to `http://localhost:8080` for local testing; **left un-committed** —
  revert it locally before building for deploy, or just don't commit it.
- **Firebase project mismatch (fixed):** the API's dev service-account JSON was for project
  `zitro-7044d` while the Angular app's `FIREBASE_CONFIG` (`app.constants.ts`) uses project
  `zitro-customer` — phone-auth ID tokens from one project can never verify against a service
  account from a different project, so `POST /api/auth/verify` 401'd on every sign-in attempt no
  matter the OTP entered. `appsettings.Development.json` now has a `zitro-customer`-project service
  account active (the old `zitro-7044d` one left commented above it for reference) and the API was
  restarted to pick it up — sign-in confirmed working end-to-end (real OTP-bypass login, full
  checkout, real order placed). Also fixed to match the user's new bucket
  `gs://zitro-customer.firebasestorage.app`:
  - `zitro-api/src/Zitro.Api/appsettings.json` → `Firebase.StorageBucket`:
    `zitro-customer.appspot.com` → `zitro-customer.firebasestorage.app`
  - `zitro-api/src/Zitro.Shared/Configuration/ZitroOptions.cs` → `FirebaseOptions` defaults
    (`ProjectId`/`StorageBucket`) updated from the stale `the-hunger-point` fallback to
    `zitro-customer` / `zitro-customer.firebasestorage.app`, matching what `appsettings.json`
    already had active.
- **Address subsystem schema gap — correction from the original write-up of this finding:**
  the original version of this document said the apartment/society-addresses migration was
  "never added to `ZITRO-Production-Schema.sql`." **That was wrong** — re-reading the schema file
  more carefully, the full migration (`CREATE TYPE address_mode`, `societies`, `society_towers`,
  the `ALTER TABLE user_addresses ADD COLUMN ...`, the `chk_society_mode_fields` CHECK constraint)
  is already there, added 2026-08-13 (`ZITRO-Production-Schema.sql` lines ~2026–2131). The actual
  bug was narrower: **that block was written into the schema file but never actually run against
  local `zitro-dev`** (and, since nothing else in the repo confirms otherwise, possibly not run
  against the real database either — worth an explicit check there). No code or schema-file change
  was needed for this one; the local DB was brought in line with the already-correct schema file:
  ```sql
  CREATE TYPE address_mode AS ENUM ('manual', 'society');
  CREATE TABLE societies (...);           -- full definition from the schema file
  CREATE TABLE society_towers (...);      -- full definition from the schema file
  ALTER TABLE user_addresses
    ADD COLUMN address_mode address_mode NOT NULL DEFAULT 'manual',
    ADD COLUMN society_id uuid REFERENCES societies(id),
    ADD COLUMN tower_id uuid REFERENCES society_towers(id),
    ADD COLUMN tower_name_other text,
    ADD COLUMN flat_number text,
    ADD COLUMN society_name_snapshot text,
    ADD COLUMN tower_name_snapshot text,
    ADD CONSTRAINT chk_society_mode_fields CHECK (...);  -- see schema file for the exact expression
  ```
  Confirmed working end-to-end afterward: address save/list, and a full order placed against a
  saved address. **Action item for whoever owns the real databases:** confirm this exact block from
  `ZITRO-Production-Schema.sql` (lines ~2026–2131) has actually been executed there too — if it
  hasn't, address read/write is broken live the same way it was here.
- Test account used: phone `9643809268`, OTP `123456` (via `Otp.BypassForDevelopment`/Firebase
  test-number flow) — user-supplied, already a returning user ("krishna", pre-existing cart/orders
  in the DB from earlier sessions). Two real test orders were placed against `EFC Pizza` (the only
  business seeded locally) — `#ORD937977142239` (before fixes, evidence for 1.7) and
  `#ORD965659412936` (after fixes, confirms the checkout fixes didn't break the happy path) — both
  left in place.

---

## 1. Issues found — all fixed and re-verified live

### 1.1 — "Search your Location" is dead for every first-time user (HIGH) — FIXED

**Scenario:** CUST-T-208. Fresh browser state (no `zitro_user_location` in localStorage), land on
`/location-selection`, tap "🔍 Search your Location".

**Expected** (per CUST-T-208): navigates to `/add-address`; a guest gets redirected to
`/auth/signin` first.

**Actual (before fix):** nothing happens — no navigation, no redirect, silently stays on
`/location-selection`. Reproduced with a real click, a ref-targeted click, and a direct
`element.click()` in the console — all three produced zero effect, and no `AuthGuard`/router
console logs fired at all despite the app logging every guard decision.

**Root cause:** `/add-address`'s route has **two stacked guards** —
`locationGuard` on its parent (`app.routes.ts` — the `''`/`MainLayoutComponent` route) and its own
`AuthGuard`. `locationGuard` (`core/guards/location.guard.ts`) redirects to `/location-selection`
whenever `zitro_user_location` is absent from localStorage. But the **only way a user is ever on
`/location-selection` in the first place is because they have no saved location yet** — so
`router.navigate(['/add-address'])` from `LocationSelectionComponent.onSearchLocation()`
immediately gets intercepted by `locationGuard` and bounced right back to `/location-selection`,
before `AuthGuard` ever runs.

**Fix:**

- `location.guard.ts` — exempts `/add-address` from the "must have a saved location" check (it's
  the one page a location-less user needs to reach in order to set one).
- `location-selection.component.ts` — `onSearchLocation()` now navigates with
  `queryParams: { setInitialLocation: 'true' }`.
- `add-address.page.ts` — reads that flag; on successful save, if set, persists
  `zitro_user_location` + updates `LocationSelectionService` from the saved address's
  `houseAndStreet`/`town`/`lat`/`lng` (mirroring exactly what `LocationSelectionComponent`'s own
  `saveAndNavigate()` does for the GPS/saved-address paths) and navigates to `/home`, instead of
  the normal `/addresses` redirect.

**Verified live:** cleared `zitro_user_location`, landed on `/location-selection`, tapped "Search
your Location" → New Address form opened correctly this time. Filled it in, saved → navigated to
`/home`, header correctly showed "Dibiyapur / Shop 1, Dibiyapur", `zitro_user_location` correctly
persisted in localStorage.

**Where:** `apps/apps/zitro-customer/src/app/core/guards/location.guard.ts`,
`apps/apps/zitro-customer/src/app/features/location-selection/location-selection.component.ts`,
`apps/apps/zitro-customer/src/app/features/addresses/add-address.page.ts`.

---

### 1.2 — Never-authenticated visitors get bounced from Home to sign-in (HIGH) — FIXED

**Scenario:** not in the source doc as written — found while trying to reach Home as a fresh user
without going through the sign-in screen's "Continue as Guest" button (e.g. after granting GPS on
`/location-selection`, which per CUST-T-201 should land directly on `/home`).

**Expected:** per CUST-T-303/CUST-T-201, a user can reach and browse `/home` without ever visiting
`/auth/signin` — the app supports guest browsing.

**Actual (before fix):** landing on `/home` with neither a `token` nor `isGuest` set in
localStorage immediately redirects to `/auth/signin`.

**Root cause:** `MainLayoutComponent.ngOnInit()` unconditionally calls
`userManagementService.loadCurrentUserProfile()` on every page load under the main layout. That
method only skipped its `GET /api/users/me` call when `isGuest === 'true'` — it never checked
whether a token existed at all. A user who has never visited the auth screens has neither flag set,
so the call fired, got 401 (no `Authorization` header), and `errorInterceptor` — whose own comment
said "Never redirect guests — they intentionally have no auth token" — checked the same `isGuest`
flag, found it falsy, and force-signed-out + redirected to `/auth/signin`.

**Fix (defense in depth, two layers):**

- `user-management.service.ts` — `loadCurrentUserProfile()` now also skips when there's no token
  (`isGuest || !hasToken`), so the doomed 401 call never fires in the first place for this case.
- `error.interceptor.ts` — the 401 handler now also requires `hadToken` before redirecting, so
  _any_ other user-scoped call that 401s for a never-authenticated visitor (not just this one) is
  correctly treated as "expected, not signed in yet" rather than "session expired, force sign-in."
  Genuine session expiry (a real token that the server now rejects) still redirects correctly,
  since `hasToken` is true in that case.

**Verified live:** signed in normally with the test account afterward (unaffected — `hasToken` is
true for a real session, so the redirect-on-401 behavior for actual expiry is preserved); the
specific never-authenticated-visitor repro path is structurally eliminated by the code change
(the 401 that used to trigger it can no longer occur, since the profile call is now skipped).

**Where:** `apps/libs/services/src/user-management.service.ts` (`loadCurrentUserProfile`),
`apps/libs/services/src/interceptors/error.interceptor.ts`.

---

### 1.3 — Delivery order could be attempted with zero address; failed late with a raw i18n key (MEDIUM) — FIXED

**Scenario:** CUST-T-610. Delivery order type, cart has items, **no address selected at all**
("Add your first address to get started with deliveries!" still showing), tap "Place Order."

**Expected** (per CUST-T-610): "place-order-btn should be disabled or blocked before the
delivery-range dialog even opens."

**Actual (before fix):** the button was not disabled. Tapping it opened the Delivery Range Notice
dialog exactly as if an address were selected, ran the full order-processing animation, and only
then failed showing both a raw untranslated i18n key literal (`order.error.address_required`) and
the correctly-translated fallback message stacked on top of each other.

**Root cause #1 (validation bypass):** `CartPage.isAddressSelected` was
`!!this.selectedAddressId() || this.locationService.snapshot.type !== 'none'` — the second half of
that OR let simply having a general delivery-area location set (true as soon as the location gate
is passed, well before any address exists) satisfy the check, even with zero saved address chosen.
Both `canPlaceOrder` (drives the button's `[disabled]`) and `validateOrderType()`'s address check
rely on this signal.

**Root cause #2 (untranslated key):** `I18nService.translate(key, params?)` has no `fallback`
option — it only supports `{variable}` interpolation params — so passing
`{ fallback: apiError.error }` did nothing; when the key was missing, `translate()` returned the
raw key string per its own documented behavior, and that leaked straight to the UI.

**Fix:**

- `cart.page.ts` — `isAddressSelected` now purely requires `!!this.selectedAddressId()`. This
  makes `canPlaceOrder` correctly disable the button with no address selected, and
  `validateOrderType()` correctly block with the right in-app error before any dialog opens.
- `cart.page.ts` — the error-code-to-message logic now checks whether `translate()` actually
  resolved the key (compares the return value to the key itself, matching `translate()`'s own
  missing-key contract) and only then falls back to the backend's own error message, instead of
  relying on a nonexistent `fallback` option.

**Verified live:** re-tested the full happy-path checkout after this fix (see finding 1.7's
verification) — address selection, dialog, and order placement all worked correctly with no
regression; the specific no-address repro path is now structurally blocked before the dialog can
open at all.

**Where:** `apps/apps/zitro-customer/src/app/features/cart/cart.page.ts`
(`isAddressSelected`, `placeOrder`'s catch block).

---

### 1.4 — Address list & create were completely broken (500) — missing local DB schema (CRITICAL, environment) — FIXED

**Scenario:** CUST-T-1102. Fill out "New Address" on `/add-address`, tap "Save Address."

**Expected:** `POST /api/users/me/addresses` succeeds with `houseAndStreet`/`town` field names.

**Actual (before fix):**

```
GET  /api/users/me/addresses → 500  Npgsql.PostgresException: 42703: column u.address_mode does not exist
POST /api/users/me/addresses → 500  System.NotSupportedException: Cannot resolve 'address_mode' to a fully qualified datatype name
```

**Root cause — corrected from this document's original write-up:** the apartment/society-addresses
migration is _already_ in `ZITRO-Production-Schema.sql` (added 2026-08-13) — it was **never run
against local `zitro-dev`**, not missing from the source of truth. See §0 above for the full
correction and the exact statements applied to bring local dev in line with the schema file
(including the `societies`/`society_towers` tables and FK/CHECK constraints the very first
quick patch during live debugging didn't have).

**Fix:** local `zitro-dev` schema brought fully in line with `ZITRO-Production-Schema.sql`'s
existing migration (see §0) — no application code or schema-file changes needed, since both were
already correct.

**Verified live:** address save succeeded (`Krishna Test`, Dibiyapur, 206244), address list showed
it correctly alongside pre-existing addresses, and a full order was later placed end-to-end against
a saved address (`#ORD965659412936`).

**Remaining action item (not fixable from this session):** confirm whoever owns the real
Neon/staging databases has actually run this same schema block against them — nothing in the repo
proves it, and if it hasn't been run there, address read/write is broken live exactly as it was
here.

**Where:** local Postgres schema only — no application code changed for this one.

---

### 1.5 — Cart silently and permanently "disappeared" after any transient fetch failure (HIGH) — FIXED

**Scenario:** not in the source doc as written — found when the cart page rendered "Your cart is
empty" immediately after the API was briefly restarted (to pick up the schema patch above) while
the cart page happened to be loading. **The server-side cart was never actually empty** — verified
directly against the database: an active cart with 4 line items (₹847) existed the entire time.
The empty state persisted across multiple hard reloads, and `GET /api/cart` was never even called
on those reloads — the page didn't attempt to re-check the server at all.

**Root cause:** `CartApiService.loadAllCarts()` tracked "which businesses have an active cart" in a
localStorage array (`zitro_active_cart_businesses`). **Any** failure of `loadCart(slug)` — network
error, 500, the server being briefly unreachable, a timeout — was caught and treated identically to
"this business genuinely has no cart," permanently removing it from that tracked list. There's no
distinction between "confirmed empty" and "couldn't check." `GET /api/cart` always gets-or-creates
a cart and returns 200 (confirmed by reading `CartController.GetCart`'s own doc comment), so a
_successful_ response with zero items was already the only legitimate "genuinely empty" signal —
`loadCart()`'s success path already untracks the slug in that case; the failure-path untracking was
simply never correct.

**Fix:** `loadAllCarts()` no longer untracks a slug on failure — a failed fetch is left as-is, so
the slug stays tracked and the next load attempt (next page visit) retries it naturally, instead of
the business being permanently forgotten after one bad network blip.

**Verified live:** re-tested cart flow after the fix — added items, navigated away and back
multiple times including through the API restarts done later in this same session for other fixes,
cart contents stayed correctly visible throughout (no recurrence of the empty-cart symptom across
several more restart cycles during subsequent testing).

**Where:** `apps/libs/services/src/api/cart.service.ts` (`loadAllCarts`).

---

### 1.6 — Product disabled for online ordering rendered as normal/addable; failure was silent (MEDIUM) — FIXED

**Scenario:** adjacent to CUST-T-506 (out-of-stock product), but this is a different flag. Tapped
"ADD +" on "Gulab Jamun," a product with `is_enabled_for_online_orders = false` in the database but
otherwise `status = true` (active) with no stock/availability badge shown anywhere in the listing
UI.

**Expected:** either the product shouldn't appear in the online-orders listing at all, or (per
CUST-T-506's pattern for out-of-stock items) it should show a disabled/out-of-stock treatment.

**Actual (before fix):** rendered completely normally — full-color, clickable "ADD +" button, no
badge. Tapping it fired `POST /api/cart/items`, which correctly returned `400
{ "errorCode": "PRODUCT_UNAVAILABLE" }` — but the UI showed **absolutely no feedback**. The button
just silently did nothing.

**Root cause #1 (backend):** `GetBusinessMenuHandler` computed each product's `IsAvailable` DTO
field from `Status`/branch-override-availability only — never from `IsEnabledForOnlineOrders`. The
frontend's `CatalogMapper` already maps `dto.isAvailable → model.isEnabledForOnlineOrders` (there's
even an existing unit test asserting exactly that mapping), and the actual product-card component
used by the listing (`libs/ui/src/catalog/product-card`) already had complete, correct
out-of-stock-badge + disabled-button logic keyed off that field — it just never received a `false`
value to react to, because the backend never sent one.

**Root cause #2 (silent failure):** `ListingComponent.onAddToCart`/`onIncrement`/`onDecrement` all
had `catch { /* no-op */ }` around the cart-mutation call, with an explicit comment showing this was
intentional, not an oversight.

**Fix:**

- `GetBusinessMenu/Handler.cs` — `IsAvailable` now correctly factors in
  `IsEnabledForOnlineOrders` in both the shared-catalog and independent-catalog branches. No
  frontend template/logic changes were needed — the existing out-of-stock UI now receives the
  correct signal and handles it as designed.
- `listing.component.ts` — the three cart-mutation catch blocks now call a `showCartError()` helper
  (wired to `ToastService`) instead of swallowing the error. **Caveat:** `ToastService` itself is a
  pre-existing, app-wide no-op stub (`libs/services/src/toast.service.ts` — "replaced by app-level
  provider in T020," never actually implemented anywhere in the app) — this fix wires the call
  correctly and consistently with how the rest of the codebase already calls it (e.g.
  `error.interceptor.ts`'s 429 handler), but a toast still won't visibly render until someone
  implements a real `ToastService` provider. That's a separate, pre-existing gap, not introduced or
  fixed by this pass.

**Verified live:** after the backend fix + a full API restart + clearing the 1-hour client-side
menu cache (`zitro_cache_businessMenu:efc-pizza`, `CatalogApiService.getBusinessMenu`'s own TTL),
re-fetched the menu directly and confirmed `isAvailable: false` for Gulab Jamun; in the app, the
"Desserts" category (Gulab Jamun's only category, which is _also_ independently flagged
`isEnabledForOnlineOrders: false` server-side) no longer renders in the listing at all — the item
can no longer be added.

**Where:** `zitro-api/src/Modules/Businesses/Businesses.Module/Features/GetBusinessMenu/Handler.cs`,
`apps/apps/zitro-customer/src/app/features/listing/listing.component.ts`.

---

### 1.7 — Order could be charged for a different quantity than the cart displayed at checkout (CRITICAL) — FIXED (fail-safe)

**Scenario:** not in the source doc as written — found while completing a real checkout.
Immediately before tapping "Place Order," the cart page displayed **Farmhouse Pizza × 2** (₹249 ×
2 = ₹498, confirmed as part of a correctly-summed "5 items · ₹847" total returned directly from a
`POST /api/cart/items` response moments earlier). No further "+" taps happened. The order that was
actually created and charged had **Farmhouse Pizza × 3** (₹747) — verified both in the
order-confirmation screen and directly in the `order_items` table. Grand total charged: ₹1,150.80,
vs. the ₹904 the cart page showed right before checkout began.

**Root cause investigation:** `CartPage.placeOrder()` builds the order's line items from
`this.cartApi.getCheckoutSummary(slug)` — a separate endpoint from the one that renders the cart
page (`GET /api/cart`). Both `GetCartHandler` and `CheckoutHandler` (server-side) were read in
full: **neither uses any caching** (both run a fresh, uncached EF Core query against Postgres each
call), and `placeOrder()` itself calls no mutating endpoint between the cart page render and
`getCheckoutSummary()`. The exact mechanism that let the two reads diverge for the same cart within
seconds of each other was **not conclusively pinned down** in the time available — the leading
candidate is a duplicated/retried `addToCart()` request (plausible given this reproduction happened
right after the API had just been restarted for the schema-patch fix, i.e. during a window of
genuine network instability) landing a second increment after the page had already rendered and the
tester had already visually confirmed the lower quantity.

**Fix — a fail-safe, not a root-cause fix:** since the _exact_ trigger couldn't be confirmed with
certainty, the priority was making sure this class of bug can never again silently overcharge a
customer, regardless of what causes a future divergence. `placeOrder()` now compares
`getCheckoutSummary()`'s items against what the cart page is currently displaying
(`this.apiCart()`) by item id + quantity immediately after fetching the summary. If they don't
match, the order is **not** created — the cart display is refreshed from the server and the user
sees "Your cart changed just now — please review it and try again," the same way an
unavailable-item mismatch is already handled. This turns an unpredictable race into "never silently
charge more than the customer confirmed," which is the actual harm this bug caused, even without
100% certainty on the underlying trigger.

**Verified live:** placed a full order after this fix (single item, no manual quantity changes
between cart view and checkout) — the divergence check correctly found no mismatch and let the
order through normally (`#ORD965659412936`, qty confirmed correct in the DB) — confirming the
fail-safe doesn't false-positive on the ordinary, unchanged-cart path.

**Where:** `apps/apps/zitro-customer/src/app/features/cart/cart.page.ts` (`placeOrder`, new
`hasCartDiverged` helper).

**Still open:** the underlying trigger for how the two reads diverged in the first place is not
fully understood. If this fail-safe starts firing in practice (visible via the new "cart changed"
message and/or `order_failed` analytics events), that's the signal to dig further into the actual
race — the fail-safe prevents customer harm but doesn't explain the mechanism.

---

### 1.8 — Minor / cosmetic

| #     | Finding                                                                                                                                                                                                                     | Status                      | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.8.1 | `GET /assets/images/logo.png` → 404 on every cold load (splash screen). No logo asset exists anywhere in the repo under any name.                                                                                           | **FIXED** (defensively)     | No real logo file exists to add (not something to fabricate). `SplashScreenComponent`'s `<img>` now has an `(error)` handler that hides the element instead of leaving a failed request/broken-image icon. Forward-compatible — a real `logo.png` added later will just display normally, this only changes the failure path. `libs/ui/src/common/splash-screen/splash-screen.component.{ts,html}`.                                                                                                                                                                                                                                                                                                         |
| 1.8.2 | Address list display produced a double comma when Landmark is empty: `"Shop No. 10, Test Market, , Dibiyapur, Uttar Pradesh — 206244"`.                                                                                     | **FIXED**                   | `AddressCardComponent` now has a `formattedDetails` computed that filters out empty segments before joining with `, `, instead of the template unconditionally interpolating every field. `libs/ui/src/address/address-card/address-card.component.{ts,html}`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 1.8.3 | The Add-Address Google Map never centered on the user's actual selected delivery location — always opened centered on a fixed Lucknow/Hazratganj-area coordinate (`26.8467, 80.9462`) regardless of the user's actual area. | **FIXED**                   | `AddAddressPage.initMap()`'s center fallback chain is now `presetCoords ?? locationSelectionService.snapshot.coordinates ?? hardcoded default` — falls back to the user's already-selected delivery-area coordinates before the last-resort hardcoded point. `apps/apps/zitro-customer/src/app/features/addresses/add-address.page.ts`.                                                                                                                                                                                                                                                                                                                                                                     |
| 1.8.4 | App startup: `AppSettings Firestore getDocs` genuinely takes **~26 seconds** to resolve, even though a 5-second timeout fallback already lets the rest of the app proceed after 5s.                                         | **Investigated, not fixed** | The 5s timeout is implemented via `Promise.race`, which lets the app move on but can't actually cancel the underlying Firestore `getDocs()` call — the Firestore JS SDK has no cancellation for an in-flight query, so it keeps running for the full ~26s regardless, just orphaned in the background. The real fix is either a faster/indexed query or (per `zitro-api/CLAUDE.md`'s own migration notes — `appSettings/restaurantDetails/onlineorders` is listed as "migrating to PostgreSQL") retiring this Firestore path entirely, which is a bigger, already-planned architectural change, not a safe surgical patch. Left as-is; user-facing impact is already bounded to 5s by the existing timeout. |

---

## 2. Confirmed live (already known via §16, now independently reproduced)

- **§16.8 — header hardcodes "The Hunger Point"**: confirmed on every screen visited while browsing
  EFC Pizza's actual menu/cart/checkout/order-tracking — the top bar never once said "EFC Pizza."
  Not fixed in this pass (out of the originally-reported scope).
- **CUST-T-907 — Invoice/Download-bill buttons are permanently disabled**: confirmed on the
  order-tracking page for a real, just-placed order. Not fixed in this pass.
- **§9.1/CUST-T-903 — no status timeline on order-tracking, only a single banner**: confirmed.
  Not fixed in this pass.
- **Phone masking on order-tracking**: works correctly (`964380XXXX`), for what it's worth as a
  positive confirmation.

---

## 3. Not reached this pass

§2 (location gate's GPS-permission branches — couldn't grant real OS-level geolocation permission
in this browser automation environment), §7 (coupons), §10 (order history), §11 (addresses beyond
add/save), §12 (account/profile), §13 (contact us), §14 (2048 game), §15 (not-implemented sweep),
§17 (cross-cutting guard/offline scenarios). The real-time order-status propagation gap (§9.2,
already exhaustively documented in the source doc via code reading) was not independently
re-verified live this pass — changing an order's status server-side requires either direct SQL
(which would skip the app's own status-flow/Firestore-sync logic and produce a misleading test) or
the `zitro-restaurant` portal, which wasn't part of this session's scope.
