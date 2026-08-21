# ZITRO Admin Dashboard — Remaining Work

> Everything from the original gap list (Phases 1–3, Phase 4.1–4.5) is implemented,
> verified live, and committed — one commit per sub-item, in both the `apps` and
> `zitro-api` repos. Read `git log` in each repo for full history and detail; this file
> tracks only what's still outstanding.

---

## Firebase Storage bucket doesn't exist — blocks banner image upload

**What's broken:** `POST /api/banners/media` (the admin Banners screen's image-upload
endpoint, `zitro-api` commit `1a6cd75`) fails every time with `UPLOAD_FAILED`. Confirmed via
direct testing that this is **not** an auth or code problem — the request reaches Google's
real Storage API with valid, authenticated credentials — but the configured bucket doesn't
exist. Tested both plausible bucket names for the configured project directly (temporarily
swapping `zitro-api/src/Zitro.Api/appsettings.json`'s `Firebase.StorageBucket` and
reverting after each check):

- `zitro-7044d.firebasestorage.app` → `404 The specified bucket does not exist`
- `zitro-7044d.appspot.com` → same `404`

Most likely cause: Firebase Storage was never initialized for this project in the Firebase
Console (a one-time manual step — visiting the Storage tab and clicking "Get started" —
not something fixable from application code or a coding session).

**Also worth resolving while in there:** the backend's Firebase service account
(`FIREBASE_SERVICE_ACCOUNT_JSON` in `appsettings.Development.json`) belongs to project
`zitro-7044d`, but the actual shipped Android app uses a **different** Firebase project —
`the-hunger-point` (confirmed via `apps/apps/zitro-customer/android/app/google-services.json`
and this repo's own `zitro-api/CLAUDE.md`, which states the project ID as
`the-hunger-point`). Worth checking whether that's intentional (two separate projects, by
design) or drift nobody's caught — it affects which project's Console needs the Storage
setup above.

**To unblock:** someone with Firebase/GCP Console access needs to either (a) initialize
Storage for `zitro-7044d` and confirm the resulting bucket name matches
`Firebase.StorageBucket` in `appsettings.json`, or (b) decide `the-hunger-point` should be
the canonical project instead and repoint the backend's service account + `Firebase:*`
config at it. Everything else about the upload feature (frontend file picker, preview,
error handling, the target-link toggle, `TargetUrl` persistence) is fully built and
verified — this bucket is the only blocker.
