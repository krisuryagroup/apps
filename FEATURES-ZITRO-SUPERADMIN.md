# zitro-superadmin — Feature & Business-Value Reference

> Companion to `FEATURES-ZITRO-ADMIN.md` — read that one first. This doc only covers what's
> **different** about `zitro-superadmin`, to avoid duplicating the same feature list twice.
> Keep updated alongside the admin doc whenever a shared screen or a superadmin-only screen
> changes. Manual test checklist: `tasks/SUPERADMIN-TEST-SCENARIOS.md`.

**Who uses this app:** platform engineering/config owners — the people who control what the
_other_ apps look like and how they behave, not day-to-day marketplace operations (that's
`zitro-admin`'s job, one level down in privilege).

**Relationship to zitro-admin:** every screen in `FEATURES-ZITRO-ADMIN.md` §1–5 (Businesses,
Brands, Tags, Categories, Products, Orders, Users, Coupons, Cashback, Subscriptions, Delivery
Partners/Zones, Payouts, Banners, Admins, My Profile, Dashboard) is **the exact same shared
component**, reused unmodified from `@zitro/admin-ui` via this app's own routing. This is not a
re-implementation — it's the same code, same known gaps, same in-flight bug fixes. Any fix
landed for one app is live in both simultaneously. Don't file a duplicate bug against this app
for something already tracked in the admin doc.

---

## What's actually unique to zitro-superadmin

**Business value:** these are platform-wide levers that no single restaurant or ops admin
should be able to pull — they change behavior for every business and every app at once.

- **Feature Flags** (`/feature-flags`): turn a feature on/off platform-wide in real time, no
  deploy required. Propagates to running clients.
- **Translations** (`/translations`): manage the i18n string catalog that `@zitro/i18n` serves
  to every Angular app.
- **Themes** (`/themes`): manage the CSS custom-property token sets (`@zitro/theme`) apps pull
  their design system from.
- **Per-App UI Config** (`/ui-config`): app-specific config toggles that don't fit the
  feature-flag model.
- **Remote Settings** (`/remote-settings`): a further tier of runtime-configurable settings
  (check current source for exact scope — this screen has grown since first documented).

---

## Cross-references

- Full shared-screen feature list: `FEATURES-ZITRO-ADMIN.md`
- Manual test checklist (does a shallow smoke pass over the shared screens, full-depth pass
  lives in the admin doc): `tasks/SUPERADMIN-TEST-SCENARIOS.md`
