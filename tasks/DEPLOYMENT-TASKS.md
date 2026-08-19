# Firebase Hosting — Multi-Site Deployment for zitro-restaurant, zitro-admin, zitro-superadmin

> **Goal:** each new app deploys to its own Firebase Hosting **site** inside the same Firebase
> project already used by `zitro-customer` — confirmed as project ID **`zitro-customer`** (from
> the live `FIREBASE_CONFIG` in
> `apps/apps/zitro-customer/src/app/core/constants/app.constants.ts`, which matches
> `apps/.firebaserc`'s `"default": "zitro-customer"`). Root `CLAUDE.md`'s mention of
> `the-hunger-point` as the Firebase Project ID is stale/wrong — `the-hunger-point` is not
> referenced anywhere in the actual Firebase config the app uses. Worth a one-line fix in
> `CLAUDE.md` at some point, not blocking. All commands below use the `zitro-customer`
> project ID directly.
>
> Each site then gets a custom subdomain of `zitro.in` connected via Firebase Console + DNS
> records added at your domain registrar.

---

## Current state

`apps/firebase.json` is single-site today:

```json
{
  "hosting": {
    "public": "dist/apps/zitro-customer/browser",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

This must become a **multi-site hosting array**, each entry using a `target` instead of being the
single implicit site — this is Firebase's standard pattern for one project hosting several
independent static sites/domains.

---

## DEP-001 — Create Firebase Hosting Sites + Targets

**Size:** S | **Depends on:** confirming the real project ID (see note above)

**Steps:**

```bash
# One-time, per new site — site IDs must be globally unique across all Firebase projects
firebase hosting:sites:create zitro-restaurant --project zitro-customer
firebase hosting:sites:create zitro-admin --project zitro-customer
firebase hosting:sites:create zitro-superadmin --project zitro-customer

# Map each site to a deploy target name used in firebase.json
firebase target:apply hosting customer     zitro-customer     --project zitro-customer
firebase target:apply hosting restaurant   zitro-restaurant    --project zitro-customer
firebase target:apply hosting admin        zitro-admin          --project zitro-customer
firebase target:apply hosting superadmin   zitro-superadmin      --project zitro-customer
```

This writes the `"targets"` block into `.firebaserc` automatically.

**`firebase.json` becomes:**

```json
{
  "hosting": [
    {
      "target": "customer",
      "public": "dist/apps/zitro-customer/browser",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "restaurant",
      "public": "dist/apps/zitro-restaurant/browser",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "admin",
      "public": "dist/apps/zitro-admin/browser",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    },
    {
      "target": "superadmin",
      "public": "dist/apps/zitro-superadmin/browser",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }]
    }
  ]
}
```

**Deploy one site only:** `firebase deploy --only hosting:restaurant`
**Deploy all:** `firebase deploy --only hosting`

**Acceptance criteria:**

- [ ] All 4 sites exist in Firebase Console → Hosting
- [ ] `firebase deploy --only hosting:restaurant` deploys only that site, doesn't touch the others
- [ ] `zitro-customer` deploy behaviour is unchanged (regression check)

---

## DEP-002 — Connect Custom Subdomains

**Size:** S | **Depends on:** DEP-001, access to `zitro.in` DNS (registrar or wherever it's managed)

**Proposed subdomains** (confirm/adjust before implementing):

| App                | Subdomain           | Notes                                                                                                                                                                                                 |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zitro-restaurant` | `partners.zitro.in` | "Restaurant Partner Portal" — reads better publicly than `restaurant.zitro.in` for a page that also has a public application form (RS-002)                                                            |
| `zitro-admin`      | `admin.zitro.in`    | internal only                                                                                                                                                                                         |
| `zitro-superadmin` | `console.zitro.in`  | deliberately not `superadmin.zitro.in` — avoid advertising the highest-privilege panel's existence in an obvious subdomain name; real security is still auth/RBAC, this is just not painting a target |

**Steps per subdomain (Firebase Console → Hosting → Add custom domain):**

1. Add custom domain to the specific site (`zitro-restaurant`, `zitro-admin`, `zitro-superadmin`).
2. Firebase gives a TXT record for ownership verification — add to `zitro.in` DNS.
3. Firebase gives an A record (or CNAME for subdomain) — add to DNS.
4. Wait for SSL cert provisioning (Firebase-managed, usually under 24h).
5. Verify `https://<subdomain>.zitro.in` serves the site with a valid cert.

**Acceptance criteria:**

- [ ] All 3 subdomains resolve to their correct app over HTTPS
- [ ] `zitro.in` and `www.zitro.in` (the existing marketing site) are unaffected
- [ ] No mixed-content or CORS issues calling `https://api.zitroapp.in` from the new subdomains — confirm `AllowedOrigins` in `zitro-api` `appsettings.json` (`AppOptions`) includes all 3 new subdomains

---

## DEP-003 — CI/CD per App

**Size:** M | **Depends on:** DEP-001

Extend the existing GitHub Actions pattern (§14 of `ZITRO-APPS-ARCHITECTURE.md`) with one deploy
job per app, triggered only when that app's `dist/` output changed (Nx affected detection already
gives this for free):

```yaml
# .github/workflows/deploy-restaurant.yml (one per app, same shape)
name: Deploy zitro-restaurant
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npx nx build zitro-restaurant --configuration=production
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: zitro-customer
          target: restaurant
```

**Acceptance criteria:**

- [ ] Merge to `main` that only touches `zitro-restaurant` deploys only that site
- [ ] A shared-lib-only change (e.g. `@zitro/ui`) triggers all 4 app deploys (Nx affected correctly walks the dependency graph)
- [ ] Failed build blocks deploy (no partial/broken site pushed)
