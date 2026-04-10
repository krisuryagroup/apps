# ZITRO Customer App — Migration Plan

> **Goal:** Move `zitro-app` into `apps/zitro-customer` inside the Nx monorepo.
> The app must run **exactly as it does today** — same Firebase, same routes, same UI, same logic, same field names.
>
> **Source:** `E:/Github/krisuryagroup/zitro-app/`
> **Destination:** `E:/Github/krisuryagroup/apps/`
> **Claude context:** `apps/CLAUDE.md`

---

## The Only Rule

> **Copy file → update import paths → nothing else.**
>
> No field renames. No new patterns. No mapper layer. No API calls. No component rewrites.
> If a file has Firebase code, it keeps Firebase code. If a template has hardcoded strings, they stay hardcoded.
> Import paths are the only thing that changes.

---

## What moves where

```
zitro-app/src/app/                         → destination
├── core/models/          ──────────────→  libs/models/src/
├── models/               ──────────────→  libs/models/src/          (merge — 2 extra files)
├── utils/                ──────────────→  libs/utils/src/
├── theme/                ──────────────→  libs/theme/src/
├── shared/components/    ──────────────→  libs/ui/src/components/
├── shared/directives/    ──────────────→  libs/ui/src/directives/
├── core/services/        ──────────────→  libs/services/src/
├── services/             ──────────────→  libs/services/src/         (merge — firebase-otp.service.ts)
├── core/repositories/    ──────────────→  libs/services/src/repositories/
├── core/guards/          ──────────────→  apps/zitro-customer/src/app/core/guards/
├── core/initializers/    ──────────────→  apps/zitro-customer/src/app/core/initializers/
├── core/constants/       ──────────────→  apps/zitro-customer/src/app/core/constants/
├── layout/               ──────────────→  apps/zitro-customer/src/app/layout/
├── features/             ──────────────→  apps/zitro-customer/src/app/features/
├── games/                ──────────────→  apps/zitro-customer/src/app/games/
├── app.component.*       ──────────────→  apps/zitro-customer/src/app/app.component.*
├── app.config.ts         ──────────────→  apps/zitro-customer/src/app/app.config.ts
├── app.routes.ts         ──────────────→  apps/zitro-customer/src/app/app.routes.ts
└── app.material.config.ts ─────────────→  apps/zitro-customer/src/app/app.material.config.ts
```

## Import path updates (the only code change)

When a file moves into a lib and references something from another lib, the import path changes:

| Old import pattern | New import |
|---|---|
| `from '../../core/models/...'` | `from '@zitro/models'` |
| `from '../models/...'` | `from '@zitro/models'` |
| `from '../../utils/...'` | `from '@zitro/utils'` |
| `from '../utils/...'` | `from '@zitro/utils'` |
| `from '../../theme/...'` | `from '@zitro/theme'` |
| `from '../../shared/components/...'` | `from '@zitro/ui'` |
| `from '../../shared/directives/...'` | `from '@zitro/ui'` |
| `from '../services/...'` (cross-lib) | `from '@zitro/services'` |
| `from '../repositories/...'` | `from '@zitro/services'` |
| Firebase imports | **unchanged** |
| `@angular/material/*` imports | **unchanged** |
| `@angular/fire/*` imports | **unchanged** |

Within the same lib, relative imports are fine.

---

## Status Board

| ID | Title | Status | Depends on |
|----|-------|--------|-----------|
| MT001 | Bootstrap Nx workspace | [x] | — |
| MT002 | Create library scaffolds | [x] | MT001 |
| MT003 | Copy `@zitro/models` | [x] | MT002 |
| MT004 | Copy `@zitro/utils` | [x] | MT002 |
| MT005 | Copy `@zitro/theme` | [x] | MT002 |
| MT006 | Copy `@zitro/ui` (shared components + directives) | [x] | MT003 |
| MT007 | Copy `@zitro/services` | [x] | MT003, MT004 |
| MT008 | Bootstrap `apps/zitro-customer` shell | [x] | MT007 |
| MT009 | Copy app shell files (layout, guards, initializers, constants) | [x] | MT008 |
| MT010 | Copy features: business-selection | [ ] | MT009 |
| MT011 | Copy features: auth (signin, signup, forgot-password) | [ ] | MT009 |
| MT012 | Copy features: home + categories + category-listing | [ ] | MT009 |
| MT013 | Copy features: listing + search | [ ] | MT009 |
| MT014 | Copy features: cart + coupon-selection | [ ] | MT009 |
| MT015 | Copy features: addresses (manage-addresses + add-address) | [ ] | MT009 |
| MT016 | Copy features: orders (order-history + order-confirmation + order-tracking) | [ ] | MT009 |
| MT017 | Copy features: account + contact + cache-management + game-2048 | [ ] | MT009 |
| MT018 | Final verification — app runs end-to-end | [ ] | MT017 |

---

## Detailed Tasks

---

### MT001 — Bootstrap Nx Workspace

**Status:** `[ ]`
**Branch:** `feature/MT001-nx-bootstrap`
**Depends on:** —

**What to do:**
```bash
cd E:/Github/krisuryagroup/apps

# Init Nx workspace
npx create-nx-workspace@latest . --preset=apps --packageManager=npm --nxCloud=skip

# Angular + JS + Node generators
npm install -D @nx/angular @nx/js @nx/node
```

**Install the exact same dependencies as `zitro-app/package.json`:**
```bash
# Core Angular (match zitro-app versions)
npm install @angular/animations @angular/cdk @angular/common @angular/compiler
npm install @angular/core @angular/forms @angular/material
npm install @angular/platform-browser @angular/platform-browser-dynamic @angular/router

# Firebase
npm install @angular/fire firebase

# Capacitor (match zitro-app versions)
npm install @capacitor/core @capacitor/android @capacitor/cli
npm install @capacitor/app @capacitor/geolocation @capacitor/browser
npm install @capacitor-firebase/analytics

# Utilities (match zitro-app)
npm install geolib rxjs tslib zone.js

# Dev tools
npm install -D vitest @vitest/coverage-v8 @vitest/ui happy-dom
npm install -D @playwright/test
npm install -D typescript
```

> **Version matching:** Open `zitro-app/package.json` and use the exact same version strings.
> Do not upgrade anything — version mismatch will cause subtle breakage.

**Acceptance Criteria:**
- [ ] `npx nx --version` runs
- [ ] `node_modules/@angular/core` exists at the same version as `zitro-app`

---

### MT002 — Create Library Scaffolds

**Status:** `[x]`
**Branch:** `feature/MT002-lib-scaffolds`
**Depends on:** MT001

**What to do:**
```bash
# Pure TS libs (no Angular)
nx g @nx/js:lib models    --directory=libs/models    --importPath=@zitro/models
nx g @nx/js:lib utils     --directory=libs/utils     --importPath=@zitro/utils
nx g @nx/js:lib theme     --directory=libs/theme     --importPath=@zitro/theme

# Angular libs
nx g @nx/angular:lib services --directory=libs/services --importPath=@zitro/services --standalone
nx g @nx/angular:lib ui       --directory=libs/ui       --importPath=@zitro/ui       --standalone
```

> `test-data`, `mappers`, `jobs-shared` are NOT created here — they belong to future tasks (T006, T004, T035) and are not needed to run the app.

**After scaffolding — verify `tsconfig.base.json` has these paths:**
```json
{
  "paths": {
    "@zitro/models": ["libs/models/src/index.ts"],
    "@zitro/utils": ["libs/utils/src/index.ts"],
    "@zitro/theme": ["libs/theme/src/index.ts"],
    "@zitro/services": ["libs/services/src/index.ts"],
    "@zitro/ui": ["libs/ui/src/index.ts"]
  }
}
```

**Clean up generated boilerplate:**
Each generator creates sample files (`my-lib.ts`, `my-lib.spec.ts`, etc.). Delete them. Leave only `index.ts`.

**Acceptance Criteria:**
- [ ] 5 `libs/*/project.json` files exist
- [ ] `tsconfig.base.json` has all 5 path aliases
- [ ] `nx graph` shows 5 lib nodes

---

### MT003 — Copy `@zitro/models`

**Status:** `[x]`
**Branch:** `feature/MT003-copy-models`
**Depends on:** MT002

**Source files — copy ALL of these:**
```
zitro-app/src/app/core/models/address.model.ts
zitro-app/src/app/core/models/app-version.model.ts
zitro-app/src/app/core/models/appSettings.model.ts
zitro-app/src/app/core/models/auth-config.model.ts
zitro-app/src/app/core/models/banner.model.ts
zitro-app/src/app/core/models/cache-config.model.ts
zitro-app/src/app/core/models/category-config.model.ts
zitro-app/src/app/core/models/coupon.model.ts
zitro-app/src/app/core/models/fast2sms.model.ts
zitro-app/src/app/core/models/item-slider.model.ts
zitro-app/src/app/core/models/order-config.model.ts
zitro-app/src/app/core/models/order.model.ts
zitro-app/src/app/core/models/pricing.model.ts
zitro-app/src/app/core/models/product.model.ts

zitro-app/src/app/models/analytics-config.model.ts   ← top-level models folder
zitro-app/src/app/models/search-term.model.ts
```

**Destination:** `libs/models/src/` (all files go flat into this folder)

**File content:** Copy verbatim. Zero changes to any interface, type, const, or field name.

**Create `libs/models/src/index.ts`** — export everything:
```typescript
export * from './address.model';
export * from './app-version.model';
export * from './appSettings.model';
export * from './auth-config.model';
export * from './banner.model';
export * from './cache-config.model';
export * from './category-config.model';
export * from './coupon.model';
export * from './fast2sms.model';
export * from './item-slider.model';
export * from './order-config.model';
export * from './order.model';
export * from './pricing.model';
export * from './product.model';
export * from './analytics-config.model';
export * from './search-term.model';
```

**Acceptance Criteria:**
- [ ] `nx build models` — compiles without error
- [ ] `import { Product } from '@zitro/models'` resolves correctly in a test file
- [ ] No interface, type alias, const, or enum has been modified

---

### MT004 — Copy `@zitro/utils`

**Status:** `[x]`
**Branch:** `feature/MT004-copy-utils`
**Depends on:** MT002

**Source files — copy ALL of these:**
```
zitro-app/src/app/utils/common.util.ts
zitro-app/src/app/utils/common.util.spec.ts
zitro-app/src/app/utils/firebase-storage.util.ts
zitro-app/src/app/utils/firebase-storage.util.spec.ts
zitro-app/src/app/utils/order.util.ts
zitro-app/src/app/utils/order.util.spec.ts
zitro-app/src/app/utils/restaurant-switching.util.ts
zitro-app/src/app/utils/restaurant-switching.util.spec.ts
zitro-app/src/app/utils/validators.util.ts
zitro-app/src/app/utils/validators.util.spec.ts
```

**Destination:** `libs/utils/src/`

**Import path updates in copied files:**
- Any `from '../core/models/...'` → `from '@zitro/models'`
- Any `from '../models/...'` → `from '@zitro/models'`
- All other imports stay as-is

**Create `libs/utils/src/index.ts`** — export everything:
```typescript
export * from './common.util';
export * from './firebase-storage.util';
export * from './order.util';
export * from './restaurant-switching.util';
export * from './validators.util';
```

**Acceptance Criteria:**
- [ ] `nx build utils` — compiles without error
- [ ] `nx test utils` — existing tests pass (do not add new tests)

---

### MT005 — Copy `@zitro/theme`

**Status:** `[x]`
**Branch:** `feature/MT005-copy-theme`
**Depends on:** MT002

**Source files:**
```
zitro-app/src/app/theme/index.scss
```

> Check if there are other files in `zitro-app/src/styles/` or `zitro-app/src/app/theme/` — copy all of them.

**Destination:** `libs/theme/src/`

**Create `libs/theme/src/index.ts`:**
```typescript
// Theme library — SCSS only for now
// Future: ThemeService will live here (Task T007)
export {};
```

**In `apps/zitro-customer/src/styles.scss`** (created in MT008) add:
```scss
@use '@zitro/theme' as *;   // or @import — match whatever the existing app uses
```

**Also copy `zitro-app/src/styles.scss`** to `apps/zitro-customer/src/styles.scss` verbatim.

**Acceptance Criteria:**
- [ ] `nx build theme` — compiles without error
- [ ] SCSS tokens are accessible in the customer app

---

### MT006 — Copy `@zitro/ui`

**Status:** `[ ]`
**Branch:** `feature/MT006-copy-ui`
**Depends on:** MT003

**Source files — copy ALL of these folders:**
```
zitro-app/src/app/shared/components/banner/
zitro-app/src/app/shared/components/bottom-nav/
zitro-app/src/app/shared/components/cache-management/
zitro-app/src/app/shared/components/call-restaurant-button/
zitro-app/src/app/shared/components/cancel-order-dialog/
zitro-app/src/app/shared/components/cart-summary/
zitro-app/src/app/shared/components/category-cards/
zitro-app/src/app/shared/components/confirmation-dialog/
zitro-app/src/app/shared/components/coupon-selector/
zitro-app/src/app/shared/components/coupon-selector-cart/
zitro-app/src/app/shared/components/delivery-range-dialog.component.ts
zitro-app/src/app/shared/components/delivery-range-dialog.component.spec.ts
zitro-app/src/app/shared/components/description-dialog/
zitro-app/src/app/shared/components/footer/
zitro-app/src/app/shared/components/item-details-dialog/
zitro-app/src/app/shared/components/item-slider/
zitro-app/src/app/shared/components/loader/
zitro-app/src/app/shared/components/location-bottom-sheet/
zitro-app/src/app/shared/components/no-internet/
zitro-app/src/app/shared/components/order-loading-modal/
zitro-app/src/app/shared/components/pricing-summary/
zitro-app/src/app/shared/components/product-card/
zitro-app/src/app/shared/components/product-grid/
zitro-app/src/app/shared/components/sidebar/
zitro-app/src/app/shared/components/splash-screen/
zitro-app/src/app/shared/components/truncated-text/
zitro-app/src/app/shared/components/update-dialog/
zitro-app/src/app/shared/components/view-all-card/
zitro-app/src/app/shared/components/whatsapp-button/
zitro-app/src/app/shared/components/zoomable-image/

zitro-app/src/app/shared/directives/cached-image.directive.ts
zitro-app/src/app/shared/directives/cached-image.directive.spec.ts
zitro-app/src/app/shared/directives/swipe-back.directive.ts
zitro-app/src/app/shared/directives/swipe-back.directive.spec.ts
zitro-app/src/app/shared/directives/index.ts
```

**Destination structure:**
```
libs/ui/src/
├── components/            ← all component folders go here (same names)
│   ├── banner/
│   ├── bottom-nav/
│   └── ... (all others)
├── directives/            ← directive files go here
│   ├── cached-image.directive.ts
│   ├── swipe-back.directive.ts
│   └── index.ts
└── index.ts
```

**Import path updates in every copied file:**
- `from '../../core/models/...'` or `from '../../../core/models/...'` → `from '@zitro/models'`
- `from '../../utils/...'` or `from '../../../utils/...'` → `from '@zitro/utils'`
- `from '../../core/services/...'` or any cross-boundary service import → `from '@zitro/services'`
- Relative imports within `libs/ui/src/` (component importing another component) → keep as relative

**Create `libs/ui/src/index.ts`** — export everything:
```typescript
// Components
export * from './components/banner/...';
// ... export each component's public API
// Directives
export * from './directives/cached-image.directive';
export * from './directives/swipe-back.directive';
```

> Read each component folder to find the exact exported class names before writing index.ts.

**Acceptance Criteria:**
- [ ] `nx build ui` — compiles without error
- [ ] No component template or logic has been modified
- [ ] All Angular Material imports in components are unchanged

---

### MT007 — Copy `@zitro/services`

**Status:** `[ ]`
**Branch:** `feature/MT007-copy-services`
**Depends on:** MT003, MT004

**Source files — copy ALL of these:**

From `zitro-app/src/app/core/services/`:
```
analytics.service.ts + .spec.ts (if exists)
app-settings.service.ts + .spec.ts
app-version.service.ts + .spec.ts
banner.service.ts + .spec.ts
breakpoint.service.ts
cache-manager.service.ts + .spec.ts
cache.service.ts + .spec.ts
cart.service.ts + .spec.ts
categories.service.ts + .spec.ts
coupon.service.ts + .spec.ts
device-token.service.ts
dialog.service.ts + .spec.ts
favorite.service.ts + .spec.ts
favorites.service.ts + .spec.ts
fcm-token.service.ts
fcm.service.ts
firebase-auth.service.ts + .spec.ts
firebase-config.service.ts + .spec.ts
firebase-connection-manager.service.ts + .spec.ts
firebase-error-handler.service.ts + .spec.ts
firebase-storage.service.ts + .spec.ts
game-2048.service.ts
game-reward.service.ts
google-geocoding.service.ts
image-cache.service.ts
location-selection.service.ts
location.service.ts + .spec.ts
navigation.service.ts + .spec.ts
order-config.service.ts
order-processing.service.ts + .spec.ts
order.service.ts + .spec.ts
pricing.service.ts
products.service.ts + .spec.ts
request-throttle.service.ts + .spec.ts
restaurant-switching.service.ts + .spec.ts
user-management.service.ts + .spec.ts
```

From `zitro-app/src/app/services/` (top-level):
```
firebase-otp.service.ts
```

From `zitro-app/src/app/core/repositories/`:
```
firebase.repository.ts + .spec.ts
```

**Destination structure:**
```
libs/services/src/
├── (all service files flat)
├── repositories/
│   ├── firebase.repository.ts
│   └── firebase.repository.spec.ts
└── index.ts
```

**Import path updates in every copied file:**
- `from '../../models/...'` or `from '../models/...'` → `from '@zitro/models'`
- `from '../../utils/...'` or `from '../utils/...'` → `from '@zitro/utils'`
- `from '../repositories/...'` (when in service file) → `from './repositories/firebase.repository'`
- `from '../../shared/components/...'` → `from '@zitro/ui'`
- **Firebase imports: DO NOT TOUCH** — `@angular/fire/...` stays exactly as-is
- Cross-service imports (service importing another service): keep as relative `./other.service`

**Create `libs/services/src/index.ts`** — export all services publicly:
```typescript
export * from './app-settings.service';
export * from './auth.service';
// ... one line per service file
export * from './repositories/firebase.repository';
```

**Acceptance Criteria:**
- [ ] `nx build services` — compiles without error
- [ ] `nx test services` — existing tests pass (do not add new tests, do not fix test logic)
- [ ] All Firebase calls in services are unchanged
- [ ] No service method signatures have changed

---

### MT008 — Bootstrap `apps/zitro-customer` Shell

**Status:** `[ ]`
**Branch:** `feature/MT008-customer-shell`
**Depends on:** MT007

**What to do:**
```bash
nx g @nx/angular:app zitro-customer \
  --directory=apps/zitro-customer \
  --standalone \
  --routing \
  --style=scss
```

**Then copy these files verbatim from `zitro-app/src/`:**

| Source | Destination |
|--------|------------|
| `src/main.ts` | `apps/zitro-customer/src/main.ts` |
| `src/index.html` | `apps/zitro-customer/src/index.html` |
| `src/styles.scss` | `apps/zitro-customer/src/styles.scss` |
| `src/app/app.component.ts` | `apps/zitro-customer/src/app/app.component.ts` |
| `src/app/app.component.html` | `apps/zitro-customer/src/app/app.component.html` |
| `src/app/app.component.scss` | `apps/zitro-customer/src/app/app.component.scss` |
| `src/app/app.config.ts` | `apps/zitro-customer/src/app/app.config.ts` |
| `src/app/app.routes.ts` | `apps/zitro-customer/src/app/app.routes.ts` |
| `src/app/app.material.config.ts` | `apps/zitro-customer/src/app/app.material.config.ts` |

**Also copy Capacitor config:**

| Source | Destination |
|--------|------------|
| `capacitor.config.ts` | `apps/zitro-customer/capacitor.config.ts` |
| `android/` folder | `apps/zitro-customer/android/` |

**Update `capacitor.config.ts` — only one line changes:**
```typescript
// Change webDir to point to the new build output location
webDir: 'dist/apps/zitro-customer/browser',
// Everything else: unchanged (same appId, appName, etc.)
```

**Import path updates in `app.config.ts`:**
- `from './core/initializers/...'` → `from './core/initializers/...'` (stays relative — these files stay in the app)
- `from './core/constants/...'` → `from './core/constants/...'` (stays relative)
- `from './core/services/...'` → `from '@zitro/services'`

**Import path updates in `app.routes.ts`:**
- Feature component imports will fail until those features are copied in MT010–MT017
- For now: comment out all feature imports and replace routes with a placeholder component
- Uncomment them one by one as each feature task completes

**`project.json`** — make sure these scripts exist:
```json
{
  "targets": {
    "serve": { ... },
    "build": { ... },
    "test": { "executor": "@nx/vite:test" }
  }
}
```

**Acceptance Criteria:**
- [ ] `nx serve zitro-customer` starts (even with placeholder routes)
- [ ] Browser opens and shows the app shell (no crashes)
- [ ] `nx build zitro-customer` produces dist folder

---

### MT009 — Copy App Shell Files (layout, guards, initializers, constants)

**Status:** `[ ]`
**Branch:** `feature/MT009-customer-shell-files`
**Depends on:** MT008

**Copy these folders verbatim into `apps/zitro-customer/src/app/`:**

| Source | Destination |
|--------|------------|
| `zitro-app/src/app/core/guards/` | `apps/zitro-customer/src/app/core/guards/` |
| `zitro-app/src/app/core/initializers/` | `apps/zitro-customer/src/app/core/initializers/` |
| `zitro-app/src/app/core/constants/app.constants.ts` | `apps/zitro-customer/src/app/core/constants/app.constants.ts` |
| `zitro-app/src/app/layout/` | `apps/zitro-customer/src/app/layout/` |

**Import path updates in each file:**
- `from '../services/...'` or `from '../../core/services/...'` → `from '@zitro/services'`
- `from '../models/...'` or `from '../../core/models/...'` → `from '@zitro/models'`
- `from '../../utils/...'` → `from '@zitro/utils'`
- `from '../../shared/components/...'` → `from '@zitro/ui'`
- Imports between files within the same folder (e.g. guard importing a constant) → keep as relative

**After copying, uncomment the layout and guard imports in `app.routes.ts`.**

**Acceptance Criteria:**
- [ ] `nx serve zitro-customer` still starts
- [ ] `MainLayoutComponent` renders (shell visible)
- [ ] Guards compile without error (routes still placeholder)

---

### MT010 — Copy Features: Business Selection

**Status:** `[ ]`
**Branch:** `feature/MT010-feature-business-selection`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/business-selection/   →   apps/zitro-customer/src/app/features/business-selection/
```

**Import path updates:**
- `from '../../core/services/...'` → `from '@zitro/services'`
- `from '../../core/models/...'` → `from '@zitro/models'`
- `from '../../shared/components/...'` → `from '@zitro/ui'`
- `from '../../utils/...'` → `from '@zitro/utils'`

**Uncomment the route in `app.routes.ts`:**
```typescript
{ path: 'business-selection', component: BusinessSelectionComponent },
```

**Acceptance Criteria:**
- [ ] `nx serve zitro-customer` — navigating to `/business-selection` renders the page
- [ ] No console errors from this page

---

### MT011 — Copy Features: Auth

**Status:** `[ ]`
**Branch:** `feature/MT011-feature-auth`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/auth/signin.component.*
zitro-app/src/app/features/auth/signup.component.*
zitro-app/src/app/features/auth/forgot-password.component.*
```

**Import path updates:** Same pattern as MT010.

**Uncomment auth routes in `app.routes.ts`.**

**Acceptance Criteria:**
- [ ] `/auth/signin` renders
- [ ] OTP flow compiles and is navigable

---

### MT012 — Copy Features: Home + Categories

**Status:** `[ ]`
**Branch:** `feature/MT012-feature-home-categories`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/home/
zitro-app/src/app/features/categories/
zitro-app/src/app/features/category-listing/
```

**Import path updates:** Same pattern. Pay attention to component imports from `shared/`.

**Uncomment routes.**

**Acceptance Criteria:**
- [ ] `/home` loads and shows banners + categories from Firebase

---

### MT013 — Copy Features: Listing + Search

**Status:** `[ ]`
**Branch:** `feature/MT013-feature-listing-search`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/listing/
zitro-app/src/app/features/search/
```

**Acceptance Criteria:**
- [ ] `/listing` and `/search` routes render

---

### MT014 — Copy Features: Cart + Coupon Selection

**Status:** `[ ]`
**Branch:** `feature/MT014-feature-cart-coupons`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/cart/
zitro-app/src/app/features/coupon-selection/
```

**Acceptance Criteria:**
- [ ] `/cart` renders and shows cart items from CartService
- [ ] `/coupons` renders

---

### MT015 — Copy Features: Addresses

**Status:** `[ ]`
**Branch:** `feature/MT015-feature-addresses`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/manage-addresses/
zitro-app/src/app/features/add-address/
```

**Acceptance Criteria:**
- [ ] `/addresses` and `/add-address` render (requires auth)

---

### MT016 — Copy Features: Orders

**Status:** `[ ]`
**Branch:** `feature/MT016-feature-orders`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/order-history/
zitro-app/src/app/features/order-confirmation/
zitro-app/src/app/features/order-tracking/
```

**Acceptance Criteria:**
- [ ] `/orders`, `/order-confirmation`, `/track-order` render

---

### MT017 — Copy Features: Account + Remaining

**Status:** `[ ]`
**Branch:** `feature/MT017-feature-remaining`
**Depends on:** MT009

**Copy:**
```
zitro-app/src/app/features/account/
zitro-app/src/app/features/contact-us.component.*
zitro-app/src/app/games/                           ← game-2048 lives here
```

> Check if `game-2048` is under `features/` or `games/` — copy from wherever it actually is.

**Uncomment all remaining routes in `app.routes.ts`.**

**Acceptance Criteria:**
- [ ] All routes from the original `app.routes.ts` are active and render
- [ ] Zero commented-out route imports remain

---

### MT018 — Final Verification

**Status:** `[ ]`
**Branch:** `feature/MT018-verification`
**Depends on:** MT017

**Manual smoke test — go through every flow:**

| Flow | Expected result |
|------|----------------|
| Cold start → business selection | Shows 3 businesses |
| Select business → home | Banners + categories load from Firebase |
| Browse products → add to cart | Cart count updates |
| Guest checkout attempt | Redirected to sign in |
| Phone OTP signin | OTP sent, user signed in |
| Place delivery order | Order created in Firestore |
| View order history | Orders listed |
| Add/edit address | Address saved to Firestore |
| Apply coupon | Discount applied in pricing |
| Cancel order | Order cancelled within time window |
| Switch business | Other business loads |
| Play 2048 game | Game works |

**Build verification:**
```bash
nx build zitro-customer --configuration=production
# Bundle should be similar size to zitro-app build
```

**Android verification:**
```bash
nx build zitro-customer --configuration=production
npx cap copy android
# Open in Android Studio and run on emulator/device
```

**Acceptance Criteria:**
- [ ] All smoke test flows pass
- [ ] Production build completes without error
- [ ] Android app loads on emulator
- [ ] No Firebase errors in console
- [ ] App behaviour is identical to `zitro-app`

---

## What comes after this migration

Once MT018 is done, `apps/zitro-customer` is a working copy of the live app in the new structure. The `zitro-app` folder is no longer the active development target.

Future tasks (from `TASKS.md`) then incrementally improve the migrated app:
- **T007** — replace hardcoded SCSS variables with `@zitro/theme` CSS custom properties
- **T008** — extract hardcoded strings into `@zitro/i18n`
- **T009/T010** — add HTTP interceptors + .NET API services (alongside existing Firebase services)
- **Component rewrites** — add config objects, signal inputs, `data-testid` attributes
- **Field renames** — consolidate `image`/`imageURL`, flatten `OrderCharges` (when API is ready)
