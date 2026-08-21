# ZITRO Customer — Live Test Findings (2026-08-20)

> **Purpose:** record of actually **running** `CUSTOMER-TEST-SCENARIOS.md` against a live local
> stack — `zitro-api` on `:8080` against local Postgres `zitro-dev`, `zitro-customer` on `:4200`.
> Everything below was reproduced by clicking through the real app in a browser and cross-checked
> against server logs / the database, not inferred from reading source alone. Issues already
> catalogued in `CUSTOMER-TEST-SCENARIOS.md` §16 (Known Gaps) are not repeated here except where
> this session verified them live for the first time.
>
> Not exhaustive — one focused pass on the location → auth → home → cart → checkout →
> order-tracking path (§1–§9 territory). Coupons, account, contact-us, and the 2048 game were not
> reached.
>
> **Status:** 7 numbered issues + 3 cosmetic ones were found, fixed, and re-verified live —
> pruned from this doc since they're closed; see git log (`fix(customer): ...` /
> `fix: ...` commits dated 2026-08-20) for exactly what changed on each. **What's below is what's
> still open.**
>
> **Correction (same day, user-caught):** the first fix for "Search your Location" (finding 1.1,
> now closed) was itself wrong on manual re-test — it routed to `/add-address`, which still has its
> own `AuthGuard` and bounced any non-signed-in user straight to `/auth/signin`, never showing a
> search field. Replaced with the actual right fix: reuse the existing, already-guest-friendly
> `LocationBottomSheetComponent` (the same "Select a location" sheet already used elsewhere in the
> app) instead of routing anywhere. See commit
> `fix(customer): use the existing location bottom sheet for "Search your Location"...`.

---

## 1. Still open

### 1.1 — Order-quantity divergence: fail-safe applied, root cause not found (CRITICAL → mitigated)

A real checkout showed the cart at **Farmhouse Pizza × 2** moments before "Place Order," but the
order actually created and charged had **× 3** (₹1,150.80 vs. the ₹904 shown). `placeOrder()`
builds the order from `getCheckoutSummary()`, a different endpoint than the one that renders the
cart (`GET /api/cart`) — both were read in full server-side and neither caches, so the exact
mechanism that let the two diverge within seconds of each other was **not conclusively pinned
down**. Leading candidate: a duplicated/retried `addToCart()` request landing a second increment
after the page had already rendered the lower quantity (this reproduction happened right after an
API restart, i.e. during a window of genuine network instability).

**What's in place now:** `placeOrder()` compares the checkout-summary items against what's
currently on screen by id + quantity, and refuses to create the order on any mismatch (refreshes
the cart, tells the user it changed) instead of silently charging more than confirmed. This
prevents customer harm but doesn't explain the trigger.

**Action item:** if the new "Your cart changed just now" message starts appearing in practice
(check for it and/or `order_failed` analytics events), that's the signal to dig into the actual
race between `GetCartHandler` and `CheckoutHandler`.

**Where:** `apps/apps/zitro-customer/src/app/features/cart/cart.page.ts` (`placeOrder`,
`hasCartDiverged`).

---

### 1.2 — Slow Firestore call at startup (~26s) — FIXED (2026-08-21)

`AppSettings Firestore getDocs` used to take ~26 seconds to resolve on every app boot.

**Resolved:** built the REST replacement this was blocked on. New `remote_settings` table
(single global row) + `GET /api/app-config/remote-settings` (public, polled at boot) +
`POST /api/admin/remote-settings/force-logout` / `POST /api/admin/remote-settings/cache-clear`
(Admin JWT + `app-config:write` permission, same pattern as the rest of `AdminAppConfigController`).
`AppSettingsService.getAppSettings()` now calls the REST endpoint instead of Firestore —
verified live: boot-time fetch is now ~10-14ms (was ~26,000ms). `triggerForceLogoutAllDevices()`
and the new `triggerCacheClearAllDevices()` in `cache-management.component.ts` call the two admin
endpoints. The whole `appSettings/restaurantDetails/onlineorders/` Firestore path is now fully
retired — `AppSettingsService` no longer imports `@angular/fire/firestore` at all.

One caveat, by design: the two admin trigger buttons in `cache-management.component.ts` require an
Admin JWT (`AdminAuthTokenService`, key `zitro_admin_jwt`), which zitro-customer has no login flow
for — the component is explicitly "Development Only" and was reachable with **no auth at all**
before (an open Firestore write); it's a strict security improvement, but a developer needs to seed
that localStorage key manually (e.g. paste a token obtained via `POST /api/admin/auth/login`) to
actually use those two buttons locally. The public GET (the one that fixed the startup delay) needs
no auth and works for every user.

**Migration:** `zitro-api/docs/schema/apply-2026-08-21-remote-settings.sql` (idempotent, already
applied to local `zitro-dev`) — run it against any other database this needs to reach.

**Where:** `apps/libs/services/src/app-settings.service.ts`, `apps/libs/services/src/api/remote-settings-api.service.ts` (new),
`apps/apps/zitro-customer/src/app/shared/components/cache-management/cache-management.component.ts`,
`zitro-api/src/Modules/AppConfig/AppConfig.Module/Features/{GetRemoteSettings,TriggerForceLogout,TriggerCacheClear}/`.

---

### 1.3 — Known gaps confirmed live, not fixed this pass

- **§16.8 — header hardcodes "The Hunger Point"**: confirmed on every screen while browsing EFC
  Pizza's actual menu/cart/checkout/order-tracking — the top bar never once said "EFC Pizza."
- **CUST-T-907 — Invoice/Download-bill buttons are permanently disabled**: confirmed on
  order-tracking for a real, just-placed order.
- **§9.1/CUST-T-903 — no status timeline on order-tracking, only a single banner**: confirmed.

These were pre-existing, already-documented gaps (source doc §16 / relevant `CUST-T-*` scenarios) —
out of scope for this fix pass, listed here only because this session independently reproduced them
live rather than just reading the code.

---

## 2. Environment — remaining action items

- **Confirm the real databases have the apartment/society-addresses schema.** Address
  read/write (`GET`/`POST /api/users/me/addresses`) was completely broken locally (500s) because
  the migration in `ZITRO-Production-Schema.sql` (`address_mode`, `societies`, `society_towers`,
  lines ~2026–2131 — already correctly present in the schema file, this was **not** a missing-code
  bug) had never actually been run against local `zitro-dev`. Nothing in the repo confirms it's
  been run against the real Neon/staging databases either — if it hasn't, address read/write is
  broken live exactly as it was here. Local `zitro-dev` has since been brought in line with the
  schema file and confirmed working end-to-end.
- **`apps/apps/zitro-customer/src/environments/environment.ts`** `apiUrl` is currently pointed at
  `http://localhost:8080` for local testing (deliberately left uncommitted). Revert to
  `https://zitro-api.onrender.com` before building for deploy, or just don't commit it.
- **`zitro-api` local dev now points at local Postgres** (`zitro-dev`) instead of a Neon database
  named `zitro-prod` that was left active in `appsettings.Development.json` — this fix is
  committed. If you pull that file fresh from another machine/backup, double-check the active
  `DATABASE:URL` before running anything that writes data.
- Two real test orders exist in local `zitro-dev` from this session — `#ORD937977142239` and
  `#ORD965659412936` — left in place as they were the evidence trail for 1.1 above.

---

## 3. Not reached this pass

§2 (location gate's GPS-permission branches — couldn't grant real OS-level geolocation permission
in this browser automation environment), §7 (coupons), §10 (order history), §11 (addresses beyond
add/save), §12 (account/profile), §13 (contact us), §14 (2048 game), §15 (not-implemented sweep),
§17 (cross-cutting guard/offline scenarios). The real-time order-status propagation gap (§9.2,
already exhaustively documented in the source doc via code reading) was not independently
re-verified live this pass.
