# ZITRO Customer — Live Test Findings (2026-08-20)

> **Purpose:** record of actually **running** `CUSTOMER-TEST-SCENARIOS.md` against a live local
> stack — `zitro-api` on `:8080` against local Postgres `zitro-dev`, `zitro-customer` on `:4200`.
> Everything below was reproduced by clicking through the real app in a browser and cross-checked
> against server logs / the database, not inferred from reading source alone.
>
> Not exhaustive — one focused pass on the location → auth → home → cart → checkout →
> order-tracking path (§1–§9 territory). Coupons, account, contact-us, and the 2048 game were not
> reached.
>
> **Closed items** (7 numbered issues + 3 cosmetic ones from the original pass, plus the slow
> Firestore startup call, the hardcoded "The Hunger Point" header, the disabled invoice/bill
> buttons, and the missing order status timeline — all fixed and verified live 2026-08-20/21) have
> been pruned from this doc. See git log / session history for what changed on each. **What's below
> is what's still open.**

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

## 2. Environment — remaining action items

- **`apps/apps/zitro-customer/src/environments/environment.ts`** `apiUrl` is currently pointed at
  `http://localhost:8080` for local testing (deliberately left uncommitted). Revert to
  `https://zitro-api.onrender.com` before building for deploy, or just don't commit it.

---

## 3. Not reached this pass

§2 (location gate's GPS-permission branches — couldn't grant real OS-level geolocation permission
in this browser automation environment), §7 (coupons), §10 (order history), §11 (addresses beyond
add/save), §12 (account/profile), §13 (contact us), §14 (2048 game), §15 (not-implemented sweep),
§17 (cross-cutting guard/offline scenarios). The real-time order-status propagation gap (§9.2,
already exhaustively documented in the source doc via code reading) was not independently
re-verified live this pass. §16 (Known Gaps) items not called out above are still open exactly as
documented in the source scenarios doc — this file only tracks what this live-testing pass touched.
