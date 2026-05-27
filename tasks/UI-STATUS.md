# ZITRO Customer — UI Task Status Board

> **How to use:** Say "start task UI-005" — Claude will audit the current page, check the Postman
> collection for APIs, report gaps, and wait for your confirmation before writing any code.
>
> **Design required:** Share a design image/mockup at task start. No task proceeds without a design.
>
> **Scope boundary:** UI tasks touch `apps/` only. Any missing API or DB change is flagged and
> waits for your confirmation before proceeding.
>
> **Task detail file:** `tasks/UI-TASKS.md` — full spec, API list, acceptance criteria per task.
>
> **Implementation protocol (every task):**
> Stage 0 Audit → Stage 1 Scaffold → Stage 2 Style → Stage 3 Browser Validation → Stage 4 Functional Check → Stage 5 Handoff

---

## Status Legend

| Symbol | Meaning                                          |
| ------ | ------------------------------------------------ |
| `[ ]`  | Not started                                      |
| `[~]`  | In progress                                      |
| `[x]`  | Done — approved by you after screenshot sign-off |
| `[!]`  | Blocked — missing API or design                  |

---

## UI Tasks — Page by Page

| ID                   | Page                    | Size | Status | Design? | Notes                                                                                |
| -------------------- | ----------------------- | ---- | ------ | ------- | ------------------------------------------------------------------------------------ |
| **Core Commerce**    |                         |      |        |         |                                                                                      |
| UI-005               | Home Page               | L    | `[x]`  | ✅ Done | Mockup approved → `UI-mockups/UI-005-home-page.html`. T1–T8 sub-tasks in UI-TASKS.md |
| UI-006               | Category / Menu Listing | L    | `[x]`  | ✅ Done | Product grid, veg filter, add-to-cart                                                |
| UI-008               | Cart Page               | L    | `[x]`  | ✅ Done | Pricing breakdown, coupon badge, COD                                                 |
| UI-012               | Order Confirmation      | M    | `[x]`  | ✅ Done | Success state, order summary, track CTA                                              |
| UI-014               | Order Tracking          | L    | `[x]`  | ✅ Done | Status timeline, delivery location                                                   |
| **Auth + Account**   |                         |      |        |         |                                                                                      |
| UI-002               | Auth — Sign In + OTP    | M    | ` [x]` | ✅ Done | OTP timer, error states, resend                                                      |
| UI-003               | Auth — Sign Up          | S    | `[x]`  | ✅ Done | Post-OTP profile creation                                                            |
| UI-015               | Account / Profile       | M    | `[x]`  | ✅ Done | Edit name, phone read-only, avatar                                                   |
| UI-010               | Addresses — List        | M    | `[x]`  | ✅ Done | Default badge, select for delivery, delete                                           |
| UI-011               | Addresses — Add/Edit    | M    | `[x]`  | ✅ Done | Form, `houseAndStreet` field                                                         |
| **Supporting Pages** |                         |      |        |         |                                                                                      |
| UI-004               | Location Selection      | S    | `[x]`  | ✅ Done | GPS flow, saved addresses, edge cases                                                |
| UI-007               | Product Search          | M    | `[x]`  | ✅ Done | Debounced input, results, empty state                                                |
| UI-009               | Coupon Selection        | M    | `[x]`  | ✅ Done | List, apply, validation messages                                                     |
| UI-013               | Order History           | M    | `[x]`  | ✅ Done | Status chips, pagination, reorder CTA                                                |
| UI-016               | Contact Us              | S    | `[x]`  | ✅ Done | Phone, WhatsApp, hours                                                               |
| UI-001               | Splash Screen           | S    | `[x]`  | ✅ Done | Logo, animation, routing timing                                                      |

---

## Testing Phase (after you manually verify all pages above)

| ID       | Title                                         | Status | Trigger                                |
| -------- | --------------------------------------------- | ------ | -------------------------------------- |
| TEST-001 | Unit + Integration Tests                      | `[ ]`  | After all UI tasks pass manual testing |
| TEST-002 | Acceptance / E2E Tests (12 critical journeys) | `[ ]`  | After TEST-001 passes                  |

---

## Recommended Execution Order

```
Phase 1 (Core Commerce — highest impact):
  UI-005 → UI-006 → UI-008 → UI-012 → UI-014

Phase 2 (Auth + Account):
  UI-002 → UI-003 → UI-015 → UI-010 → UI-011

Phase 3 (Supporting Pages):
  UI-004 → UI-007 → UI-009 → UI-013 → UI-016 → UI-001

Phase 4 (Testing — after manual verification of all above):
  TEST-001 → TEST-002
```
