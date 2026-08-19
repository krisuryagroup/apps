# Resume Prompt — paste this into a fresh Claude agent session (Copilot or otherwise)

I'm continuing work on the ZITRO platform. This workspace root
(`/Users/krishna/Documents/GitHub/zitro-root`) contains multiple separate git repos:
`apps/` (frontend Nx monorepo — zitro-customer, zitro-restaurant, zitro-admin,
zitro-superadmin), `zitro-api/` (backend), `zitro-jobs/` (legacy, do not touch).

Before doing anything:

1. Read `/Users/krishna/Documents/GitHub/zitro-root/CLAUDE.md`, then
   `apps/CLAUDE.md` and `zitro-api/CLAUDE.md` — these are the hard architectural rules
   for this codebase (module boundaries, coding conventions, what not to do).

2. Read the task tracking files to see exactly what's done vs pending:
   - `apps/tasks/RESTAURANT-STATUS.md`, `apps/tasks/ADMIN-STATUS.md`,
     `apps/tasks/SUPERADMIN-STATUS.md`, `apps/tasks/DEPLOYMENT-TASKS.md` —
     `[x]` = done, `[!]` = blocked on a backend task, `[ ]` = not started.
   - `zitro-api/TASK-STATUS.md` — same idea, `Status: Done` per task card. Each
     completed card has a "What actually shipped" section documenting any deviation
     from the original plan and why.
   - `apps/tasks/COLLABORATION-PLAN.md` — the overall phasing/ownership plan.

3. Run `git log --oneline -15` in both `apps/` and `zitro-api/` to see the most
   recent commits — each is scoped to one task, with the task ID in the message.

4. Run `git status` in both repos — if there's uncommitted work, that's a task that
   was mid-flight when the previous session ended. Read the diff to see how far it
   got before continuing it.

**Current state as of this handoff:** Phase 0 (backend APIs + all 3 new app scaffolds

- Firebase Hosting multi-site setup) is in progress. Check the status files above for
  the exact current picture — don't trust this paragraph, it goes stale immediately.

**Working conventions already established this session** (don't re-litigate, just
follow): commit after each completed task, directly to `main`, no PR — one task per
commit, clear message referencing the task ID. Every backend task must pass
`dotnet build --configuration Release /warnaserror` and `dotnet format
--verify-no-changes` before being considered done. Every frontend task must pass
`nx build`, `nx lint`, `nx test` for the affected project(s), and ideally a quick
visual check via a dev server before being marked done.

Continue from wherever the status files + git history say things left off.
