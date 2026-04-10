# ZITRO Apps — Task Board

> **How to use:** Tell Claude "start task T007" and it will read this file, implement everything in scope, run checks, and raise a PR automatically.
>
> **Read first:** `ROADMAP.md` — shows the complete sequence (migration → evolution → new apps) and how each task here connects to the migration.
> **Migration tasks:** `MIGRATION-PLAN.md` (MT001–MT018) — must be done before any task here.
> **Architecture reference:** `ZITRO-APPS-ARCHITECTURE.md`
> **Claude context:** `CLAUDE.md`

> ⚠️ **Tasks T001, T002, T003, T005 are superseded by migration tasks MT001–MT004. Do not run them.**
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
| T003 | `@zitro/models` structural changes (imageUrl + flat OrderCharges) | [ ] after .NET API done | MT003 |
| T004 | Implement `@zitro/mappers` | [ ] | MT003 |
| T005 | Verify `@zitro/utils` tests pass | `[x]` superseded by MT004 (run tests only) | MT004 |
| **Phase 3 — Test Data** |
| T006 | Implement `@zitro/test-data` | [ ] | T004, T005 |
| **Phase 4 — Theme** |
| T007 | Evolve `@zitro/theme` — CSS custom properties + ThemeService (SCSS already copied by MT005) | [ ] | MT005 |
| **Phase 5 — i18n** |
| T008 | Build `@zitro/i18n` — extract strings from migrated `apps/zitro-customer` templates | [ ] | MT018 |
| **Phase 6 — Services** |
| T009 | HTTP interceptors in `@zitro/services` | [ ] | T004, T006 |
| T010 | API service classes in `@zitro/services` | [ ] | T009 |
| T011 | FeatureFlagService + CacheService | [ ] | T009 |
| **Phase 7 — UI Library (evolve existing components from MT006)** |
| T012 | Evolve: `loader`, `no-internet`, `splash-screen` + equivalents — add config objects, signals, data-testid, i18n, tests | [ ] | T007, T008, T006 |
| T013 | Evolve: `confirmation-dialog`, `bottom-sheet`, `truncated-text`, `zoomable-image`, `description-dialog`, `order-loading-modal` | [ ] | T012 |
| T014 | Evolve: auth input components (signin, OTP) + new `theme-picker` component | [ ] | T012 |
| T015 | Evolve: `product-card`, `product-grid`, `category-cards`, `item-details-dialog`, search | [ ] | T013, T010 |
| T016 | Evolve: address components | [ ] | T013, T010 |
| T017 | Evolve: `cart-summary`, `pricing-summary`, coupon selector | [ ] | T015 |
| T018 | Evolve: `banner`, `cancel-order-dialog`, `update-dialog` + new ratings components | [ ] | T013, T010 |
| **Phase 8 — SCSS Cleanup + Security & Finalize** |
| T019-scss | SCSS refactoring — slim down oversized component stylesheets to pass `anyComponentStyle` budget | [x] | MT018 |
| T019 | Finalize command + Husky + audit-ci | [ ] | MT002, T019-scss |
| **Phase 9 — zitro-customer (evolve existing pages from MT009–MT017)** |
| T020 | Evolve `app.config.ts` — add provideI18n, provideTheme, provideZitroServices (HTTP) alongside Firebase | [ ] | T008, T007, T009 |
| T021 | Evolve `business-selection` page | [ ] | T020 |
| T022 | Evolve auth pages | [ ] | T021, T014 |
| T023 | Evolve `home` page | [ ] | T022, T015, T018 |
| T024 | Evolve `listing`, `search`, `categories`, `category-listing` pages | [ ] | T023 |
| T025 | Evolve `cart` page | [ ] | T024, T017 |
| T026 | Evolve address pages | [ ] | T025, T016 |
| T027 | Evolve `order-confirmation` + checkout flow | [ ] | T026 |
| T028 | Evolve `order-history`, `order-tracking` pages | [ ] | T027, T018 |
| T029 | Evolve `account`, `contact-us`, `coupon-selection`, `game-2048` pages | [ ] | T028 |
| T030 | E2E tests — 5 critical journeys (pages exist, now write tests against them) | [ ] | T029 |
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

### T003 — Implement `@zitro/models`

**Status:** `[ ]`
**Branch:** `feature/T003-zitro-models`
**Depends on:** T002

**Source files (migrate from):**
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
- [ ] `nx test models` — all pass
- [ ] `nx lint models` — no errors
- [ ] No fields from legacy model are dropped without being documented in `MIGRATION.md`
- [ ] `index.ts` exports everything with no circular dependencies
- [ ] TypeScript strict mode: no implicit `any`, no `!` assertions without justification

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
libs/mappers/src/mappers/catalog.mapper.spec.ts
libs/mappers/src/mappers/order.mapper.spec.ts
libs/mappers/src/mappers/user.mapper.spec.ts
libs/mappers/src/mappers/coupon.mapper.spec.ts
libs/mappers/src/mappers/pricing.mapper.spec.ts
```

**Key implementation rules:**
- DTOs mirror the `.NET API` response shapes (camelCase — ASP.NET Core 8 default)
- DTOs are plain interfaces — no classes, no decorators
- Mapper functions are pure (no side effects, no DI, no HTTP)
- Every mapper must have a corresponding `*.spec.ts`
- Use inline test objects in specs for T004 (test-data builders exist only after T006)

**Key mappers to implement (see Section 4.2 of ZITRO-APPS-ARCHITECTURE.md for full code):**
- `CatalogMapper.toProduct(dto)` — maps `ProductDto` → `Product`
- `CatalogMapper.toVariation(dto)` — maps `ProductVariationDto` → `ProductVariation`
- `CatalogMapper.toProductList(dtos)` — convenience batch mapper
- `OrderMapper.toOrder(dto)` — maps `OrderDto` → `Order`
- `OrderMapper.fromCart(cart, options)` — builds `CreateOrderRequest` from cart state
- `PricingMapper.toBreakdown(dto)` — maps `PricingDto` → `PricingBreakdown` (including `visibility` block)

**Acceptance Criteria:**
- [ ] `nx test mappers` — all pass, 100% coverage on mapper functions
- [ ] `nx lint mappers` — no errors
- [ ] Every public mapper function has a unit test with at least: happy path, null field handling
- [ ] `CatalogMapper.toProduct` correctly maps `label` → `name`, absolute price → `priceModifier`
- [ ] `OrderMapper.fromCart` produces a valid `CreateOrderRequest`

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
libs/test-data/src/builders/customer.builders.ts
libs/test-data/src/builders/restaurant.builders.ts
libs/test-data/src/builders/catalog.builders.ts
libs/test-data/src/builders/order.builders.ts
libs/test-data/src/builders/cart.builders.ts
libs/test-data/src/builders/coupon.builders.ts
libs/test-data/src/msw/handlers.ts
libs/test-data/src/msw/handlers.spec.ts
libs/test-data/src/index.ts
```

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
- [ ] `nx test test-data` — all pass
- [ ] All fixture JSON files are valid JSON with realistic Indian data
- [ ] Every builder returns a typed object matching `@zitro/models` exactly
- [ ] MSW handlers respond to all listed endpoints
- [ ] MSW handlers spec verifies handlers return the right shape

---

### T007 — Implement `@zitro/theme`

**Status:** `[ ]`
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
- [ ] `nx test theme` — all pass
- [ ] `tokens.scss` imports in any Angular app without error
- [ ] `ThemeService.setTheme('dark')` correctly sets `[data-theme='dark']` on root element
- [ ] Persists across page reload (localStorage)
- [ ] Exported `theme.service.spec.ts` tests cover: init, set, persist, restore

---

### T008 — Implement `@zitro/i18n`

**Status:** `[ ]`
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

**Status:** `[ ]`
**Branch:** `feature/T009-http-interceptors`
**Depends on:** T004, T006

**Scope — files to create:**
```
libs/services/src/interceptors/auth.interceptor.ts
libs/services/src/interceptors/auth.interceptor.spec.ts
libs/services/src/interceptors/business-id.interceptor.ts
libs/services/src/interceptors/business-id.interceptor.spec.ts
libs/services/src/interceptors/error.interceptor.ts
libs/services/src/interceptors/error.interceptor.spec.ts
libs/services/src/interceptors/index.ts
libs/services/src/provide-services.ts   ← provideZitroServices() function
```

**`auth.interceptor.ts`:** Attaches Firebase JWT to every outgoing request as `Authorization: Bearer <token>`. Skips public endpoints (configurable list). Refreshes token if expired before attaching.

**`business-id.interceptor.ts`:** Reads current `businessId` from `BusinessContextService` (signal). Attaches `X-Business-Id: <slug>` header to all `/api/*` requests.

**`error.interceptor.ts`:**
- `401` → clear auth state, redirect to `/auth/signin`
- `429` → show rate limit toast (via `ToastService`)
- `503` → show maintenance page (via `FeatureFlagService`)
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
- [ ] `nx test services` (interceptors only) — all pass
- [ ] `auth.interceptor` attaches correct header (verified with MSW)
- [ ] `auth.interceptor` does NOT attach header to non-API URLs
- [ ] `error.interceptor` converts 401 into navigation to `/auth/signin`
- [ ] Integration tests use MSW to simulate 401, 429, 503

---

### T010 — API Service Classes in `@zitro/services`

**Status:** `[ ]`
**Branch:** `feature/T010-api-services`
**Depends on:** T009

**Source files (migrate logic from):**
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
libs/services/src/api/catalog-api.service.ts       + .integration.spec.ts
libs/services/src/api/order-api.service.ts          + .integration.spec.ts
libs/services/src/api/user-api.service.ts           + .integration.spec.ts
libs/services/src/api/cart.service.ts               + .spec.ts
libs/services/src/api/pricing.service.ts            + .spec.ts
libs/services/src/api/coupon-api.service.ts         + .integration.spec.ts
libs/services/src/api/auth.service.ts               + .spec.ts
libs/services/src/api/address-api.service.ts        + .integration.spec.ts
libs/services/src/api/config-api.service.ts         + .integration.spec.ts
libs/services/src/api/geocoding-api.service.ts      + .integration.spec.ts
libs/services/src/api/business-context.service.ts   + .spec.ts
libs/services/src/api/index.ts
```

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
- [ ] `nx test services` — all pass
- [ ] Integration tests use MSW handlers from `@zitro/test-data`
- [ ] `CatalogApiService.getProducts` calls mapper before returning
- [ ] `CartService` survives page reload (localStorage persistence)
- [ ] `OrderApiService.createOrder` calls `OrderMapper.fromCart` to build request

---

### T011 — FeatureFlagService + CacheService

**Status:** `[ ]`
**Branch:** `feature/T011-flag-cache-services`
**Depends on:** T009

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
  | 'wallet_payments'
  | 'delivery_tracking'
  | 'ratings_reviews'
  | 'scheduled_pickup'
  | 'dine_in'
  | 'grocery_mode';
```

**Acceptance Criteria:**
- [ ] `nx test services` — all pass
- [ ] `CacheService.get` returns null after TTL expires
- [ ] `CacheService.invalidatePattern` clears all matching keys
- [ ] `FeatureFlagService` returns `false` for all flags when API is unreachable (fail-safe)

---

### T012 — UI: Common Group 1

**Status:** `[ ]`
**Branch:** `feature/T012-ui-common-g1`
**Depends on:** T007, T008, T006

**Source files (migrate from):**
```
zitro-app/src/app/shared/components/loader/
zitro-app/src/app/shared/components/empty-state/
zitro-app/src/app/shared/components/error-state/
zitro-app/src/app/shared/components/no-internet/
zitro-app/src/app/features/splash/
```

**Scope — files to create (per component: component.ts, component.html, component.scss, component.spec.ts):**
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
- [ ] `nx test ui` — all pass for these 5 components
- [ ] All components are standalone
- [ ] All user-visible strings go through `I18nPipe`
- [ ] All interactive/visible elements have `data-testid`
- [ ] Each component spec tests: renders with default config, renders with custom config, displays i18n string

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

**Acceptance Criteria:** Same as T012 pattern.

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
- [ ] `PhoneInput` validates Indian phone format live (uses `Validators.isIndianPhone`)
- [ ] `OtpInput` supports paste (auto-fills all 6 boxes)
- [ ] `OtpInput` auto-submits when `autoSubmit: true` and all boxes filled
- [ ] `ThemePicker` calls `ThemeService.setTheme()` on selection

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
- [ ] `ProductCard` renders in all 3 layout modes
- [ ] `ProductCard` shows Veg/Non-Veg indicator (green/red dot)
- [ ] `CategoryBar` scrolls horizontally, highlights active category
- [ ] `ItemDetailSheet` shows correct variation prices

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
- [ ] Form validates all required fields
- [ ] Pincode field only accepts 6 digits
- [ ] Phone field validates Indian phone format
- [ ] `AddressCard` shows default badge for `isDefault: true`

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
- [ ] `PricingSummary` hides rows where `visibility.show*` is false
- [ ] Free delivery progress bar shows correct amount remaining
- [ ] Coupon discount row only shows when `couponDiscount > 0`

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
- [ ] Each order status maps to correct color
- [ ] `BannerCarousel` skips inactive banners
- [ ] `StarRating` emits on selection and supports read-only mode

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

### T030 — E2E Tests (zitro-customer)

**Status:** `[ ]`
**Branch:** `feature/T030-customer-e2e`
**Depends on:** T029

**Scope:**
```
apps/zitro-customer-e2e/playwright.config.ts
apps/zitro-customer-e2e/pages/auth.page.ts
apps/zitro-customer-e2e/pages/home.page.ts
apps/zitro-customer-e2e/pages/cart.page.ts
apps/zitro-customer-e2e/pages/checkout.page.ts
apps/zitro-customer-e2e/pages/orders.page.ts
apps/zitro-customer-e2e/journeys/guest-browse.journey.ts
apps/zitro-customer-e2e/journeys/place-order.journey.ts
apps/zitro-customer-e2e/journeys/apply-coupon.journey.ts
apps/zitro-customer-e2e/journeys/cancel-order.journey.ts
apps/zitro-customer-e2e/journeys/address-management.journey.ts
```

**5 Critical Journeys:**
1. **Guest Browse** — open app → select business → browse menu → search product
2. **Place Order** — login → add items → checkout (delivery) → confirm order → see status
3. **Apply Coupon** — add items → apply coupon → verify discount → place order
4. **Cancel Order** — place order → view orders → cancel within time window
5. **Address Management** — login → add address → set as default → use in checkout

**Rules:** Page Objects only use `data-testid` selectors. No CSS selectors.

**Acceptance Criteria:**
- [ ] All 5 journeys pass against local dev server
- [ ] Journeys use Page Object Model pattern
- [ ] No CSS selectors in any test

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
