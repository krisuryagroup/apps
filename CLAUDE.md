# ZITRO Apps — Monorepo Context for Claude

> **Workspace root:** `E:/Github/krisuryagroup/apps/`

---

## ALWAYS READ THIS BEFORE MAKING ANY CHANGES

This is an **Nx monorepo** containing all frontend applications and shared libraries for the ZITRO platform.

---

## Task Reference Files

| File                         | When to read                                                              |
| ---------------------------- | ------------------------------------------------------------------------- |
| `tasks/UI-STATUS.md`         | Before any UI task — status board for all page tasks                      |
| `tasks/UI-TASKS.md`          | Full spec, APIs, acceptance criteria for UI-001–UI-016, TEST-001–TEST-002 |
| `tasks/STATUS.md`            | Legacy T-task status board (T001–T042 infrastructure tasks — mostly done) |
| `ZITRO-APPS-ARCHITECTURE.md` | Deep implementation details                                               |

**Current status:** Phase 1 (MT001–MT018) complete. T tasks (library/component evolution) complete. Now on UI page tasks.

---

## Platform at a Glance

### Applications

| App                | Platform                 | Purpose                             |
| ------------------ | ------------------------ | ----------------------------------- |
| `zitro-customer`   | Android + Web            | Customer food ordering              |
| `zitro-restaurant` | Android + Web            | Restaurant partner — orders, menu   |
| `zitro-delivery`   | Android                  | Delivery partner app                |
| `zitro-pos`        | Android tablet + Web     | POS for restaurant cashiers         |
| `zitro-admin`      | Web                      | Admin dashboard                     |
| `zitro-superadmin` | Web                      | Config, feature flags, translations |
| `zitro-jobs`       | Firebase Cloud Functions | Background jobs                     |

### Shared Libraries

| Library     | Import path          | Purpose                                                   |
| ----------- | -------------------- | --------------------------------------------------------- |
| models      | `@zitro/models`      | TypeScript interfaces — single source of truth            |
| mappers     | `@zitro/mappers`     | API DTOs + mapper functions                               |
| utils       | `@zitro/utils`       | Validators, formatters, geo helpers                       |
| theme       | `@zitro/theme`       | CSS custom property tokens, ThemeService                  |
| i18n        | `@zitro/i18n`        | I18nService, I18nPipe, EN default strings                 |
| services    | `@zitro/services`    | Firebase Auth/Storage/FCM + .NET API services             |
| ui          | `@zitro/ui`          | All shared components, directives, pipes                  |
| test-data   | `@zitro/test-data`   | JSON fixtures + typed builders + MSW handlers (test-only) |
| jobs-shared | `@zitro/jobs-shared` | FCM helpers + internal API client (jobs-only)             |

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

apps/angular/*     → any @zitro/* except @zitro/jobs-shared
apps/zitro-jobs    → @zitro/models, @zitro/jobs-shared
```

**Violations are build errors.** Never bypass Nx boundary checks.

---

## Key Files — Always Check Before Changing

### Workspace-level

| File                 | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `nx.json`            | Nx version (22.6.4), target caching, plugin config        |
| `tsconfig.base.json` | Path aliases for all `@zitro/*` libs                      |
| `package.json`       | All dependencies — never upgrade versions without testing |
| `eslint.config.mjs`  | Workspace lint rules + Nx boundary enforcement            |

### zitro-customer app

| File                                                       | Purpose                                           |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `apps/zitro-customer/src/app/app.config.ts`                | Angular providers: Firebase, HTTP, initializers   |
| `apps/zitro-customer/src/app/app.routes.ts`                | All routes + guards                               |
| `apps/zitro-customer/src/environments/environment.ts`      | Dev config — `apiUrl: 'http://localhost:8080'`    |
| `apps/zitro-customer/src/environments/environment.prod.ts` | Prod config — `apiUrl: 'https://api.zitroapp.in'` |
| `apps/zitro-customer/src/styles.scss`                      | Global styles + theme import                      |

---

## Coding Rules (T tasks — Phase 2)

**Angular**

- Standalone components only — no NgModules
- Signal inputs: `input()` / `output()` / `model()` — never `@Input()` / `@Output()`
- Control flow: `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor`
- Inject via `inject()` function — never constructor injection
- All services: `providedIn: 'root'` unless explicitly scoped

**Components — Config Object Pattern**

```typescript
export interface ProductCardConfig {
  layout: 'grid' | 'list';
  showAddButton: boolean;
}
export const PRODUCT_CARD_DEFAULT_CONFIG: ProductCardConfig = {
  layout: 'grid',
  showAddButton: true,
};
// config = input<ProductCardConfig>(PRODUCT_CARD_DEFAULT_CONFIG);
```

**Mapper Pattern — Services Never Read DTOs Directly**

```typescript
getProducts(slug: string): Observable<Product[]> {
  return this.http.get<ProductDto[]>(`/api/...`)
    .pipe(map(dtos => CatalogMapper.toProductList(dtos)));
}
```

**i18n — No hardcoded user-visible strings**

```html
<button>{{ 'buttons.addToCart' | i18n }}</button>
```

All keys must exist in `@zitro/i18n/defaults/en.ts`.

**Testing**

- Unit tests: Vitest — `*.spec.ts` next to source
- Integration tests: Vitest + MSW — `*.integration.spec.ts`
- E2E: Playwright — in `apps/*-e2e/`
- `data-testid` attributes only — never CSS selectors in tests
- Test data: always from `@zitro/test-data` builders — never inline objects
- `@zitro/test-data` is never imported in application source code

---

## Commands Reference

| Command                     | What it does                                                                 |
| --------------------------- | ---------------------------------------------------------------------------- |
| `npm run finalize`          | Full pipeline: lint → unit → integration → secret scan → audit → E2E → build |
| `npm run finalize:affected` | Same but only affected projects — run on every PR                            |
| `nx test <project>`         | Run unit tests for one project                                               |
| `nx lint <project>`         | Lint one project                                                             |
| `nx build <project>`        | Build one project                                                            |
| `nx serve zitro-customer`   | Start dev server                                                             |

---

## Backend API Reference

- **Base URL (dev):** `http://localhost:8080`
- **Base URL (prod):** `https://api.zitroapp.in`
- **Auth:** Firebase JWT in `Authorization: Bearer <token>` header (injected by `AuthInterceptor`)
- **Business context:** `X-Business-Id: <slug>` header (injected by `BusinessIdInterceptor`)
- **Full API spec:** `E:/Github/krisuryagroup/zitro-api/ZITRO-API.postman_collection.json`

---

## Task Workflow

Say **"start task UI-005"** → Claude reads `tasks/UI-TASKS.md`, audits the current page,
checks `zitro-api/ZITRO-API.postman_collection.json` for APIs, reports current state + gaps,
waits for your design image + confirmation before writing any code.

Say **"start task TEST-001"** or **"start task TEST-002"** → reads testing task from `tasks/UI-TASKS.md`.

Branch naming: `feature/UI-005-home-page`
Commit format: `feat: UI-005 — Home page design implementation`
Update status in `tasks/UI-STATUS.md` as part of every task PR.

---

## What NOT to Do

- **Do NOT touch** `zitro-api/` — backend; flag if an API is missing, wait for confirmation
- **Do NOT touch** `zitro-jobs/` — legacy jobs, frozen
- **Do NOT bundle multiple tasks into one PR**
- **Do NOT skip `npm run finalize:affected`** before pushing
- **Do NOT commit secrets** — `.env` files, API keys, Firebase config with real values
- **Do NOT use `@Input()` / `@Output()` decorators** — signals only
- **Do NOT hardcode user-visible strings** — all text via i18n
- **Do NOT import `@zitro/test-data`** in application source files
- **Do NOT use NgModules** — standalone only

---

## API Contracts Quick Reference

> These are the critical contracts between frontend and backend. Field names are FROZEN — changing
> them breaks the app. Source: `zitro-api/CLAUDE.md` sections 5–11.

### Auth Token Flow

1. Angular → `POST /api/auth/send-otp` (API calls Fast2SMS)
2. Angular → `POST /api/auth/verify-otp` → returns Firebase custom token
3. Angular exchanges custom token for Firebase ID token
4. All API calls: `Authorization: Bearer {firebase_id_token}`

### OrderStatus — exact strings (enum serialized as lowercase)

```
pending | confirmed | preparing | ready | shipped | delivered | completed | cancelled
```

### Address Field Names (FROZEN)

```typescript
houseAndStreet: string; // NOT addressLine, NOT street, NOT address
town: string; // NOT city
```

DB column: `house_and_street` | JSON: `houseAndStreet`

### Error Response Format

```json
{ "error": "ERROR_CODE", "message": "Human readable", "traceId": "abc-123" }
```

426 Upgrade Required adds: `"minimumVersion": "1.0.3"`

### PricingConfig Shape (from `GET /api/businesses/{slug}/config`) — FROZEN

```json
{
  "currency": "INR",
  "delivery": {
    "enabled": true,
    "apply": true,
    "base_fee": 40,
    "free_delivery_above": 249
  },
  "platform_fee": { "enabled": true, "apply": false, "flat_fee": 5 },
  "packaging": {
    "enabled": true,
    "apply": false,
    "default_fee": 10,
    "type": "flat"
  },
  "gst": { "enabled": true, "apply": false, "food_percent": 5 },
  "rounding": { "enabled": true, "type": "nearest_rupee" }
}
```

### OrderCharges Structure (stored as JSONB, returned in OrderDto)

```typescript
{
  packagingCharges: { calculated: number; applied: number; waived: number; }
  platformFee:      { calculated: number; applied: number; waived: number; }
  gst:              { calculated: number; applied: number; waived: number; percentage: number; }
  deliveryCharge?:  { calculated: number; applied: number; waived: number; }
  couponDiscount?:  { code: string; amount: number; }
}
```

### Order ID Format

`ORD` + last 8 digits of epoch ms + 4 random digits. Example: `ORD123456789012`
Angular uses display ID for all API calls — internal UUID is never exposed.

### ⚠️ DTO field names are NOT verified against the backend by type-checking alone

Found live 2026-08-21: `ProductDto` (in `admin-api.service.ts`) declared `basePrice`/
`isAvailable`, but `GET /api/products/search` actually returns `price`/
`isEnabledForOnlineOrders` — TypeScript happily compiled it, and the admin Products
table rendered "₹undefined" and a permanent ✗ for every row. Same class of bug hit
`BusinessSummaryDto` (missing `menuMode`/`brandId`, which the backend `BusinessDto`
already returned) and `BusinessProfileDto` (same, for the business-portal profile GET).
**Whenever you add or trust a response-shape interface for a _read_ endpoint, verify the
actual field names against the C# DTO record (or a live curl), not just against what
compiles.** These mismatches don't error — they silently render `undefined`.

### Brand / multi-branch admin + business-portal UI (added 2026-08-21)

See `zitro-api/CLAUDE.md` → "Businesses module" → "Brand / multi-branch architecture"
for the full backend picture (brand master catalog, branch_item_overrides, the
promote-to-brand-master migration). Frontend pieces:

- `AdminBusinessEditComponent` (`libs/admin-ui/src/business-edit`) — Brand + Menu Mode
  fields, and a "Promote Menu to Brand Master" action (shown only for an
  independent-mode business that has a brand selected).
- `AdminBusinessesComponent`'s Invite Partner form — Brand picker; also reads a
  `?brandId=` query param so the Brands page's "+ Add Branch" link can pre-select it.
- `AdminBrandsComponent`'s branches panel — "+ Add Branch" (links to
  `/businesses?brandId=X`) and a per-branch "Promote to Master" action.
- `SharedMenuComponent` (`apps/zitro-restaurant/.../features/menu/shared-menu.component.ts`)
  — shown by `RestaurantMenuComponent` instead of the normal product-CRUD table whenever
  the logged-in business's `menuMode === 'shared'`. Lets the branch owner set a price
  override, hide an item, or mark it unavailable per brand-master product; it cannot
  create/edit/delete master products directly (that's an admin action, at the brand
  level, via the existing admin Products screen with `brandId` set and no `businessId`).
- **No frontend unit tests exist yet** for any of the components above, or for their
  pre-existing siblings in the same directories (`admin-businesses.component.ts`,
  `admin-brands.component.ts`, `menu.component.ts`) — none of them had a `.spec.ts` file
  before this feature either. Backend coverage lives in
  `zitro-api/tests/Zitro.UnitTests/Businesses/`.
