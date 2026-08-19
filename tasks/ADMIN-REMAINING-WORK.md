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

**Gap:** noted in the execution log §4 as "may not be intended" — the create form has no
`businessId` field, so every category created is global/unscoped, and the backend accepts
this without validation either way.

**Scope:** Confirm with `CreateCategoryCommand`/handler whether categories are meant to be
optionally global (shared taxonomy) or must always belong to a business — read the schema/
existing seeded data for intent rather than guessing. Add the `businessId` field to the
create form if scoping is the correct model, and add backend validation so an invalid or
inconsistent state (e.g. a category that should be scoped but isn't) can't be persisted
silently.

### 4.2 Tag → business assignment

**Gap:** AD-T-408. No `tag-assign-business-select` anywhere in `AdminTagsComponent`, despite
being in both the testid list and acceptance criteria.

**Scope:** Add an assign-to-business control (multi-select or per-business toggle list) on
the tag row/detail; confirm backend assignment endpoint exists before building UI for it.

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
