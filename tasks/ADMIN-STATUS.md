# ZITRO Admin Dashboard — Task Status Board

> **How to use:** Say "start task AD-005" — same audit-then-confirm workflow as the customer
> and restaurant apps. Check `zitro-api/ZITRO-API.postman_collection.json` +
> `zitro-api/TASK-STATUS.md` first.
>
> **Users:** platform Ops / Support / Finance roles (see `AdminRole` enum in `zitro-api`).
> `SuperAdmin` role also logs into this app for the day-to-day admin screens — the
> superadmin-only screens (feature flags, translations, themes, platform config) live in the
> separate `zitro-superadmin` app, see `SUPERADMIN-TASKS.md`.
>
> **Shared components strategy:** every screen below should be built as a reusable component
> in a new shared location (`libs/ui/src/admin/` or a new `@zitro/admin-ui` lib — decide at
> AD-000) so `zitro-superadmin` composes the same components instead of rebuilding 19 admin
> screens a second time. Build once here, import there.
>
> **App not yet scaffolded.** AD-000 must run before any other task.

---

## Status Legend

Same as `RESTAURANT-STATUS.md`: `[ ]` not started, `[~]` in progress, `[x]` done/approved, `[!]` blocked.

---

## Tasks

| ID                      | Page / Feature                                                                                              | Size | Status | Backend dependency                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ---- | ------ | -------------------------------------------------------------------------------------------------------------- |
| **Foundation**          |                                                                                                             |      |        |                                                                                                                |
| AD-000                  | Scaffold `zitro-admin` Nx app + shared admin-ui components (data-table, sidebar-nav, stat-card, form-field) | L    | `[x]`  | none — done: @zitro/admin-ui built (4 components, 8 passing tests), app + layout + sidebar verified in browser |
| AD-001                  | Login                                                                                                       | S    | `[ ]`  | `POST /api/admin/auth/login` — ready                                                                           |
| **Overview**            |                                                                                                             |      |        |                                                                                                                |
| AD-002                  | Dashboard                                                                                                   | M    | `[ ]`  | ready (`GET /api/admin/dashboard`)                                                                             |
| **Business Management** |                                                                                                             |      |        |                                                                                                                |
| AD-003                  | Businesses — List/Search + Invite Partner                                                                   | M    | `[!]`  | list is ready; invite action needs zitro-api TASK-039 (pending)                                                |
| AD-004                  | Business Detail + Approve/Reject Onboarding                                                                 | L    | `[!]`  | KYC field display needs zitro-api TASK-032                                                                     |
| AD-005                  | Business — Edit                                                                                             | M    | `[!]`  | zitro-api TASK-032 (KYC/bank fields)                                                                           |
| AD-006                  | Brands Management                                                                                           | M    | `[ ]`  | ready                                                                                                          |
| AD-007                  | Tags Management                                                                                             | S    | `[ ]`  | ready                                                                                                          |
| **Catalog**             |                                                                                                             |      |        |                                                                                                                |
| AD-008                  | Products — Global Catalog                                                                                   | L    | `[ ]`  | ready, incl. bulk import + media                                                                               |
| AD-009                  | Categories — Global                                                                                         | M    | `[ ]`  | ready, incl. bulk                                                                                              |
| **Orders & Users**      |                                                                                                             |      |        |                                                                                                                |
| AD-010                  | Order Oversight / Cross-Business Search                                                                     | M    | `[!]`  | zitro-api TASK-035 (pending, new)                                                                              |
| AD-011                  | Users — List/Detail/Block                                                                                   | M    | `[ ]`  | ready                                                                                                          |
| **Commercial**          |                                                                                                             |      |        |                                                                                                                |
| AD-012                  | Coupons Management                                                                                          | M    | `[ ]`  | ready                                                                                                          |
| AD-013                  | Cashback Rules                                                                                              | M    | `[ ]`  | ready                                                                                                          |
| AD-014                  | Delivery Partners Management                                                                                | M    | `[ ]`  | ready                                                                                                          |
| AD-015                  | Delivery Zones — Global Admin                                                                               | S    | `[ ]`  | ready                                                                                                          |
| AD-016                  | Payouts — Generate/Mark Paid                                                                                | M    | `[ ]`  | ready                                                                                                          |
| AD-017                  | Subscription Plans                                                                                          | M    | `[ ]`  | ready                                                                                                          |
| AD-018                  | Banners Management                                                                                          | M    | `[!]`  | zitro-api TASK-037 (pending — list/delete missing)                                                             |
| **Admin Ops**           |                                                                                                             |      |        |                                                                                                                |
| AD-019                  | Admin Users Management (SuperAdmin-gated)                                                                   | M    | `[ ]`  | ready, permission-gated already                                                                                |
| **Platform**            |                                                                                                             |      |        |                                                                                                                |
| AD-020                  | Firebase Hosting Deploy + `admin.zitro.in`                                                                  | S    | `[ ]`  | see `DEPLOYMENT-TASKS.md`                                                                                      |
| **Testing**             |                                                                                                             |      |        |                                                                                                                |
| AD-TEST-001             | Unit + Integration Tests                                                                                    | —    | `[ ]`  | after all pages pass manual testing                                                                            |
| AD-TEST-002             | E2E — critical admin journeys                                                                               | —    | `[ ]`  | after AD-TEST-001                                                                                              |

---

## Recommended Execution Order

```
Phase 0: AD-000 → AD-001 → AD-002
Phase 1 (business oversight — unblocks restaurant-app onboarding review): AD-003 → AD-004 → AD-005
Phase 2 (catalog, shared with brands): AD-006 → AD-007 → AD-008 → AD-009
Phase 3 (orders/users): AD-010 → AD-011
Phase 4 (commercial): AD-012 → AD-013 → AD-014 → AD-015 → AD-016 → AD-017 → AD-018
Phase 5 (admin ops): AD-019
Phase 6 (platform): AD-020
Phase 7 (testing): AD-TEST-001 → AD-TEST-002
```

**AD-004 is on the critical path for RS-003** — a restaurant partner's KYC submission has
nowhere to be reviewed until AD-004 exists. Recommend prioritizing AD-000 → AD-004 if
`zitro-restaurant` onboarding is the near-term goal.
