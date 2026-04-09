# ZITRO Apps — Monorepo Context for Claude

> **Workspace root:** `E:/Github/krisuryagroup/apps/`

---

## ALWAYS READ THIS BEFORE MAKING ANY CHANGES

This is an **Nx monorepo** containing all frontend applications and shared libraries for the ZITRO food-delivery platform.

The live customer app is at `E:/Github/krisuryagroup/zitro-app/` — **do NOT touch it**.

---

## Documents in This Folder — Read Order

| File | When to read |
|------|-------------|
| **`CLAUDE.md`** (this file) | Always — before any task |
| **`ROADMAP.md`** | Before starting any task — understand where we are in the sequence |
| **`MIGRATION-PLAN.md`** | For `MT` tasks — copying `zitro-app` into this monorepo |
| **`TASKS.md`** | For `T` tasks — evolving and building new features after migration |
| **`ZITRO-APPS-ARCHITECTURE.md`** | For deep implementation details — models, patterns, API specs, component specs |

---

## The Three-Phase Plan (read ROADMAP.md for full detail)

```
PHASE 1 — Migration (MT001–MT018)        PHASE 2 — Evolution (T007–T030)        PHASE 3 — New Apps (T031–T042)
─────────────────────────────────        ───────────────────────────────        ──────────────────────────────
Copy zitro-app into monorepo.            Evolve libs + components + pages.       Build restaurant, delivery,
App runs identically. No logic           Add patterns, .NET API, tests.          admin, POS, jobs apps.
changes. Firebase everywhere.            Gradual, one task at a time.
```

**Current starting point:** Phase 1 has not begun. `apps/` is empty except for planning documents.

**T001, T002, T003, T005 in TASKS.md are superseded** — migration handles them. Do not run those tasks separately.

---

## Platform at a Glance

### Applications

| App | Type | Platform | Purpose |
|-----|------|----------|---------|
| `zitro-customer` | Angular + Capacitor | Android + Web | Customer food ordering (migrated from `zitro-app`, then evolved) |
| `zitro-restaurant` | Angular + Capacitor | Android + Web | Restaurant partner — order management, menu management |
| `zitro-delivery` | Angular + Capacitor | Android | Delivery partner app |
| `zitro-pos` | Angular + Capacitor | Android tablet + Web | POS system for restaurant cashiers |
| `zitro-admin` | Angular | Web | Admin dashboard |
| `zitro-superadmin` | Angular | Web | Superadmin — config, feature flags, translations |
| `zitro-jobs` | Node.js | Firebase Cloud Functions | Background jobs — notifications, timeouts, reports |

### Shared Libraries

| Library | Import path | Type | Purpose |
|---------|-------------|------|---------|
| models | `@zitro/models` | Pure TS | TypeScript interfaces — single source of truth |
| mappers | `@zitro/mappers` | Pure TS | API DTOs + mapper functions (built in T004, after migration) |
| utils | `@zitro/utils` | Pure TS | Validators, formatters, geo helpers |
| theme | `@zitro/theme` | Angular | CSS custom property tokens, ThemeService |
| i18n | `@zitro/i18n` | Angular | I18nService, I18nPipe, EN default strings |
| services | `@zitro/services` | Angular | Firebase services (from migration) + .NET API services (added in T010) |
| ui | `@zitro/ui` | Angular | All shared components, directives, pipes |
| test-data | `@zitro/test-data` | Pure TS | JSON fixtures + typed builders + MSW handlers (test-only) |
| jobs-shared | `@zitro/jobs-shared` | Pure TS | FCM helpers + internal API client (jobs-only) |

---

## Dependency Rules — Enforced by Nx Tags

```
@zitro/models      → no internal deps
@zitro/mappers     → @zitro/models
@zitro/utils       → @zitro/models
@zitro/theme       → no internal deps
@zitro/i18n        → @zitro/models
@zitro/services    → @zitro/models, @zitro/mappers, @zitro/utils
@zitro/ui          → @zitro/models, @zitro/utils, @zitro/theme, @zitro/i18n
@zitro/test-data   → @zitro/models, @zitro/mappers
@zitro/jobs-shared → @zitro/models

apps/angular/*     → any @zitro/* except @zitro/jobs-shared
apps/zitro-jobs    → @zitro/models, @zitro/jobs-shared
```

**Violations are build errors.** Never bypass Nx boundary checks.

---

## Coding Rules — Two Sets

Rules differ between migration tasks (MT) and evolution tasks (T).

### During MT tasks (Phase 1 — Migration)

**One rule only: copy file → update import paths → nothing else.**

- Keep `@Input()` / `@Output()` decorators — do NOT convert to signals
- Keep `*ngIf` / `*ngFor` — do NOT convert to `@if` / `@for`
- Keep hardcoded strings — do NOT add i18n pipe
- Keep Firebase calls — do NOT add HTTP calls
- Keep all field names exactly as they are in `zitro-app`
- The only permitted change: `from '../../core/models/x'` → `from '@zitro/models'`

### During T tasks (Phase 2 — Evolution)

These rules apply when evolving or building new files:

**Angular**
- Standalone components only — no NgModules
- Signal inputs: `input()` / `output()` / `model()` — never `@Input()` / `@Output()`
- Control flow: `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor`
- Inject via `inject()` function — never constructor injection
- All services: `providedIn: 'root'` unless explicitly scoped

**Components — Config Object Pattern**
Every `@zitro/ui` component exposes a typed config interface:
```typescript
export interface ProductCardConfig {
  layout: 'grid' | 'list' | 'pos';
  showAddButton: boolean;
}
export const PRODUCT_CARD_DEFAULT_CONFIG: ProductCardConfig = {
  layout: 'grid', showAddButton: true,
};
// config = input<ProductCardConfig>(PRODUCT_CARD_DEFAULT_CONFIG);
```

**Mapper Pattern — Services Never Read DTOs Directly**
```typescript
// ✅ correct
getProducts(businessId: string): Observable<Product[]> {
  return this.http.get<ProductDto[]>(`/api/...`)
    .pipe(map(dtos => CatalogMapper.toProductList(dtos)));
}
```

**i18n**
- No hardcoded user-visible strings in templates or services
- Always use `I18nPipe`: `{{ 'key.path' | i18n }}`
- All keys must exist in `@zitro/i18n/defaults/en.ts`

**Testing**
- Unit tests: Vitest — `*.spec.ts` next to the source file
- Integration tests: Vitest + MSW — `*.integration.spec.ts`
- E2E tests: Playwright — in `apps/*-e2e/`
- `data-testid` attributes only — never CSS selectors in tests
- Test data: always from `@zitro/test-data` builders — never inline objects
- `@zitro/test-data` is never imported in application source code

**Security**
- No secrets in any source file
- `trufflehog` runs in pre-commit hook
- `audit-ci` runs on every PR

---

## The .NET API Transition Strategy (Phase 2)

After migration, `@zitro/services` has all Firebase services. The .NET API services are added alongside in T010, not as replacements. Feature pages switch over one at a time, controlled by `FeatureFlagService`:

```typescript
products$ = this.flags.isEnabled('use_dotnet_catalog')
  ? this.catalogApi.getProducts(this.businessId)   // .NET API (T010)
  : this.productsService.getProducts(this.businessId); // Firebase (migration)
```

Switch order (lowest to highest risk): catalog → coupons → addresses → orders.
Firebase Auth is never replaced — it stays forever.

---

## Commands Reference

| Command | What it does |
|---------|-------------|
| `npm run finalize` | Full pipeline: lint → unit → integration → secret scan → audit → E2E → build → bundle size |
| `npm run finalize:affected` | Same but only affected projects — run on every PR |
| `nx test <project>` | Run unit tests for one project |
| `nx lint <project>` | Lint one project |
| `nx build <project>` | Build one project |
| `nx graph` | Visual dependency graph in browser |
| `cd apps/zitro-jobs && firebase deploy --only functions` | Deploy Cloud Functions |

---

## Backend API Reference

- **Base URL (dev):** `http://localhost:5000`
- **Base URL (prod):** configured in environment
- **Auth:** Firebase JWT in `Authorization: Bearer <token>` header
- **Business context:** `X-Business-Id: <slug>` header (injected by `BusinessIdInterceptor`)
- **Full API spec:** `E:/Github/krisuryagroup/zitro-api/ZITRO-API.postman_collection.json`
- **Backend CLAUDE.md:** `E:/Github/krisuryagroup/zitro-api/CLAUDE.md`

---

## Three Businesses (hardcoded slugs — never change these)

| Slug | Name | Type | Pincode |
|------|------|------|---------|
| `hunger_point` | The Hunger Point | restaurant | 206244 |
| `efc-pizza` | EFC Pizza | restaurant | 209722 |
| `tularam-kirana-store` | Tularam Kirana Store | grocery | 209722 |

Firebase Project ID: `the-hunger-point`

---

## Task Workflow — How to Start a Task

When the user says **"start task MT008"** or **"start task T007"**:
- `MT` prefix → read `MIGRATION-PLAN.md`, find the task
- `T` prefix → read `TASKS.md`, find the task
- Always check `ROADMAP.md` to confirm the task's dependencies are done

### Step 1 — Identify the task
Open the correct file. Read:
- `Depends-on` — confirm all dependencies are `[x]`
- `Scope` — exact files to create or modify
- `Source` — what to copy from (for MT tasks)
- `Acceptance Criteria` — what must pass before PR

### Step 2 — Create a branch
```bash
git checkout main && git pull origin main
git checkout -b feature/MT008-customer-shell
# or
git checkout -b feature/T007-theme-evolution
```

### Step 3 — Implement
- Work through every file in `Scope`
- For MT tasks: copy + update import paths only
- For T tasks: follow evolution rules above
- Mark task `[~]` in the task file immediately

### Step 4 — Run checks
```bash
npm run finalize:affected
# Fix all failures before proceeding
```

### Step 5 — Commit
```bash
git add <specific files — never git add -A>
git commit -m "$(cat <<'EOF'
MT008: Bootstrap zitro-customer shell

- Copied app.config.ts, app.routes.ts, main.ts, styles.scss from zitro-app
- Updated capacitor.config.ts webDir to new dist path
- App serves at localhost with placeholder routes

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Step 6 — Update task status + push + PR
```bash
# Update status in MIGRATION-PLAN.md or TASKS.md: [~] → [x]
git push -u origin feature/MT008-customer-shell

gh pr create \
  --title "MT008: Bootstrap zitro-customer shell" \
  --body "$(cat <<'EOF'
## Task
MT008 — Bootstrap apps/zitro-customer shell

## Summary
- Copied app shell files from zitro-app
- Updated webDir in capacitor.config.ts
- nx serve zitro-customer works

## Test plan
- [ ] nx serve zitro-customer starts without error
- [ ] nx build zitro-customer produces dist folder
- [ ] MIGRATION-PLAN.md MT008 marked done

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

### PR Rules
- One PR per task — never bundle
- PR title: `MT008: <title>` or `T007: <title>`
- Always update task status file in the same PR
- Never push directly to `main`

---

## What NOT to Do

**Always:**
- **Do NOT touch** `E:/Github/krisuryagroup/zitro-app/` — live Play Store app
- **Do NOT touch** `E:/Github/krisuryagroup/zitro-api/` — unless implementing T042 API endpoints
- **Do NOT bundle multiple tasks into one PR**
- **Do NOT skip `npm run finalize:affected`** before pushing
- **Do NOT commit secrets** — `.env` files, API keys, Firebase config with real values

**During MT tasks only:**
- **Do NOT rename fields** — copy them exactly as they are
- **Do NOT convert patterns** — keep `@Input()`, `*ngIf`, hardcoded strings
- **Do NOT add new logic** — only import path changes are allowed

**During T tasks only:**
- **Do NOT use `@Input()` / `@Output()` decorators** — signals only
- **Do NOT hardcode user-visible strings** — all text via i18n
- **Do NOT import `@zitro/test-data`** in application source files
- **Do NOT import `@zitro/jobs-shared`** in Angular app source files
- **Do NOT use NgModules** — standalone only
