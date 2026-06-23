# Frontend Authentication & Authorization — ZITRO Customer App (Angular 19)

## Overview

The app supports two OTP delivery modes, controlled by a runtime config fetched from Firestore at startup. Both modes end with the same app JWT in localStorage.

---

## Auth Config — Feature Flag (Runtime, from Firestore)

Fetched by `AppSettingsService.getAuthConfig()` from Firestore path:
`appSettings/restaurantDetails/onlineorders/auh`

```typescript
// libs/models/src/auth-config.model.ts
interface AuthSmsConfig {
  isFast2SmsPhoneAuthentication: boolean; // Mode A: backend OTP via Fast2SMS
  isFirebasePhoneAuthentication: boolean; // Mode B: Firebase Phone Auth
  resendOTPAllowed: boolean;
  resendOTPTime: number; // seconds before resend allowed
}
```

Both flags can be `true` simultaneously — Firebase is tried first; Fast2SMS is the fallback.

---

## OTP Flow — Mode A: Backend OTP (Fast2SMS)

**Files:**

- `libs/services/src/firebase-auth.service.ts` — `sendOtp()`, `signInWithPhone()`
- `apps/zitro-customer/src/app/features/auth/signin.component.ts` — UI

**Steps:**

1. `POST /api/auth/otp/request` with `{ phone }` → API generates OTP, sends SMS via Fast2SMS
2. User enters OTP → `POST /api/auth/otp/verify` with `{ phone, otp }` → returns `{ firebaseCustomToken }`
3. `signInWithCustomToken(auth, firebaseCustomToken)` → Firebase returns `UserCredential`
4. `credential.user.getIdToken()` → Firebase ID token
5. `POST /api/auth/verify` with Firebase ID token → returns `{ appToken, user }`
6. Store in localStorage: `token = appToken`, `currentUserPhone`, `logged_in_date_time`, `isGuest = false`

---

## OTP Flow — Mode B: Firebase Phone Auth

**Files:**

- `libs/services/src/firebase-otp.service.ts` — `FirebaseOtpService`
- `apps/zitro-customer/src/app/features/auth/signin.component.ts` — UI

**Steps:**

1. `signInWithPhoneNumber(auth, phone, RecaptchaVerifier)` → Firebase sends OTP SMS directly → returns `ConfirmationResult`
2. User enters OTP → `confirmationResult.confirm(otp)` → Firebase returns `UserCredential`
3. **Same as Mode A steps 4–6** — gets Firebase ID token → exchanges for app JWT → stores in localStorage

> Firebase Phone Auth provides 10 free SMS/day on test numbers; production numbers are unlimited (standard Firebase Phone Auth quota).

---

## Token Storage (localStorage)

| Key                   | Value                        | Constant                        |
| --------------------- | ---------------------------- | ------------------------------- |
| `token`               | App JWT (issued by backend)  | `AUTH_KEYS.TOKEN`               |
| `currentUserPhone`    | `+91XXXXXXXXXX`              | `AUTH_KEYS.CURRENT_USER_PHONE`  |
| `logged_in_date_time` | ISO timestamp                | `AUTH_KEYS.LOGGED_IN_DATE_TIME` |
| `isGuest`             | `'true'` \| `'false'`        | `AUTH_KEYS.IS_GUEST`            |
| `guestId`             | `guest_<timestamp>_<random>` | `AUTH_KEYS.GUEST_ID`            |

Session expires after **30 days** from `logged_in_date_time`. Auto-logout triggered by `UserManagementService.getCurrentUserPhone()`.

---

## HTTP Interceptors (applied in order)

**File:** `libs/services/src/provide-services.ts`

| Order | Interceptor             | What it does                                                                  |
| ----- | ----------------------- | ----------------------------------------------------------------------------- |
| 1     | `retryInterceptor`      | Retries on network errors (max 2)                                             |
| 2     | `authInterceptor`       | Adds `Authorization: Bearer <appToken>` from localStorage                     |
| 3     | `businessIdInterceptor` | Adds `X-Business-Id` header from `BusinessContextService`                     |
| 4     | `errorInterceptor`      | 401 → sign out + redirect `/auth/signin`; 429 → toast; 503 → maintenance mode |

**Public endpoints** (no auth header attached):

```
/api/app-config
/api/platform-tags
/api/businesses/nearby
/api/tags
/api/businesses/
/api/auth/otp/request
/api/auth/otp/verify
```

---

## Route Guards

**File:** `apps/zitro-customer/src/app/core/guards/auth.guard.ts`

| Guard        | Condition to pass                                               | Applied to                                            |
| ------------ | --------------------------------------------------------------- | ----------------------------------------------------- |
| `AuthGuard`  | `token` exists AND `isGuest = false` AND `currentUserPhone` set | Protected routes                                      |
| `LoginGuard` | Inverse of above                                                | `/auth/signin` — redirects logged-in users to `/home` |

---

## Guest Mode

`FirebaseAuthService.continueAsGuest()` stores `isGuest = true` and a generated `guestId` as the token. Auth interceptor allows unauthenticated requests through when `getIdToken()` throws.

---

## Error Codes — Firebase Phone Auth

| Firebase error code              | User-facing message      |
| -------------------------------- | ------------------------ |
| `auth/invalid-verification-code` | Invalid OTP              |
| `auth/code-expired`              | OTP expired, request new |
| `auth/too-many-requests`         | Too many attempts        |
| `auth/invalid-phone-number`      | Invalid phone number     |
| `auth/quota-exceeded`            | SMS quota exceeded       |
