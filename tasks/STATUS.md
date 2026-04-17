# ZITRO Apps — Task Status Board

> **How to use:** Tell Claude "start task T009" and it will read the relevant task file, implement everything in scope, run checks, and raise a PR.
>
> **Task files in this folder:**
> | File | Contents |
> |------|---------|
> | `STATUS.md` | This file — status board, always read first |
> | `TESTING-STANDARDS.md` | Test framework rules, coverage targets, file splitting rules |
> | `T003-T011.md` | Infrastructure tasks: models, mappers, test-data, theme, i18n, services |
> | `T012-T019.md` | Component evolution: UI lib, SCSS cleanup, finalize command |
> | `T020-T029.md` | Feature pages: zitro-customer + restaurant/delivery/jobs/admin apps |
> | `T029-UNIT.md` | Unit + integration test batch (written last, after T029) |
> | `T030-E2E.md` | Playwright E2E journeys (27 tests, 5 journeys) |
>
> **Read first:** `../ROADMAP.md` — shows the complete sequence and how tasks connect.
> **Migration tasks:** `../MIGRATION-PLAN.md` (MT001–MT018) — must be done before T tasks.
> **Architecture reference:** `../ZITRO-APPS-ARCHITECTURE.md`
> **Claude context:** `../CLAUDE.md`

> ⚠️ **Tasks T001, T002, T005 are superseded by migration tasks MT001–MT004. Do not run them.**
> **T003 is now active** — models update. All other tasks start after MT018 is complete.

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
| T003 | `@zitro/models` structural changes (imageUrl + flat OrderCharges + new User/BusinessConfig/catalog models) | `[ ]` | MT003 |
| T004 | Implement `@zitro/mappers` | `[ ]` | T003 |
| T005 | Verify `@zitro/utils` tests pass | `[x]` superseded by MT004 | MT004 |
| **Phase 3 — Test Data** |
| T006 | Implement `@zitro/test-data` | `[x]` | T004, T005 |
| **Phase 4 — Theme** |
| T007 | Evolve `@zitro/theme` — CSS custom properties + ThemeService | `[x]` | MT005 |
| **Phase 5 — i18n** |
| T008 | Build `@zitro/i18n` — extract strings from migrated templates | `[x]` | MT018 |
| **Phase 6 — Services** |
| T009 | HTTP interceptors in `@zitro/services` | `[x]` | T004 |
| T010 | API service classes in `@zitro/services` (replace Firebase data services) | `[x]` | T009 |
| T011 | FeatureFlagService (UI flags only) + CacheService | `[ ]` | T009 |
| **Phase 7 — UI Library** |
| T012 | Evolve: `loader`, `no-internet`, `splash-screen` + equivalents | `[x]` | T007, T008 |
| T013 | Evolve: `confirmation-dialog`, `bottom-sheet`, `truncated-text`, `zoomable-image` | `[x]` | T012 |
| T014 | Evolve: auth input components (signin, OTP) + new `theme-picker` | `[x]` | T012 |
| T015 | Evolve: `product-card`, `product-grid`, `category-cards`, `item-details-dialog`, search | `[ ]` | T013, T010 |
| T016 | Evolve: address components | `[ ]` | T013, T010 |
| T017 | Evolve: `cart-summary`, `pricing-summary`, coupon selector | `[ ]` | T015 |
| T018 | Evolve: `banner`, `cancel-order-dialog`, `update-dialog` + new ratings components | `[ ]` | T013, T010 |
| **Phase 8 — SCSS Cleanup + Security & Finalize** |
| T019-scss | SCSS refactoring — slim oversized component stylesheets | `[x]` | MT018 |
| T019 | Finalize command + Husky + audit-ci | `[x]` | MT002, T019-scss |
| **Phase 9 — zitro-customer pages** |
| T020 | Evolve `app.config.ts` | `[ ]` | T008, T007, T009 |
| T021 | Evolve `business-selection` page | `[x]` | T020 |
| T022 | Evolve auth pages | `[x]` | T021, T014 |
| T023 | Evolve `home` page | `[ ]` | T022, T015, T018 |
| T024 | Evolve `listing`, `search`, `categories`, `category-listing` pages | `[ ]` | T023 |
| T025 | Evolve `cart` page | `[ ]` | T024, T017 |
| T026 | Evolve address pages | `[ ]` | T025, T016 |
| T027 | Evolve `order-confirmation` + checkout flow | `[ ]` | T026 |
| T028 | Evolve `order-history`, `order-tracking` pages | `[ ]` | T027, T018 |
| T029 | Evolve `account`, `contact-us`, `coupon-selection`, `game-2048` pages | `[ ]` | T028 |
| T029-unit | Write ALL unit + integration tests | `[ ]` | T029, T006 |
| T030 | E2E tests — 5 critical journeys (Playwright, 27 tests) | `[ ]` | T029-unit |
| **Phase 10 — Restaurant Partner App** |
| T031 | Bootstrap `zitro-restaurant` | `[ ]` | T011, T019 |
| T032 | zitro-restaurant: Order management | `[ ]` | T031, T018 |
| T033 | zitro-restaurant: Menu management | `[ ]` | T032, T015 |
| T034 | zitro-restaurant: Business settings + reports | `[ ]` | T033 |
| **Phase 10b — Background Jobs** |
| T035 | Implement `@zitro/jobs-shared` | `[ ]` | T003 |
| T036 | Bootstrap `zitro-jobs` + all Cloud Functions | `[ ]` | T035 |
| **Phase 11 — Remaining Apps** |
| T037 | Bootstrap `zitro-admin` — core screens | `[ ]` | T011, T019 |
| T038 | Bootstrap `zitro-delivery` — core screens + Capacitor | `[ ]` | T011, T019 |
| T039 | Bootstrap `zitro-pos` — core screens + Capacitor | `[ ]` | T011, T019 |
| T040 | Bootstrap `zitro-superadmin` — core screens | `[ ]` | T011, T019 |
| **Phase 12 — CI/CD** |
| T041 | GitHub Actions — PR check + release workflows | `[ ]` | T019 |
| **Phase 13 — New API Endpoints** |
| T042 | zitro-api: Config endpoint + Geo proxy + Business search + Internal jobs endpoints | `[ ]` | T010 |

---

## Parallel Execution Map

**Wave 1 (start now — all independent):**
- T011 (FeatureFlagService + CacheService)
- T013 (UI Common Group 2)
- T014 (UI Theme + Auth)
- T019 (Finalize command — if not done)

**Wave 2 (after T011 + T009):**
- T010 (API services) — if not already done
- HRD-002 (env config + services)
- T020 (app.config.ts)

**Wave 3 (after T013):**
- T015 + T016 in parallel (both depend on T013 + T010)

**Wave 4 (after T015):**
- T017 (cart components)
- T018 (order/ratings/banners) — parallel with T017

**Pages (sequential after T020):**
T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029

**Tests (last):**
T029-unit (after T029) → T030 (after T029-unit)

---

## Notes

- Tasks within the same Phase can be parallelized if their dependencies are satisfied
- Each task = one PR, one branch, one review
- Never merge a task PR with failing checks
- Update status in this file as part of every task PR
