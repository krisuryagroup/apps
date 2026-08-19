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

| ID                      | Page / Feature                                            | Size | Status | Backend dependency                                                                                                                                    |
| ----------------------- | --------------------------------------------------------- | ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Foundation**          |                                                           |      |        |                                                                                                                                                       |
| RS-000                  | Scaffold `zitro-restaurant` Nx app + Capacitor config     | M    | `[x]`  | none — done: app builds/lints/tests clean, theme live, guards verified in browser                                                                     |
| **Onboarding**          |                                                           |      |        |                                                                                                                                                       |
| RS-001                  | Login                                                     | S    | `[x]`  | done — phone/password login, error states, apply link                                                                                                 |
| RS-002                  | Partner Application (public signup)                       | M    | `[x]`  | done — 3-step public application form; needs manual SQL + EMAIL_API_KEY for live end-to-end                                                           |
| RS-002b                 | Accept Admin Invite                                       | S    | `[x]`  | done — token validation + password set; same caveats as RS-002                                                                                        |
| RS-003                  | Onboarding / KYC Completion (FSSAI, GST, PAN, bank, docs) | L    | `[x]`  | done — status display + link to profile/KYC (RS-015)                                                                                                  |
| **Daily Operations**    |                                                           |      |        |                                                                                                                                                       |
| RS-004                  | Dashboard                                                 | M    | `[x]`  | done — stat cards (today orders/revenue/pending), quick links                                                                                         |
| RS-005                  | Live Orders Queue                                         | L    | `[x]`  | done — tabbed queue by status, accept/advance/reject with reason, real-time refresh via poll                                                          |
| RS-006                  | Order Detail                                              | M    | `[x]`  | done — line items, charges, customer, status timeline                                                                                                 |
| **Menu Management**     |                                                           |      |        |                                                                                                                                                       |
| RS-007                  | Menu — Category & Item List + Manual CRUD                 | L    | `[x]`  | done — category sidebar, item table, add/edit/delete both; AI import link                                                                             |
| RS-008                  | Menu Import — AI Photo/PDF Upload + Review & Approve      | XL   | `[x]`  | done — AI parse + review + commit; graceful fallback when flag disabled                                                                               |
| RS-009                  | Menu Import — Bulk Spreadsheet                            | M    | `[ ]`  | **not actually built** — no route or component exists (found while writing RESTAURANT-TEST-SCENARIOS.md); backend (RS-008's commit endpoint) is ready |
| RS-010                  | Menu — Clone from Branch/Brand                            | S    | `[ ]`  | **not actually built** — no route or component exists, not even a placeholder (found while writing RESTAURANT-TEST-SCENARIOS.md)                      |
| **Business Operations** |                                                           |      |        |                                                                                                                                                       |
| RS-011                  | Inventory Management                                      | M    | `[x]`  | done — stock table, adjust qty with reason, alerts list                                                                                               |
| RS-012                  | Delivery Zones                                            | M    | `[x]`  | done — zone list, add with base fee, delete                                                                                                           |
| RS-013                  | Ratings & Reviews                                         | S    | `[x]`  | done — review list with star rating, reply form                                                                                                       |
| RS-014                  | Payouts                                                   | M    | `[x]`  | done — payout history table                                                                                                                           |
| RS-015                  | Business Profile & Settings                               | M    | `[x]`  | done — editable profile with KYC fields, status display                                                                                               |
| RS-016                  | Staff Management                                          | M    | `[x]`  | done — staff list, add new staff with role                                                                                                            |
| **Platform**            |                                                           |      |        |                                                                                                                                                       |
| RS-017                  | Push Notifications (Android FCM order alerts)             | M    | `[ ]`  | verify device-token registration exists for business users — see task file                                                                            |
| RS-018                  | Firebase Hosting Deploy + `partners.zitro.in`             | S    | `[ ]`  | see `DEPLOYMENT-TASKS.md`                                                                                                                             |
| **Testing**             |                                                           |      |        |                                                                                                                                                       |
| RS-TEST-001             | Unit + Integration Tests                                  | —    | `[ ]`  | after all pages pass manual testing                                                                                                                   |
| RS-TEST-002             | E2E — critical partner journeys                           | —    | `[ ]`  | after RS-TEST-001                                                                                                                                     |

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

All backend-dependent tasks (originally blocked on zitro-api TASK-032/033/034/038/039) have
since been unblocked and implemented — see the table above; no `[!]` rows remain. Only
RS-017/018 (push notifications, Firebase Hosting deploy) and the RS-TEST-\* tasks are still
outstanding.
