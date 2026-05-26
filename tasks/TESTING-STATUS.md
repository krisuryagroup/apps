# ZITRO — Testing Task Status Board

> **How to use:**
> - Frontend tasks: say "start task T029" or "start task T030"
> - Backend tasks: say "start task B01" through "start task B10"
>
> **Scenario files** (read these to understand the depth required):
> - `apps/ACCEPTANCE-TEST-SCENARIOS.md` — frontend E2E deep scenarios per page
> - `apps/TESTING-STRATEGY.md` — frontend test architecture, mocks, fixture rules
> - `zitro-api/docs/BACKEND-TEST-SCENARIOS.md` — backend deep scenarios per API module
> - `zitro-api/docs/TESTING-STRATEGY.md` — backend test architecture, seeding, CI

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |
| `[!]` | Blocked — specify reason |

---

## BACKEND TASKS — zitro-api

> Task detail file: `zitro-api/tasks/BACKEND-TEST-TASKS.md`
> Start order: B01 → B02 → B03–B09 in any order → B10 anytime

| ID | Task | Status | Notes |
|----|------|--------|-------|
| B01 | TestData Infrastructure — DatabaseSeeder + TestConstants + Builders | `[ ]` | Foundation for all B tasks |
| B02 | Centralized Mocks — Firebase, OTP, Razorpay, Fast2SMS | `[ ]` | Depends on B01 |
| B03 | Auth Integration Tests (21 tests) | `[ ]` | OTP rate limit, replay, brute force, concurrent user |
| B04 | Orders Integration Tests (34 tests) | `[ ]` | Price tamper, atomicity, IDOR, status transitions |
| B05 | Payments Integration Tests (14 tests) | `[ ]` | HMAC check, paise math, duplicate webhook |
| B06 | Cart Integration Tests (12 tests) | `[ ]` | Cross-restaurant, IDOR, guest merge |
| B07 | Wallet Integration Tests (8 tests) | `[ ]` | Concurrency, idempotency, atomic deduction |
| B08 | Coupons Integration Tests (9 tests) | `[ ]` | Race condition, discount cap |
| B09 | RBAC Enforcement Tests (15 tests) | `[ ]` | 401/403 matrix all roles × endpoints |
| B10 | POST /api/auth/dev-login endpoint | `[ ]` | Required before any frontend E2E runs |

---

## FRONTEND TASKS — apps

> Task detail files: `apps/tasks/T029-UNIT.md`, `apps/tasks/T030-E2E.md`
> Start order: T029 → T030 (T030 requires B10 to be done first for OTP bypass)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| T029 | Unit + Integration Tests (all batches) | `[ ]` | Mappers, services, interceptors, UI components, feature pages |
| T030 | E2E Tests — 27 Playwright journeys | `[ ]` | Requires B10 (dev-login) to bypass OTP |

### T029 Batch Summary

| Batch | Scope | Files |
|-------|-------|-------|
| 1 — Pure libs | Mappers, interceptors, cart/pricing services | ~12 spec files |
| 2 — Integration | API services via MSW (catalog, orders, users, coupons, addresses) | ~6 integration spec files |
| 3 — UI components | Shared lib components (loader, otp-input, product-card, pricing-summary, etc.) | ~14 spec files |
| 4 — Feature pages | All zitro-customer pages (sign-in, otp, home, cart, checkout, order-confirmation, etc.) | ~14 spec files |

### T030 Journey Summary

| Journey | Spec file | Tests |
|---------|-----------|-------|
| J1 — Guest Browse | `guest-browse.spec.ts` | 8 |
| J2 — Place Order | `place-order.spec.ts` | 7 |
| J3 — Apply Coupon | `apply-coupon.spec.ts` | 4 |
| J4 — Cancel Order | `cancel-order.spec.ts` | 3 |
| J5 — Address Management | `address-management.spec.ts` | 5 |
| **Total** | | **27** |

---

## Checkout Scenarios (part of T030 J2 — Place Order)

The cart page (`cart.page.ts`) IS the checkout — it includes order type, address, payment method,
and the order processing stages. T030 J2 covers all of these. Key checkout scenarios to validate:

| Scenario | Journey | Test ID |
|----------|---------|---------|
| Delivery order — select address — COD — place | J2 | J2-04 |
| Dine-in — select table — select guests — place | J2 | (extend J2) |
| Takeout — scheduled time — place | J2 | (extend J2) |
| No address selected — place-order btn disabled | J2 | J2-E2 |
| Guest user — checkout triggers login redirect | J2 | J2 precondition |
| Order processing stages modal (validating → confirming) | J2 | J2-04 assertion |
| Unavailable item caught at checkout summary | J2 | (extend J2) |
| Cutlery toggle persists to order | J2 | (extend J2) |
| Customer note saved with order | J2 | (extend J2) |

> Full checkout scenario depth: see `apps/ACCEPTANCE-TEST-SCENARIOS.md` → PAGE: Cart → FEATURE 4

---

## Recommended Execution Order (full sequence)

```
1. B01 — TestData infrastructure (2–3h)
2. B02 — Mocks (1h)
3. B10 — dev-login endpoint (1h) ← unblocks all frontend E2E
4. B03–B09 — Integration tests (1–2h each, run in parallel if time allows)
5. T029 — Frontend unit tests (4–6h)
6. T030 — Frontend E2E (2–3h, requires dev server + B10 done)
```

**Milestone:** When B03–B09 all pass and T030 all pass →
backend is production-safe and frontend golden path is fully automated.
