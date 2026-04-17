# T029-unit — Write All Unit + Integration Tests

**Status:** `[ ]`
**Branch:** `feature/T029-unit-tests`
**Depends on:** T029, T006

> **Read `TESTING-STANDARDS.md` before starting.** All rules, coverage targets, and file splitting guidance are there.

---

## Goal

Write ALL unit and integration tests in one PR after `zitro-customer` is feature-complete (T029 done).
This avoids rework from tests being written against intermediate implementations.
Uses `@zitro/test-data` builders + factories everywhere — no inline mock objects.

---

## Batch 1 — Pure Libs (Vitest, no Angular)

### Models
```
libs/models/src/*.spec.ts    (ONLY if model files export runtime functions — see T003 spec)
```

### Mappers (100% coverage target)
```
libs/mappers/src/mappers/catalog.mapper.spec.ts
  (split: catalog.mapper.to-product.spec.ts + catalog.mapper.to-category.spec.ts if > 300 lines)
libs/mappers/src/mappers/order.mapper.to-order.spec.ts
libs/mappers/src/mappers/order.mapper.from-cart.spec.ts
libs/mappers/src/mappers/pricing.mapper.spec.ts
libs/mappers/src/mappers/user.mapper.spec.ts
libs/mappers/src/mappers/coupon.mapper.spec.ts
libs/mappers/src/mappers/business.mapper.spec.ts
```

For exact test cases (`describe`/`it` blocks) — see **T004 Test Specifications** in `T003-T011.md`.

### Interceptors
```
libs/services/src/interceptors/auth.interceptor.spec.ts
libs/services/src/interceptors/business-id.interceptor.spec.ts
libs/services/src/interceptors/error.interceptor.4xx.spec.ts
libs/services/src/interceptors/error.interceptor.5xx.spec.ts
libs/services/src/interceptors/retry.interceptor.spec.ts
```

For exact test cases — see **T009 Test Specifications** in `T003-T011.md`.

### Cart + Pricing Services
```
libs/services/src/api/cart.service.state.spec.ts
libs/services/src/api/cart.service.persistence.spec.ts
libs/services/src/api/pricing.service.spec.ts
```

### Cache + FeatureFlag Services
```
libs/services/src/cache.service.get-set.spec.ts
libs/services/src/cache.service.invalidate.spec.ts
libs/services/src/feature-flag.service.spec.ts
```

For exact test cases — see **T011 Test Specifications** in `T003-T011.md`.

---

## Batch 2 — Integration Tests (Vitest + MSW)

MSW handlers come from `@zitro/test-data/msw`. Start the server in `beforeAll`, stop in `afterAll`.

```
libs/services/src/api/catalog-api.service.get-products.integration.spec.ts
libs/services/src/api/catalog-api.service.get-categories.integration.spec.ts
libs/services/src/api/order-api.service.integration.spec.ts
libs/services/src/api/user-api.service.integration.spec.ts
libs/services/src/api/coupon-api.service.integration.spec.ts
libs/services/src/api/address-api.service.integration.spec.ts
```

For exact test cases — see **T010 Test Specifications** in `T003-T011.md`.

---

## Batch 3 — Angular Component Tests (jest-preset-angular)

All use `fixture.componentRef.setInput()` for signal inputs. Never `(component as any).prop = value`.

```
libs/ui/src/common/loader/loader.component.rendering.spec.ts
libs/ui/src/common/no-internet/no-internet.component.spec.ts
libs/ui/src/common/splash-screen/splash-screen.component.spec.ts
libs/ui/src/common/confirmation-dialog/confirmation-dialog.component.rendering.spec.ts
libs/ui/src/common/confirmation-dialog/confirmation-dialog.component.interactions.spec.ts
libs/ui/src/auth/phone-input/phone-input.component.spec.ts
libs/ui/src/auth/otp-input/otp-input.component.spec.ts
libs/ui/src/catalog/product-card/product-card.component.rendering.spec.ts
libs/ui/src/catalog/product-card/product-card.component.interactions.spec.ts
libs/ui/src/catalog/product-card/product-card.component.config.spec.ts
libs/ui/src/catalog/search-bar/search-bar.component.spec.ts
libs/ui/src/address/add-address-form/add-address-form.component.spec.ts
libs/ui/src/cart/pricing-summary/pricing-summary.component.spec.ts
libs/ui/src/order/order-status-badge/order-status-badge.component.spec.ts
libs/ui/src/banners/banner-carousel/banner-carousel.component.spec.ts
```

For exact test cases — see **Test Specifications** in `T012-T019.md` for each component.

---

## Batch 4 — Feature Page Tests (jest-preset-angular)

One `.spec.ts` per feature page in `apps/zitro-customer/src/app/features/`. Each spec tests:
- Route guard behavior (auth guard, business selection guard)
- Service method calls (mocked via `vi.fn()` / `jest.fn()`)
- Template renders key `[data-testid]` elements
- Output/event wiring to services

```
apps/zitro-customer/src/app/features/splash/splash.page.spec.ts
apps/zitro-customer/src/app/features/business-selection/business-selection.page.spec.ts
apps/zitro-customer/src/app/features/auth/sign-in/sign-in.page.spec.ts
apps/zitro-customer/src/app/features/auth/otp/otp.page.spec.ts
apps/zitro-customer/src/app/features/home/home.page.spec.ts
apps/zitro-customer/src/app/features/menu/menu.page.spec.ts
apps/zitro-customer/src/app/features/cart/cart.page.spec.ts
apps/zitro-customer/src/app/features/checkout/checkout.page.spec.ts
apps/zitro-customer/src/app/features/order-confirmation/order-confirmation.page.spec.ts
apps/zitro-customer/src/app/features/orders/order-history.page.spec.ts
apps/zitro-customer/src/app/features/orders/order-detail.page.spec.ts
apps/zitro-customer/src/app/features/addresses/address-list.page.spec.ts
apps/zitro-customer/src/app/features/profile/profile.page.spec.ts
apps/zitro-customer/src/app/features/coupon-selection/coupon-selection.page.spec.ts
```

---

## Coverage Gates

Run after all batch specs are written:

- [ ] `nx run-many -t test` — all pass
- [ ] `nx test mappers -- --coverage` → 100% statement + branch
- [ ] `nx test services -- --coverage` → 90%+ statement
- [ ] `nx test ui -- --coverage` → 80%+ statement
- [ ] Report saved to `coverage/` (gitignored)

---

## File Splitting Enforcement

Any spec file that exceeds 300 lines MUST be split before the PR is opened.
Use naming convention from `TESTING-STANDARDS.md`.
