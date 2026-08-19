# ZITRO Super Admin — Task Definitions (SA-000 to SA-008 + TEST-001/002)

> **Read `SUPERADMIN-STATUS.md` first.** Same 5-stage protocol. **Auth:** Admin JWT, same
> login endpoint as `zitro-admin` — the app itself, not a different credential, is what scopes
> "superadmin" here; a non-SuperAdmin who somehow reaches this app's URL should see the shared
> AD-XXX screens but get 403s on SA-003…SA-006 the same way they would on any
> permission-gated action, since the backend enforces this regardless of which app calls it.

---

## SA-000 — Scaffold `zitro-superadmin` Nx App

**Size:** M | **Depends on:** AD-000 (shared admin-ui component location must exist first)

**What this delivers:**

- `nx g @nx/angular:app zitro-superadmin --directory=apps/zitro-superadmin` — web only.
- Same `app.config.ts` pattern as `zitro-admin` (admin-auth interceptor, `adminAuthGuard`,
  `requirePermission` guard).
- Imports the shared admin-ui lib created in AD-000 — this app should have very little
  original UI code of its own beyond SA-003…SA-006.

**Acceptance criteria:**

- [ ] `nx serve zitro-superadmin` runs, themed shell
- [ ] `nx build zitro-superadmin --configuration=production` passes clean
- [ ] `nx lint zitro-superadmin` passes; confirm it imports the shared admin-ui lib rather than duplicating any AD-XXX component

---

## SA-001 — Login

**Size:** S | Identical spec to AD-001 (same endpoint, same JWT). Reuse the component from
`zitro-admin` if the Nx boundary allows sharing app-level auth pages, or duplicate the thin
login page (login pages are usually fine to have per-app rather than shared, since they carry
almost no logic beyond calling the same service).

---

## SA-002 — Compose Shared Admin Screens

**Size:** M | **Depends on:** the relevant AD-XXX tasks in `ADMIN-TASKS.md` being built

**What this delivers:** route registrations in `zitro-superadmin` pointing at the same shared
components used by `zitro-admin` for AD-002 (Dashboard) through AD-019 (Admin Users). No new
component code — this task is pure composition + navigation/sidebar wiring so a SuperAdmin
logging into _this_ app sees the full admin feature set plus SA-003…SA-006.

**Acceptance criteria:**

- [ ] Every AD-002…AD-019 screen is reachable and functionally identical when accessed from `zitro-superadmin` vs `zitro-admin`
- [ ] No component code exists in `zitro-superadmin`'s own source for anything covered by an AD-XXX task — if it does, that's a sign AD-000's shared-lib boundary wasn't respected, fix before merging

---

## SA-003 — Feature Flags Management

**Size:** M | **Backend:** `zitro-api` TASK-036 (pending, new)

**APIs (new, per TASK-036):** `PUT /api/admin/feature-flags/{app}`, read side via
`GET /api/app-config`

**Expected behaviour:** per-app (`zitro-customer`, `zitro-restaurant`, `zitro-admin`, etc.),
per-platform (web/android) toggle list for feature flags. Toggle on/off, see which apps/users
are affected before saving (if the backend supports a dry-run or at least clearly documents
scope), save applies immediately (matches the 1-hour cache TTL noted in the architecture doc
§12 — mention the propagation delay in the UI so it's not mistaken for a bug).

`data-testid`: `flag-app-select`, `flag-list`, `flag-toggle-{key}`, `flag-save-btn`.

**Acceptance criteria:**

- [ ] Toggling a flag here is reflected on the target app within the documented cache TTL (verify end-to-end, not just that the API call succeeds)
- [ ] Flag list is scoped per app — toggling a `zitro-customer` flag never shows up under `zitro-restaurant`'s list

---

## SA-004 — Translations Management

**Size:** L | **Backend:** `zitro-api` TASK-036 (pending, new)

**APIs (new, per TASK-036):** `GET /api/translations`, `POST/DELETE /api/admin/translations`,
`GET /api/app-config/supported-languages`

**Expected behaviour:** language selector (initially just `en`, ready to add `hi` and others),
key-value editor for translation strings, grouped by the same key namespaces used in
`@zitro/i18n/defaults/en.ts` (e.g. `buttons.*`, `address.*`), search/filter by key or value,
add new language, bulk import (CSV/spreadsheet — same pattern as menu import's bulk path,
reuse that upload+preview+commit UX rather than inventing a third one), missing-translation
report (keys that exist in `en` but have no value in another active language).

`data-testid`: `lang-select`, `translation-search`, `translation-key-row`, `translation-value-input`, `translation-add-lang-btn`, `translation-bulk-import-btn`, `translation-missing-report`.

**Acceptance criteria:**

- [ ] Editing a key here and reloading the target app (any of the 4) shows the updated string within the documented cache TTL
- [ ] Missing-translation report is accurate against the real `en.ts` key set (verify this list is kept in sync — flag if `en.ts` keys and the DB-seeded key set can drift, since that's a real risk with two sources of truth)

---

## SA-005 — Theme Management

**Size:** M | **Backend:** `zitro-api` TASK-036 (pending, new)

**APIs (new, per TASK-036):** `POST/PUT /api/admin/themes`

**Expected behaviour:** list existing themes (the 4 built-in ones — default, dark, nature,
ocean — plus any DB-added ones), create a new theme by editing the same token set defined in
`@zitro/theme/src/tokens.scss` (color/typography/spacing/shape/elevation tokens), live preview
against a sample screen (reuse a simplified version of a real page, e.g. a product card +
button + input, not a full app embed) before saving, mark a theme as available per-app.

`data-testid`: `theme-list`, `theme-add-btn`, `theme-token-input-{tokenName}`, `theme-preview-pane`, `theme-save-btn`.

**Acceptance criteria:**

- [ ] New theme created here is selectable in any app's existing theme-picker component (`@zitro/ui/common/theme-picker`) without a frontend deploy
- [ ] Built-in themes (`is_built_in`) are read-only here, can't be edited/deleted — only DB-added custom themes can

---

## SA-006 — Per-App UI Config Management

**Size:** M | **Backend:** `zitro-api` TASK-036 (pending, new)

**APIs (new, per TASK-036):** `PUT /api/admin/ui-config/{app}`

**Expected behaviour:** the least-defined of the four new screens — scope depends on what
`app_ui_configs` actually needs to hold once TASK-036 is designed in detail (e.g. show/hide
specific home-page sections, configurable nav items). **Recommend deferring detailed design
of this screen until TASK-036's exact config shape is settled** rather than guessing a form
now — flag this back for a follow-up design pass.

**Acceptance criteria:** TBD pending TASK-036 design.

---

## SA-007 — Platform Analytics (Extended)

**Size:** M | **Backend:** base data via AD-002's `GET /api/admin/dashboard`; assess whether
deeper breakdowns (revenue by business over time, cohort retention, etc.) need new backend
queries at task start — don't assume, verify against what the dashboard endpoint actually
returns.

**Expected behaviour:** extends AD-002's dashboard with time-range selection, per-business
breakdown, export to CSV. If the existing endpoint can't support this, flag a new backend
task rather than building charts against data that isn't there.

`data-testid`: `analytics-date-range`, `analytics-business-breakdown`, `analytics-export-btn`.

**Acceptance criteria:**

- [ ] Every number shown ties back to a real backend field — no client-side-only aggregation invented to fill a gap without flagging it first

---

## SA-008 — Firebase Hosting Deploy

**Size:** S | See `DEPLOYMENT-TASKS.md` — `console.zitro.in`.

---

## SA-TEST-001 — Unit + Integration Tests

Same standard as the other apps. Since most screens are shared components already tested
under `zitro-admin`'s test suite, this app's own tests should focus on SA-003…SA-006 (the
genuinely new code) plus the composition/routing from SA-002, not re-test AD-XXX logic.

## SA-TEST-002 — E2E Critical Journeys

Minimum set: toggle a feature flag → visible on target app; edit a translation key → visible
on target app; create a custom theme → selectable on customer app's theme picker.
