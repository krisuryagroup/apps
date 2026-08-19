# ZITRO Admin Dashboard — Remaining Work Plan

> Source of gaps: `ADMIN-TEST-SCENARIOS.md`'s Live Execution Log (2026-08-19 full pass +
> quick-wins follow-up). Each item cites the `AD-T-###` scenario that documents the gap —
> read that doc for full repro detail before starting an item. Full detail for completed
> phases lives in git commit messages (`apps` and `zitro-api` repos), not here — this file
> only tracks what's still open.

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

**Gap:** AD-T-707/801 tail. Nav-hiding is done (fix #6). Still missing: a `requirePermission`
route guard on `/admins` (AD-000 spec'd one, `app.routes.ts` doesn't have it), and
`AdminAdminUsersComponent` doesn't hide/disable its own Add/Deactivate buttons by role — only
the backend's `[RequirePermission]` check actually stops a non-SuperAdmin, client-side is
purely cosmetic right now.

**Scope:** Add the route guard; disable (not just hide) write actions in the component based
on the same `hasPermission()` logic already added to `AdminApiService` in fix #6.

### 4.4 Confirmation dialogs — native → shared component

**Gap:** AD-T-805. AD-000 spec'd a shared `confirmation-dialog` component; every
delete/deactivate action currently uses native `confirm()`.

**Scope:** Build/reuse a shared dialog component, swap into tags/coupons/products/banners/
brands/admins delete-deactivate actions. Cosmetic — no functional gap — but also blocks clean
Playwright coverage later (native dialogs need `page.on('dialog')` handling).

### 4.5 Banners — image upload + target-business/link field

**Gap:** AD-T-616/617. `#banner-img` is a plain URL text field, not a file-upload widget.
No target-business or link field on the create form at all.

**Scope:** (a) image upload — needs a storage/upload endpoint decision (Firebase Storage?
existing media upload pattern elsewhere in the app?) before UI work starts. (b) link/target
field — straightforward form field addition once the intended behavior (link to a business
page vs. arbitrary URL) is confirmed.

---

## Sequencing note

Phase 4 items are independent of each other and can be picked up in any order or dropped
individually without affecting the rest. Commit per logical fix (established pattern this
initiative) rather than batching items into one diff — smaller commits stay cheaper to
verify.
