# Plan: Frontend UI Tasks + Token Optimization

## Context

The backend is feature-complete. `apps/zitro-customer` migration and HRD tasks are done.
App compiles and runs, but pages have UI gaps, broken API connections, and design mismatches.

This plan covers:
1. **Doc Refactoring** — Trim CLAUDE.md files so frontend sessions don't waste tokens loading
   ~650 lines of irrelevant backend architecture (76% token reduction)
2. **Page-by-Page UI Task System** — UI-001 to UI-016, each with a browser-validated, zero-rework
   implementation process — designed to match designs pixel-accurately on the first attempt

---

## The Rework Problem — Root Cause & Fix

Past attempts gave mismatched outcomes because:
- Implementation happened without verifying the running app visually
- Design specs (exact px, colors, spacing) were guessed from images instead of extracted
- No feedback loop between code written and browser rendering

**The fix: a 5-stage process per task that never moves to the next stage without validating the previous one.**

---

## Per-Task Implementation Protocol (Senior Dev Standard)

Every UI task — regardless of size — follows these exact stages:

### Stage 0 — Audit (before writing a single line)
1. Run the dev server, take a screenshot of the **current** page using browser tools
2. Read the design image you share — extract a spec table:
   - Layout structure (flex/grid, direction, gaps)
   - Typography (font-size, weight, line-height per element)
   - Colors (background, text, border, shadow — matched to `--zitro-*` CSS tokens where possible)
   - Spacing (padding, margin in px/rem)
   - Border radius, shadows, elevation
   - Interactive states (hover, active, disabled, loading, empty, error)
3. Check existing API service files — list which calls are present vs missing
4. Flag anything outside `apps/` scope BEFORE proceeding

**Output:** A written spec comment block at the top of the component — design source of truth.
Claude never guesses a value; every pixel has a source.

### Stage 1 — Scaffold
- Create/update component files with correct structure, no styling yet
- Wire all API calls using existing service patterns
- Verify TypeScript compiles: `npx nx build zitro-customer --configuration=production`
- No UI styling in this stage — structure and data only

### Stage 2 — Style (Design Matching)
- Apply styles using only `--zitro-*` CSS tokens + extracted spec values
- Use `rem` for font sizes, `px` for borders/shadows, `%` for layout where appropriate
- Responsive breakpoints: mobile-first (`375px` base), tablet (`768px`), desktop (`1024px+`)
- Every user-visible string via `i18n` pipe — no hardcoded text

### Stage 3 — Browser Validation (Critical — No Skipping)
1. Start dev server: `npx nx serve zitro-customer`
2. Take screenshot of the implemented page using browser automation tools
3. Side-by-side comparison against the design image you shared
4. List every visual delta (e.g., "button border-radius is 8px, design shows 12px")
5. Fix all deltas → screenshot again → repeat until diff is empty or acceptable
6. Test all interactive states (loading skeleton, empty state, error state, success)
7. Test on mobile viewport (375px) and tablet (768px)

**This stage is non-negotiable. The implementation is not done until the screenshot matches.**

### Stage 4 — Functional Verification
- Test the full user journey on the page (tap → API → render → next action)
- Verify console has zero errors
- Verify network tab shows correct API calls with correct headers (Firebase token, X-Business-Id)
- Run: `npx nx build zitro-customer --configuration=production` — must pass clean

### Stage 5 — Handoff
- Update i18n keys in `en.ts`
- Final screenshot pair (before/after) shared with you for sign-off
- Mark task done only after your explicit approval

---

## Part A — Token Optimization (Do This First)

### Why it matters
Every frontend session currently loads ~1,270 lines of CLAUDE.md:
- `CLAUDE.md` (root): ~110 lines — mostly fine
- `apps/CLAUDE.md`: ~389 lines — all frontend-relevant ✅
- `zitro-api/CLAUDE.md`: ~771 lines — only ~100 lines relevant to frontend ❌

**Target: ~300 lines total loaded per frontend session (76% reduction).**

---

### DOC-001 — Slim Root `CLAUDE.md`
**File:** `E:/Github/krisuryagroup/CLAUDE.md`

**Remove:**
- Entire "Critical Rule: Production Safety" section — `zitro-app` repo is deleted, app is in dev, not live
- `zitro-app/` row from Repo Map — repo deleted
- `zitro-app/` row from "Where to Make Changes" table — repo deleted
- "Existing live customer app (hotfixes only)" decision row — irrelevant
- "Three live businesses" framing (the "hardcoded in the Angular app" language) — no live app
- Firebase Usage table — compress to one line referencing per-repo CLAUDE.md
- Entire "Per-Repo Quick Reference" sub-sections for `zitro-api`, `zitro-app`, `zitro-jobs`, `apps` — all detail lives in each repo's own CLAUDE.md
- "How to Add a New Repo" section — not day-to-day content

**Keep:**
- Repo Map table (3 rows: `zitro-api`, `zitro-jobs`, `apps`) — no zitro-app
- Business slugs table (keep slugs as API/DB seed reference, remove "hardcoded in Angular app" note)
- Decision Guide (remove zitro-app row)
- Firebase Project ID one-liner

**Result:** ~35 lines (down from ~110)

---

### DOC-002 — Slim `apps/CLAUDE.md`
**File:** `E:/Github/krisuryagroup/apps/CLAUDE.md`

**Remove:**
- "The live customer app is at `zitro-app/` — do NOT touch it" note — repo deleted
- "During MT tasks" coding rules block — Phase 1 complete, dead weight
- ".NET API Strategy" section — already wired in T010, not a decision anymore
- Full 6-step Task Workflow git ceremony — compress to 3-line reminder
- "Documents in This Folder" read-order table — compress, MT docs are done
- Any "LIVE on Play Store" / production safety language — app is in dev
- `zitro-app` references in "What NOT to Do" section

**Add (at bottom):** "API Contracts Quick Ref" — 80-line extract from `zitro-api/CLAUDE.md`
covering only what frontend needs: auth token flow, PricingConfig JSON shape, OrderStatus
strings, Address field names (`houseAndStreet` not `addressLine`), OrderCharges structure,
Error response format. Eliminates need to ever load the backend file.

**Result:** ~220 lines (down from ~389)

---

### DOC-003 — Exclude Backend CLAUDE.md for Frontend Sessions
**File:** `E:/Github/krisuryagroup/.claude/settings.local.json`

Add `claudeMdExcludes` to exclude the 771-line backend doc from frontend sessions:
```json
{
  "permissions": { "...existing..." },
  "claudeMdExcludes": [
    "E:/Github/krisuryagroup/zitro-api/CLAUDE.md"
  ]
}
```

**When doing backend work:** Open Claude from `zitro-api/` directly — the exclusion won't apply
and the full backend doc loads normally.

**Result after all 3 docs:** ~300 lines per frontend session (down from ~1,270). **76% reduction.**

---

## Part B — Page-by-Page UI Task System

### Task List (in user-journey order)

| Task | Page | Size | Primary APIs | Key Risk |
|------|------|------|-------------|----------|
| **UI-001** | Splash Screen | S | none | Animation, routing timing |
| **UI-002** | Auth — Sign In + OTP | M | Firebase Phone Auth | OTP timer, error states, resend |
| **UI-003** | Auth — Sign Up | S | `POST /api/users/profile` | Post-OTP profile creation |
| **UI-004** | Location Selection | S | Geocoding | GPS permission flow, edge cases |
| **UI-005** | Home Page | L | `/api/businesses/nearby`, `/api/tags`, `/api/businesses/{slug}/banners` | Tag filtering, tab theming, banner carousel |
| **UI-006** | Category / Menu Listing | L | `/api/businesses/{slug}/menu`, `/api/categories` | Product grid, veg filter, add-to-cart |
| **UI-007** | Product Search | M | `/api/search` or `/api/businesses/{slug}/search` | Debounced input, empty state, results |
| **UI-008** | Cart Page | L | Local state + `/api/businesses/{slug}/config` | Pricing breakdown, coupon badge, COD only |
| **UI-009** | Coupon Selection | M | `GET /api/coupons` | Apply/remove, validation messages |
| **UI-010** | Addresses — List | M | `GET /api/users/addresses` | Default badge, select for delivery, delete |
| **UI-011** | Addresses — Add/Edit | M | `POST/PUT /api/users/addresses` | Form validation, `houseAndStreet` field name |
| **UI-012** | Order Confirmation | M | `GET /api/orders/{orderId}` | Success animation, order summary, CTA |
| **UI-013** | Order History | M | `GET /api/orders` | Status chips, pagination, reorder CTA |
| **UI-014** | Order Tracking | L | `GET /api/orders/{orderId}`, Firebase Realtime DB | Live status timeline, delivery map |
| **UI-015** | Account / Profile | M | `GET/PUT /api/users/profile` | Edit flow, phone read-only, avatar upload |
| **UI-016** | Contact Us | S | `GET /api/businesses/{slug}` | Phone, WhatsApp, hours |

**Not in list (deprioritized):** Game 2048 (rewards backend needed first)

---

### Size Definitions

| Size | Scope | Stages run | Typical calendar |
|------|-------|-----------|-----------------|
| **S** | Polish/static — no new APIs | 0, 2, 3, 4, 5 | 1 session |
| **M** | 1–2 API integrations + layout | All 5 | 1–2 sessions |
| **L** | Complex state, 3+ APIs, full layout | All 5 + extra iteration loops | 2–3 sessions |

---

### What You Provide Per Task

| Item | Required? | When |
|------|-----------|------|
| UI design image / mockup | **Required** | At task start or before |
| Priority order across pages | Optional | Now (or default to journey order) |
| Confirmation if API is missing | **Required when Claude flags** | During Stage 0 |
| Any business rule not in code | When Claude asks | During Stage 0 |

**You never need to provide:** component structure, service wiring, API URLs, Angular patterns —
Claude derives all of these from existing code.

---

### API Verification Rule (Hard)

During Stage 0, Claude checks the Postman collection at:
`E:/Github/krisuryagroup/zitro-api/ZITRO-API.postman_collection.json`

If an API endpoint needed for the page does **not exist** in the collection:
- Claude **stops** and tells you exactly which endpoint is missing
- Claude does **not** implement the frontend UI until you confirm the backend is ready or
  confirm a workaround (mock data, skip the feature, etc.)
- This prevents building against phantom APIs

---

### Changes Scope — Strict Boundary

**Will change (UI tasks):**
- `apps/apps/zitro-customer/src/app/features/<page>/` — component files
- `apps/libs/ui/src/components/` — shared components if needed
- `apps/libs/services/src/` — API service additions only if endpoint exists
- `apps/libs/i18n/src/defaults/en.ts` — new string keys

**Will NOT change without explicit flag + your confirmation:**
- `zitro-api/` — any backend change (Claude tells you the gap and waits)
- Database schema — Claude describes what's needed, you decide
- `zitro-app/` — live Play Store app, never touched
- `zitro-jobs/` — legacy jobs, frozen

---

## Execution Order

**Phase 1 — Doc Cleanup (one-time, do first):**
DOC-001 → DOC-002 → DOC-003

**Phase 2 — Core Commerce (highest impact):**
UI-005 → UI-006 → UI-008 → UI-012 → UI-014

**Phase 3 — Auth + Account:**
UI-002 → UI-003 → UI-015 → UI-010 → UI-011

**Phase 4 — Supporting Pages:**
UI-004 → UI-007 → UI-009 → UI-013 → UI-016 → UI-001

**Phase 5 — Testing (after you manually verify all pages above):**
TEST-001 → TEST-002

---

## Part C — Testing Phase (After Manual Verification of All Pages)

> **Trigger:** Start this phase only after you've manually tested all UI-001–UI-016 pages
> and are satisfied with the behaviour. No tests are written during UI development.

**Goal:** After this phase, any future small code change requires only `npm run finalize:affected`
— no manual testing needed. A regression is caught automatically.

---

### TEST-001 — Unit + Integration Tests
**Scope:** Every service, component, and mapper in `apps/libs/` + `apps/apps/zitro-customer/`

**Framework:** Vitest (already configured in the monorepo)

**What gets tested:**

| Target | What to verify |
|--------|---------------|
| `@zitro/mappers` | Every mapper function — DTO in → domain model out, null/missing field handling |
| `@zitro/services` API services | HTTP calls fire with correct URL, headers (`Authorization`, `X-Business-Id`), and payload |
| `@zitro/services` cart/state | Cart add/remove/update quantity, pricing totals, coupon application |
| `@zitro/ui` components | Inputs render correctly, outputs emit on interaction, loading/empty/error states |
| Guards (`AuthGuard`, `locationGuard`) | Redirect behaviour for unauthenticated and no-location states |
| Interceptors | Auth token attached, X-Business-Id attached, error codes mapped to toasts |

**Test data source:** `@zitro/test-data` builders (already exists) — never inline objects in tests.
**MSW handlers** mock all API calls — no real network in unit tests.

**File convention:** `*.spec.ts` next to each source file.

**Done when:** `npx nx test zitro-customer --coverage` passes, coverage ≥ 80% on services + mappers.

---

### TEST-002 — Acceptance / E2E Tests (Critical User Journeys)
**Framework:** Playwright (already configured at `apps/apps/zitro-customer-e2e/`)

**Philosophy:** Cover the journeys a real user would take. One broken scenario = one failing test.
Each test is independent — no shared state between tests.

**Critical journeys to cover:**

| Test ID | Journey | Covers |
|---------|---------|--------|
| E2E-01 | Guest opens app → sees location prompt → grants GPS → lands on home | Splash, location gate, home load |
| E2E-02 | User enters phone → receives OTP → verifies → lands on home logged in | Full auth flow |
| E2E-03 | Browse home → select business type tab → filter by cuisine tag → see business cards | Home page filtering |
| E2E-04 | Open business menu → browse category → add item to cart → cart count updates | Menu + cart add |
| E2E-05 | Cart → apply valid coupon → discount reflected → remove coupon → price resets | Coupon flow |
| E2E-06 | Cart → proceed → select saved address → place COD order → see confirmation | Full order placement |
| E2E-07 | Order confirmation → tap track → see status timeline | Order tracking |
| E2E-08 | Account → edit name → save → see updated name | Profile edit |
| E2E-09 | Addresses → add new address → set as default → appears first in list | Address management |
| E2E-10 | Search "pizza" → results appear → add item from search → cart updates | Search + cart |
| E2E-11 | Open app with saved session → go directly to home (no re-login) | Auth persistence |
| E2E-12 | Add item → navigate away → return to cart → item still present | Cart persistence |

**`data-testid` attributes:** All interactive elements must have `data-testid` added during UI tasks
(Stage 2). E2E selectors use only `data-testid` — never CSS class or text.

**Done when:** All 12 journeys pass on `npx nx e2e zitro-customer-e2e` against a running dev server
with the backend API available (or MSW intercepts in place).

---

## Build Verification (every UI task, every stage)

```bash
# From apps/ root:
npx nx build zitro-customer --configuration=production
# Must pass: zero TypeScript errors, zero budget violations (2MB warn / 5MB error)
```

Full pipeline (before any PR, and after TEST phase):
```bash
npm run finalize:affected
```