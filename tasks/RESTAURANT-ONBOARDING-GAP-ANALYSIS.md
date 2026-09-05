# Restaurant Onboarding — Zomato Comparison & Gap Analysis

**Date:** 2026-09-05 (implementation status last updated 2026-09-05)
**Purpose:** Document what Zomato actually requires to onboard a restaurant, compare it
against zitro-restaurant's current onboarding flow, and produce a phased plan to close
the gap.

**Not committed to git** — this file tracks in-progress implementation for this working
session only; the user will delete it once the phases below are done.

## Implementation status

Scope decisions from the user (2026-09-05), superseding Section E below where they
differ:

- All file/document uploads go to **Firebase Storage** under an industry-standard
  structured folder (`businesses/{businessId}/kyc/{documentType}/{file}` — see Phase 1).
- **Identity verification (phone OTP) is required before any business/owner details are
  saved** — moved from "Phase 4 lower priority" up into Phase 1.
- **Business registration doc (Pvt Ltd/Partnership/LLP/Shop Act) is dropped** — not
  needed for now.
- **Menu + cover photo are uploaded later** (not part of the initial registration form),
  **but must be mandatory before go-live** (i.e. before Admin can approve) — this is
  Phase 3's job, not Phase 1's.

| Phase                                                  | Status                                   | Backend commit | Frontend commit |
| ------------------------------------------------------ | ---------------------------------------- | -------------- | --------------- |
| 0 — Slug retirement + reactivate/deactivate            | ✅ Done (landed before this doc existed) | `18bf345`      | `c0064f0`       |
| 1 — OTP identity gate + Firebase Storage KYC documents | ✅ Done                                  | `d1bbc30`      | `db34522`       |
| 2 — Bank/payout details                                | ✅ Done                                  | `d48eccf`      | `bc9c6d4`       |
| 3 — Onboarding-form completeness + go-live gate        | ✅ Done                                  | `378aaf5`      | `5997409`       |
| 4 — Contract/commission acceptance                     | ✅ Done                                  | `b1ede47`      | `0a632bd`       |

### Phase 4 — what actually landed

Scoped-down MVP version of Zomato's e-signed commission agreement: an explicit
acceptance action + timestamp, not an actual e-signature/PDF flow.

Backend (`zitro-api` commit `b1ede47`):

- `Business.CommissionAcceptedAt` (`DateTime?`) — migration
  `docs/schema/apply-2026-09-05-commission-acceptance.sql`.
- `POST /api/business-portal/{businessId}/accept-commission` (new
  `AcceptCommissionTermsCommand`/`Handler`, owner-only, same reachability
  rationale as document/cover-photo upload — a Pending business must still be
  able to complete this) — records `CommissionAcceptedAt = UtcNow`. Fails with
  `COMMISSION_NOT_SET` if `CommissionPercentage` is null (defends against a
  future where the default stops being 0; in practice `CommissionPercentage`
  always has a value today).
- **Go-live gate extended**: `ApproveBusinessHandler` now also requires
  `CommissionAcceptedAt` to be set (unconditionally, not menu-mode-gated —
  every business needs to accept its own commission rate).
- **Reset-on-change**: `UpdateBusinessHandler` clears `CommissionAcceptedAt`
  back to null whenever Admin changes `CommissionPercentage` to a different
  value — a stale acceptance of an old rate never silently counts toward a
  new one. Unchanged re-submits of the same value do NOT reset it.
- `CommissionAcceptedAt` added to `GetBusinessById`'s `BusinessDetailDto` (used
  by both the admin detail view and the business-portal's own profile GET).
- Regression-tested: 6 new unit tests (accept handler happy/not-found/
  commission-not-set + go-live gate + update-handler reset/no-reset) + 2 new
  integration tests (accept-commission 204 + 401), zero regressions against
  the 22 unit / 15 integration baseline.

Frontend (`apps` commit `0a632bd`):

- `profile.component.ts` — new "Commission terms" section: shows the current
  rate, an "Accept commission rate" button (hidden once accepted, replaced
  with an "accepted" badge).
- `admin-business-detail.component.ts` Profile tab — commission row now shows
  an "accepted"/"not accepted" badge next to the percentage.
- `business-api.service.ts` gained `acceptCommissionTerms()`;
  `BusinessProfileDto`/`BusinessDetailDto` gained `commissionAcceptedAt` (and
  `BusinessProfileDto` gained `commissionPercentage`, which it was missing
  entirely before this phase).

**All 4 phases of the onboarding gap-closing plan are now complete.** No
further phases planned unless new gaps are identified.

### Phase 3 — what actually landed

Backend (`zitro-api` commit `378aaf5`):

- `Business` gained `CoverImageUrl`, `CuisineTypes` (`text[]`), `RestaurantCategory` —
  migration `docs/schema/apply-2026-09-05-onboarding-completeness.sql`.
- `POST /api/business-portal/{businessId}/cover-photo` (new
  `UploadBusinessCoverPhotoCommand`/`Handler`) — reuses the `IStorageService` from
  Phase 1, uploads to `businesses/{businessId}/cover`, jpeg/png/webp only.
- **Go-live gate**: `ApproveBusinessHandler` now refuses approval (`INCOMPLETE_LISTING`, 400) unless the business has a cover photo, and — for `MenuMode.Independent`
  businesses only — at least one product. `Shared`-mode branches (no products of their
  own) skip the product check. `BusinessesController.Approve` now maps `NOT_FOUND`→404
  vs. everything else→400, so this surfaces correctly.
- `CuisineTypes`/`RestaurantCategory` threaded through `CreateBusinessApplicationCommand`,
  `UpdateBusinessCommand`, and `GetBusinessById`'s `BusinessDetailDto`. `CoverImageUrl` is
  deliberately upload-endpoint-only, not settable via `UpdateBusiness`.
- Regression-tested: 2 unit tests + 1 integration test added for the gate; pre-existing
  approve-success tests updated to seed cover photo + a product so they still pass.

Frontend (`apps` commit `5997409`):

- `apply.component.ts` (self-apply form) — restaurant category select, cuisine types
  input (restaurant-only), open/close time + 24-hours checkbox.
- `profile.component.ts` — new "Cover photo" section (preview + upload), above
  Verification documents.
- `admin-business-detail.component.ts` — `approve()`/`reject()` now surface the actual
  backend error message (e.g. the `INCOMPLETE_LISTING` text naming exactly what's
  missing) instead of a generic error; Profile tab now shows category, cuisines, and
  cover photo when present.

**Known follow-up not addressed in Phase 3:** `admin-business-edit.component.ts` doesn't
yet have editable cuisine/category fields (parity with the `PayoutAccountId` field added
there in Phase 2) — admin can only see these via the detail view today, not edit them
directly; low priority since the restaurant owner can already edit these via their own
profile.

### Phase 2 — what actually landed

Went with the document-based approach recommended in Section E (not raw structured
bank fields collected via a web form):

- Backend (`d48eccf`): `PayoutAccountId` removed from the business-portal's own
  `UpdateProfile` wire DTO — an owner can no longer set it themselves, matching the
  `VerificationDocs` precedent from Phase 1. Admin's `PUT /api/businesses/{id}` is now
  the only way to set it.
- Frontend (`bc9c6d4`): `profile.component.ts` shows the payout account read-only
  ("set by our team..."); `admin-business-edit.component.ts` gained an editable Payout
  Account field with a link to the business's uploaded bank-proof document so admin
  can key in the value while looking at the evidence.

### Phase 1 — what actually landed

Backend (`zitro-api` commit `d1bbc30`):

- `IStorageService` (Zitro.Shared.Contracts) + `FirebaseStorageService`
  (Zitro.Infrastructure) — the first reusable Firebase Storage upload abstraction;
  `UploadBusinessProductMediaCommand`/`UploadBannerMediaCommand` still have their own
  copies of this logic (not migrated — out of scope, no regression risk taken on).
- `POST /api/business-portal/{businessId}/documents` — uploads one of
  `pan | fssai | gst | bank-proof` to
  `businesses/{businessId}/kyc/{documentType}/{guid}.{ext}`, upserts into
  `Business.VerificationDocs` (by `Type`), always `Status: "pending"`.
- `VerificationDocDto` gained `Status`/`RejectionReason`. Only Admin's
  `PUT /api/businesses/{id}` can move a document to verified/rejected —
  `VerificationDocs` was removed from the business-portal's own `UpdateProfile` wire
  DTO entirely, so an owner can never self-approve their own KYC.
- `CreateBusinessApplicationHandler` now requires a recently-verified (≤30 min)
  `OtpSession` for `OwnerPhone` before creating anything — reuses the existing
  anonymous `/api/auth/otp/request` + `/verify` endpoints as-is, no new OTP
  infrastructure. Also fixed this handler's own slug-uniqueness check (it had its own
  duplicate logic, missed by the earlier slug-retirement fix).

Frontend (`apps` commit `db34522`):

- `apply.component.ts` — new OTP step (request → enter code → verify) gating the final
  "Submit Application" button.
- `profile.component.ts` (zitro-restaurant) — "Verification documents" section: 4
  upload slots with status badges + re-upload; added a PAN number text field.
- `admin-business-detail.component.ts` — new Documents tab: per-document status,
  view link, Verify/Reject actions.
- New `libs/services/src/business-document.model.ts` — canonical
  `BusinessDocumentType`/`VerificationDocDto`, shared by `AdminApiService` and
  `BusinessApiService` (they'd collide as separate declarations under the same
  `@zitro/services` barrel otherwise).

**Known follow-ups not addressed in Phase 1** (flagging for later, not forgotten):

- `PayoutAccountId` is still a free-text string field the owner can set directly via
  profile update — Phase 2 decides whether to formalize this or keep the
  document-based approach (recommended: keep it document-based, have ops key in the
  actual account number from the reviewed bank-proof document, per the original
  Section E recommendation — less raw bank-account PII flowing through a web form).
- The go-live gate (menu + cover photo required before Admin can approve) is NOT yet
  enforced anywhere — `ApproveBusinessHandler` still has zero preconditions. This is
  explicitly Phase 3's job.
- No cover-photo field exists on `Business` yet — needed for Phase 3.

## How this was researched

Zomato's live registration form (`zomato.com/partner-with-us/new/`) gates everything
behind a phone/email OTP on the very first screen — there's no way to see the actual
multi-step form fields without a real, receivable phone number or inbox, which I don't
have. I did NOT use the real FSSAI certificate you attached (it belongs to a real
person — name, address, and photo) to try to push through that gate; submitting a real
individual's identity documents into a live third-party production system isn't
something I'll do regardless of the research intent.

Instead, this document combines:

1. Zomato's own public "Partner with Us" landing page — the mandatory/optional
   document checklist and all 6 FAQ answers (fees, timeline, commission, payouts),
   captured directly from the live page.
2. Five independently-published, dated 2026 step-by-step guides to Zomato's actual
   registration form (field-level detail the gated live form wouldn't show me anyway) —
   cross-referenced against each other and against Zomato's own official checklist for
   consistency. Sources listed at the bottom.
3. A full read of zitro-restaurant's current onboarding code (self-apply flow, admin
   invite flow, profile edit screen, and the backend `Business` entity) to establish
   exactly what's captured today.

I could not save literal screenshot files to disk — the Browser tool didn't expose a
"save to path" capability for this session, only inline display. Screens are described
in full field-level detail below instead.

---

## Section A — What Zomato's own page states (verbatim, live-captured)

**Mandatory documents:**

- PAN card — "Only adult PAN cards are accepted"
- FSSAI license certificate
- Bank details — "A copy of your cheque or passbook"
- Restaurant's delivery menu
- One food image — "Used as your restaurant's cover image on Zomato"

**Optional:**

- GST certificate — "If applicable, based on the PAN provided"

**FAQ answers (live-captured):**

- **Go-live time:** ~24 hours to verify documents and build the menu once all mandatory
  docs are uploaded and the contract is accepted; rejected documents delay it further.
- **Onboarding fee:** covers "administrative, operational, growth enablement, and
  technical services, including document verification, menu digitisation and support,
  quality checks, and query resolutions" — paid in full at the time of onboarding
  (amount not disclosed pre-login).
- **Commission:** charged for order placement, catalog hosting, demand generation,
  marketing, logistics, tech infrastructure, and customer support; varies by city and
  restaurant (cuisine/location) — the actual rate is only shown when you accept the
  online ordering contract.
- **Payouts:** weekly, every Wednesday, for the prior Monday–Sunday; daily payouts
  available on request via the Help Centre once live.

---

## Section B — The actual multi-step form (from published 2026 walkthroughs)

Cross-referencing 5 independent guides, the flow consistently breaks into these stages
(exact field lists vary slightly by source, but every source agrees on the stage order):

1. **Entry / account creation** — phone number → OTP verification (this is the wall I
   hit on the live page too). Then: your name, email, role (owner/manager).
2. **Claim or add listing** — search for the restaurant by name; "Claim the Listing" if
   Zomato already has an unclaimed listing for it, else "Add your Restaurant."
3. **Restaurant basic info:**
   - Restaurant name
   - Full address + pincode, with a map-pin location step (one guide specifically notes
     GPS-based location verification)
   - Cuisine type(s) — multi-select
   - Restaurant category (QSR, casual dining, cafe, cloud kitchen, etc.)
   - Seating capacity (dine-in-relevant, likely skippable for delivery-only)
   - "Cost for two" estimate
   - Operating/opening hours
   - Owner contact: name, email, phone, city
4. **Document upload & KYC** (all sources agree on this set):
   - FSSAI license (file)
   - GST certificate (file, optional per PAN)
   - PAN card (file)
   - Cancelled cheque / passbook copy (file) — this is how bank details are actually
     captured, not a set of typed account-number/IFSC fields
   - Owner ID proof (Aadhaar or driver's license) — mentioned in 2 of 5 sources,
     collected either at this step or during physical verification
   - Business registration document — Private Ltd / Partnership / LLP registration,
     Shop Act license (mentioned in 2 of 5 sources; likely conditional on legal entity
     type)
5. **Menu setup:**
   - Digitized menu — item name, description, price, category (starters/mains/
     desserts/beverages)
   - Item-level photos (recommended, not always mandatory)
   - "Top five dishes" images specifically called out by one source
   - Kitchen + restaurant exterior photos (2 of 5 sources)
6. **Delivery preference** — Zomato's own delivery fleet vs. self-delivery (1 source)
7. **Physical verification** — a Zomato representative visits to collect/verify
   documents and photograph the location (3 of 5 sources explicitly describe this step
   as separate from the online form — it is NOT purely a self-service digital flow)
8. **Contract / agreement** — review and e-sign the partnership agreement; this is
   where the actual commission rate for that restaurant/city becomes visible (matches
   Zomato's own FAQ answer above)
9. **Review & go-live** — team verifies (~24h–7 days depending on source), restaurant
   goes live for online ordering

**Note on discrepancy:** Zomato's own FAQ says documents are verified in ~24 hours;
third-party guides say 2–7 business days including a physical visit. Likely explanation:
the ~24h figure is for document/menu verification specifically, while the longer window
includes the physical verification visit as a separate, slower step. Treat "physical
verification happens" as the reliable fact, and the exact SLA as approximate.

---

## Section C — What zitro-restaurant captures today

**Self-apply flow** (`apply.component.ts`, 3 steps, no login required):

1. Business name, business type (restaurant/grocery dropdown)
2. Town, phone
3. Owner name, owner phone, password

→ `POST /api/business-applications` creates the business as `OnboardingStatus.Pending`,
`IsActive: false`. **No documents, no OTP/phone verification, no bank details, no menu,
no photos, no GST/FSSAI/PAN capture at all** at this stage.

**Admin invite flow** (`InviteBusinessOwnerHandler`, admin-initiated alternative):
Same minimal field set — name, type, address (town only in the UI), owner name/phone/
email — plus an emailed invite link for the owner to set their own password. Same
absence of documents/bank/menu at creation time.

**Admin approval** (`admin-business-detail.component.ts` / `ApproveBusinessHandler`):
Approve/reject with a rejection reason — a pure status flip. Nothing in the approval
screen displays or requires any document, because nothing upstream ever collected one.

**Restaurant's own profile edit** (`profile.component.ts`, post-approval, self-service):
Editable fields: name, description, phone, FSSAI number, GST number. That's the entire
set — **no PAN, no bank/payout account fields, no file upload for any document**.

**Backend data model is ahead of the frontend:** the `Business` entity
(`Zitro.Infrastructure/Entities/Businesses/Business.cs`) already has
`FssaiLicenseNumber`, `GstNumber`, `PanNumber`, `BusinessContactName`,
`AlternatePhone`, `PayoutAccountId`, `CommissionPercentage`, and `VerificationDocs`
(JSON) columns — but confirmed via grep across the whole frontend: **no screen anywhere
(admin or restaurant) reads or writes `PanNumber`, `PayoutAccountId`, or
`VerificationDocs`.** These are dead columns today, wired up on the DB/API side but with
zero UI reachability.

**Menu:** the restaurant portal does have real menu CRUD (`menu.component.ts`,
`menu-bulk-add.component.ts`, `menu-import.component.ts`) — but it's entirely
post-approval self-service, not part of onboarding/verification.

---

## Section D — Gap table

| Area                                                         | Zomato                                                                        | zitro-restaurant today                                                                                                                     | Gap                                                                                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Identity verification                                        | Phone OTP before anything else                                                | None — no OTP on self-apply or invite accept                                                                                               | **Missing.** Anyone can submit an application with any phone number; the owner phone is never proven to be reachable/theirs. |
| PAN card                                                     | File upload, mandatory                                                        | `PanNumber` column exists, no UI field, no file upload                                                                                     | **Missing UI + file storage entirely.**                                                                                      |
| FSSAI license                                                | File upload, mandatory                                                        | Text field for the number only (post-approval, in profile) — no file                                                                       | **Missing file upload.** Number-only isn't verifiable.                                                                       |
| GST certificate                                              | File upload, optional                                                         | Text field for the number only (post-approval) — no file                                                                                   | **Missing file upload.**                                                                                                     |
| Bank details                                                 | Cancelled cheque / passbook file upload                                       | `PayoutAccountId` (string) column, zero UI                                                                                                 | **Missing entirely** — no way for a restaurant to actually receive a payout today.                                           |
| Business registration doc (Pvt Ltd/Partnership/LLP/Shop Act) | Collected for some entity types                                               | Not modeled at all — no legal-entity-type field on `Business`                                                                              | **Missing**, lower priority (Zomato itself treats this as conditional).                                                      |
| Owner ID proof (Aadhaar etc.)                                | Collected at KYC or physical visit                                            | Not modeled                                                                                                                                | **Missing**, lower priority.                                                                                                 |
| Menu + photos as part of onboarding                          | Mandatory before go-live                                                      | Menu CRUD exists but is post-approval self-service, not gating go-live                                                                     | **Process gap, not a data gap** — menu tooling exists, it's just not required before `OnboardingStatus.Approved`.            |
| Cover/profile photo                                          | Mandatory, one image                                                          | Product-level images exist via menu CRUD; no dedicated "restaurant cover photo" field                                                      | **Missing** a business-level cover-photo field distinct from per-product images.                                             |
| Cuisine type / restaurant category                           | Captured at signup                                                            | Not modeled anywhere                                                                                                                       | **Missing.** Also plausibly useful for the customer app's discovery/filtering (`nearby-businesses`) beyond just onboarding.  |
| Operating hours                                              | Captured at signup                                                            | `OpenTime`/`CloseTime`/`Is24Hours` exist on `Business` but aren't in the self-apply/invite form — only editable later in profile           | **Partial** — data model is fine, just not collected at intake.                                                              |
| Physical verification                                        | A real visit, separate from the digital form                                  | Not applicable to a purely digital platform — **recommend explicitly deciding to skip this**, not silently omit it                         | **Process decision needed**, not a bug.                                                                                      |
| Contract / commission acceptance                             | E-signed agreement showing the actual commission rate                         | `CommissionPercentage` is admin-set silently (see `UpdateBusinessCommand`); the business never "accepts" it                                | **Missing** an explicit acceptance step — arguably a fairness/dispute-risk gap, not just a feature gap.                      |
| Document verification / rejection loop                       | Admin reviews docs, can reject a specific doc with a reason, owner re-submits | Admin can only reject the _whole application_ with one reason (`OnboardingRejectionReason`) — no per-document status                       | **Coarser than Zomato's.** Fine for an MVP, worth revisiting once documents exist at all.                                    |
| Payout cadence choice                                        | Weekly by default, daily on request                                           | Payout generation exists (`RestaurantPayout`, weekly job per your recent commits) but no restaurant-facing "request daily payouts" control | **Missing** self-service control, backend job already does weekly generation.                                                |

---

## Section E — Recommended phased plan

**Phase 1 — Document capture (highest priority, closes the biggest real gap)**

1. Add a generic "business document" upload capability: reuse the existing
   `uploadProductMedia`/`uploadBannerMedia` pattern (Firebase Storage upload → public
   URL) for a new `POST /api/business-portal/{businessId}/documents` (or reuse
   `VerificationDocs` JSON on `Business`, storing `{type, url, uploadedAt, status}` per
   doc — the column already exists and is unused).
2. Add PAN, FSSAI certificate, GST certificate, and a bank-proof (cancelled cheque/
   passbook) as four named document slots in that JSON, each with its own
   pending/verified/rejected status — this is what actually lets admin review docs
   individually instead of only approving/rejecting the whole application.
3. Surface upload UI on **both** the self-apply flow (`apply.component.ts`) — as a 4th
   step before submit — and the restaurant portal's profile page (for post-approval
   re-uploads if a document is rejected or expires).
4. Surface a document review UI in `admin-business-detail.component.ts`: per-document
   thumbnail/link + approve/reject-with-reason, instead of the current single
   whole-application approve/reject.

**Phase 2 — Bank/payout details**

1. Add real structured fields (`BankAccountHolderName`, `BankAccountNumber`,
   `BankIfscCode` — or keep it simpler and just require the cancelled-cheque document
   from Phase 1 and have an admin/ops step manually key in the account details from
   it, matching how many aggregators actually do it to avoid storing raw account
   numbers turned in via a web form). Recommend the latter for MVP — less PII surface
   to secure, and it matches what Zomato's own document-based approach implies.
2. Wire `PayoutAccountId` to whichever approach you pick; today it's a dead column.

**Phase 3 — Onboarding-form completeness**

1. Add cuisine type(s) and restaurant category to the self-apply/invite forms and to
   `Business` (useful for customer-app discovery too, not just onboarding).
2. Add operating hours to the self-apply/invite forms (the `Business` columns already
   exist — this is pure frontend work).
3. Add a dedicated "cover photo" field on `Business` distinct from per-product images,
   required before `OnboardingStatus` can move to `Approved`.
4. Require at least one menu category + product to exist before an admin can approve
   — enforce Zomato's "menu ready before go-live" rule as a real gate, not just
   available tooling.

**Phase 4 — Trust & identity (lower priority, bigger scope)**

1. Phone OTP verification on the self-apply flow before the application is even
   created (reuses the existing customer-app Firebase phone-OTP infra, or Fast2SMS —
   both already exist in this codebase for the customer side).
2. An explicit "accept terms / commission rate" step shown to the owner before
   `Approved`, logged with a timestamp (dispute-risk mitigation).
3. Legal entity type + registration doc + owner ID proof — only if/when you decide to
   support non-individual FBOs; skip for MVP if all current partners are individual
   FBOs (matches the sample FSSAI cert style — "Kind of Business: Retailer").

**Explicitly out of scope / a business decision, not an engineering gap:**

- Physical verification visits — Zomato does this with a field team; zitro doesn't
  have one. Either accept fully-remote verification (documents + admin review only) as
  the intentional model, or note it as a future ops hire, but don't treat it as a
  missing _feature_.

---

## Sources

- Zomato's own live page: `https://www.zomato.com/partner-with-us/new/` (captured
  2026-09-05 — document checklist + all 6 FAQ answers)
- [Zomato Partner Registration 2026 | Add Your Restaurant Step-by-Step](https://www.growthjockey.com/blogs/zomato-registration-guide)
- [Zomato Restaurant Partner Registration: 2026 Complete Guide](https://www.agileregulatory.com/blogs/how-to-apply-for-zomato-restaurant-partner-registration-in-2026-)
- [How to Register Restaurant on Zomato & Swiggy: Complete Guide (2026)](https://www.dineopen.com/blog/how-to-register-restaurant-zomato-swiggy.html)
- [How to Register on Zomato & Swiggy in 2026 (Step-by-Step)](https://restoyantra.com/blog/register-restaurant-zomato-swiggy-india-2026)
- [How to Become a Zomato Restaurant Partner: Step-by-Step Guide](https://www.registrationwala.com/knowledge-base/post/business/how-to-become-zomato-restaurant-partner)

Zitro code read for Section C: `apps/zitro-restaurant/src/app/features/onboarding/apply.component.ts`,
`apps/zitro-restaurant/src/app/features/profile/profile.component.ts`,
`libs/admin-ui/src/business-detail/admin-business-detail.component.ts`,
`libs/admin-ui/src/business-edit/admin-business-edit.component.ts`,
`zitro-api/src/Zitro.Infrastructure/Entities/Businesses/Business.cs`,
`zitro-api/src/Modules/Businesses/Businesses.Module/Features/{CreateBusiness,InviteBusinessOwner,ApproveBusiness,UpdateBusiness}/*.cs`.
