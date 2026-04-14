# ZITRO Apps — Complete Roadmap

> This is the master sequence document. Read this to understand how `MIGRATION-PLAN.md` and `TASKS.md` connect and in what order everything gets done.
>
> **To start a task:** say "start task MT001" (migration) or "start task T007" (post-migration)
> Claude reads `MIGRATION-PLAN.md` for MT tasks and `TASKS.md` for T tasks.

---

## The Three Phases

```
PHASE 1 — GET IT RUNNING          PHASE 2 — STRENGTHEN              PHASE 3 — NEW APPS
MT001 → MT018                      T006 → T030                        T031 → T042
──────────────────────             ────────────────────────           ──────────────
Copy zitro-app into monorepo.      Evolve each library and page.      Build restaurant,
App runs identically.              Add patterns, .NET API, tests.      delivery, admin, jobs.
Zero logic changes.                Gradual, feature by feature.
```

---

## Phase 1 — Migration (MT tasks)

**State at start:** `zitro-app` is the live app in its own folder.
**State at end:** `apps/zitro-customer` runs identically to `zitro-app`. Firebase everywhere. Legacy field names. No new patterns.

Run in strict order:

```
MT001 → MT002 → MT003 → MT004 → MT005 → MT006 → MT007
                                                    ↓
MT018 ← MT017 ← MT016 ← MT015 ← MT014 ← MT013 ← MT008
         ↑                                          ↓
        MT012 ← MT011 ← MT010                     MT009
```

See `MIGRATION-PLAN.md` for details of each MT task.

---

## Phase 2 — Strengthen (T tasks, post-migration)

**State at start:** after MT018.
**State at end:** full architecture from `ZITRO-APPS-ARCHITECTURE.md` is in place in `zitro-customer`.

### What each T task does differently because migration happened first

| T task | Original intent | After migration, it becomes |
|--------|----------------|----------------------------|
| T001 | Bootstrap Nx workspace | **Superseded by MT001** — skip |
| T002 | Create all lib scaffolds | **Superseded by MT002** — skip (5 libs created; test-data/mappers/jobs-shared still needed in T004/T006/T035) |
| T003 | Implement `@zitro/models` | **Active now** — models were copied in MT003. T003 updates them: rename `imageUrl`, flatten `OrderCharges`, add `User`/`BusinessConfig`/`MenuCategory`/`NearbyBusiness`/`PlatformTag` models. Do not defer. |
| T004 | Implement `@zitro/mappers` | **New work** — build fresh. Depends on T003 being done. |
| T005 | Implement `@zitro/utils` | **Superseded by MT004** — run `nx test utils` to verify; fix any failing tests |
| T006 | Implement `@zitro/test-data` | **New work** — build fresh. Fixtures, builders, MSW handlers. |
| T007 | Implement `@zitro/theme` | **Evolve** — SCSS already copied in MT005. Now add CSS custom properties + ThemeService on top. |
| T008 | Implement `@zitro/i18n` | **Evolve** — scan `apps/zitro-customer` templates (not `zitro-app`) to extract strings. |
| T009 | HTTP interceptors | **New work** — build fresh. |
| T010 | .NET API services | **New work alongside Firebase** — see dual-mode strategy below. |
| T011 | FeatureFlagService + CacheService | **Evolve** — `cache.service.ts` exists from migration; evolve it. `FeatureFlagService` is new. |
| T012–T018 | Build `@zitro/ui` components | **Evolve** — all 30 components already exist in `libs/ui/src/`. Add patterns on top. |
| T019 | Finalize command + security | **New work** — build fresh. |
| T020 | Bootstrap `zitro-customer` | **Evolve** — app shell exists from MT008. Update providers only. |
| T021–T029 | Feature pages | **Evolve** — pages already exist from migration. Adopt evolved components + API. |
| T030 | E2E tests | **New work** — build fresh (pages now exist to test against). |

---

## Phase 2 — Detailed Order

Tasks within the same group can run in parallel:

### Group A — Independent, no cross-task deps (start right after MT018)

| Task | What to do | Source files to work with |
|------|-----------|--------------------------|
| **T005-verify** | Run `nx test utils` — fix any failing tests. No new code. | `libs/utils/src/` |
| **T006** | Build `@zitro/test-data` from scratch (fixtures + builders + MSW handlers) | New files only |
| **T007** | Evolve `@zitro/theme` — add CSS custom properties + ThemeService | `libs/theme/src/` (SCSS already there from MT005) |
| **T008** | Extract i18n strings from migrated templates + build `@zitro/i18n` | Scan `apps/zitro-customer/src/app/` templates |
| **T019** | Build finalize command + Husky + audit-ci | New files in `tools/scripts/` |

### Group B — Depends on Group A

| Task | What to do | Depends on |
|------|-----------|-----------|
| **T004** | Build `@zitro/mappers` (DTOs + mapper functions) | T003 |
| **T009** | Build HTTP interceptors | T019 (for CI checks to pass) |
| **T011** | Build `CacheService` + `FeatureFlagService` (UI flags only — not for API switching) | T009 |

### Group C — Depends on Group B

| Task | What to do | Depends on |
|------|-----------|-----------|
| **T010** | Build .NET API services (replace Firebase data services) | T004, T009 |

### Group D — Component evolution (sequential, each group depends on previous)

These evolve the components that already exist in `libs/ui/src/components/` from MT006.

**What "evolve a component" means:**
1. Add typed `Config` interface + defaults (`export interface LoaderConfig { ... }`)
2. Replace `@Input()` / `@Output()` decorators → `input()` / `output()` signals
3. Add `data-testid` attributes to every interactive and key display element
4. Replace every hardcoded user-visible string → `{{ 'key' | i18n }}`
5. Write unit test (`*.spec.ts` next to component)

| Task | Components to evolve | Depends on |
|------|---------------------|-----------|
| **T012** | `loader`, `no-internet`, `splash-screen` (and equivalent in migrated code) | T007, T008, T006 |
| **T013** | `confirmation-dialog`, `bottom-sheet`, `truncated-text`, `zoomable-image`, `description-dialog`, `order-loading-modal` | T012 |
| **T014** | Theme picker (new), signin form components, OTP input components | T012 |
| **T015** | `product-card`, `product-grid`, `category-cards`, `item-details-dialog`, search components | T013, T010 |
| **T016** | Address components (manage + add address UI) | T013, T010 |
| **T017** | `cart-summary`, `pricing-summary`, coupon components | T015 |
| **T018** | `banner`, `cancel-order-dialog`, `update-dialog`, ratings (new) | T013, T010 |

### Group E — App evolution (feature pages)

These evolve the feature pages that already exist in `apps/zitro-customer/src/app/features/` from migration.

**What "evolve a feature page" means:**
1. Update imports to use the evolved `@zitro/ui` components (as they complete in T012–T018)
2. Pipe all user-visible strings through `{{ 'key' | i18n }}` (after T008)
3. Apply `ThemeService` where hardcoded colours were used (after T007)
4. Add `data-testid` to page-level elements needed for E2E (after T030)
5. Wire to .NET API service (after T010) — see dual-mode strategy below

| Task | Pages to evolve | Depends on |
|------|----------------|-----------|
| **T020** | `app.config.ts` — add `provideI18n()`, `provideTheme()`, `provideZitroServices()` | T008, T007, T009 |
| **T021** | `business-selection` page | T020 |
| **T022** | `signin`, `signup`, `forgot-password` pages | T021, T014 |
| **T023** | `home` page | T022, T015, T018 |
| **T024** | `listing`, `search`, `categories`, `category-listing` pages | T023 |
| **T025** | `cart` page | T024, T017 |
| **T026** | `manage-addresses`, `add-address` pages | T025, T016 |
| **T027** | `order-confirmation`, checkout flow | T026 |
| **T028** | `order-history`, `order-tracking` pages | T027, T018 |
| **T029** | `account`, `contact-us`, `coupon-selection`, `game-2048` pages | T028 |
| **T030** | E2E tests — 5 critical journeys | T029 |

---

## The API-First Strategy

**No dual-mode. No FeatureFlagService for API switching.**

T010 builds .NET API service classes that **directly replace** the Firebase data services. Feature pages
switch to the new API service the moment T010 ships that service class. The old Firebase service file
stays until the page has switched over and been tested — then it is deleted.

**What stays on Firebase permanently:**

| Service | Reason |
|---------|--------|
| Firebase Phone Auth + OTP | No replacement — `firebase-auth.service.ts`, `firebase-otp.service.ts` |
| Firebase Storage | Product/user image upload — `firebase-storage.service.ts` |
| FCM push notifications | `fcm.service.ts`, `fcm-token.service.ts`, `device-token.service.ts` |
| Firebase Analytics | Write-only, low risk — `analytics.service.ts` |

**Firebase data services replaced by T010 (in this order — lowest to highest risk):**

| Old Firebase service | New API service | Endpoint |
|----------------------|-----------------|---------|
| `categories.service.ts` | `catalog-api.service.ts` | `GET /api/categories?businessSlug=X` |
| `products.service.ts` | `catalog-api.service.ts` | `GET /api/businesses/{slug}/menu` |
| `coupon.service.ts` | `coupon-api.service.ts` | `GET /api/coupons` |
| `banner.service.ts` | `engagement-api.service.ts` | `GET /api/businesses/{slug}/banners` |
| `user-management.service.ts` | `user-api.service.ts` | `GET/PUT /api/users/profile`, `/api/users/addresses` |
| `order.service.ts` | `order-api.service.ts` | `POST/GET /api/orders` |

`FeatureFlagService` (T011) is for **UI feature flags only** (wallet tab, game, dine-in mode).
It is never used to pick between Firebase vs .NET API.

---

## The `@zitro/models` Structural Changes

Two field changes were deferred from migration (kept legacy field names to stay safe). They are done
in **T003, now** — not deferred until "API verified for 2 weeks":

| Change | Why now |
|--------|---------|
| `Product.image` / `Product.imageURL` → `Product.imageUrl` | .NET API returns one field; Firebase had two from different code paths |
| `OrderCharges` nested `{ calculated, applied, waived }` → flat numbers | .NET API returns final computed values; no sub-field structure |

New models added in T003: `User`, `BusinessConfig`, `MenuCategory`, `BusinessMenu`, `NearbyBusiness`, `PlatformTag`.

T003 also updates all components in `@zitro/ui` and all feature pages in `zitro-customer` that reference
the renamed fields — the whole change ships in one PR (no T003-finalize needed).

---

## Phase 3 — New Apps (T tasks, after T030)

These are built from scratch — no migration equivalent. Build them in this order:

| Task | App | Depends on |
|------|-----|-----------|
| **T031** | Bootstrap `zitro-restaurant` (web + Capacitor) | T011, T019 |
| **T032** | zitro-restaurant: order management | T031, T018 |
| **T033** | zitro-restaurant: menu management | T032, T015 |
| **T034** | zitro-restaurant: settings + reports | T033 |
| **T035** | `@zitro/jobs-shared` | T003 |
| **T036** | `zitro-jobs` — all Cloud Functions | T035 |
| **T037** | `zitro-admin` core | T011, T019 |
| **T038** | `zitro-delivery` core + Capacitor | T011, T019 |
| **T039** | `zitro-pos` core + Capacitor | T011, T019 |
| **T040** | `zitro-superadmin` core | T011, T019 |
| **T041** | CI/CD — GitHub Actions | T019 |
| **T042** | New API endpoints in `zitro-api` | T010 |

T031–T040 can run in parallel once T011 + T019 are done.

---

## Complete Master Sequence

```
TODAY
  │
  ▼
MT001  Bootstrap Nx workspace
MT002  Scaffold libs (models, utils, theme, services, ui)
MT003  Copy @zitro/models (exact copy, no changes)
MT004  Copy @zitro/utils (exact copy)
MT005  Copy @zitro/theme SCSS (exact copy)
MT006  Copy @zitro/ui components (exact copy)
MT007  Copy @zitro/services (exact copy, Firebase intact)
MT008  Bootstrap apps/zitro-customer shell
MT009  Copy layout + guards + initializers + constants
MT010  Copy business-selection feature
MT011  Copy auth features
MT012  Copy home + categories features
MT013  Copy listing + search features
MT014  Copy cart + coupons features
MT015  Copy addresses features
MT016  Copy orders features
MT017  Copy account + remaining features
MT018  ✅ Verify — app runs identically to live zitro-app
  │
  ▼
  ┌─────────────────────────────────────── parallel ──────────────────────────────────────┐
  │                                                                                        │
T005-verify  Run utils tests               T006  Build @zitro/test-data                   │
T007  Evolve @zitro/theme tokens+service   T008  Build @zitro/i18n (scan migrated app)    │
T019  Finalize command + security          │                                               │
  │                                        │                                               │
  └───────────────────┬────────────────────┘                                               │
                      ▼                                                                     │
              T004  Build @zitro/mappers                                                   │
              T009  HTTP interceptors                                                       │
              T011  CacheService (evolve) + FeatureFlagService (new)                       │
                      │                                                                     │
                      ▼                                                                     │
              T010  .NET API service classes (replace Firebase data services)                          │
                      │                                                                     │
  ┌───────────────────┴──────────────────────────────────────────────────────────────────┘
  │
  ▼ Component Evolution (sequential)
T012  Evolve: loader, no-internet, splash-screen
T013  Evolve: dialogs, bottom-sheet, truncated-text, zoomable-image
T014  Evolve: auth components + new theme-picker
T015  Evolve: catalog components (product-card, product-grid, etc.)
T016  Evolve: address components
T017  Evolve: cart + pricing components
T018  Evolve: order components + banners + update-dialog
  │
  ▼ App Evolution (sequential)
T020  Evolve app.config.ts — add i18n, theme, HTTP providers
T021  Evolve business-selection page
T022  Evolve auth pages
T023  Evolve home page
T024  Evolve listing + search + categories pages
T025  Evolve cart page
T026  Evolve addresses pages
T027  Evolve checkout + order-confirmation pages
T028  Evolve orders + tracking pages
T029  Evolve account + remaining pages
T030  ✅ E2E tests — 5 critical journeys
  │
  ▼ New Apps (parallel once T019 + T011 done)
  ┌──────────────────────────────────────────┐
  │                                          │
T031–T034  zitro-restaurant            T035–T036  zitro-jobs
T037  zitro-admin                      T038  zitro-delivery
T039  zitro-pos                        T040  zitro-superadmin
  │                                          │
  └────────────────────┬─────────────────────┘
                       │
T041  CI/CD             T042  New API endpoints in zitro-api
                       │
                       ▼
                   DONE ✅
```

---

## At Any Point in This Sequence

- The app in `apps/zitro-customer` is always in a **working state**. Nothing breaks between tasks.
- The live `zitro-app` is untouched throughout. It continues serving real users.
- Every task = one branch + one PR. Never bundle tasks.
- Run `npm run finalize:affected` before every PR.
