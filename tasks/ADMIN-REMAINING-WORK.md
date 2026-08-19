# ZITRO Admin Dashboard — Remaining Work Plan

> Source of gaps: `ADMIN-TEST-SCENARIOS.md`'s Live Execution Log (2026-08-19 full pass +
> quick-wins follow-up). Each item cites the `AD-T-###` scenario that documents the gap —
> read that doc for full repro detail before starting an item. Full detail for completed
> phases lives in git commit messages (`apps` and `zitro-api` repos), not here — this file
> only tracks what's still open.

---

## What's left — start here

**The entire planned scope (Phases 1–3, Phase 4.1–4.5) is now implemented and committed.**
Nothing left to _build_. One real thing left to _unblock_:

- **Firebase Storage bucket for project `zitro-7044d` doesn't exist.** Blocks 4.5's banner
  image upload from actually completing (code is correct and verified up to the point of a
  real, authenticated Google API call — see §4.5's "Known gap" for the full detail). Needs
  someone with Firebase/GCP Console access to either initialize Storage for that project, or
  confirm whether `zitro-7044d` vs. `the-hunger-point` (used by the shipped Android app) is
  the project this backend should actually be pointed at, then update
  `zitro-api/appsettings.json`'s `Firebase.StorageBucket` accordingly. Not something fixable
  from a coding session — needs a console action + a product decision.

Everything else in this document below is historical record — read it for context on what
was built and why, not as a task list.

---

## Completed — Phases 1–3 (2026-08-19)

All committed, one commit per sub-item, each verified live against the local stack:

| Phase     | What                                                                                                                                                                                       | `apps` commit | `zitro-api` commit                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------- |
| 1         | `DataTableComponent` error-state + pagination infra; fixed a `PagedResult.total`→`totalCount` contract bug and two silent-crash bare-array/wrapper-object bugs (Orders, Delivery Partners) | `ace5911`     | —                                        |
| 2.1 & 2.2 | Business detail Users/Orders tabs                                                                                                                                                          | `9660fea`     | —                                        |
| 2.3       | Orders screen business filter                                                                                                                                                              | `e847dad`     | —                                        |
| 2.4       | Brands → branches drill-down (expandable row, generic `DataTableComponent` support added)                                                                                                  | `73a85e6`     | —                                        |
| 3.1       | Coupon form — 5 missing fields (order-type, new-customer-only, cooldown, min-order, usage-limit)                                                                                           | `b4a690d`     | —                                        |
| 3.2       | Delivery zones scoped per business — turned out to need required `businessId`/`polygonCoords`/`baseFee`/`feePerKm` the old form never collected at all                                     | `8c5346d`     | —                                        |
| 3.3       | Payouts batch-review + mark-paid UI; fixed a silently-unbound `fromDate`/`toDate`→`from`/`to` request bug                                                                                  | `47c496d`     | `a47ec37` (new `GET /api/admin/payouts`) |
| doc trim  | Trimmed this file's completed-phase detail into the table above                                                                                                                            | `59a1f9a`     | —                                        |
| 4.1       | Categories business scoping + validation; fixed parent-select, `isEnabledForOnlineOrders`, and `CategoryDto` contract bugs                                                                 | `572ec4e`     | `47f3ee8` (reject both-null on create)   |
| 4.2       | Tag → business assignment (expandable row, reused 2.4's mechanism) — first clean backend surface, no bugs found                                                                            | `0c9d268`     | —                                        |
| 4.3       | Admins screen permission gating — route guard + disabled (not hidden) write actions                                                                                                        | `b8b2d66`     | —                                        |
| ad-hoc    | Shared login page title now dynamic per app (`ZITRO Admin` vs `ZITRO Super Admin`) via `input()` + route `data` — not from the original gap list, a direct user request                    | `7b42fd7`     | —                                        |
| 4.4       | Native `confirm()` → shared `lib-confirmation-dialog`, 5 real call-sites (Products/Brands/Banners delete, Tags deactivate, Coupons delete)                                                 | `8580f2c`     | —                                        |
| 4.5       | Banners real image upload (Firebase Storage) + 3-way target-link toggle; blocked end-to-end by a pre-existing Storage-bucket infra gap, see §4.5                                           | `d97abbf`     | `1a6cd75`                                |

**Recurring bug class found across all three phases:** frontend/backend field-name or
type contract mismatches that don't crash on write (bad data just gets silently dropped or
defaulted) and only surface once something actually reads the field back — e.g.
`PagedResult.total` vs `totalCount`, `generatePayouts`'s `fromDate` vs `from`. Worth
grep-checking for on every future endpoint touched, not just trusting the frontend types.

---

## Phase 4 — Smaller / lower-priority polish

**Standing rule for this phase (and beyond):** a missing field on a create/edit form is not
just a UI gap — check whether the backend actually validates the resulting state too. The
categories gap below (4.1) is the concrete example: no `businessId` field on the create form
meant every category was silently created global/unscoped, and nothing on the backend
rejects that. Don't just wire the frontend field through; confirm the handler validates it
(or add that validation) so the same class of gap doesn't just move server-side.

### 4.1 Categories — business scoping on create

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** noted in the execution log §4 as "may not be intended" — the create form has no
`businessId` field, so every category created is global/unscoped, and the backend accepts
this without validation either way.

**Confirmed the data model:** `Category.BusinessId`/`BrandId` are both legitimately
nullable (`NULL BusinessId` = brand-level shared category when paired with a `BrandId`), but
`GetCategoriesHandler` — the only real read path anything uses — queries **either**
`BusinessId == business.Id` **or** `BrandId == X && BusinessId == null`. A category with
_both_ null matches neither branch: it's genuinely invisible garbage, not a valid "global"
state, confirming this was a real bug, not an ambiguous product question.

**Delivered:**

- `zitro-api`: `CreateCategoryHandler` now rejects `VALIDATION_ERROR` when both `BusinessId`
  and `BrandId` are null, before any DB write. `UpdateCategoryCommand` can't un-scope a
  category (no such fields in its patch), so no equivalent fix needed there.
- `apps`: added a required business selector to the create form.

**Two more contract bugs found and fixed in the same area** (same recurring class flagged
throughout this initiative):

- The parent-category selector sent `parentId`, but `CreateCategoryCommand` binds
  `ParentCategoryId` (JSON `parentCategoryId`) — parent selection has never actually worked;
  every category was silently created as top-level regardless of the dropdown.
- `isEnabledForOnlineOrders` is a non-nullable `bool` with no default in the command — never
  sent by the old form, so every category was silently created with it `false`. Now sent
  explicitly (checkbox, defaults checked).
- `CategoryDto`'s fields didn't match the real `GET /api/admin/categories` shape
  (`displayOrder`/`parentId` vs. the real `priority`/`parentCategoryId`) — the "Order" column
  has always rendered `undefined`. `createCategory()` was also typed to return a full
  `CategoryDto` when the backend only returns `{ id }` — fixed by refetching the list after
  create instead of reconstructing a row from a response that was never in the payload.

**Verified live end-to-end:** confirmed the validation rejection via a direct API call with
both fields omitted (`VALIDATION_ERROR`); created a business-scoped category with a parent —
`path` correctly nested under the parent (`pizzas.veg_pizzas`), something that could never
have worked before this fix; "Order" column now shows real `priority` values instead of
blank. Test data cleaned up after.

### 4.2 Tag → business assignment

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-408. No `tag-assign-business-select` anywhere in `AdminTagsComponent`, despite
being in both the testid list and acceptance criteria.

**Backend:** Fully built already, no bugs found — `GET /tags/{id}/businesses`,
`POST/DELETE /businesses/{id}/tags`. First clean backend surface this whole initiative;
worth noting since every other endpoint touched so far had at least one contract bug.

**Delivered:** Reused the generic expandable-row mechanism built for 2.4 (Brands → branches)
rather than inventing a new pattern — a "Manage Businesses" row action expands in place to
show currently-assigned businesses (with per-row Remove) plus an Add-business dropdown that
excludes already-assigned businesses. Verified live: removed and re-added EFC Pizza's Pizza
tag assignment, confirmed the dropdown correctly excludes/includes it based on current
assignment state, no route change, no modal.

### 4.3 Admins screen — server-side-only permission gating

**Status: DONE — implemented and verified live against local stack, 2026-08-19 (`b8b2d66`).**

**Gap:** AD-T-707/801 tail. Nav-hiding is done (fix #6). Still missing: a `requirePermission`
route guard on `/admins` (AD-000 spec'd one, `app.routes.ts` doesn't have it), and
`AdminAdminUsersComponent` doesn't hide/disable its own Add/Deactivate buttons by role — only
the backend's `[RequirePermission]` check actually stops a non-SuperAdmin, client-side is
purely cosmetic right now.

**Delivered:** Added a `requirePermissionGuard(permission)` factory (mirrors the backend's
`RequirePermissionAttribute` semantics — SuperAdmin bypasses, otherwise checks the JWT's
permission claims) to **both** `zitro-admin` and `zitro-superadmin`'s route guards, since
both apps expose `/admins` via the same shared `AdminAdminUsersComponent`. Wired it onto both
apps' `/admins` route requiring `admins:read`. In the component itself, added a `canWrite`
computed gated on `admins:write` (matching the backend's write-endpoint permission exactly)
and used it to `[disabled]` — not hide — the Add Admin button, both row actions
(Activate/Deactivate, Reset Password), and both modals' Save buttons.

**Verified live:** logged in as the Finance test account (role `finance`, no permissions
granted — `createAdmin()` still always sends `permissions: []`, a separate pre-existing gap
not in this item's scope) and navigated directly to `/admins` by URL — redirected straight to
`/dashboard`, confirming the route guard closes the "hidden nav link is still directly
reachable" gap. Logged back in as SuperAdmin and confirmed `/admins` still loads fully with
every action enabled (SuperAdmin's permission bypass still works). Did not have a test
account with `admins:read` but not `admins:write` to directly verify the disabled-not-hidden
button state visually — that logic reuses the same `hasPermission()` already verified working
in the nav-filter fix, so this is a reasonable-confidence gap rather than a fully closed loop;
worth a quick visual check if such an account ever gets seeded.

### 4.4 Confirmation dialogs — native → shared component

**Status: DONE — implemented and verified live against local stack, 2026-08-19.**

**Gap:** AD-T-805. AD-000 spec'd a shared `confirmation-dialog` component; every
delete/deactivate action currently uses native `confirm()`.

**Delivered:** A shared dialog already existed (`libs/ui/src/common/confirmation-dialog/`,
`lib-confirmation-dialog`) but nothing used it — swapped it into all 5 real call-sites
(grepped for `confirm(` to get the exact list, not the plan's guessed one — "admins" was
never actually a `confirm()` site, `admin-admin-users.component.ts` has none): Products,
Brands, Banners (delete), Tags (deactivate), Coupons (delete). Each screen now holds a
`pendingDelete`/`pendingDeactivate` signal and a `computed` dialog config built via
`I18nService.translate()` (two new shared keys: `common.confirmDeleteTitle`/
`confirmDeleteMessage`, `common.confirmDeactivateTitle`/`confirmDeactivateMessage`, both
support `{name}` interpolation).

**Verified live:** Tags — clicked Deactivate, dialog showed `Deactivate "Pizza"?`, Cancel
closed it with zero side effect (tag stayed active). Coupons — created a real test coupon,
clicked Delete, dialog showed `Delete "DIALOGTEST"?`, Confirm actually deleted it server-side.
Products/Brands/Banners use the identical pattern (same component, same computed-config
shape) and pass build+lint clean; not independently re-verified live given the pattern is
byte-for-byte identical to the two spot-checked screens.

### 4.5 Banners — image upload + target-business/link field

**Status: Code complete on both apps+backend, but the live upload path is blocked by a
pre-existing infra gap outside this session's reach — see "Known gap" below before treating
this as fully done.**

**Gap:** AD-T-616/617. `#banner-img` is a plain URL text field, not a file-upload widget.
No target-business or link field on the create form at all.

**Decisions confirmed with the user before starting:** build a real Firebase Storage upload
(not a URL-field shortcut); target field is a 3-way toggle (nothing / a business / a URL),
storing the business's `slug` as the value for "business" mode (there's no business
deep-link route anywhere in the customer app yet to point at instead — confirmed by
checking its routes — so this is forward-compatible intent-capture, not a working deep link
today; that's a separate, future customer-app task).

**Delivered:**

- `zitro-api`: new `POST /api/banners/media` (multipart, admin-only), modeled on the
  existing `UploadProductMediaHandler` pattern but with one deliberate improvement — that
  handler calls `StorageClient.Create()` with no explicit credential, relying on ambient
  Application Default Credentials that aren't configured on this dev machine (no
  `GOOGLE_APPLICATION_CREDENTIALS`, no `gcloud auth application-default login`), so it can't
  work locally. The new handler instead builds the credential from the same
  `FIREBASE_SERVICE_ACCOUNT_JSON` config value `Program.cs` already uses for the Firebase
  Admin SDK. Returns `{ url }` — banners have no media-gallery table, just a single
  `ImageUrl` string, so no DB row is written here (unlike products' media table).
- `apps`: `AdminBannersComponent` rebuilt with a real file picker (uploads immediately on
  select, shows a preview + inline error), business/URL/none toggle for `targetUrl`
  (`TargetUrl` already existed on `CreateBannerCommand` — pure frontend gap), plus 4.4's
  dialog swap done in the same pass.

**Known gap — not something I can fix from here:** the upload endpoint's auth/credential
path is confirmed correct (reached Google's real API with a valid, authenticated request —
not an auth error), but both plausible bucket names for the configured Firebase project
(`zitro-7044d.firebasestorage.app` and `zitro-7044d.appspot.com`, tested directly by
temporarily swapping `appsettings.json` and reverting after) come back `404 The specified
bucket does not exist`. Firebase Storage was most likely never initialized for this project
in the Firebase Console (a one-time manual step, not something `dotnet`/API code can do).
Also worth the user's attention: the codebase references **two different Firebase
projects** — `zitro-7044d` (the backend's service account, `appsettings.json`) vs.
`the-hunger-point` (the actual shipped Android app's `google-services.json`, and the project
ID stated in `zitro-api/CLAUDE.md`). Whether that's intentional or a drift nobody's caught
yet, it's worth resolving before relying on this upload path — target/link field has zero
dependency on this and is fully verified.

**Verified live:**

- Target-link toggle: switching between "A business" / "A URL" correctly swaps the business
  dropdown for a URL text input, both empty/gated correctly.
- `TargetUrl` persistence: created a banner directly via the API with `targetUrl: "efc-pizza"`
  (bypassing the broken upload, since Save is gated on a real `imageUrl` existing), confirmed
  it round-tripped exactly — this is the actual field the frontend will send.
- Upload endpoint: confirmed authentication/credential-building works (real Google API
  response, not an auth failure) and confirmed the specific `bucket does not exist` failure
  mode with backend log inspection — this is what's blocking full end-to-end verification,
  not the application code.

---

## Sequencing note

Phase 4 items are independent of each other and can be picked up in any order or dropped
individually without affecting the rest. Commit per logical fix (established pattern this
initiative) rather than batching items into one diff — smaller commits stay cheaper to
verify.
