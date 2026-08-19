# Claude + Copilot — Parallel Work Plan

> **Goal:** move fast across `zitro-restaurant`, `zitro-admin`, `zitro-superadmin` using both
> Claude Code and GitHub Copilot at the same time, without either breaking the other's work.
>
> **Core principle:** split by _portal_ (each app's source tree is physically separate under
> Nx), keep _shared code_ (libs, backend) on one hand only, and never run two agents against
> the same file at the same time. Details below.

---

## Why the split is "backend + novel features = Claude, mechanical CRUD = Copilot" — not 50/50

Two things I found this session justify this specific split, not just intuition:

1. **The `BusinessPortalController` IDOR bug** (TASK-031, already fixed) existed because two
   independent implementations of the same feature (`GetBusinessOrders`/`UpdateOrderStatus`)
   were built in two different modules by two different efforts that didn't share context —
   one got the ownership check right, one didn't, and they silently collided on the same
   route. That is _exactly_ the failure mode of splitting backend work across two AI tools
   with no shared memory of the codebase's conventions (vertical-slice modules, MediatR,
   `Result<T>`, the ownership-check pattern, `IOptions<T>` config, cache-key conventions,
   the module-isolation rules in `zitro-api/CLAUDE.md` §19). One codebase, one set of hands.
2. **Frontend CRUD screens are the opposite risk profile** — once `AD-000`'s shared
   `data-table`/`form-builder`/`sidebar-nav` components exist and the API is fully ready
   (most of `zitro-admin` already is), a coupon-management screen or a tags-management screen
   is genuinely mechanical: copy the pattern from an already-built screen, wire the existing
   endpoint, done. Low complexity, low blast radius if imperfect, easy to review at a glance.
   This is where a second tool adds real throughput without real risk.

---

## Phase 0 — Foundation (Claude only, sequential, do not parallelize)

Everything below is a dependency for something else. Splitting this phase is what would cause
breakage, so it stays single-threaded regardless of who's available.

**Backend (`zitro-api`):**

- TASK-031 — done
- TASK-032 — KYC/bank fields
- TASK-039 — partner application + admin invite (needs the email-infra decision from you —
  see the card for the provider question)
- TASK-033 — self-service profile/menu/staff
- TASK-034 — dashboard stats
- TASK-038 — AI menu import (the most novel piece — stays with Claude even after Phase 0,
  see Track A below)
- TASK-035, TASK-037 — small, can slot in anywhere in Phase 0
- TASK-036 — largest pending card (~2 days), can start in Phase 0 or run into Phase 1 in
  parallel with frontend Track A/B since nothing else depends on it finishing first

**Frontend scaffolding:**

- RS-000 (`zitro-restaurant` Nx app)
- AD-000 (`zitro-admin` Nx app **+** the shared admin-ui component library — `data-table`,
  `sidebar-nav`, `stat-card`, `form-builder`. This is the one piece every single Track B/C
  task depends on, so it must be fully done and stable before any Copilot task in those
  tracks starts)
- SA-000 (`zitro-superadmin` Nx app — depends on AD-000)
- DEP-001 (Firebase Hosting multi-site setup — small, unblocks nothing code-wise but good to
  get out of the way early so every subsequent task can deploy-and-check as it lands)

**Once Phase 0 is done, the three portals become genuinely independent file trees and can run
in parallel.**

---

## Phase 1+ — Parallel Tracks

### Track A — `zitro-restaurant` (Claude-heavy — this is where the flagship feature lives)

| Owner                | Tasks                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude**           | RS-002, RS-002b, RS-003 (new invite/KYC backend + frontend, coordinate together) · RS-007 (menu CRUD — do first since RS-008 builds on its data model) · RS-008, RS-009, RS-010 (AI import + bulk import + clone — novel, keep together) · RS-015, RS-016 (self-service profile/staff — touches the ownership-check pattern from TASK-031, keep with the person who fixed it) |
| **Copilot**          | RS-001 (login — trivial, good first Copilot task to validate the workflow) · RS-004 (dashboard, once TASK-034 lands) · RS-005, RS-006 (orders — API fully ready, well-specified) · RS-011, RS-012, RS-013 (inventory/zones/ratings — all API-ready, standard CRUD) · RS-014 (payouts, mostly read-only)                                                                       |
| **Either, low risk** | RS-017 (native FCM — pick whichever tool you're more comfortable driving Capacitor/Android testing with) · RS-018 (deploy — mechanical once DEP-001 exists)                                                                                                                                                                                                                   |

### Track B — `zitro-admin` (Copilot-heavy — this is the mechanical-CRUD portal)

| Owner       | Tasks                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude**  | AD-004 (KYC display + approve/reject — handles sensitive PAN/GST/bank data, keep the masking logic with the person who scoped TASK-032) · AD-010 (needs TASK-035 backend first, frontend can follow either way but I'd do it since it's new) · AD-019 (admin user management — permission-sensitive, and it's the shared component `zitro-superadmin` also uses, so keep implementation consistent) |
| **Copilot** | AD-002 (dashboard) · AD-003 (businesses list + invite-partner form) · AD-005 (business edit) · AD-006 (brands) · AD-007 (tags) · AD-008, AD-009 (products/categories) · AD-011 (users) · AD-012 (coupons) · AD-013 (cashback rules) · AD-014, AD-015 (delivery) · AD-016 (payouts) · AD-017 (subscription plans) · AD-018 (banners, once TASK-037 lands)                                            |
| **Either**  | AD-020 (deploy)                                                                                                                                                                                                                                                                                                                                                                                     |

**This is 13 of 19 `zitro-admin` tasks going to Copilot** — it's the best-suited portal for
it: every API is ready or nearly ready, and `AD-000`'s shared components give Copilot a
consistent pattern to follow for every single one.

### Track C — `zitro-superadmin` (thin app, mostly composition)

| Owner       | Tasks                                                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude**  | SA-003, SA-004, SA-005, SA-006 (feature flags/translations/themes/UI config — genuinely new UI patterns, not CRUD-shaped, and depend on TASK-036 which I'm also building) · SA-007 (analytics — needs judgment calls about what the backend can actually support) |
| **Copilot** | SA-001 (login — same pattern as RS-001/AD-001) · SA-002 (pure composition/routing of already-built AD-XXX components — zero new logic)                                                                                                                            |
| **Either**  | SA-008 (deploy)                                                                                                                                                                                                                                                   |

---

## How to keep three parallel streams from breaking each other

1. **One task = one branch = one PR**, same convention already used for the customer app
   (`feature/UI-005-home-page`, commit `feat: UI-005 — ...`). Use `feature/RS-011-inventory`,
   `feature/AD-012-coupons`, etc. Never let Copilot and Claude work directly on the same
   branch at the same time.
2. **Git worktrees for concurrent sessions** — if you want me actively working on, say,
   RS-008 while Copilot works on AD-012 _at the same moment_, run them in separate worktrees
   (`git worktree add ../zitro-root-rs008 feature/RS-008-ai-import`) rather than both pointed
   at the same working directory. Avoids any "whose uncommitted change is this" confusion.
3. **Shared libs are frozen after Phase 0**, except through Claude. If a Track B/C Copilot
   task seems to need a change to `@zitro/ui`, `@zitro/theme`, `@zitro/i18n`, `@zitro/models`,
   `@zitro/mappers`, or `@zitro/services` — stop, don't let Copilot edit those directly, flag
   it back so the shared-lib change happens once, deliberately, and both tracks rebase onto
   it. This is the single highest-risk conflict point, precisely because it's the one place
   two portals' work actually touches the same files.
4. **Merge small and often.** Each finished AD-XXX/RS-XXX task should merge to `main`
   individually (matches the existing "one task = one PR" rule already in `apps/CLAUDE.md`)
   rather than batching several before merging — keeps every other in-flight branch's rebase
   cheap.
5. **Backend stays single-threaded through Claude**, full stop, for the reason in the section
   above. If you want to try Copilot on a backend task anyway to compare, do it on a
   throwaway branch off a task with zero frontend dependents (e.g. AD-018's small
   TASK-037), not on the critical-path items (TASK-032/033/038/039).

---

## What to literally paste into Copilot

General template — fill in the task ID and the "pattern to copy" reference:

```
Implement <TASK-ID> from apps/tasks/<ADMIN|RESTAURANT|SUPERADMIN>-TASKS.md in this repo.

Read the full task spec there first — size, API, expected behaviour, data-testid list,
acceptance criteria.

Follow these exactly:
- Standalone Angular components only, signal inputs/outputs (input()/output()/model()),
  @if/@for control flow — see apps/apps/zitro-customer for reference patterns, or
  <specific earlier AD-XXX/RS-XXX screen> if one already exists for the same pattern.
- All colors from @zitro/theme tokens (--zitro-*) — never a hardcoded hex value anywhere.
- All user-visible strings via @zitro/i18n — no hardcoded UI text.
- Use the shared components from <libs/ui/src/admin or @zitro/admin-ui, per AD-000> for
  tables/forms/nav — do not build a new data-table or form pattern from scratch.
- Services call the API through a mapper (@zitro/mappers) — never read DTO fields directly.
- Add every data-testid listed in the task spec.
- Do not modify anything under libs/ (shared libraries) — if the task seems to need a
  shared-lib change, stop and flag it instead of editing there.

Confirm nx build and nx lint pass before considering it done.
```

Two concrete examples:

**"Implement AD-012 from apps/tasks/ADMIN-TASKS.md. Coupons Management — full CRUD against
the already-ready `/api/admin/coupons` endpoints. Use AD-006 (Brands) as your pattern
reference since it's the same list+form CRUD shape. [...rest of template]"**

**"Implement RS-011 from apps/tasks/RESTAURANT-TASKS.md. Inventory Management — stock table +
adjust action against the already-ready `/api/business-portal/{businessId}/inventory*`
endpoints. [...rest of template]"**
