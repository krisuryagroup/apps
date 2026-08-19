# ZITRO Restaurant Partner Portal — Task Status Board

> **How to use:** Say "start task RS-005" — Claude will audit any existing code, check
> `zitro-api/ZITRO-API.postman_collection.json` + `zitro-api/TASK-STATUS.md` for the API this
> screen needs, report gaps, and wait for confirmation before writing code.
>
> **Design required:** Share a design image/mockup at task start, same as the customer app
> workflow. No task proceeds without a design (except where noted "no design needed").
>
> **Scope boundary:** these tasks touch `apps/zitro-restaurant` and shared libs only. Any
> missing/incomplete backend API is flagged and waits for confirmation — see the "Backend"
> column below, which points at the `zitro-api/TASK-STATUS.md` card that unblocks it.
>
> **Task detail file:** `tasks/RESTAURANT-TASKS.md` — full spec, API list, acceptance criteria.
>
> **App not yet scaffolded.** RS-000 (Nx app generation) must run before any other task.

---

## Status Legend

| Symbol | Meaning                                   |
| ------ | ----------------------------------------- |
| `[ ]`  | Not started                               |
| `[~]`  | In progress                               |
| `[x]`  | Done — approved after screenshot sign-off |
| `[!]`  | Blocked — missing API/design/decision     |

---

## Tasks

| ID                      | Page / Feature                                            | Size | Status | Backend dependency                                                                |
| ----------------------- | --------------------------------------------------------- | ---- | ------ | --------------------------------------------------------------------------------- |
| **Foundation**          |                                                           |      |        |                                                                                   |
| RS-000                  | Scaffold `zitro-restaurant` Nx app + Capacitor config     | M    | `[x]`  | none — done: app builds/lints/tests clean, theme live, guards verified in browser |
| **Onboarding**          |                                                           |      |        |                                                                                   |
| RS-001                  | Login                                                     | S    | `[ ]`  | `POST /api/business-auth/login` — ready                                           |
| RS-002                  | Partner Application (public signup)                       | M    | `[ ]`  | zitro-api TASK-039 done — needs manual SQL + EMAIL_API_KEY before live end-to-end |
| RS-002b                 | Accept Admin Invite                                       | S    | `[ ]`  | zitro-api TASK-039 done — same caveat as RS-002                                   |
| RS-003                  | Onboarding / KYC Completion (FSSAI, GST, PAN, bank, docs) | L    | `[ ]`  | zitro-api TASK-032 done — ready                                                   |
| **Daily Operations**    |                                                           |      |        |                                                                                   |
| RS-004                  | Dashboard                                                 | M    | `[ ]`  | ready — zitro-api TASK-034 done                                                   |
| RS-005                  | Live Orders Queue                                         | L    | `[ ]`  | ready (`BusinessOrdersController`)                                                |
| RS-006                  | Order Detail                                              | M    | `[ ]`  | ready (`GetOrderDetail`)                                                          |
| **Menu Management**     |                                                           |      |        |                                                                                   |
| RS-007                  | Menu — Category & Item List + Manual CRUD                 | L    | `[ ]`  | ready — zitro-api TASK-033 done                                                   |
| RS-008                  | Menu Import — AI Photo/PDF Upload + Review & Approve      | XL   | `[!]`  | zitro-api TASK-038 (pending, new)                                                 |
| RS-009                  | Menu Import — Bulk Spreadsheet                            | M    | `[ ]`  | ready — zitro-api TASK-033 done (reuses RS-007/RS-008 commit endpoint)            |
| RS-010                  | Menu — Clone from Branch/Brand                            | S    | `[ ]`  | ready (`GetBranches`, needs copy endpoint — see task file)                        |
| **Business Operations** |                                                           |      |        |                                                                                   |
| RS-011                  | Inventory Management                                      | M    | `[ ]`  | ready                                                                             |
| RS-012                  | Delivery Zones                                            | M    | `[ ]`  | ready                                                                             |
| RS-013                  | Ratings & Reviews                                         | S    | `[ ]`  | ready                                                                             |
| RS-014                  | Payouts                                                   | M    | `[ ]`  | ready — bank details display needs zitro-api TASK-032 (done)                      |
| RS-015                  | Business Profile & Settings                               | M    | `[ ]`  | ready — zitro-api TASK-033 done                                                   |
| RS-016                  | Staff Management                                          | M    | `[ ]`  | ready — zitro-api TASK-033 done                                                   |
| **Platform**            |                                                           |      |        |                                                                                   |
| RS-017                  | Push Notifications (Android FCM order alerts)             | M    | `[ ]`  | verify device-token registration exists for business users — see task file        |
| RS-018                  | Firebase Hosting Deploy + `partners.zitro.in`             | S    | `[ ]`  | see `DEPLOYMENT-TASKS.md`                                                         |
| **Testing**             |                                                           |      |        |                                                                                   |
| RS-TEST-001             | Unit + Integration Tests                                  | —    | `[ ]`  | after all pages pass manual testing                                               |
| RS-TEST-002             | E2E — critical partner journeys                           | —    | `[ ]`  | after RS-TEST-001                                                                 |

---

## Recommended Execution Order

```
Phase 0 (Foundation):
  RS-000

Phase 1 (get a partner logged in and looking at orders — fastest path to value):
  RS-001 → RS-005 → RS-006

Phase 2 (onboarding — both entry paths):
  RS-002 → RS-002b → RS-003

Phase 3 (menu — the big one):
  RS-007 → RS-008 → RS-009 → RS-010

Phase 4 (remaining operations):
  RS-011 → RS-012 → RS-013 → RS-014 → RS-015 → RS-016

Phase 5 (platform):
  RS-017 → RS-018

Phase 6 (testing):
  RS-TEST-001 → RS-TEST-002
```

**9 of 19 tasks are `[!]` blocked on backend work that doesn't exist yet.** Nothing stops you
reviewing/approving the frontend specs now — the backend task cards they depend on are already
written in `zitro-api/TASK-STATUS.md` (TASK-032, TASK-033, TASK-034, TASK-038, TASK-039) and
can be implemented in parallel with frontend scaffolding of the non-blocked tasks.
