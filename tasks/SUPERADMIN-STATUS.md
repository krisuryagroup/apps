# ZITRO Super Admin — Task Status Board

> **How to use:** same audit-then-confirm workflow as the other apps.
>
> **This app is thin by design.** Everything in `ADMIN-TASKS.md` (AD-002 through AD-019) is
> built once as shared components (per `ADMIN-STATUS.md`'s shared-component strategy) and
> composed here too — a `SuperAdmin`-role login sees the full admin feature set _plus_ the
> superadmin-only screens below. Do not rebuild AD-002…AD-019 a second time from scratch here;
> SA-002 is a composition task, not a new-build task.
>
> **App not yet scaffolded.** SA-000 must run before any other task, and depends on AD-000
> having created the shared admin-ui component location first.

---

## Status Legend

Same as the other status boards.

---

## Tasks

| ID          | Page / Feature                                                      | Size | Status | Backend dependency                                                                                                                                         |
| ----------- | ------------------------------------------------------------------- | ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SA-000      | Scaffold `zitro-superadmin` Nx app                                  | M    | `[x]`  | done — app builds/lints/tests clean, sidebar shows all AD-\* + SA-003..006 nav, verified in browser                                                        |
| SA-001      | Login                                                               | S    | `[x]`  | done — shared `AdminLoginComponent` in `@zitro/admin-ui`, email/password, invalid-credentials vs deactivated-account error states, all `data-testid` attrs |
| SA-002      | Compose shared admin screens (AD-002…AD-019) into this app's routes | M    | `[ ]`  | depends on the corresponding AD-XXX tasks being built                                                                                                      |
| SA-003      | Feature Flags Management                                            | M    | `[ ]`  | zitro-api TASK-036 done ✓ backend ready                                                                                                                    |
| SA-004      | Translations Management                                             | L    | `[ ]`  | zitro-api TASK-036 done ✓ backend ready                                                                                                                    |
| SA-005      | Theme Management                                                    | M    | `[ ]`  | zitro-api TASK-036 done ✓ backend ready                                                                                                                    |
| SA-006      | Per-App UI Config Management                                        | M    | `[ ]`  | zitro-api TASK-036 done ✓ backend ready                                                                                                                    |
| SA-007      | Platform Analytics (extended)                                       | M    | `[ ]`  | base data ready via AD-002; extended breakdowns may need new queries — assess at task start                                                                |
| SA-008      | Firebase Hosting Deploy + `console.zitro.in`                        | S    | `[ ]`  | see `DEPLOYMENT-TASKS.md`                                                                                                                                  |
| SA-TEST-001 | Unit + Integration Tests                                            | —    | `[ ]`  | after all pages pass manual testing                                                                                                                        |
| SA-TEST-002 | E2E — critical superadmin journeys                                  | —    | `[ ]`  | after SA-TEST-001                                                                                                                                          |

---

## Recommended Execution Order

```
Phase 0: SA-000 → SA-001 → SA-002
Phase 1 (the only genuinely new feature set here): SA-003 → SA-004 → SA-005 → SA-006
Phase 2: SA-007
Phase 3: SA-008
Phase 4 (testing): SA-TEST-001 → SA-TEST-002
```

**Everything in Phase 1 is blocked on `zitro-api` TASK-036**, which is the largest of the
pending backend tasks (~2 days per its card) since it's genuinely new — new tables
(`app_translations`, `app_feature_flags`, `app_ui_configs`, `app_themes`), not just exposing
existing columns like TASK-032. Realistically this is the last piece of the three-app buildout
to land, and that's fine — nothing else depends on it.
