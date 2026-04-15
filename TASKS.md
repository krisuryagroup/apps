# ZITRO Apps — Task Board

> **How to use:** Tell Claude "start task T007" and it will read this file, implement everything in scope, run checks, and raise a PR automatically.
>
> **Read first:** `ROADMAP.md` — shows the complete sequence (migration → evolution → new apps) and how each task here connects to the migration.
> **Migration tasks:** `MIGRATION-PLAN.md` (MT001–MT018) — must be done before any task here.
> **Architecture reference:** `ZITRO-APPS-ARCHITECTURE.md`
> **Claude context:** `CLAUDE.md`

> ⚠️ **Tasks T001, T002, T005 are superseded by migration tasks MT001–MT004. Do not run them.**
> **T003 is now active** — models update (imageUrl rename + flatten OrderCharges + new User/BusinessConfig/catalog models). Start it now; do not wait for .NET API to be "verified".
> All other tasks start after MT018 is complete. See `ROADMAP.md` for the full sequence.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done — PR merged |
| `[!]` | Blocked — dependency not complete |

---

## Quick Status Board

| ID | Title | Status | Depends On |
|----|-------|--------|-----------|
| **Phase 1 — Workspace Foundation** |
| T001 | Bootstrap Nx workspace | `[x]` superseded by MT001 | — |
| T002 | Create all library scaffolds | `[x]` superseded by MT002 | T001 |
| **Phase 2 — Models, Mappers & Utils** |
| T003 | `@zitro/models` structural changes (imageUrl + flat OrderCharges + new User/BusinessConfig/catalog models) | [ ] | MT003 |
| T004 | Implement `@zitro/mappers` | [ ] | MT003 |
| T005 | Verify `@zitro/utils` tests pass | `[x]` superseded by MT004 (run tests only) | MT004 |
| **Phase 3 — Test Data** |
| T006 | Implement `@zitro/test-data` | [ ] | T004, T005 |
| **Phase 4 — Theme** |
| T007 | Evolve `@zitro/theme` — CSS custom properties + ThemeService (SCSS already copied by MT005) | [x] | MT005 |
| **Phase 5 — i18n** |
| T008 | Build `@zitro/i18n` — extract strings from migrated `apps/zitro-customer` templates | [x] | MT018 |
| **Phase 6 — Services** |
| T009 | HTTP interceptors in `@zitro/services` | [x] | T004 |
| T010 | API service classes in `@zitro/services` (replace Firebase data services) | [ ] | T009 |
| T011 | FeatureFlagService (UI flags only) + CacheService | [ ] | T009 |
| **Phase 7 — UI Library (evolve existing components from MT006)** |
| T012 | Evolve: `loader`, `no-internet`, `splash-screen` + equivalents — add config objects, signals, data-testid, i18n | [ ] | T007, T008 |
| T013 | Evolve: `confirmation-dialog`, `bottom-sheet`, `truncated-text`, `zoomable-image`, `description-dialog`, `order-loading-modal` | [ ] | T012 |
| T014 | Evolve: auth input components (signin, OTP) + new `theme-picker` component | [ ] | T012 |
| T015 | Evolve: `product-card`, `product-grid`, `category-cards`, `item-details-dialog`, search | [ ] | T013, T010 |
| T016 | Evolve: address components | [ ] | T013, T010 |
| T017 | Evolve: `cart-summary`, `pricing-summary`, coupon selector | [ ] | T015 |
| T018 | Evolve: `banner`, `cancel-order-dialog`, `update-dialog` + new ratings components | [ ] | T013, T010 |
| **Phase 8 — SCSS Cleanup + Security & Finalize** |
| T019-scss | SCSS refactoring — slim down oversized component stylesheets to pass `anyComponentStyle` budget | [x] | MT018 |
| T019 | Finalize command + Husky + audit-ci | [x] | MT002, T019-scss |
| **Phase 9 — zitro-customer (evolve existing pages from MT009–MT017)** |
| T020 | Evolve `app.config.ts` — add provideI18n, provideTheme, provideZitroServices (HTTP) | [ ] | T008, T007, T009 |
| T021 | Evolve `business-selection` page | [ ] | T020 |
| T022 | Evolve auth pages | [ ] | T021, T014 |
| T023 | Evolve `home` page | [ ] | T022, T015, T018 |
| T024 | Evolve `listing`, `search`, `categories`, `category-listing` pages | [ ] | T023 |
| T025 | Evolve `cart` page | [ ] | T024, T017 |
| T026 | Evolve address pages | [ ] | T025, T016 |
| T027 | Evolve `order-confirmation` + checkout flow | [ ] | T026 |
| T028 | Evolve `order-history`, `order-tracking` pages | [ ] | T027, T018 |
| T029 | Evolve `account`, `contact-us`, `coupon-selection`, `game-2048` pages | [ ] | T028 |
| T029-unit | Write ALL unit + integration tests (mappers, services, interceptors, components, pages) | [ ] | T029, T006 |
| T030 | E2E tests — 5 critical journeys (Playwright) | [ ] | T029-unit |
| **Phase 10 — Restaurant Partner App** |
| T031 | Bootstrap `zitro-restaurant` — app.config, routing, auth, Capacitor | [ ] | T011, T019 |
| T032 | zitro-restaurant: Order management (live queue, accept/reject) | [ ] | T031, T018 |
| T033 | zitro-restaurant: Menu management (CRUD, availability, categories) | [ ] | T032, T015 |
| T034 | zitro-restaurant: Business settings + reports | [ ] | T033 |
| **Phase 10b — Background Jobs** |
| T035 | Implement `@zitro/jobs-shared` | [ ] | T003 |
| T036 | Bootstrap `zitro-jobs` + all Cloud Functions | [ ] | T035 |
| **Phase 11 — Remaining Apps** |
| T037 | Bootstrap `zitro-admin` — core screens | [ ] | T011, T019 |
| T038 | Bootstrap `zitro-delivery` — core screens + Capacitor | [ ] | T011, T019 |
| T039 | Bootstrap `zitro-pos` — core screens + Capacitor | [ ] | T011, T019 |
| T040 | Bootstrap `zitro-superadmin` — core screens | [ ] | T011, T019 |
| **Phase 12 — CI/CD** |
| T041 | GitHub Actions — PR check + release workflows | [ ] | T019 |
| **Phase 13 — New API Endpoints** |
| T042 | zitro-api: Config endpoint + Geo proxy + Business search + Internal jobs endpoints | [ ] | T010 |

---

## Testing Standards

> **Tests are written LAST** — in T029-unit (after T029), not alongside each task.
> Each task T003–T018 contains a "Test Specifications" subsection that serves as a test plan.
> The acceptance criteria in T003–T018 do NOT gate on tests passing — only on the build passing.
> T029-unit writes all unit + integration tests in one PR. T030 adds E2E on top.

### Framework by Location

| Location | Test Runner | Style |
|---|---|---|
| `libs/models`, `libs/mappers`, `libs/utils`, `libs/services`, `libs/theme`, `libs/i18n`, `libs/test-data` | **Vitest** — `import { describe, it, expect, vi } from 'vitest'` | Direct constructor injection |
| `libs/ui` | **jest-preset-angular** — `TestBed.configureTestingModule` | Angular `ComponentFixture` |
| `apps/zitro-customer` (pages) | **jest-preset-angular** | Angular `ComponentFixture` |
| `apps/zitro-customer-e2e` | **Playwright** | Page Object Model, `[data-testid]` only |

### File Splitting Rules

Split a spec file when ANY condition is true:
1. The file would exceed **300 lines** before a new `describe` block is added
2. A single `describe` group has more than **12 `it()` calls**
3. The source file has 2+ logically distinct responsibility areas

**Naming convention for split files:**
```
service.spec.ts                       → only: construction, init, bootstrap tests
service.get-products.spec.ts          → all getProducts describe groups
service.cache.spec.ts                 → all cache-interaction tests
mapper.catalog.spec.ts                → toProduct, toProductList, toCategory, toVariation
mapper.order.to-order.spec.ts         → toOrder, toOrderList methods
mapper.order.from-cart.spec.ts        → fromCart, fromCartItem methods
component.rendering.spec.ts           → template / data-testid presence assertions
component.interactions.spec.ts        → user events, outputs, service calls
component.config.spec.ts              → config object input variations
```

Every split file is a fully standalone spec (its own `beforeEach` setup, no shared state between files).

### Coverage Targets

| File type | Target |
|---|---|
| Pure functions / mappers (`libs/mappers`, `libs/utils`) | **100%** statement + branch |
| Services (`libs/services`) | **90%** statement, **85%** branch |
| Angular components (`libs/ui`) | **80%** statement, **70%** branch |
| Feature pages (`apps/zitro-customer`) | **70%** statement |
| `libs/test-data` builders + factories | **100%** — untested builders are silent bugs |

Coverage generated by: `nx test <project> -- --coverage` → `coverage/<project>/`

### @zitro/test-data Usage

All T029-unit specs run after T006 — `@zitro/test-data` exists. **Every spec uses builders/factories — no inline mock objects.**

```typescript
import { CatalogBuilders, OrderBuilders, CartBuilders, UserBuilders } from '@zitro/test-data';
import { catalogHandlers, orderHandlers } from '@zitro/test-data/msw';
import { ProductDtoFactory, OrderDtoFactory } from '@zitro/test-data/factories'; // for mapper specs
```

Never `as any` — builders and factories return fully-typed objects.

### Signal Input Testing (jest-preset-angular)

```typescript
// CORRECT — use setInput via ComponentRef
fixture.componentRef.setInput('product', CatalogBuilders.paneerButterMasala());
fixture.detectChanges();

// WRONG — bypasses signal reactivity
(component as any).product = someValue;
```

---

## Detailed Tasks

---

### T001 — Bootstrap Nx Workspace

**Status:** `[ ]`
**Branch:** `feature/T001-nx-bootstrap`
**Depends on:** —
**Estimated effort:** Small (commands only, no business logic)

**Scope — files to create/modify:**
- `nx.json`
- `package.json`
- `tsconfig.base.json`
- `.eslintrc.json`
- `.gitignore`
- `audit-ci.json`
- `.nvmrc` (Node 20)

**Steps:**
```bash
cd E:/Github/krisuryagroup/apps

# 1. Init Nx workspace
npx create-nx-workspace@latest . --preset=apps --packageManager=npm --nxCloud=skip

# 2. Install generators
npm install -D @nx/angular @nx/js @nx/node

# 3. Testing tools
npm install -D vitest @vitest/coverage-v8 @vitest/ui happy-dom
npm install -D @playwright/test
npm install -D msw
npm install -D audit-ci
npm install -D husky lint-staged

# 4. Angular + Capacitor
npm install @angular/material @angular/cdk
npm install @angular/fire firebase
npm install @capacitor/core @capacitor/android @capacitor/cli
npm install @capacitor/app @capacitor/geolocation @capacitor/browser
npm install @capacitor/push-notifications @capacitor/haptics

# 5. Utilities
npm install geolib rxjs

# 6. Firebase for jobs
npm install firebase-functions firebase-admin

# 7. Dev tools
npm install -D chalk ts-node eslint-plugin-security

# 8. Husky
npx husky init
```

**`audit-ci.json`:**
```json
{
  "high": true,
  "critical": true,
  "allowlist": [],
  "report-type": "important"
}
```

**`.nvmrc`:**
```
20
```

**Acceptance Criteria:**
- [ ] `nx graph` opens without error
- [ ] `npm run nx -- --version` prints Nx version
- [ ] `npm audit` runs (audit-ci configured)
- [ ] `.husky/pre-commit` file exists

---

### T002 — Create All Library Scaffolds

**Status:** `[ ]`
**Branch:** `feature/T002-lib-scaffolds`
**Depends on:** T001
**Estimated effort:** Small (generate commands + tsconfig paths)

**Scope — files created by generators (verify these exist after running):**
- `libs/models/project.json`
- `libs/mappers/project.json`
- `libs/utils/project.json`
- `libs/theme/project.json`
- `libs/i18n/project.json`
- `libs/services/project.json`
- `libs/ui/project.json`
- `libs/test-data/project.json`
- `libs/jobs-shared/project.json`
- `tsconfig.base.json` (updated with all path aliases)

**Steps:**
```bash
# Pure TS libs
nx g @nx/js:lib models      --directory=libs/models      --importPath=@zitro/models
nx g @nx/js:lib mappers     --directory=libs/mappers     --importPath=@zitro/mappers
nx g @nx/js:lib utils       --directory=libs/utils       --importPath=@zitro/utils
nx g @nx/js:lib test-data   --directory=libs/test-data   --importPath=@zitro/test-data
nx g @nx/js:lib jobs-shared --directory=libs/jobs-shared --importPath=@zitro/jobs-shared

# Angular libs (standalone)
nx g @nx/angular:lib theme    --directory=libs/theme    --importPath=@zitro/theme    --standalone
nx g @nx/angular:lib i18n     --directory=libs/i18n     --importPath=@zitro/i18n     --standalone
nx g @nx/angular:lib services --directory=libs/services --importPath=@zitro/services --standalone
nx g @nx/angular:lib ui       --directory=libs/ui       --importPath=@zitro/ui       --standalone

# Node.js jobs app
nx g @nx/node:app zitro-jobs --directory=apps/zitro-jobs --framework=none
```

**After scaffolding — configure Nx tags in each `project.json`:**
```json
// libs/models/project.json
{ "tags": ["scope:models", "type:lib"] }

// libs/mappers/project.json
{ "tags": ["scope:mappers", "type:lib"] }

// libs/services/project.json
{ "tags": ["scope:services", "type:lib", "platform:angular"] }

// libs/ui/project.json
{ "tags": ["scope:ui", "type:lib", "platform:angular"] }

// libs/test-data/project.json
{ "tags": ["scope:test-data", "type:lib", "usage:test-only"] }

// libs/jobs-shared/project.json
{ "tags": ["scope:jobs-shared", "type:lib", "platform:node"] }

// apps/zitro-jobs/project.json
{ "tags": ["scope:jobs", "type:app", "platform:node"] }
```

**Add Nx boundary rules to `.eslintrc.json`:**
```json
{
  "@nx/enforce-module-boundaries": [
    "error",
    {
      "depConstraints": [
        { "sourceTag": "usage:test-only", "onlyDependOnLibsWithTags": ["type:lib"] },
        { "sourceTag": "platform:node", "bannedExternalImports": ["@angular/*"] },
        {
          "sourceTag": "scope:jobs",
          "allowedExternalImports": ["@zitro/models", "@zitro/jobs-shared"]
        }
      ]
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] All 9 `libs/*/project.json` files exist
- [ ] `tsconfig.base.json` has path aliases for all `@zitro/*`
- [ ] `nx lint models` passes (no boundary violations)
- [ ] `nx graph` shows all 9 libs as nodes

---

### T003 — Update `@zitro/models` (API-aligned)

**Status:** `[ ]`
**Branch:** `feature/T003-models-api-aligned`
**Depends on:** MT003

**Goal:** Update the models already copied in MT003 to match .NET API response shapes.
Apply the two structural changes, add new models (`User`, `BusinessConfig`, `MenuCategory`, `BusinessMenu`,
`NearbyBusiness`, `PlatformTag`), and export everything from `index.ts`.
Do this now — do NOT wait for .NET API to be verified for 2+ weeks.

**Source files (already in `libs/models/src/` from MT003 — modify in place):**
```
zitro-app/src/app/core/models/address.model.ts
zitro-app/src/app/core/models/auth-config.model.ts
zitro-app/src/app/core/models/banner.model.ts
zitro-app/src/app/core/models/cache-config.model.ts
zitro-app/src/app/core/models/category-config.model.ts
zitro-app/src/app/core/models/coupon.model.ts
zitro-app/src/app/core/models/order.model.ts
zitro-app/src/app/core/models/order-config.model.ts
zitro-app/src/app/core/models/pricing.model.ts
zitro-app/src/app/core/models/product.model.ts
zitro-app/src/app/core/models/appSettings.model.ts
zitro-app/src/app/core/models/banner.model.ts
```

**Scope — files to create:**
```
libs/models/src/address.model.ts
libs/models/src/auth.model.ts
libs/models/src/banner.model.ts
libs/models/src/business.model.ts
libs/models/src/cache.model.ts
libs/models/src/cart.model.ts
libs/models/src/catalog.model.ts        ← Product, ProductVariation, Category
libs/models/src/coupon.model.ts
libs/models/src/delivery.model.ts
libs/models/src/order.model.ts          ← Order, OrderItem, OrderCharges, OrderType, etc.
libs/models/src/order-config.model.ts   ← OrderConfiguration, DineInConfig, etc.
libs/models/src/pricing.model.ts        ← PricingBreakdown, PricingConfig
libs/models/src/user.model.ts
libs/models/src/app-config.model.ts     ← Runtime config from API
libs/models/src/index.ts                ← Re-export everything
libs/models/MIGRATION.md                ← Documents field renames
```

**Migration rule: copy field names as-is unless the API contract forces a change.**
Do not rename for style during migration — that is a separate cleanup task.

**Only two structural changes are required (both forced by the .NET API contract):**

| Legacy shape | New shape | Why it must change |
|---|---|---|
| `Product.image` and `Product.imageURL` (two separate fields) | `Product.imageUrl` (single field) | The .NET API returns one field. Two fields existed in Firebase because different code added them at different times. |
| `OrderCharges` nested `{ packagingCharges: { calculated, applied, waived }, ... }` | `OrderCharges` flat `{ packagingCharge: number, ... }` | Firebase stored sub-fields because Cloud Functions updated each separately. The .NET API computes and returns only the final applied value — the nested structure has no meaning in the new backend. |

**Everything else copies directly from the legacy model — same field names, same types:**
- `Product.isEnabledForOnlineOrders` → keep as `isEnabledForOnlineOrders`
- `ProductVariation.label` → keep as `label`
- `ProductVariation.price` (absolute) → keep as `price` (absolute — do NOT convert to delta)
- `ProductVariation.isEnabled` → keep as `isEnabled`
- `Address.type: 'Home' | 'Office' | 'Other'` → keep exactly (the legacy app already uses `'Office'`, not `'Work'`)
- All `OrderConfiguration`, `DineInConfig`, `TakeoutConfig`, `DeliveryConfig` fields → copy verbatim

**`PricingBreakdown` must include `visibility` block (copy from legacy `ChargesVisibility`):**
```typescript
visibility: {
  showDeliveryCharge: boolean;
  showPackagingCharge: boolean;
  showPlatformFee: boolean;
  showGst: boolean;
  showCouponDiscount: boolean;
  showFreeDeliveryProgress: boolean;
};
```

**`PricingConfig.delivery` must include `per_km_fee: number`** (already in legacy, just carry it over)

**`PaymentMethod = 'cash' | 'online'`** — wallet is future scope, not in legacy either

**`MIGRATION.md`** — document only the two structural changes above and why, so future developers understand why `OrderCharges` is flat.

**Acceptance Criteria:**
- [ ] `nx build models` — no errors
- [ ] `nx lint models` — no errors
- [ ] No fields from legacy model are dropped without being documented in `MIGRATION.md`
- [ ] `index.ts` exports everything with no circular dependencies
- [ ] TypeScript strict mode: no implicit `any`, no `!` assertions without justification

> **Tests:** Deferred to T029-unit. See "Test Specifications" below for what to test.

**Test Specifications (implement in T029-unit):**

`@zitro/models` exports only TypeScript interfaces. If any model file exports a runtime
function (type guard, validator), test it with Vitest — 100% branch coverage.

Example — if `order.model.ts` exports `isOrderCancellable(order: Order): boolean`:
```typescript
// order.model.spec.ts
describe('isOrderCancellable', () => {
  it.each([
    ['pending', true], ['confirmed', true],
    ['preparing', false], ['shipped', false],
    ['delivered', false], ['cancelled', false],
  ])('returns %s for status "%s"', (status, expected) => {
    expect(isOrderCancellable({ status } as Order)).toBe(expected);
  });
});
```

If no model file exports runtime functions — **zero spec files needed for T003.**
Model shape correctness is verified implicitly by T004 mapper tests.

---

### T004 — Implement `@zitro/mappers`

**Status:** `[ ]`
**Branch:** `feature/T004-zitro-mappers`
**Depends on:** T003

**Scope — files to create:**
```
libs/mappers/src/dtos/auth.dto.ts
libs/mappers/src/dtos/catalog.dto.ts
libs/mappers/src/dtos/order.dto.ts
libs/mappers/src/dtos/user.dto.ts
libs/mappers/src/dtos/coupon.dto.ts
libs/mappers/src/dtos/pricing.dto.ts
libs/mappers/src/dtos/index.ts
libs/mappers/src/requests/order.request.ts
libs/mappers/src/requests/address.request.ts
libs/mappers/src/requests/auth.request.ts
libs/mappers/src/requests/index.ts
libs/mappers/src/mappers/catalog.mapper.ts
libs/mappers/src/mappers/order.mapper.ts
libs/mappers/src/mappers/user.mapper.ts
libs/mappers/src/mappers/coupon.mapper.ts
libs/mappers/src/mappers/pricing.mapper.ts
libs/mappers/src/mappers/index.ts
libs/mappers/src/index.ts
```

**Key implementation rules:**
- DTOs mirror the `.NET API` response shapes (camelCase — ASP.NET Core 8 default)
- DTOs are plain interfaces — no classes, no decorators
- Mapper functions are pure (no side effects, no DI, no HTTP)
- No spec files in T004 — tests are written in T029-unit using `@zitro/test-data/factories`

**Key mappers to implement (see Section 4.2 of ZITRO-APPS-ARCHITECTURE.md for full code):**
- `CatalogMapper.toProduct(dto)` — maps `ProductDto` → `Product`; `dto.imageUrl → product.imageUrl`
- `CatalogMapper.toVariation(dto)` — maps `ProductVariationDto` → `ProductVariation`
- `CatalogMapper.toProductList(dtos)` — convenience batch mapper
- `OrderMapper.toOrder(dto)` — maps `OrderDto` → `Order`; flat `OrderCharges`
- `OrderMapper.fromCart(cart, options)` — builds `CreateOrderRequest` from cart state
- `PricingMapper.toBreakdown(dto)` — maps `PricingDto` → `PricingBreakdown` (with `visibility` block)
- `UserMapper.toUser(dto)` — maps `UserDto` → `User`
- `CouponMapper.toCoupon(dto)` — maps `CouponDto` → `Coupon`
- `BusinessMapper.toNearbyBusiness(dto)` — maps `NearbyBusinessDto` → `NearbyBusiness`
- `BannerMapper.toBanner(dto)` — maps `BannerDto` → `Banner`

**Acceptance Criteria:**
- [ ] `nx build mappers` — no errors
- [ ] `nx lint mappers` — no errors
- [ ] Every mapper function handles `null`/`undefined` fields without throwing (use defaults)
- [ ] `CatalogMapper.toProduct` maps `dto.imageUrl → product.imageUrl` (no legacy field names)
- [ ] `OrderMapper.fromCart` produces a valid `CreateOrderRequest`

> **Tests:** Deferred to T029-unit. See "Test Specifications" below.

**Test Specifications (implement in T029-unit — 100% coverage target):**

All mapper specs use Vitest. Use `@zitro/test-data/factories` for DTOs.

**`catalog.mapper.spec.ts`** (split if > 300 lines: `catalog.mapper.to-product.spec.ts` + `catalog.mapper.to-category.spec.ts`):
```
describe('CatalogMapper.toProduct')
  it maps all scalar fields 1:1 (id, name, description, basePrice, foodType, ...)
  it maps dto.imageUrl → product.imageUrl (assert NO "image" or "imageURL" on result)
  it maps dto.isAvailable = true → product.isEnabledForOnlineOrders = true
  it maps dto.isAvailable = false → product.isEnabledForOnlineOrders = false
  it maps dto.variations [] → []
  it maps 2 dto.variations → 2 ProductVariation via toVariation
  it defaults dto.dietaryPreferences undefined → []
  it defaults dto.dietaryPreferences null → []

describe('CatalogMapper.toVariation')
  it maps dto.name → variation.label  (field rename)
  it maps dto.isAvailable → variation.isEnabled
  it maps id, price, isDefault, sortOrder 1:1

describe('CatalogMapper.toProductList')
  it returns [] for empty input
  it maps array of 3 DTOs → 3 Products

describe('CatalogMapper.toCategory')
  it returns MenuCategory with id, name, priority, imageUrl, products[]
```

**`order.mapper.to-order.spec.ts`** + **`order.mapper.from-cart.spec.ts`**:
```
describe('OrderMapper.toOrder')
  it maps all top-level scalar fields
  it maps items via toOrderItem (productId, qty, price all present)
  it FLAT OrderCharges: packagingCharge is number (NOT nested object)
  it FLAT: deliveryCharge, platformFee, gst, couponDiscount are all numbers
  it deliveryAddress = null when dto.deliveryAddress = null
  it deliveryAddress = mapped object when dto.deliveryAddress present

describe('OrderMapper.fromCart')
  it orderType = "Delivery" for delivery orders
  it items[0].productId = cart.items[0].productId
  it items[0].quantity = cart.items[0].qty
  it couponCode = options.couponCode when provided
  it couponCode = null when options.couponCode is undefined
  it deliveryAddressId = null for Takeout order
```

**`pricing.mapper.spec.ts`**:
```
describe('PricingMapper.toBreakdown')
  it maps all 6 charge amount fields
  it maps entire visibility block (7 booleans)
  it showFreeDeliveryProgress = true when subtotal < freeDeliveryThreshold
  it showFreeDeliveryProgress = false when subtotal >= freeDeliveryThreshold
  it couponDiscount = 0 when no coupon applied
```

**`user.mapper.spec.ts`**, **`coupon.mapper.spec.ts`**, **`business.mapper.spec.ts`**:
```
UserMapper.toUser: maps all fields; addresses[] via toAddress; [] when dto.addresses undefined
CouponMapper.toCoupon: maps id, code, discountType, discountValue, minOrderValue, maxDiscount
  it.each(['percentage','flat'])('maps discountType="%s" correctly')
BusinessMapper.toNearbyBusiness: maps slug, name, businessType, rating, tags[]
```

---

### T005 — Implement `@zitro/utils`

**Status:** `[ ]`
**Branch:** `feature/T005-zitro-utils`
**Depends on:** T003

**Source files (migrate from):**
```
zitro-app/src/app/core/utils/    (if exists)
zitro-app/src/app/shared/utils/  (if exists)
```

**Scope — files to create:**
```
libs/utils/src/validators.util.ts
libs/utils/src/formatters.util.ts
libs/utils/src/geo.util.ts
libs/utils/src/storage.util.ts
libs/utils/src/date.util.ts
libs/utils/src/index.ts
libs/utils/src/validators.util.spec.ts
libs/utils/src/formatters.util.spec.ts
libs/utils/src/geo.util.spec.ts
libs/utils/src/date.util.spec.ts
```

**Key functions to include (from ZITRO-APPS-ARCHITECTURE.md Section 4.3):**

`validators.util.ts`:
- `isIndianPhone(phone)` — `/^[6-9]\d{9}$/`
- `isValidOtp(otp)` — 6 digits
- `isValidPincode(pin)` — 6 digits
- `isValidEmail(email)`
- `isValidGst(gst)`

`formatters.util.ts`:
- `currency(amount)` — `₹249` format (Intl, en-IN)
- `relativeTime(isoDate)` — "2 mins ago"
- `truncate(text, maxLen)`
- `phoneDisplay(phone)` — `+91 98765 43210`

`geo.util.ts`:
- `distanceKm(lat1, lon1, lat2, lon2)` — uses `geolib`
- `isWithinDeliveryZone(userCoords, zones)`

`date.util.ts`:
- `toIst(isoDate)` — convert to IST display string
- `formatOrderTime(isoDate)` — "Today 2:30 PM" / "Yesterday 8:00 PM"
- `isOpen(openTime, closeTime)` — given "HH:mm" strings

**Acceptance Criteria:**
- [ ] `nx test utils` — all pass
- [ ] `nx lint utils` — no errors
- [ ] No Angular imports anywhere in `@zitro/utils`
- [ ] `isIndianPhone` tested with valid, invalid, with/without spaces

---

### T006 — Implement `@zitro/test-data`

**Status:** `[ ]`
**Branch:** `feature/T006-test-data`
**Depends on:** T004, T005

**Scope — files to create:**
```
libs/test-data/src/_fixtures/customers.json
libs/test-data/src/_fixtures/restaurants.json
libs/test-data/src/_fixtures/menu-items.json
libs/test-data/src/_fixtures/categories.json
libs/test-data/src/_fixtures/orders.json
libs/test-data/src/_fixtures/addresses.json
libs/test-data/src/_fixtures/coupons.json
libs/test-data/src/_fixtures/delivery-partners.json
libs/test-data/src/loaders/fixture-loader.ts
libs/test-data/src/builders/customer.builders.ts       → UserBuilders
libs/test-data/src/builders/restaurant.builders.ts     → BusinessBuilders
libs/test-data/src/builders/catalog.builders.ts        → CatalogBuilders (Product, Category, Variation)
libs/test-data/src/builders/order.builders.ts          → OrderBuilders (placed, delivered, cancelled)
libs/test-data/src/builders/cart.builders.ts           → CartBuilders (single, multi-item, empty)
libs/test-data/src/builders/coupon.builders.ts         → CouponBuilders
libs/test-data/src/builders/address.builders.ts        → AddressBuilders (home, office)
libs/test-data/src/factories/product-dto.factory.ts    → ProductDtoFactory.build(overrides?)
libs/test-data/src/factories/order-dto.factory.ts      → OrderDtoFactory.build(overrides?)
libs/test-data/src/factories/address-dto.factory.ts    → AddressDtoFactory.build(overrides?)
libs/test-data/src/factories/user-dto.factory.ts       → UserDtoFactory.build(overrides?)
libs/test-data/src/factories/coupon-dto.factory.ts     → CouponDtoFactory.build(overrides?)
libs/test-data/src/factories/nearby-business-dto.factory.ts → NearbyBusinessDtoFactory.build(overrides?)
libs/test-data/src/factories/index.ts
libs/test-data/src/msw/handlers.ts
libs/test-data/src/msw/handlers.spec.ts
libs/test-data/src/index.ts
```

> **factories/ vs builders/:** Builders return domain objects (`Product`, `Order` from `@zitro/models`).
> Factories return raw API DTOs (`ProductDto`, `OrderDto` from `@zitro/mappers/dtos`).
> Mapper tests use factories as input. Service integration tests use builders for assertions.
> Both accept partial overrides: `ProductDtoFactory.build({ imageUrl: 'custom.jpg' })`

**Data quality rules — ALL fixture data must look like real Indian data:**
- Names: Aarav Sharma, Priya Singh, Rahul Gupta, Meera Patel, Vikram Yadav, Ananya Joshi, etc.
- Phones: `9876543210`, `8765432109`, `7654321098` (valid format)
- Addresses: Real UP towns — Etawah (206244), Auraiya (206122), Kanpur (208001), etc.
- Restaurant names: The Hunger Point, EFC Pizza, Tularam Kirana Store (the 3 real ones)
- Food items: Paneer Butter Masala, Dal Makhani, Margherita Pizza, EFC Special Burger, etc.
- Prices: Realistic INR (₹80–₹400 for food items, ₹15–₹60 for groceries)

**Builder pattern (mirrors backend `Zitro.TestData` project):**
```typescript
// Every builder method returns a fully valid typed object
export const CatalogBuilders = {
  paneerButterMasala: (): Product => ({
    id: 'prod-001',
    businessId: 'hunger_point',
    categoryId: 'cat-mains',
    name: 'Paneer Butter Masala',
    description: 'Rich creamy tomato-based curry with cottage cheese',
    basePrice: 180,
    imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/pbm.jpg',
    foodType: 'Veg',
    isAvailable: true,
    isFeatured: true,
    isNew: false,
    sortOrder: 1,
    dietaryPreferences: ['Jain'],
    variations: [],
  }),
  // ... more builders
};
```

**MSW handlers must cover all endpoints from Section 12 + Postman collection:**
- `GET /api/businesses/:slug/products`
- `GET /api/businesses/:slug/categories`
- `GET /api/businesses/:slug/coupons`
- `POST /api/orders`
- `GET /api/orders` (user order history)
- `GET /api/orders/:id`
- `GET /api/users/me`
- `GET /api/users/addresses`
- `POST /api/users/addresses`
- `GET /api/config`

**Acceptance Criteria:**
- [ ] `nx test test-data` — all pass (handlers.spec.ts + builder self-tests)
- [ ] All fixture JSON files are valid JSON with realistic Indian data
- [ ] Every builder returns a typed object matching `@zitro/models` exactly
- [ ] Every factory returns a valid DTO matching `@zitro/mappers/dtos` shape
- [ ] MSW handlers respond to all listed endpoints with correct shapes
- [ ] `@zitro/test-data/factories` entry point accessible from other test files

> **Test Specifications (implement in T029-unit — but `handlers.spec.ts` is written here as part of T006):**

**`handlers.spec.ts`** — created IN T006 (not deferred):
```
GET /api/businesses/nearby    → 200, array with at least 1 NearbyBusinessDto
GET /api/businesses/:slug/products → 200, ProductDto[] — first item has imageUrl (not imageURL)
GET /api/businesses/:slug/categories → 200, CategoryDto[]
POST /api/orders (valid body) → 201, OrderDto with id + status="pending"
POST /api/orders (missing items) → 400
GET /api/orders               → 200, OrderDto[]
GET /api/orders/:id (known)   → 200, single OrderDto
GET /api/orders/:id (unknown) → 404
POST /api/users/addresses     → 201, AddressDto with generated id
GET /api/config               → 200, featureFlags map + apiVersion string
```

**Builder self-tests** (created IN T006):
```
CatalogBuilders.paneerButterMasala() → imageUrl present, no "image" or "imageURL"
OrderBuilders.placedOrder()   → status = "pending"
OrderBuilders.deliveredOrder() → status = "delivered"
OrderBuilders.cancelledOrder() → status = "cancelled"
CartBuilders.singleItemCart() → items.length = 1
CartBuilders.emptyCart()      → items.length = 0
ProductDtoFactory.build()     → has imageUrl, isAvailable, id (all required DTO fields)
OrderDtoFactory.build()       → charges object is flat (packagingCharge is a number, not nested)
```

---

### T007 — Implement `@zitro/theme`

**Status:** `[x]`
**Branch:** `feature/T007-theme-lib`
**Depends on:** T003

**Source files (migrate from):**
```
zitro-app/src/styles/
zitro-app/src/app/core/services/theme.service.ts  (if exists)
```

**Scope — files to create:**
```
libs/theme/src/tokens.scss          ← All CSS custom properties (--zitro-*)
libs/theme/src/themes/_default.scss
libs/theme/src/themes/_dark.scss
libs/theme/src/themes/_nature.scss
libs/theme/src/themes/_ocean.scss
libs/theme/src/theme.model.ts
libs/theme/src/theme.service.ts
libs/theme/src/theme.service.spec.ts
libs/theme/src/index.ts
```

**CSS custom property naming convention:**
```scss
// tokens.scss
:root {
  // Colors
  --zitro-primary: #FF5722;
  --zitro-primary-dark: #E64A19;
  --zitro-surface: #FFFFFF;
  --zitro-surface-variant: #F5F5F5;
  --zitro-on-surface: #212121;
  --zitro-on-surface-variant: #757575;
  --zitro-error: #B00020;
  // ...

  // Spacing
  --zitro-spacing-xs: 4px;
  --zitro-spacing-sm: 8px;
  --zitro-spacing-md: 16px;
  --zitro-spacing-lg: 24px;
  --zitro-spacing-xl: 32px;

  // Typography
  --zitro-font-family: 'Roboto', sans-serif;
  --zitro-font-size-sm: 12px;
  --zitro-font-size-md: 14px;
  --zitro-font-size-lg: 16px;
  --zitro-font-size-xl: 20px;

  // Border radius
  --zitro-radius-sm: 4px;
  --zitro-radius-md: 8px;
  --zitro-radius-lg: 16px;
  --zitro-radius-pill: 999px;
}

[data-theme="dark"] {
  --zitro-surface: #121212;
  --zitro-surface-variant: #1E1E1E;
  --zitro-on-surface: #FFFFFF;
  // ...
}
```

**`ThemeService` must:**
- Persist selected theme to localStorage key `zitro_theme`
- Apply `data-theme` attribute to `document.documentElement`
- Support runtime token injection (for backend-driven themes from config API)
- Return `Observable<ThemeName>` of current theme

**Acceptance Criteria:**
- [x] `nx test theme` — all pass
- [x] `tokens.scss` imports in any Angular app without error
- [x] `ThemeService.setTheme('dark')` correctly sets `[data-theme='dark']` on root element
- [x] Persists across page reload (localStorage)
- [x] Exported `theme.service.spec.ts` tests cover: init, set, persist, restore

---

### T008 — Implement `@zitro/i18n`

**Status:** `[x]`
**Branch:** `feature/T008-i18n-lib`
**Depends on:** T003

**Source:** Scan all component templates and services in `zitro-app/src/app/` for hardcoded user-visible strings. Extract every one into `en.ts`.

**Scope — files to create:**
```
libs/i18n/src/defaults/en.ts          ← All EN strings (every hardcoded string from zitro-app)
libs/i18n/src/i18n.model.ts           ← TranslationMap, Language, etc.
libs/i18n/src/i18n.service.ts
libs/i18n/src/i18n.pipe.ts
libs/i18n/src/i18n.service.spec.ts
libs/i18n/src/i18n.pipe.spec.ts
libs/i18n/src/testing/provide-i18n-for-tests.ts  ← Helper for component tests
libs/i18n/src/index.ts
```

**`en.ts` key structure (nested by feature):**
```typescript
export const EN_DEFAULTS = {
  common: {
    loading: 'Loading...',
    error: 'Something went wrong. Please try again.',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    back: 'Back',
    done: 'Done',
    noInternet: 'No internet connection',
  },
  auth: {
    header: 'Welcome Back!',
    headerDescription: 'Sign in to continue',
    sendOtpButton: 'Send OTP',
    phonePlaceholder: 'Enter phone number',
    verifyOtpButton: 'Verify OTP',
    otpPlaceholder: 'Enter 6-digit OTP',
    guestButton: 'Continue as Guest',
    otpSentSuccess: 'OTP sent successfully. Please check your SMS',
    otpSentFailure: 'Failed to send OTP. Please try again.',
    resendOtp: 'Resend OTP',
  },
  home: {
    searchPlaceholder: 'Search for dishes...',
    allCategories: 'All',
    restaurantClosed: 'Currently closed',
    restaurantOpen: 'Open now',
  },
  cart: {
    title: 'Your Cart',
    empty: 'Your cart is empty',
    emptySubtitle: 'Add items from the menu to get started',
    checkout: 'Proceed to Checkout',
    total: 'Total',
    delivery: 'Delivery',
    packaging: 'Packaging',
    platformFee: 'Platform fee',
    gst: 'GST',
    couponDiscount: 'Coupon discount',
    freeDelivery: 'FREE',
    freeDeliveryProgress: 'Add ₹{amount} more for free delivery',
  },
  order: {
    placed: 'Order placed successfully!',
    cancelled: 'Order cancelled',
    pending: 'Order received',
    confirmed: 'Order confirmed',
    preparing: 'Being prepared',
    ready: 'Ready for pickup',
    shipped: 'On the way',
    delivered: 'Delivered',
  },
  // ... all other strings extracted from zitro-app
} as const;

export type TranslationKey = /* deep path type */ string;
```

**`I18nService`:**
- Loads translations from `GET /api/config/translations?lang=en` on init
- Falls back to `EN_DEFAULTS` if API fails or offline
- Caches API translations in localStorage for 24hrs
- `translate(key: string, params?: Record<string, string>): string` — supports `{amount}` interpolation
- `currentLang$: Observable<string>`

**`I18nPipe`:** `'cart.checkout' | i18n` → `'Proceed to Checkout'`

**`provideI18nForTests()`:** Returns an Angular provider that uses `EN_DEFAULTS` synchronously — no async loading in tests.

**Acceptance Criteria:**
- [ ] `nx test i18n` — all pass
- [ ] Every key in `en.ts` is a string (no nested objects reaching undefined)
- [ ] `I18nPipe` handles missing keys gracefully (returns the key itself, logs warn)
- [ ] Interpolation works: `translate('cart.freeDeliveryProgress', { amount: '50' })` → `'Add ₹50 more for free delivery'`
- [ ] `provideI18nForTests()` works synchronously — no async required in component tests

---

### T009 — HTTP Interceptors in `@zitro/services`

**Status:** `[x]`
**Branch:** `feature/T009-http-interceptors`
**Depends on:** T004

**Scope — files to create:**
```
libs/services/src/interceptors/auth.interceptor.ts
libs/services/src/interceptors/business-id.interceptor.ts
libs/services/src/interceptors/error.interceptor.ts
libs/services/src/interceptors/retry.interceptor.ts
libs/services/src/interceptors/index.ts
libs/services/src/provide-services.ts   ← provideZitroServices() function
```

> No spec files in T009 — all interceptor tests are in T029-unit.

**`auth.interceptor.ts`:** Attaches Firebase JWT to every outgoing request as `Authorization: Bearer <token>`. Skips public endpoints (configurable list). Refreshes token if expired before attaching.

**`business-id.interceptor.ts`:** Reads current `businessId` from `BusinessContextService` (signal). Attaches `X-Business-Id: <slug>` header to all `/api/*` requests.

**`error.interceptor.ts`:**
- `401` → clear auth state, redirect to `/auth/signin`
- `429` → show rate limit toast (via `ToastService`)
- `503` → show maintenance page (via `FeatureFlagService.isMaintenanceMode()` — UI concern, not API switching)
- Other 4xx/5xx → propagate as `HttpErrorResponse` with normalized error model

**`provideZitroServices()` function:**
```typescript
export function provideZitroServices(config: ZitroServicesConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([authInterceptor, businessIdInterceptor, errorInterceptor])),
    { provide: ZITRO_API_BASE_URL, useValue: config.apiBaseUrl },
    // ...
  ]);
}
```

**Acceptance Criteria:**
- [ ] `nx build services` — no errors
- [ ] `nx lint services` — no errors
- [ ] `provideZitroServices()` registers all 3 interceptors in correct order

> **Tests:** Deferred to T029-unit. See "Test Specifications" below.

**Test Specifications (implement in T029-unit):**

All interceptor tests use Vitest. Pattern: construct minimal handler chain.

**`auth.interceptor.spec.ts`**:
```
attaches Authorization: Bearer <token> to /api/* requests
does NOT attach to external URLs (https://external.com/*)
does NOT attach to public endpoints (e.g. /api/config — in public list)
calls FirebaseAuthService.getIdToken() before attaching header
propagates error when getIdToken() throws (does not call next)
```

**`business-id.interceptor.spec.ts`**:
```
attaches X-Business-Id to /api/* when businessId signal is set
does NOT attach to non-API requests
it.each: hunger_point, efc-pizza, tularam-kirana-store all pass through correctly
passes request unchanged when businessId signal is empty string
```

**`error.interceptor.4xx.spec.ts`** + **`error.interceptor.5xx.spec.ts`** (split if > 200 lines):
```
401 → Router.navigate(['/auth/signin']) + AuthService.signOut()
429 → ToastService.show(rateLimitMessage) + propagates error
400, 404 → propagates unchanged
500 → propagates unchanged
503 → FeatureFlagService.setMaintenanceMode(true) + propagates error
network error (status 0) → propagates unchanged
200, 201 → passes through without modification
```

**`retry.interceptor.spec.ts`**:
```
retries on network error (status 0), up to maxRetries=2
does NOT retry on 4xx errors
does NOT retry on 5xx errors
emits final error after maxRetries exhausted
emits success on first retry when second attempt succeeds
```

---

### T010 — API Service Classes in `@zitro/services` (replace Firebase data services)

**Status:** `[ ]`
**Branch:** `feature/T010-api-services`
**Depends on:** T009

**Goal:** Build new .NET API service classes that **replace** (not sit alongside) the Firebase data
services. Feature pages switch directly to the new API services — no dual-mode, no feature flag
for API switching.

**What stays on Firebase permanently (do not replace these):**
- `firebase-auth.service.ts`, `firebase-otp.service.ts` — Phone Auth OTP
- `firebase-storage.service.ts` — image uploads
- `fcm.service.ts`, `fcm-token.service.ts`, `device-token.service.ts` — push notifications
- `analytics.service.ts` — write-only, low risk

**Firebase data services replaced by these new API services (old files kept until page switches over):**

| Old Firebase service | New API service | Endpoint |
|---|---|---|
| `categories.service.ts` | `catalog-api.service.ts` | `GET /api/categories?businessSlug=X` |
| `products.service.ts` | `catalog-api.service.ts` | `GET /api/businesses/{slug}/menu` |
| `order.service.ts` | `order-api.service.ts` | `POST/GET /api/orders` |
| `user-management.service.ts` | `user-api.service.ts` | `GET/PUT /api/users/profile`, `/api/users/addresses` |
| `banner.service.ts` | `engagement-api.service.ts` | `GET /api/businesses/{slug}/banners` |
| `coupon.service.ts` | `coupon-api.service.ts` | `GET /api/coupons` |
| `pricing.service.ts` | `business-config-api.service.ts` | `GET /api/businesses/{slug}/config` |
| `app-settings.service.ts` | `business-config-api.service.ts` | `GET /api/businesses/{slug}/config` |
| `favorites.service.ts` | `favorites-api.service.ts` | `GET/POST/DELETE /api/users/favorites` |
| `app-version.service.ts` | `engagement-api.service.ts` | `GET /api/app-version` |

**Transition order (lowest to highest risk):** catalog → coupons → banners → addresses → orders.
Remove old Firebase service file only after the feature page has fully switched over and been tested.

**Source files (read for business logic, do NOT copy — rewrite for .NET API):**
```
zitro-app/src/app/core/services/products.service.ts
zitro-app/src/app/core/services/categories.service.ts
zitro-app/src/app/core/services/order.service.ts
zitro-app/src/app/core/services/cart.service.ts
zitro-app/src/app/core/services/pricing.service.ts
zitro-app/src/app/core/services/coupon.service.ts
zitro-app/src/app/core/services/address.service.ts
zitro-app/src/app/core/services/firebase-auth.service.ts
zitro-app/src/app/core/services/app-settings.service.ts
zitro-app/src/app/core/services/google-geocoding.service.ts
```

**Scope — files to create:**
```
libs/services/src/api/catalog-api.service.ts
libs/services/src/api/order-api.service.ts
libs/services/src/api/user-api.service.ts
libs/services/src/api/cart.service.ts
libs/services/src/api/pricing.service.ts
libs/services/src/api/coupon-api.service.ts
libs/services/src/api/auth.service.ts
libs/services/src/api/address-api.service.ts
libs/services/src/api/config-api.service.ts
libs/services/src/api/geocoding-api.service.ts
libs/services/src/api/business-context.service.ts
libs/services/src/api/index.ts
```

> No spec files in T010 — all API service tests are written in T029-unit.

**Migration rules (for each service):**
1. Keep all business logic, BehaviorSubjects, caching logic intact
2. Replace Firestore reads/writes → HTTP calls to `.NET API`
3. Pipe HTTP responses through the appropriate mapper
4. Use `@zitro/utils` for any validation/formatting that was inline
5. Replace `@Input` signals where applicable

**Key service patterns:**
```typescript
// catalog-api.service.ts — example pattern
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);

  getProducts(businessId: string): Observable<Product[]> {
    const cacheKey = `products:${businessId}`;
    return this.cache.get<Product[]>(cacheKey) ??
      this.http.get<ProductDto[]>(`/api/businesses/${businessId}/products`)
        .pipe(
          map(dtos => CatalogMapper.toProductList(dtos)),
          tap(products => this.cache.set(cacheKey, products, { ttlHours: 1 })),
        );
  }
}
```

**`cart.service.ts` — pure state, no HTTP:**
- Signals-based: `items = signal<CartItem[]>([])`
- `add(product, variation?, qty)`, `remove(itemId)`, `updateQty(itemId, qty)`, `clear()`
- Persists to localStorage
- Emits `cartCount$`, `cartSubtotal$`

**Acceptance Criteria:**
- [ ] `nx build services` — no errors
- [ ] `nx lint services` — no errors
- [ ] Every API service injects `CacheService` and respects TTL
- [ ] `CatalogApiService.getProducts` pipes response through `CatalogMapper.toProductList`
- [ ] `CartService` persists to `localStorage` key `"zitro_cart"`
- [ ] `OrderApiService.createOrder` calls `OrderMapper.fromCart` to build the request body

> **Tests:** Deferred to T029-unit. See "Test Specifications" below.

**Test Specifications (implement in T029-unit — uses `@zitro/test-data/msw` for MSW server):**

API services: `.integration.spec.ts` (MSW mock server). Pure state services: `.spec.ts`.

**`catalog-api.service.get-products.integration.spec.ts`**:
```
returns Observable<Product[]> with mapped products (Product shape, not DTO shape)
CatalogMapper.toProductList spy called with raw DTO array
result stored in CacheService after first fetch (cacheKey = "products:<slug>")
second call returns cached result (MSW receives only 1 HTTP request)
fresh fetch after cache TTL expires (vi.advanceTimersByTime > 1hr)
propagates error when server returns 500
```

**`catalog-api.service.get-categories.integration.spec.ts`**:
```
returns Observable<Category[]>; caches under "categories:<businessId>"
returns cached value on second call (no new HTTP request)
```

**`order-api.service.integration.spec.ts`**:
```
createOrder: OrderMapper.fromCart spy called before POSTing
createOrder: POSTs to /api/orders; emits mapped Order (status="pending")
getOrderHistory: GETs /api/orders; caches 5 minutes
getOrderHistory: cache invalidated after createOrder
cancelOrder: PATCHes /api/orders/:id/cancel; invalidates order cache
cancelOrder: propagates 409 when past cancellation window
```

**`cart.service.state.spec.ts`** + **`cart.service.persistence.spec.ts`** (split):
```
State: empty on init; add→qty=1; add existing→increment; remove→decrement/delete; clear→[]
Persistence: writes "zitro_cart" after every mutation; restores on construction
  handles corrupted JSON in localStorage → initializes empty (no throw)
  cartCount$ = sum of all item qtys; cartSubtotal$ = sum of (price × qty)
```

**`pricing.service.spec.ts`**:
```
deliveryCharge = 0 for takeout/dine-in; > 0 for delivery
couponDiscount = 0 when no coupon; > 0 with valid coupon
total = subtotal + delivery + packaging + platform + gst - coupon
visibility.showCouponDiscount = true when couponDiscount > 0
visibility.showFreeDeliveryProgress = true when subtotal < threshold
```

---

### T011 — FeatureFlagService (UI flags) + CacheService

**Status:** `[ ]`
**Branch:** `feature/T011-flag-cache-services`
**Depends on:** T009

> **Note:** `FeatureFlagService` is for UI feature flags only (e.g. show/hide wallet tab, enable game,
> dine-in mode). It is **NOT** used to switch between Firebase and .NET API — the app uses .NET API
> services directly (T010). No `flags.isEnabled('use_dotnet_catalog')` pattern anywhere.

**Scope — files to create:**
```
libs/services/src/feature-flag.service.ts        + .spec.ts
libs/services/src/cache.service.ts               + .spec.ts
libs/services/src/index.ts                       ← Update to export new services
```

**`CacheService`:**
```typescript
interface CacheEntry<T> { data: T; expiresAt: number; }

@Injectable({ providedIn: 'root' })
export class CacheService {
  get<T>(key: string): T | null
  set<T>(key: string, data: T, options: { ttlHours: number }): void
  invalidate(key: string): void
  invalidatePattern(prefix: string): void   // e.g. 'products:*'
  clear(): void
}
```
Uses localStorage as backing store. Key format: `zitro_cache_{key}`.

**`FeatureFlagService`:**
```typescript
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  // Loaded from GET /api/config/flags on app init
  isEnabled(flag: FeatureFlag): boolean
  isEnabled$(flag: FeatureFlag): Observable<boolean>
  getConfig<T>(key: string): T | null
  isMaintenanceMode(): boolean
}

export type FeatureFlag =
  | 'wallet_payments'       // show wallet tab in account page
  | 'delivery_tracking'     // show live tracking on order page
  | 'ratings_reviews'       // show ratings prompt after delivery
  | 'scheduled_pickup'      // show scheduled pickup option in cart
  | 'dine_in'               // enable dine-in order type
  | 'grocery_mode'          // show grocery-specific UI tweaks
  | 'game_tab';             // show 2048 game tab
```

**Acceptance Criteria:**
- [ ] `nx build services` — no errors
- [ ] `nx lint services` — no errors
- [ ] `CacheService` stores/retrieves with `"zitro_cache_"` prefix in localStorage
- [ ] `FeatureFlagService.isEnabled()` returns `false` for all flags before `loadFlags()` called

> **Tests:** Deferred to T029-unit. See "Test Specifications" below.

**Test Specifications (implement in T029-unit):**

**`cache.service.get-set.spec.ts`** + **`cache.service.invalidate.spec.ts`** (split by 300-line rule):
```
GET-SET:
  get() returns null for unknown key
  get() returns stored value before TTL (vi.useFakeTimers + advanceByTime < ttl)
  get() returns null after TTL expires (advanceByTime > ttl)
  get() removes expired entry from localStorage after returning null
  set() writes to localStorage with "zitro_cache_" prefix
  set() stores expiresAt = Date.now() + ttlHours * 3600000
  get() handles corrupted JSON → null + removes entry (no throw)
  get() handles missing expiresAt field → null (treat as expired)
  set() overwrites existing entry with fresh data + fresh TTL

INVALIDATE:
  invalidate(key) removes exact localStorage key
  invalidate() on non-existent key → no-op
  invalidatePattern("products:") removes products:hp, products:efc, products:tularam
  invalidatePattern("products:") does NOT remove categories:hp
  invalidatePattern with no matches → no-op
  clear() removes ALL "zitro_cache_*" keys
  clear() does NOT remove non-cache keys (e.g. "zitro_theme")
```

**`feature-flag.service.spec.ts`**:
```
returns false for ALL flags before loadFlags() called
returns true for flag when API returns it as true
returns false for flag when API returns it as false
returns false for unknown flag name
returns false for ALL flags when API call throws 503 (fail-safe)
isEnabled$() Observable emits current value immediately on subscribe
isMaintenanceMode() returns true after 503 API response sets it
```

---

### T012 — UI: Common Group 1

**Status:** `[ ]`
**Branch:** `feature/T012-ui-common-g1`
**Depends on:** T007, T008

**Source files (migrate from):**
```
zitro-app/src/app/shared/components/loader/
zitro-app/src/app/shared/components/empty-state/
zitro-app/src/app/shared/components/error-state/
zitro-app/src/app/shared/components/no-internet/
zitro-app/src/app/features/splash/
```

**Scope — files to create (per component: component.ts, component.html, component.scss — NO spec files):**
```
libs/ui/src/common/loader/
libs/ui/src/common/empty-state/
libs/ui/src/common/error-state/
libs/ui/src/common/no-internet/
libs/ui/src/common/splash-screen/
```

**Pattern for every component:**
```typescript
// 1. Config interface with defaults
export interface LoaderConfig {
  size: 'sm' | 'md' | 'lg';
  color: 'primary' | 'white';
  overlay: boolean;
}
export const LOADER_DEFAULT_CONFIG: LoaderConfig = { size: 'md', color: 'primary', overlay: false };

// 2. Signal inputs
export class LoaderComponent {
  config = input<LoaderConfig>(LOADER_DEFAULT_CONFIG);
  label = input<string>('');
}

// 3. data-testid on interactive/visible elements
// <div data-testid="loader-spinner">

// 4. i18n for all strings
// <span>{{ 'common.loading' | i18n }}</span>
```

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors for these 5 components
- [ ] All components are standalone
- [ ] All user-visible strings go through `I18nPipe`
- [ ] All interactive/visible elements have `data-testid`

> **Tests:** Deferred to T029-unit. See "Test Specifications" below.

**Test Specifications (implement in T029-unit — uses jest-preset-angular):**

All component tests use the standard 3-group pattern (split when > 300 lines):
`component.rendering.spec.ts` + `component.interactions.spec.ts`

```
LoaderComponent:
  rendering: [data-testid="loader-spinner"] present
  rendering: overlay hidden when config.overlay = false
  rendering: shows [data-testid="loader-label"] with i18n text
  rendering: config.size="sm" → correct CSS class

NoInternetComponent:
  rendering: [data-testid="no-internet-icon"] + [data-testid="no-internet-message"] visible
  rendering: i18n text for "no internet" message
  interactions: [data-testid="retry-btn"] click → retryClicked output emits void

SplashScreenComponent:
  rendering: [data-testid="splash-screen"] present
  rendering: [data-testid="splash-logo"] image visible
  rendering: [data-testid="splash-loader"] present
```

---

### T013 — UI: Common Group 2

**Status:** `[ ]`
**Branch:** `feature/T013-ui-common-g2`
**Depends on:** T012

**Source files (migrate from):**
```
zitro-app/src/app/shared/components/truncated-text/
zitro-app/src/app/shared/components/zoomable-image/
zitro-app/src/app/shared/components/confirmation-dialog/
zitro-app/src/app/shared/components/bottom-sheet/
```

**Scope:**
```
libs/ui/src/common/truncated-text/
libs/ui/src/common/zoomable-image/
libs/ui/src/common/confirmation-dialog/
libs/ui/src/common/bottom-sheet/
```

**`ConfirmationDialogConfig`:**
```typescript
export interface ConfirmationDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;  // true = confirm button is red
}
```

**`BottomSheetConfig`:**
```typescript
export interface BottomSheetConfig {
  title: string;
  showHandle: boolean;
  closeOnBackdropClick: boolean;
}
```

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors for these 4 components
- [ ] All standalone, signal inputs, data-testid, i18n

> **Tests:** Deferred to T029-unit.

**Test Specifications (implement in T029-unit):**
```
ConfirmationDialogComponent:
  rendering: [data-testid="confirm-dialog-title"] shows config.title
  rendering: [data-testid="confirm-dialog-message"] shows config.message
  rendering: confirm button shows config.confirmLabel
  rendering: confirm button has destructive style when config.destructive = true
  rendering: confirm button has default style when config.destructive = false
  interactions: confirmed output emits void on confirm click
  interactions: cancelled output emits void on cancel click
  interactions: cancelled emits on backdrop click when closeOnBackdropClick = true
  interactions: cancelled does NOT emit when closeOnBackdropClick = false
```

---

### T014 — UI: Theme + Auth Components

**Status:** `[ ]`
**Branch:** `feature/T014-ui-theme-auth`
**Depends on:** T012

**Source files (migrate from):**
```
zitro-app/src/app/features/auth/sign-in/
zitro-app/src/app/features/auth/otp/
```

**Scope:**
```
libs/ui/src/common/theme-picker/    ← New (no legacy equivalent)
libs/ui/src/auth/phone-input/       ← Extracted from SignInPage
libs/ui/src/auth/otp-input/         ← Extracted from OtpPage
```

**`PhoneInputConfig`:**
```typescript
export interface PhoneInputConfig {
  countryCode: string;      // '+91'
  maxLength: number;        // 10
  showFlag: boolean;
}
```

**`OtpInputConfig`:**
```typescript
export interface OtpInputConfig {
  length: number;           // 6
  autoFocus: boolean;
  autoSubmit: boolean;      // true = submit when last digit entered
}
```

**`ThemePickerConfig`:**
```typescript
export interface ThemePickerConfig {
  layout: 'grid' | 'list';
  showLabels: boolean;
}
```

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors
- [ ] `PhoneInput` validates Indian phone format live (uses `Validators.isIndianPhone`)
- [ ] `OtpInput` supports paste (auto-fills all 6 boxes)
- [ ] `OtpInput` auto-submits when `autoSubmit: true` and all boxes filled
- [ ] `ThemePicker` calls `ThemeService.setTheme()` on selection

> **Tests:** Deferred to T029-unit.

**Test Specifications (implement in T029-unit):**
```
PhoneInputComponent:
  valid: 10-digit starting 6/7/8/9 → no [data-testid="phone-input-error"] visible
  invalid: 5 digits → [data-testid="phone-input-error"] visible
  invalid: 11 digits → error visible
  invalid: empty string → error visible
  valueChange output emits on each valid keystroke

OtpInputComponent:
  renders config.length [data-testid="otp-box"] elements (default 6)
  auto-advances focus to next box after single digit entry
  paste "123456" fills all 6 boxes
  otpComplete output emits when all boxes filled
  auto-submits (submitted output) when autoSubmit=true and all filled
  does NOT auto-submit when autoSubmit=false
```

---

### T015 — UI: Catalog Components

**Status:** `[ ]`
**Branch:** `feature/T015-ui-catalog`
**Depends on:** T013, T010

**Source files (migrate from):**
```
zitro-app/src/app/features/home/components/
zitro-app/src/app/features/menu/components/
zitro-app/src/app/shared/components/product-card/
```

**Scope:**
```
libs/ui/src/catalog/category-bar/
libs/ui/src/catalog/search-bar/
libs/ui/src/catalog/product-card/
libs/ui/src/catalog/product-grid/
libs/ui/src/catalog/item-detail-sheet/
```

**`ProductCardConfig`:**
```typescript
export interface ProductCardConfig {
  layout: 'grid' | 'list' | 'pos';
  showAddButton: boolean;
  showDietaryBadge: boolean;
  showVariationPill: boolean;
}
```

**`ProductCard` outputs:**
```typescript
addToCart = output<{ product: Product; variation: ProductVariation | null }>();
viewDetails = output<Product>();
```

**`ItemDetailSheet`** — bottom sheet showing full product details: image, description, variations, add-to-cart. Uses `BottomSheetComponent` from T013.

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors
- [ ] `ProductCard` renders in all 3 layout modes
- [ ] `ProductCard` shows Veg/Non-Veg indicator (green/red dot)
- [ ] `CategoryBar` scrolls horizontally, highlights active category
- [ ] `ItemDetailSheet` shows correct variation prices

> **Tests:** Deferred to T029-unit. **Split into 3 spec files for product-card.**

**Test Specifications (implement in T029-unit):**
```
product-card.rendering.spec.ts:
  it.each(['grid','list','pos'])('renders data-layout="%s" attribute')
  veg indicator [data-testid="veg-indicator"] visible for foodType="Veg"
  non-veg indicator visible for foodType="NonVeg"
  [data-testid="product-card-add-btn"] visible when showAddButton=true
  [data-testid="product-card-add-btn"] hidden when showAddButton=false
  price formatted as "₹180" in [data-testid="product-card-price"]

product-card.interactions.spec.ts:
  addToCart output emits { product, variation: null } for no-variation product
  addToCart output emits { product, variation } when variation selected
  viewDetails output emits product on card body click
  add-btn click does NOT trigger viewDetails (stopPropagation)

product-card.config.spec.ts:
  showDietaryBadge=false hides badge even for Jain products
  showVariationPill=true shows selector when product has variations

search-bar.spec.ts:
  renders [data-testid="search-input"]
  emits searchChange on every keystroke
  [data-testid="search-clear-btn"] visible when non-empty; hidden when empty
  clear click → clears input + emits searchChange('')
```

---

### T016 — UI: Address Components

**Status:** `[ ]`
**Branch:** `feature/T016-ui-address`
**Depends on:** T013, T010

**Source files:** `zitro-app/src/app/features/addresses/`

**Scope:**
```
libs/ui/src/address/address-card/
libs/ui/src/address/add-address-form/
libs/ui/src/address/address-list/
```

**`AddressCard` outputs:** `select = output<Address>()`, `edit = output<Address>()`, `delete = output<string>()`

**`AddAddressForm` outputs:** `submitted = output<AddressFormData>()`, `cancelled = output<void>()`

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors
- [ ] Form validates all required fields
- [ ] Pincode field only accepts 6 digits
- [ ] `AddressCard` shows default badge for `isDefault: true`

> **Tests:** Deferred to T029-unit.

**Test Specifications (implement in T029-unit):**
```
add-address-form.spec.ts:
  save btn disabled when form empty
  save btn disabled when pincode is non-6-digit
  save btn enabled when all required fields valid
  [data-testid="address-pincode-error"] visible for 3-digit pincode
  submitted output emits AddressFormData when valid form submitted
  cancelled output emits void on cancel click
```

---

### T017 — UI: Cart Components

**Status:** `[ ]`
**Branch:** `feature/T017-ui-cart`
**Depends on:** T015

**Source files:** `zitro-app/src/app/features/cart/`

**Scope:**
```
libs/ui/src/cart/cart-item-row/
libs/ui/src/cart/cart-summary-bar/
libs/ui/src/cart/pricing-summary/
```

**`PricingSummary`** renders the full pricing breakdown using `PricingBreakdown.visibility` to show/hide rows. Must handle free delivery progress bar.

**`CartSummaryBar`** — sticky bottom bar showing item count + total + checkout button.

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors
- [ ] `PricingSummary` hides rows where `visibility.show*` is false
- [ ] Free delivery progress bar shows correct amount remaining
- [ ] Coupon discount row only shows when `couponDiscount > 0`

> **Tests:** Deferred to T029-unit.

**Test Specifications (implement in T029-unit):**
```
pricing-summary.spec.ts:
  delivery row visible when visibility.showDeliveryCharge=true
  delivery row hidden when visibility.showDeliveryCharge=false
  coupon row visible when showCouponDiscount=true AND couponDiscount > 0
  free delivery bar shows "Add ₹X more" (threshold=500, subtotal=350 → ₹150)
  all amounts formatted with ₹ symbol
  total = subtotal + charges - discount
```

---

### T018 — UI: Order + Ratings + Banners + UpdateDialog

**Status:** `[ ]`
**Branch:** `feature/T018-ui-order-ratings-banners`
**Depends on:** T013, T010

**Source files:**
```
zitro-app/src/app/features/orders/
zitro-app/src/app/features/home/components/banner-carousel/
```

**Scope:**
```
libs/ui/src/order/order-status-badge/
libs/ui/src/order/order-card/
libs/ui/src/order/order-timeline/
libs/ui/src/ratings/star-rating/         ← New
libs/ui/src/ratings/rating-summary/      ← New
libs/ui/src/banners/banner-carousel/
libs/ui/src/common/update-dialog/
```

**`OrderStatusBadge`** — color-coded chip: pending=orange, confirmed=blue, preparing=purple, shipped=cyan, delivered=green, cancelled=red.

**`BannerCarousel`** — auto-scrolling with dots indicator. Respects `banner.isActive`, `banner.startDate`, `banner.endDate`, `banner.versionCondition`.

**Acceptance Criteria:**
- [ ] `nx build ui` — no errors
- [ ] Each order status maps to correct color
- [ ] `BannerCarousel` skips inactive banners
- [ ] `StarRating` emits on selection and supports read-only mode

> **Tests:** Deferred to T029-unit.

**Test Specifications (implement in T029-unit):**
```
order-status-badge.spec.ts:
  it.each(['pending','confirmed','preparing','shipped','delivered','cancelled'])
    each status renders [data-testid="order-status-badge"] with data-color=<token>
    each status renders [data-testid="order-status-label"] with i18n text

banner-carousel.spec.ts:
  renders only banners where isActive=true (inactive filtered out)
  skips banners before startDate (vi.setSystemTime before startDate)
  skips banners after endDate (vi.setSystemTime after endDate)
  auto-scrolls to next banner after autoPlayMs (jest.useFakeTimers)
  renders [data-testid="banner-dot"] per active banner
```

---

### T019-scss — SCSS Refactoring (Migrated Components)

**Status:** `[x]`
**Branch:** `feature/T019-scss-refactoring`
**Depends on:** MT018

**Why this exists:** All component stylesheets were copied verbatim during MT005–MT017 (migration rules forbade any changes). Several now exceed the `anyComponentStyle` production budget. This task slims them down — extract shared rules to `@zitro/theme`, remove dead/duplicate selectors, split very large sheets — without changing visible appearance.

**Budget targets (after this task):**
- Warning threshold (project.json): `50 kB`
- Error threshold (project.json): `100 kB`
- Practical goal: keep every migrated file under `25 kB` so there is headroom for T012–T029 evolution additions

**Files exceeding 8 kB at time of MT018 (largest first):**
```
apps/zitro-customer/src/app/features/order-confirmation/order-confirmation.component.scss   — 20.25 kB
apps/zitro-customer/src/app/layout/main-layout.component.scss                              — 16.87 kB
apps/zitro-customer/src/app/features/cart/cart.component.scss                              — 18.28 kB
apps/zitro-customer/src/app/features/order-tracking/order-tracking.component.scss          — 13.76 kB
apps/zitro-customer/src/app/features/order-history/order-history.component.scss            — 12.19 kB
apps/zitro-customer/src/app/features/add-address/add-address.component.scss                — 11.99 kB
apps/zitro-customer/src/app/features/coupon-selection/coupon-selection.component.scss      — 10.74 kB
libs/ui/src/components/item-details-dialog/item-details-dialog.component.scss              — 10.31 kB
apps/zitro-customer/src/app/features/listing/listing.component.scss                        — 9.40 kB
libs/ui/src/components/location-bottom-sheet/location-bottom-sheet.component.scss          — 8.52 kB
libs/ui/src/components/item-slider/item-slider.component.scss                              — 8.83 kB
libs/ui/src/components/coupon-selector/coupon-selector.component.scss                      — 8.21 kB
apps/zitro-customer/src/app/features/home/home.component.scss                              — 8.64 kB
apps/zitro-customer/src/app/features/game-2048/game-2048.component.scss                    — 8.32 kB
apps/zitro-customer/src/app/features/business-selection/business-selection.component.scss  — 8.02 kB
```

**Rules — what is allowed:**
- Remove duplicate/dead CSS rules and redundant media-query breakpoints
- Extract repeated values to SCSS variables or `@zitro/theme` tokens (`@use 'theme' as *`)
- Split one very large sheet into `_layout.scss` + `_mobile.scss` partials imported from the main file (no logic changes)
- **DO NOT** change any selector names, class names, or visual appearance
- **DO NOT** refactor to signals/Angular patterns — this task is CSS-only

**Acceptance Criteria:**
- [ ] `nx build zitro-customer --configuration=production` completes with zero `anyComponentStyle` **errors** (warnings at 50 kB threshold are acceptable)
- [ ] Visual appearance unchanged — spot-check each affected page in the dev server
- [ ] Each file listed above is under 25 kB after refactoring

---

### T019 — Finalize Command + Security Setup

**Status:** `[ ]`
**Branch:** `feature/T019-finalize-security`
**Depends on:** T002

**Scope — files to create:**
```
tools/scripts/finalize.ts
tools/scripts/check-bundle-sizes.ts
audit-ci.json
.husky/pre-commit
.husky/pre-push
```

**`finalize.ts`** runs this pipeline sequentially (stop on first failure):
1. `nx affected:lint`
2. `nx affected:test`
3. `nx affected:test --testPathPattern=integration`
4. `trufflehog filesystem . --only-verified --fail`
5. `audit-ci --config audit-ci.json`
6. `nx affected:e2e` (only on `--full` flag)
7. `nx affected:build`
8. `node tools/scripts/check-bundle-sizes.ts`

**`check-bundle-sizes.ts`** — reads `dist/` folders and fails if any Angular app bundle exceeds 500 KB initial JS.

**`.husky/pre-commit`:**
```bash
#!/bin/sh
npx lint-staged
node tools/scripts/finalize.ts --lint-only
```

**`.husky/pre-push`:**
```bash
#!/bin/sh
npm run finalize:affected
```

**`package.json` scripts to add:**
```json
{
  "finalize": "ts-node tools/scripts/finalize.ts --full",
  "finalize:affected": "ts-node tools/scripts/finalize.ts",
  "finalize:lint-only": "ts-node tools/scripts/finalize.ts --lint-only"
}
```

**Acceptance Criteria:**
- [ ] `npm run finalize:affected` runs without error on a clean repo
- [ ] `pre-commit` hook runs on `git commit`
- [ ] `trufflehog` scan is in the pipeline
- [ ] Bundle size check fails if a test app bundle > 500 KB

---

### T020 — Bootstrap `zitro-customer`

**Status:** `[ ]`
**Branch:** `feature/T020-customer-bootstrap`
**Depends on:** T011, T019

**Scope — files to create:**
```
apps/zitro-customer/src/app/app.config.ts
apps/zitro-customer/src/app/app.routes.ts
apps/zitro-customer/src/styles.scss
apps/zitro-customer/src/environments/environment.ts
apps/zitro-customer/src/environments/environment.prod.ts
apps/zitro-customer/capacitor.config.ts
apps/zitro-customer/project.json
```

**`app.config.ts`** must provide:
- `provideZitroServices({ apiBaseUrl: environment.apiUrl })`
- `provideRouter(routes, withViewTransitions())`
- `provideI18n()`
- `provideTheme()`
- Firebase app + Auth
- `APP_INITIALIZER` for config load, i18n load, theme restore

**Route structure (mirrors existing `zitro-app` exactly — same URLs):**
```typescript
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/splash/splash.page') },
  { path: 'select-business', loadComponent: () => ... },
  { path: ':businessSlug', children: [
    { path: '', loadComponent: () => import('./features/home/home.page') },
    { path: 'menu', loadComponent: () => ... },
    { path: 'cart', loadComponent: () => ... },
    { path: 'checkout', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'orders', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'orders/:id', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'addresses', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'profile', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'coupons', loadComponent: () => ..., canActivate: [authGuard] },
    { path: 'contact', loadComponent: () => ... },
    { path: 'favorites', loadComponent: () => ..., canActivate: [authGuard] },
  ]},
  { path: 'auth/signin', loadComponent: () => ... },
  { path: '**', redirectTo: '' },
];
```

**`capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.krisurya.zitro',
  appName: 'Zitro',
  webDir: 'dist/apps/zitro-customer/browser',
  android: { allowMixedContent: true },
};
```

**Acceptance Criteria:**
- [ ] `nx serve zitro-customer` starts without error
- [ ] All routes resolve (even to empty placeholder pages)
- [ ] `APP_INITIALIZER` loads config before first render
- [ ] `nx build zitro-customer` produces a dist folder

---

### T021 — T029: Feature Pages (zitro-customer)

> Each page task follows the same pattern. Listed briefly — refer to legacy `zitro-app` for detailed logic to migrate.

**T021 — Splash + BusinessSelection**
- Branch: `feature/T021-customer-splash-business`
- Source: `zitro-app/src/app/features/splash/`, `zitro-app/src/app/features/business-selection/`
- Migrate logic exactly; replace Firebase calls with `ConfigApiService`; use `@zitro/ui` splash-screen component

**T022 — SignIn + OTP**
- Branch: `feature/T022-customer-auth`
- Source: `zitro-app/src/app/features/auth/`
- Use `@zitro/ui` `PhoneInputComponent` + `OtpInputComponent`; migrate dual-provider OTP logic intact

**T023 — Home Page**
- Branch: `feature/T023-customer-home`
- Source: `zitro-app/src/app/features/home/`
- Use `BannerCarousel`, `CategoryBar`, `ProductGrid`; connect to `CatalogApiService`

**T024 — Menu + ProductDetail**
- Branch: `feature/T024-customer-menu`
- Source: `zitro-app/src/app/features/menu/`, `zitro-app/src/app/features/product-detail/`
- Use `ProductCard`, `ItemDetailSheet`; connect add-to-cart flow to `CartService`

**T025 — Cart Page**
- Branch: `feature/T025-customer-cart`
- Source: `zitro-app/src/app/features/cart/`
- Use `CartItemRow`, `PricingSummary`, `CartSummaryBar`; connect to `CartService` + `PricingService`

**T026 — Address Pages**
- Branch: `feature/T026-customer-addresses`
- Source: `zitro-app/src/app/features/addresses/`
- Use `AddressList`, `AddressCard`, `AddAddressForm`; connect to `AddressApiService`

**T027 — Checkout + OrderConfirmation**
- Branch: `feature/T027-customer-checkout`
- Source: `zitro-app/src/app/features/checkout/`, `zitro-app/src/app/features/order-confirmation/`
- Connect to `OrderApiService.createOrder`; use `OrderMapper.fromCart`; preserve coupon application logic

**T028 — Orders + OrderDetail**
- Branch: `feature/T028-customer-orders`
- Source: `zitro-app/src/app/features/orders/`, `zitro-app/src/app/features/order-detail/`
- Use `OrderCard`, `OrderStatusBadge`, `OrderTimeline`; connect to `OrderApiService`

**T029 — Profile + Coupons + Contact + Favorites**
- Branch: `feature/T029-customer-secondary`
- Source: `zitro-app/src/app/features/profile/`, `...coupons/`, `...contact/`, `...favorites/`
- Migrate screens; connect to respective API services

**Acceptance Criteria (all T021–T029):**
- [ ] Page renders from the live route
- [ ] Loading / error / empty states all handled
- [ ] All strings through `I18nPipe`
- [ ] All interactive elements have `data-testid`
- [ ] Unit test: renders, handles empty state, handles error state

---

### T029-unit — Write All Unit + Integration Tests

**Status:** `[ ]`
**Branch:** `feature/T029-unit-tests`
**Depends on:** T029, T006

**Goal:** Write all unit and integration tests in one PR after `zitro-customer` is feature-complete
(T029 done). This avoids rework from tests being written against intermediate implementations.
Uses `@zitro/test-data` builders + factories everywhere — no inline mock objects.

**Scope — spec files to create (see each task's "Test Specifications" subsection for exact test cases):**

**Batch 1 — Pure libs (Vitest, no Angular):**
```
libs/models/src/*.spec.ts                              (only if model files export runtime functions)
libs/mappers/src/mappers/catalog.mapper.spec.ts        (split: catalog.mapper.to-product.spec.ts if > 300 ln)
libs/mappers/src/mappers/order.mapper.to-order.spec.ts
libs/mappers/src/mappers/order.mapper.from-cart.spec.ts
libs/mappers/src/mappers/pricing.mapper.spec.ts
libs/mappers/src/mappers/user.mapper.spec.ts
libs/mappers/src/mappers/coupon.mapper.spec.ts
libs/mappers/src/mappers/business.mapper.spec.ts
libs/services/src/interceptors/auth.interceptor.spec.ts
libs/services/src/interceptors/business-id.interceptor.spec.ts
libs/services/src/interceptors/error.interceptor.4xx.spec.ts
libs/services/src/interceptors/error.interceptor.5xx.spec.ts
libs/services/src/interceptors/retry.interceptor.spec.ts
libs/services/src/api/cart.service.state.spec.ts
libs/services/src/api/cart.service.persistence.spec.ts
libs/services/src/api/pricing.service.spec.ts
libs/services/src/cache.service.get-set.spec.ts
libs/services/src/cache.service.invalidate.spec.ts
libs/services/src/feature-flag.service.spec.ts
```

**Batch 2 — Integration tests (Vitest + MSW server from `@zitro/test-data/msw`):**
```
libs/services/src/api/catalog-api.service.get-products.integration.spec.ts
libs/services/src/api/catalog-api.service.get-categories.integration.spec.ts
libs/services/src/api/order-api.service.integration.spec.ts
libs/services/src/api/user-api.service.integration.spec.ts
libs/services/src/api/coupon-api.service.integration.spec.ts
libs/services/src/api/address-api.service.integration.spec.ts
```

**Batch 3 — Angular component tests (jest-preset-angular, `@zitro/test-data` builders):**
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

**Batch 4 — Feature page tests (jest-preset-angular):**
One `.spec.ts` per feature page in `apps/zitro-customer/src/app/features/` — test:
- Route guard behavior (auth guard, business selection guard)
- Service method calls (mocked via `vi.fn()`)
- Template renders key `[data-testid]` elements
- Output/event wiring to services

**Coverage gates (run after all batches complete):**
- [ ] `nx run-many -t test` — all pass
- [ ] `nx test mappers -- --coverage` → 100% statement + branch
- [ ] `nx test services -- --coverage` → 90%+ statement
- [ ] `nx test ui -- --coverage` → 80%+ statement

**File splitting enforcement:** Any spec file that exceeds 300 lines MUST be split before the PR is opened. Use naming convention from Testing Standards section.

---

### T030 — E2E Tests (zitro-customer)

**Status:** `[ ]`
**Branch:** `feature/T030-customer-e2e`
**Depends on:** T029-unit

**Scope — files to create:**
```
apps/zitro-customer-e2e/src/pages/location-gate.page.ts
apps/zitro-customer-e2e/src/pages/home.page.ts
apps/zitro-customer-e2e/src/pages/auth.page.ts
apps/zitro-customer-e2e/src/pages/cart.page.ts
apps/zitro-customer-e2e/src/pages/checkout.page.ts
apps/zitro-customer-e2e/src/pages/orders.page.ts
apps/zitro-customer-e2e/src/pages/address.page.ts
apps/zitro-customer-e2e/src/journeys/guest-browse.spec.ts        (8 tests)
apps/zitro-customer-e2e/src/journeys/place-order.spec.ts         (7 tests)
apps/zitro-customer-e2e/src/journeys/apply-coupon.spec.ts        (4 tests)
apps/zitro-customer-e2e/src/journeys/cancel-order.spec.ts        (3 tests)
apps/zitro-customer-e2e/src/journeys/address-management.spec.ts  (5 tests)
apps/zitro-customer-e2e/src/support/test-state.ts                (auth storageState helper)
```

**Hard Rules:**
- Every locator: `page.locator('[data-testid="..."]')` — no CSS class selectors, no XPath
- Every Page Object method: `Promise<void>` returns unless reading state (`Promise<string|boolean|number>`)
- All assertions are hard — no `expect.soft()`
- Auth journeys (J2–J5) use Playwright `storageState` fixture (pre-authenticated session)
- `playwright.config.ts` `reuseExistingServer = true` — do not restart server per file
- Add `e2e` target to `apps/zitro-customer-e2e/project.json` pointing at `playwright.config.ts`
- Replace `apps/zitro-customer-e2e/src/example.spec.ts` (it uses CSS selector `h1` — violates rules)

---

### Page Object Classes

**`LocationGatePage`:**
```typescript
class LocationGatePage {
  readonly root         = this.page.locator('[data-testid="location-gate"]');
  readonly allowBtn     = this.page.locator('[data-testid="allow-location-btn"]');
  readonly manualBtn    = this.page.locator('[data-testid="manual-location-btn"]');
  readonly pincodeInput = this.page.locator('[data-testid="pincode-input"]');
  readonly submitBtn    = this.page.locator('[data-testid="pincode-submit-btn"]');

  async isVisible(): Promise<boolean>
  async allowLocation(): Promise<void>            // clicks allowBtn, waits for root hidden
  async enterPincode(pin: string): Promise<void>  // fills + clicks submitBtn
  async getPincodeError(): Promise<string>        // text of [data-testid="pincode-error"]
}
```

**`HomePage`:**
```typescript
class HomePage {
  readonly root          = this.page.locator('[data-testid="home-page"]');
  readonly businessCards = this.page.locator('[data-testid="business-card"]');
  readonly productGrid   = this.page.locator('[data-testid="product-grid"]');
  readonly productCards  = this.page.locator('[data-testid="product-card"]');
  readonly cartBadge     = this.page.locator('[data-testid="cart-badge"]');

  async waitForLoad(): Promise<void>
  async selectBusinessType(label: string): Promise<void>   // clicks [data-testid="business-type-tab"] by aria-label
  async selectBusiness(name: string): Promise<void>        // clicks [data-testid="business-card-name"] matching text
  async searchFor(term: string): Promise<void>             // fills [data-testid="search-input"]
  async getProductNames(): Promise<string[]>               // text of all [data-testid="product-card-name"]
  async addFirstProductToCart(): Promise<void>             // clicks first [data-testid="product-card-add-btn"]
  async getCartBadgeCount(): Promise<number>               // parses [data-testid="cart-badge"] text as int
  async getBusinessName(index: number): Promise<string>    // text of nth [data-testid="business-card-name"]
}
```

**`AuthPage`:**
```typescript
async enterPhone(phone: string): Promise<void>             // fills [data-testid="auth-phone-input"]
async submitPhone(): Promise<void>                         // clicks [data-testid="auth-submit-btn"], waits for OTP visible
async enterOtp(otp: string): Promise<void>                 // fills [data-testid="auth-otp-input"]
async submitOtp(): Promise<void>
async loginWithPhone(phone: string, otp: string): Promise<void>  // composite helper
async getErrorMessage(): Promise<string>                   // text of [data-testid="auth-error-msg"]
```

**`CartPage`:**
```typescript
async waitForLoad(): Promise<void>
async getItemCount(): Promise<number>                      // count of [data-testid="cart-item"]
async applyCoupon(code: string): Promise<void>             // fills + clicks [data-testid="apply-coupon-btn"]
async getCouponDiscount(): Promise<string>                 // text of [data-testid="coupon-discount-row"]
async getTotalAmount(): Promise<string>                    // text of [data-testid="order-total"]
async proceedToCheckout(): Promise<void>                   // clicks [data-testid="checkout-btn"]
async isEmpty(): Promise<boolean>                          // checks [data-testid="cart-empty"] visible
```

**`CheckoutPage`:**
```typescript
async selectDelivery(): Promise<void>                      // clicks [data-testid="delivery-option"]
async selectAddress(label: string): Promise<void>          // clicks address card matching label text
async selectCashPayment(): Promise<void>                   // clicks [data-testid="payment-cash"]
async placeOrder(): Promise<void>                          // clicks [data-testid="place-order-btn"], waits for confirmation
async getConfirmedOrderId(): Promise<string>               // text of [data-testid="order-id"]
```

**`OrdersPage`:**
```typescript
async waitForLoad(): Promise<void>
async getOrderCount(): Promise<number>
async getLatestOrderStatus(): Promise<string>              // text of first [data-testid="order-status"]
async clickCancelOnLatestOrder(): Promise<void>            // clicks [data-testid="cancel-order-btn"] on first card
async confirmCancellation(): Promise<void>                 // clicks [data-testid="confirm-cancel-btn"] in dialog
async isLatestOrderCancelled(): Promise<boolean>           // checks [data-testid="order-status-cancelled"] visible
```

**`AddressPage`:**
```typescript
async clickAddAddress(): Promise<void>
async fillAddressForm(data: { name: string; street: string; pincode: string; town: string }): Promise<void>
async saveAddress(): Promise<void>
async getAddressCount(): Promise<number>
async setFirstAddressAsDefault(): Promise<void>
async hasDefaultBadge(): Promise<boolean>                  // checks [data-testid="default-address-badge"] visible
```

---

### Journey Specifications

| Test ID | Journey | Steps | Key Assertions |
|---------|---------|-------|----------------|
| J1-01 | Guest Browse | goto('/') | `location-gate` visible; both CTA buttons visible |
| J1-02 | Manual pincode → home | click manual → enterPincode('206244') | `home-page` visible; ≥1 `business-card` |
| J1-03 | Business tab filter | J1-02 → selectBusinessType('Restaurant') | `business-card` count > 0 |
| J1-04 | Select business → products | J1-02 → selectBusiness('The Hunger Point') | `product-grid` visible; `product-card` count > 0 |
| J1-05 | Search filters products | J1-04 → searchFor('Paneer') | all `product-card-name` text contains "paneer" (case-insensitive) |
| J1-06 | Clear search restores list | J1-05 → searchFor('') | count equals pre-search count |
| J1-E1 | Invalid pincode | enterPincode('999') | `pincode-error` visible; `home-page` NOT visible |
| J1-E2 | Search no results | searchFor('xyzzynotaproduct') | `product-grid-empty` visible; 0 `product-card` |
| J2-01 | Login with phone + OTP | goto('/auth/signin') → enterPhone + submitPhone → enterOtp('123456') + submitOtp | `home-page` visible |
| J2-02 | Add items to cart | goto('/hunger_point') → addFirstProductToCart × 2 | `cart-badge` count = 2 |
| J2-03 | Cart shows items | J2-02 → click `cart-badge` | `cart-item` count ≥ 1; `cart-empty` NOT visible; `checkout-btn` enabled |
| J2-04 | Place delivery order | J2-03 → proceedToCheckout → selectDelivery → selectAddress('Home') → selectCashPayment → placeOrder | `order-confirmation-page` visible; `order-id` non-empty |
| J2-05 | Order in history | goto('/hunger_point/orders') | `order-card` count ≥ 1; status one of "Order Received"/"Confirmed"/"Pending" |
| J2-E1 | Empty cart no checkout | goto('/hunger_point/cart') | `cart-empty` visible; `checkout-btn` NOT visible |
| J2-E2 | No address = place-order disabled | proceedToCheckout → selectDelivery (no address) | `place-order-btn` disabled |
| J3-01 | Valid coupon reduces total | add product → open cart → capture total → applyCoupon('SAVE10') | `coupon-discount-row` visible; total after < total before |
| J3-02 | Discount on confirmation | J3-01 → placeOrder | `confirmation-coupon-discount` visible |
| J3-E1 | Invalid coupon shows error | applyCoupon('INVALID') | `coupon-error-msg` visible; `coupon-discount-row` NOT visible |
| J3-E2 | Remove coupon restores total | J3-01 → click `remove-coupon-btn` | `coupon-discount-row` gone; total = original |
| J4-01 | Cancel fresh order | place order → goto orders → clickCancelOnLatestOrder → confirmCancellation | `order-status-cancelled` visible; status = "Cancelled" |
| J4-E1 | No cancel on delivered order | goto orders; find delivered card | `cancel-order-btn` NOT on delivered card |
| J4-E2 | Dismiss cancel = no change | clickCancelOnLatestOrder → click `cancel-dismiss-btn` | status unchanged |
| J5-01 | Add address | clickAddAddress → fillAddressForm → saveAddress | form gone; address count = before + 1 |
| J5-02 | Set default | setFirstAddressAsDefault | `default-address-badge` visible |
| J5-03 | Default pre-selected | add cart → checkout → selectDelivery | `selected-address-label` contains "Home" |
| J5-E1 | Save disabled incomplete form | open form → fill name only | `save-address-btn` disabled |
| J5-E2 | Invalid pincode error | enter "123" in pincode → blur | `address-pincode-error` visible; save btn disabled |

**Total: 27 tests (19 happy path + 8 edge cases)**

---

**Acceptance Criteria:**
- [ ] All 27 tests pass against `nx serve zitro-customer` (local dev server)
- [ ] Zero CSS class/ID selectors in any spec or page file — only `[data-testid="..."]`
- [ ] All Page Object methods correctly typed (`Promise<void|string|number|boolean>`)
- [ ] `zitro-customer-e2e/project.json` has `e2e` target using Playwright executor
- [ ] `example.spec.ts` is deleted (CSS selector violation)
- [ ] HTML report groups journeys by `.spec.ts` file

---

### T031–T034 — `zitro-restaurant`

**T031 — Bootstrap zitro-restaurant**
- Branch: `feature/T031-restaurant-bootstrap`
- App ID: `com.krisurya.zitro.restaurant`
- Route: `/auth/login`, `/orders`, `/menu`, `/settings`, `/reports`
- Auth: Business JWT (not Firebase user auth)
- Capacitor: push-notifications + haptics for order alerts

**T032 — Order Management**
- Live incoming order queue (Firestore real-time listener)
- Accept / Reject / Mark Ready actions
- Order detail view
- FCM permission request on first launch

**T033 — Menu Management**
- Product CRUD using `CatalogApiService`
- Availability toggle (instant, no page reload)
- Category reorder (drag)
- Variation management

**T034 — Settings + Reports**
- Business hours editor
- Delivery zone config
- Daily sales summary chart
- Payout history table

---

### T035 — Implement `@zitro/jobs-shared`

**Status:** `[ ]`
**Branch:** `feature/T035-jobs-shared`
**Depends on:** T003

**Scope:**
```
libs/jobs-shared/src/fcm.helpers.ts        + .spec.ts
libs/jobs-shared/src/api-client.ts         + .spec.ts
libs/jobs-shared/src/order-notifications.ts
libs/jobs-shared/src/index.ts
```

See Section 13 (`zitro-jobs`) in `ZITRO-APPS-ARCHITECTURE.md` for full code of `FcmPayloads` and `JobsApiClient`.

**Acceptance Criteria:**
- [ ] `nx test jobs-shared` — all pass
- [ ] No Angular imports in `@zitro/jobs-shared`
- [ ] `FcmPayloads.orderReceivedForRestaurant` produces valid FCM payload

---

### T036 — Bootstrap `zitro-jobs` + All Cloud Functions

**Status:** `[ ]`
**Branch:** `feature/T036-zitro-jobs`
**Depends on:** T035

**Scope:**
```
apps/zitro-jobs/src/shared/firebase-admin.ts
apps/zitro-jobs/src/functions/order-timeout.ts
apps/zitro-jobs/src/functions/push-notifications.ts
apps/zitro-jobs/src/functions/daily-report.ts
apps/zitro-jobs/src/functions/coupon-expiry.ts
apps/zitro-jobs/src/functions/cache-invalidation.ts
apps/zitro-jobs/src/index.ts
apps/zitro-jobs/package.json
apps/zitro-jobs/.firebaserc
apps/zitro-jobs/firebase.json
```

See Section 13 (`zitro-jobs`) in `ZITRO-APPS-ARCHITECTURE.md` for full function implementations.

**Acceptance Criteria:**
- [ ] `cd apps/zitro-jobs && npm run build` — compiles without error
- [ ] Firebase emulator runs all functions
- [ ] `orderTimeoutCheck` correctly filters orders older than 15 min

---

### T037–T040 — Remaining Apps

**T037 — zitro-admin bootstrap**
- Routes: /dashboard, /orders, /businesses, /users, /coupons, /delivery-partners, /payouts
- Depends on: T011, T019

**T038 — zitro-delivery bootstrap + Capacitor**
- App ID: `com.krisurya.zitro.delivery`
- Routes: /home, /orders, /history, /earnings, /profile
- Depends on: T011, T019

**T039 — zitro-pos bootstrap + Capacitor**
- App ID: `com.krisurya.zitro.pos`
- Routes: /menu, /cart, /orders, /reports
- Depends on: T011, T019

**T040 — zitro-superadmin bootstrap**
- Routes: /dashboard, /config, /feature-flags, /translations, /themes, /analytics
- Depends on: T011, T019

---

### T041 — CI/CD GitHub Actions

**Status:** `[ ]`
**Branch:** `feature/T041-cicd`
**Depends on:** T019

**Scope:**
```
.github/workflows/pr-check.yml
.github/workflows/release.yml
```

See Section 14 of `ZITRO-APPS-ARCHITECTURE.md` for full YAML.

**Acceptance Criteria:**
- [ ] PR workflow triggers on `pull_request` to `main` and `develop`
- [ ] Release workflow triggers on push to `main`
- [ ] Android APK artifact uploaded on release

---

### T042 — New API Endpoints in `zitro-api`

**Status:** `[ ]`
**Branch:** `feature/T042-new-api-endpoints` (in `zitro-api` repo)
**Depends on:** T010

> This task is implemented in `E:/Github/krisuryagroup/zitro-api/` — see that repo's CLAUDE.md for context.

**Endpoints to add:**
1. `GET /api/config` — returns `AppConfig` (feature flags, pricing config, cache config, maintenance mode)
2. `GET /api/config/translations?lang=en` — returns translation key map
3. `GET /api/geo/reverse?lat=&lng=` — reverse geocode proxy (wraps Google Maps API — keeps key server-side)
4. `GET /api/internal/orders?status=pending` — internal endpoint for jobs (protected by `x-jobs-api-key` header)
5. `PATCH /api/internal/orders/:id/cancel` — internal cancel endpoint for jobs

---

## Completed Tasks

_None yet — this project is in planning phase._

---

## Notes

- Tasks within the same Phase can be parallelized if their dependencies are satisfied
- Each task = one PR, one branch, one review
- Never merge a task PR that has failing checks
- Update this file's status column as part of every task PR
