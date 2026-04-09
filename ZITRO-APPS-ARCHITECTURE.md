# ZITRO Platform — Frontend Architecture Plan

> **Monorepo root:** `E:/Github/krisuryagroup/apps/`
> **Backend API:** `E:/Github/krisuryagroup/zitro-api/` (existing, do not modify structure)
> **Existing customer app:** `E:/Github/krisuryagroup/zitro-app/` (do not touch)
> **Status:** Production architecture plan — implement in order, section by section
> **Date:** 2026-04-08

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Repository Bootstrap](#2-repository-bootstrap)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Library Specifications](#4-library-specifications)
5. [Component Design System](#5-component-design-system)
6. [Multi-Language Architecture](#6-multi-language-architecture)
7. [Multi-Theme Architecture](#7-multi-theme-architecture)
8. [Backend-Driven Configuration](#8-backend-driven-configuration)
9. [Centralized Test Data](#9-centralized-test-data)
10. [Testing Architecture](#10-testing-architecture)
11. [The `finalize` Command](#11-the-finalize-command)
12. [New APIs Required in zitro-api](#12-new-apis-required-in-zitro-api)
13. [Application Specifications](#13-application-specifications)
14. [CI/CD](#14-cicd)
15. [Implementation Order](#15-implementation-order)

---

## 1. Platform Overview

### Seven Applications

| App | Folder | Type | Platform | Users |
|-----|--------|------|----------|-------|
| Customer App | `apps/zitro-customer` | Angular + Capacitor | Android (Play Store) + Web | End customers ordering food/groceries |
| Delivery App | `apps/zitro-delivery` | Angular + Capacitor | Android | Delivery riders |
| POS System | `apps/zitro-pos` | Angular + Capacitor | Android tablet + Web | Restaurant cashiers |
| Restaurant Partner App | `apps/zitro-restaurant` | Angular + Capacitor | Android + Web | Restaurant owners / managers |
| Admin Dashboard | `apps/zitro-admin` | Angular | Web | Platform admins |
| Super Admin | `apps/zitro-superadmin` | Angular | Web | Platform owners |
| Background Jobs | `apps/zitro-jobs` | Node.js (Firebase Cloud Functions) | Server | Platform — automated tasks |

> **Restaurant Portal = Restaurant Partner App.** There is no separate portal — `zitro-restaurant` serves both web (browser) and Android (via Capacitor). On the web it acts as a full management portal; as an Android APK it acts as the restaurant partner app (live order notifications, quick accept/reject). Same codebase, same features, different form factor.

> **Background Jobs placement.** `zitro-jobs` lives inside the `apps/` monorepo (not a separate repo) so it can import `@zitro/models` TypeScript interfaces directly for type safety. Deployment remains independent — `firebase deploy --only functions` from inside `apps/zitro-jobs/`.

### Nine Shared Libraries

| Library | npm scope | Purpose |
|---------|-----------|---------|
| Models | `@zitro/models` | TypeScript interfaces — the single source of truth for all data shapes |
| Mappers | `@zitro/mappers` | API DTOs + mapping functions (DTO ↔ Model, Model → Request DTO) |
| Utils | `@zitro/utils` | Validators, formatters, helpers — pure TypeScript, no Angular |
| Theme | `@zitro/theme` | Design tokens (CSS custom properties), ThemeService |
| i18n | `@zitro/i18n` | Translation service, default EN strings, i18n pipe |
| Services | `@zitro/services` | API clients (use mappers internally), interceptors, business logic |
| UI | `@zitro/ui` | All shared Angular components, directives, pipes |
| Test Data | `@zitro/test-data` | Centralized JSON fixtures + typed factory builders |
| Jobs Shared | `@zitro/jobs-shared` | Shared utilities for background jobs (FCM helpers, API client for jobs) |

### Dependency Rules (enforced by Nx)

```
@zitro/models      → no internal deps
@zitro/mappers     → @zitro/models
@zitro/utils       → @zitro/models
@zitro/theme       → no internal deps
@zitro/i18n        → @zitro/models
@zitro/services    → @zitro/models, @zitro/mappers, @zitro/utils
@zitro/ui          → @zitro/models, @zitro/utils, @zitro/theme, @zitro/i18n
@zitro/test-data   → @zitro/models, @zitro/mappers
@zitro/jobs-shared → @zitro/models

apps/angular/*     → any @zitro/* lib except @zitro/jobs-shared
apps/zitro-jobs    → @zitro/models, @zitro/jobs-shared
```

`@zitro/test-data` is **never imported in application code** — only in `*.spec.ts`, `*.integration.spec.ts`, `*.journey.ts` (E2E) and MSW handlers.

`@zitro/jobs-shared` is **never imported in Angular app code** — only in `apps/zitro-jobs/`.

---

## 2. Repository Bootstrap

Run these commands once to initialize the monorepo inside `E:/Github/krisuryagroup/apps/`.

```bash
# Step 1: Initialize Nx workspace (inside the apps/ folder)
cd E:/Github/krisuryagroup/apps
npx create-nx-workspace@latest . --preset=apps --packageManager=npm --nxCloud=skip

# Step 2: Add Angular + Node.js + Capacitor support
npm install -D @nx/angular
npm install -D @nx/js
npm install -D @nx/node

# Step 3: Add testing tools
npm install -D vitest @vitest/coverage-v8 @vitest/ui happy-dom
npm install -D @playwright/test @playwright/test
npm install -D msw
npm install -D audit-ci
npm install -D husky lint-staged

# Step 4: Add Angular packages
npm install @angular/material @angular/cdk
npm install @angular/fire firebase
npm install @capacitor/core @capacitor/android @capacitor/cli
npm install @capacitor/app @capacitor/geolocation @capacitor/browser
npm install @capacitor-firebase/analytics

# Step 5: Add utility packages
npm install geolib
npm install rxjs

# Step 6: Add Firebase packages for background jobs
npm install firebase-functions firebase-admin

# Step 7: Add development tools
npm install -D chalk ts-node
npm install -D eslint-plugin-security

# Step 8: Initialize Husky for pre-commit hooks
npx husky init
```

---

## 3. Monorepo Structure

```
apps/                                    ← Nx workspace root
├── apps/
│   ├── zitro-customer/                  ← Customer Android + Web app
│   │   ├── src/
│   │   ├── android/                     ← Capacitor Android project
│   │   ├── project.json
│   │   └── capacitor.config.ts
│   ├── zitro-customer-e2e/              ← Playwright E2E for customer
│   ├── zitro-delivery/                  ← Delivery partner Android app
│   ├── zitro-delivery-e2e/
│   ├── zitro-pos/                       ← POS tablet app
│   ├── zitro-pos-e2e/
│   ├── zitro-restaurant/                ← Restaurant partner app (web + Android)
│   ├── zitro-restaurant-e2e/
│   ├── zitro-admin/                     ← Admin dashboard web
│   ├── zitro-admin-e2e/
│   ├── zitro-superadmin/                ← Super admin web
│   └── zitro-jobs/                      ← Firebase Cloud Functions (Node.js)
│       ├── src/
│       │   ├── functions/               ← One file per Cloud Function
│       │   │   ├── order-timeout.ts
│       │   │   ├── push-notifications.ts
│       │   │   ├── daily-report.ts
│       │   │   ├── coupon-expiry.ts
│       │   │   └── cache-invalidation.ts
│       │   ├── shared/
│       │   │   ├── firebase-admin.ts
│       │   │   ├── api-client.ts        ← HTTP calls to zitro-api
│       │   │   └── fcm.helpers.ts
│       │   └── index.ts                 ← Firebase Functions entry point
│       ├── project.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── .firebaserc
│       └── firebase.json
│
├── libs/
│   ├── models/                          ← @zitro/models
│   │   └── src/
│   │       ├── address.model.ts
│   │       ├── auth.model.ts
│   │       ├── banner.model.ts
│   │       ├── business.model.ts
│   │       ├── cart.model.ts
│   │       ├── catalog.model.ts
│   │       ├── coupon.model.ts
│   │       ├── delivery.model.ts
│   │       ├── order.model.ts
│   │       ├── payment.model.ts
│   │       ├── pricing.model.ts
│   │       ├── rating.model.ts
│   │       ├── subscription.model.ts
│   │       ├── user.model.ts
│   │       └── index.ts
│   │
│   ├── utils/                           ← @zitro/utils
│   │   └── src/
│   │       ├── validators.util.ts
│   │       ├── formatters.util.ts
│   │       ├── geo.util.ts
│   │       ├── storage.util.ts
│   │       ├── date.util.ts
│   │       └── index.ts
│   │
│   ├── theme/                           ← @zitro/theme
│   │   └── src/
│   │       ├── tokens.scss              ← All CSS custom properties
│   │       ├── themes/
│   │       │   ├── _dark.scss
│   │       │   ├── _nature.scss
│   │       │   └── _ocean.scss
│   │       ├── theme.service.ts
│   │       ├── theme.model.ts
│   │       └── index.ts
│   │
│   ├── i18n/                            ← @zitro/i18n
│   │   └── src/
│   │       ├── defaults/
│   │       │   └── en.ts                ← Default EN strings (bundled)
│   │       ├── i18n.service.ts
│   │       ├── i18n.pipe.ts
│   │       ├── i18n.model.ts
│   │       └── index.ts
│   │
│   ├── services/                        ← @zitro/services
│   │   └── src/
│   │       ├── api/
│   │       │   ├── auth-api.service.ts
│   │       │   ├── business-api.service.ts
│   │       │   ├── catalog-api.service.ts
│   │       │   ├── cart-api.service.ts
│   │       │   ├── order-api.service.ts
│   │       │   ├── user-api.service.ts
│   │       │   ├── delivery-api.service.ts
│   │       │   ├── payment-api.service.ts
│   │       │   ├── rating-api.service.ts
│   │       │   ├── search-api.service.ts
│   │       │   ├── wallet-api.service.ts
│   │       │   ├── subscription-api.service.ts
│   │       │   └── app-config-api.service.ts
│   │       ├── interceptors/
│   │       │   ├── auth.interceptor.ts
│   │       │   ├── business-id.interceptor.ts
│   │       │   └── error.interceptor.ts
│   │       ├── feature-flag.service.ts
│   │       ├── cache.service.ts
│   │       └── index.ts
│   │
│   ├── ui/                              ← @zitro/ui
│   │   └── src/
│   │       ├── address/
│   │       │   ├── address-list/
│   │       │   ├── address-card/
│   │       │   └── add-address-form/
│   │       ├── auth/
│   │       │   ├── phone-input/
│   │       │   └── otp-input/
│   │       ├── banners/
│   │       │   └── banner-carousel/
│   │       ├── cart/
│   │       │   ├── cart-item-row/
│   │       │   ├── cart-summary-bar/
│   │       │   └── pricing-summary/
│   │       ├── catalog/
│   │       │   ├── category-bar/
│   │       │   ├── item-detail-sheet/
│   │       │   ├── product-card/
│   │       │   ├── product-grid/
│   │       │   └── search-bar/
│   │       ├── common/
│   │       │   ├── bottom-sheet/
│   │       │   ├── confirmation-dialog/
│   │       │   ├── empty-state/
│   │       │   ├── error-state/
│   │       │   ├── loader/
│   │       │   ├── no-internet/
│   │       │   ├── splash-screen/
│   │       │   ├── theme-picker/
│   │       │   ├── truncated-text/
│   │       │   ├── update-dialog/
│   │       │   └── zoomable-image/
│   │       ├── order/
│   │       │   ├── order-card/
│   │       │   ├── order-status-badge/
│   │       │   └── order-timeline/
│   │       ├── ratings/
│   │       │   ├── rating-summary/
│   │       │   └── star-rating/
│   │       ├── directives/
│   │       │   ├── cached-image.directive.ts
│   │       │   └── swipe-back.directive.ts
│   │       └── index.ts
│   │
│   ├── mappers/                         ← @zitro/mappers
│   │   └── src/
│   │       ├── dtos/                    ← Raw API response shapes (camelCase)
│   │       │   ├── auth.dto.ts
│   │       │   ├── catalog.dto.ts
│   │       │   ├── order.dto.ts
│   │       │   ├── user.dto.ts
│   │       │   ├── coupon.dto.ts
│   │       │   ├── pricing.dto.ts
│   │       │   └── index.ts
│   │       ├── requests/                ← Outbound request shapes
│   │       │   ├── order.request.ts
│   │       │   ├── address.request.ts
│   │       │   └── index.ts
│   │       ├── mappers/                 ← DTO → Model and Model → Request
│   │       │   ├── catalog.mapper.ts
│   │       │   ├── order.mapper.ts
│   │       │   ├── user.mapper.ts
│   │       │   ├── coupon.mapper.ts
│   │       │   ├── pricing.mapper.ts
│   │       │   └── index.ts
│   │       └── index.ts
│   │
│   ├── test-data/                       ← @zitro/test-data
│   │   └── src/
│   │       ├── _fixtures/               ← JSON data files
│   │       │   ├── customers.json
│   │       │   ├── restaurants.json
│   │       │   ├── menu-items.json
│   │       │   ├── categories.json
│   │       │   ├── orders.json
│   │       │   ├── addresses.json
│   │       │   ├── coupons.json
│   │       │   └── delivery-partners.json
│   │       ├── loaders/
│   │       │   └── fixture-loader.ts    ← Typed loader (mirrors TestDataLoader.cs)
│   │       ├── builders/
│   │       │   ├── customer.builders.ts
│   │       │   ├── restaurant.builders.ts
│   │       │   ├── catalog.builders.ts
│   │       │   ├── order.builders.ts
│   │       │   ├── cart.builders.ts
│   │       │   └── index.ts
│   │       ├── msw/
│   │       │   └── handlers.ts          ← MSW handlers using fixture data
│   │       └── index.ts
│   │
│   └── jobs-shared/                     ← @zitro/jobs-shared
│       └── src/
│           ├── fcm.helpers.ts           ← FCM payload builders + send wrappers
│           ├── api-client.ts            ← Typed HTTP client for zitro-api calls
│           ├── order-notifications.ts   ← Notification payloads per order event
│           └── index.ts
│
├── tools/
│   ├── scripts/
│   │   ├── finalize.ts                  ← The finalize command
│   │   └── check-bundle-sizes.ts
│   └── eslint-rules/
│       └── no-secrets-in-env.ts
│
├── nx.json
├── package.json
├── tsconfig.base.json
├── .eslintrc.json
├── audit-ci.json
└── .husky/
    └── pre-commit
```

---

## 4. Library Specifications

### 4.1 `@zitro/models`

All interfaces mirror the API response shapes exactly. Named to match the backend `Contracts` projects.

```typescript
// libs/models/src/user.model.ts
export interface User {
  id: string;
  firebaseUid: string;
  name: string;
  phoneNumber: string;
  email: string | null;
  photoUrl: string | null;
  referralCode: string;
  isActive: boolean;
  createdAt: string;  // ISO 8601
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string | null;
  pincode: string;
  town: string;
  state: string;
  type: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  lat: number | null;
  lng: number | null;
}

// libs/models/src/catalog.model.ts
export interface Product {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  foodType: 'Veg' | 'NonVeg' | 'Egg';
  isAvailable: boolean;           // replaces isEnabledForOnlineOrders in legacy zitro-app
  isFeatured: boolean;
  isNew: boolean;
  sortOrder: number;
  dietaryPreferences: string[];   // e.g. ['Jain', 'Gluten-Free'] — migrated from legacy
  variations: ProductVariation[];
}

export interface ProductVariation {
  id: string;
  name: string;            // legacy zitro-app used 'label' — renamed for .NET API
  priceModifier: number;   // relative to basePrice; legacy used absolute price — API handles conversion
  isDefault: boolean;
  isAvailable: boolean;    // legacy used 'isEnabled'
  sortOrder: number;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  imageUrl: string | null;
  priority: number;
  isActive: boolean;
  parentCategoryId: string | null;
}

// libs/models/src/order.model.ts
export type OrderType = 'delivery' | 'takeout' | 'dine-in';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';
export type PaymentMethod = 'cash' | 'online';  // wallet is future scope

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  variationId: string | null;
  variationName: string | null;
  priceModifier: number;
  effectivePrice: number;
  specialInstructions: string | null;
  imageUrl: string | null;
}

// Flat charge values as returned by the .NET API.
// The legacy zitro-app stored charges as nested { calculated, applied, waived }
// objects inside Firestore. The new API resolves those to single applied values.
export interface OrderCharges {
  subtotal: number;
  deliveryCharge: number;       // 0 if takeout/dine-in or free delivery threshold met
  packagingCharge: number;      // per-item packaging × quantity
  platformFee: number;          // flat fee; 0 for dine-in
  gst: number;                  // 5% of subtotal (all order types)
  couponDiscount: number;       // 0 if no coupon applied
  total: number;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  timestamp: string;
  note: string | null;
}

export interface Order {
  id: string;
  displayId: string;
  userId: string;
  businessId: string;
  businessName: string;
  orderType: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  charges: OrderCharges;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  deliveryAddress: Address | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  scheduledPickupTime: string | null;
  appliedCouponCode: string | null;
  customerNotes: string | null;
  statusTimeline: OrderStatusEvent[];
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// libs/models/src/pricing.model.ts
export interface PricingConfig {
  currency: 'INR';
  delivery: {
    enabled: boolean;
    apply: boolean;
    base_fee: number;
    per_km_fee: number;           // distance-based surcharge (from legacy pricing model)
    free_delivery_above: number;
    surge_multiplier: number;
    max_delivery_cap: number;
  };
  platform_fee: {
    enabled: boolean;
    apply: boolean;
    flat_fee: number;
    applicable_order_types: OrderType[];
  };
  packaging: {
    enabled: boolean;
    apply: boolean;
    default_fee: number;
    applicable_order_types: OrderType[];
  };
  gst: {
    enabled: boolean;
    apply: boolean;
    food_percent: number;
    applicable_order_types: OrderType[];
  };
  rounding: {
    enabled: boolean;
    type: 'nearest_rupee' | 'none';
  };
}

export interface PricingBreakdown {
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  platformFee: number;
  gst: number;
  couponDiscount: number;
  total: number;
  freeDeliveryThreshold: number;
  amountForFreeDelivery: number;  // 0 if free delivery already applied
  totalSavings: number;           // couponDiscount + waived delivery (if any)
  // Visibility flags — driven by PricingConfig.*.apply; tells UI which rows to render
  visibility: {
    showDeliveryCharge: boolean;
    showPackagingCharge: boolean;
    showPlatformFee: boolean;
    showGst: boolean;
    showCouponDiscount: boolean;
    showFreeDeliveryProgress: boolean;
  };
}
```

#### Model Migration Notes (legacy `zitro-app` → `@zitro/models`)

**Rule: copy field names as-is unless the API contract forces a structural change.**
Cosmetic renames (label→name, isEnabled→isAvailable, etc.) are deferred to a post-migration cleanup task. Renaming during migration adds risk for zero user-facing benefit.

**Only two changes are required — both forced by the .NET API contract:**

| Change | Legacy shape | New shape | Why it must change |
|--------|-------------|-----------|-------------------|
| Image field consolidation | `Product.image?: string` + `Product.imageURL?: string` | `Product.imageUrl: string \| null` | Two fields existed in Firebase because different code added them at different times. The .NET API returns a single `imageUrl`. |
| `OrderCharges` flattened | `{ packagingCharges: { calculated, applied, waived }, gst: { calculated, applied, waived, percentage }, ... }` | `{ packagingCharge: number, gst: number, ... }` | Firebase stored sub-fields because Cloud Functions updated each independently. The .NET API resolves to final applied values — the nested structure has no meaning server-side. |

**All other fields copy directly from the legacy model with the same name and type:**
- `Product.isEnabledForOnlineOrders`, `Product.dietaryPreferences`, `Product.qty`, `Product.status` — copy verbatim
- `ProductVariation.label`, `ProductVariation.price` (absolute), `ProductVariation.isEnabled` — copy verbatim
- `Address` — all fields identical; type is `'Home' | 'Office' | 'Other'` (legacy already uses `'Office'`, not `'Work'`)
- `PricingBreakdown.visibility` — copy from legacy `ChargesVisibility` directly

### 4.2 `@zitro/mappers`

Pure TypeScript — no Angular, no HTTP. Depends only on `@zitro/models`.

**Why a separate library?**
Services call the API and get raw JSON back. That raw JSON shape (the DTO) may differ from the model:
- The .NET API returns a single `imageUrl` but the legacy model had two fields (`image`, `imageURL`) — mapper consolidates
- The .NET API returns flat `OrderCharges` numbers, mapper converts from the flat DTO into the model
- Request payloads sent to the API are a different (smaller) shape than the full model
- Isolating mapping logic makes services clean and makes mappers independently unit-testable

**Rule:** Services never access DTO fields directly — they always call a mapper first.

> **Note on field names:** The DTOs below reflect what the .NET API is designed to return. The `@zitro/models` interfaces use the legacy field names (`label`, `price`, `isEnabled`, `isEnabledForOnlineOrders`) to keep the migration safe. The mapper's job is to bridge that gap. If the .NET API is designed to return clean names, the DTOs use clean names and the mapper renames them into the legacy-named model fields until a post-migration cleanup refactor renames them consistently.

```typescript
// libs/mappers/src/dtos/catalog.dto.ts
// Raw shapes returned by GET /api/products — mirrors the .NET API response contract

export interface ProductDto {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string | null;
  foodType: 'Veg' | 'NonVeg' | 'Egg';
  isAvailable: boolean;
  isFeatured: boolean;
  isNew: boolean;
  sortOrder: number;
  dietaryPreferences: string[];
  variations: ProductVariationDto[];
}

export interface ProductVariationDto {
  id: string;
  name: string;
  priceModifier: number;
  isDefault: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface CategoryDto {
  id: string;
  businessId: string;
  name: string;
  imageUrl: string | null;
  priority: number;
  isActive: boolean;
  parentCategoryId: string | null;
}
```

```typescript
// libs/mappers/src/dtos/order.dto.ts

export interface OrderDto {
  id: string;
  displayId: string;
  userId: string;
  businessId: string;
  businessName: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  status: string;
  items: OrderItemDto[];
  charges: OrderChargesDto;
  paymentMethod: 'cash' | 'online';
  isPaid: boolean;
  deliveryAddress: AddressDto | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  appliedCouponCode: string | null;
  customerNotes: string | null;
  statusTimeline: OrderStatusEventDto[];
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderChargesDto {
  subtotal: number;
  deliveryCharge: number;
  packagingCharge: number;
  platformFee: number;
  gst: number;
  couponDiscount: number;
  total: number;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  variationId: string | null;
  variationName: string | null;
  priceModifier: number;
  effectivePrice: number;
  specialInstructions: string | null;
  imageUrl: string | null;
}

export interface OrderStatusEventDto {
  status: string;
  timestamp: string;
  note: string | null;
}
```

```typescript
// libs/mappers/src/requests/order.request.ts
// Outbound shape for POST /api/orders — only what the API needs, not the full model

export interface CreateOrderRequest {
  businessId: string;
  orderType: 'delivery' | 'takeout' | 'dine-in';
  items: CreateOrderItemRequest[];
  paymentMethod: 'cash' | 'online';
  deliveryAddressId: string | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  couponCode: string | null;
  customerNotes: string | null;
}

export interface CreateOrderItemRequest {
  productId: string;
  variationId: string | null;
  quantity: number;
  specialInstructions: string | null;
}
```

```typescript
// libs/mappers/src/mappers/catalog.mapper.ts
// Maps .NET API response DTOs → @zitro/models interfaces.
// @zitro/models uses legacy field names (label, price, isEnabled, isEnabledForOnlineOrders)
// to keep migration safe. The mapper bridges any name differences between DTO and model.
import type { Product, ProductVariation, Category } from '@zitro/models';
import type { ProductDto, ProductVariationDto, CategoryDto } from '../dtos/catalog.dto';

export const CatalogMapper = {

  toProduct(dto: ProductDto): Product {
    return {
      id: dto.id,
      businessId: dto.businessId,
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description,
      basePrice: dto.basePrice,
      // API returns single imageUrl — model keeps it as imageUrl (consolidated from legacy image/imageURL)
      imageUrl: dto.imageUrl,
      foodType: dto.foodType,
      // API uses isAvailable — map into legacy field name used by model
      isEnabledForOnlineOrders: dto.isAvailable,
      isFeatured: dto.isFeatured,
      isNew: dto.isNew,
      sortOrder: dto.sortOrder,
      dietaryPreferences: dto.dietaryPreferences ?? [],
      variations: (dto.variations ?? []).map(CatalogMapper.toVariation),
    };
  },

  toVariation(dto: ProductVariationDto): ProductVariation {
    return {
      id: dto.id,
      // API uses 'name' — map into legacy field name used by model
      label: dto.name,
      // API uses priceModifier (delta) — convert back to absolute price for model
      // absolute = basePrice + priceModifier (basePrice passed separately or stored on product)
      price: dto.price,   // if API returns absolute; or resolve at call site if delta
      isDefault: dto.isDefault,
      isEnabled: dto.isAvailable,
      sortOrder: dto.sortOrder,
    };
  },

  toCategory(dto: CategoryDto): Category {
    return { ...dto };  // 1:1 currently — mapper exists so any future divergence is contained
  },

  toProductList(dtos: ProductDto[]): Product[] {
    return dtos.map(CatalogMapper.toProduct);
  },
};
```

```typescript
// libs/mappers/src/mappers/order.mapper.ts
import type { Order, OrderCharges, OrderItem, OrderStatusEvent } from '@zitro/models';
import type { OrderDto, OrderChargesDto, OrderItemDto, OrderStatusEventDto } from '../dtos/order.dto';
import type { Cart, CartItem } from '@zitro/models';
import type { CreateOrderRequest, CreateOrderItemRequest } from '../requests/order.request';

export const OrderMapper = {

  toOrder(dto: OrderDto): Order {
    return {
      id: dto.id,
      displayId: dto.displayId,
      userId: dto.userId,
      businessId: dto.businessId,
      businessName: dto.businessName,
      orderType: dto.orderType,
      status: dto.status as Order['status'],
      items: dto.items.map(OrderMapper.toOrderItem),
      charges: OrderMapper.toCharges(dto.charges),
      paymentMethod: dto.paymentMethod,
      isPaid: dto.isPaid,
      deliveryAddress: dto.deliveryAddress ?? null,
      tableNumber: dto.tableNumber,
      numberOfGuests: dto.numberOfGuests,
      scheduledPickupTime: null,
      appliedCouponCode: dto.appliedCouponCode,
      customerNotes: dto.customerNotes,
      statusTimeline: dto.statusTimeline.map(OrderMapper.toStatusEvent),
      estimatedDeliveryMinutes: dto.estimatedDeliveryMinutes,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },

  toCharges(dto: OrderChargesDto): OrderCharges {
    return { ...dto };  // 1:1 — API already returns flat values
  },

  toOrderItem(dto: OrderItemDto): OrderItem {
    return { ...dto };  // 1:1
  },

  toStatusEvent(dto: OrderStatusEventDto): OrderStatusEvent {
    return {
      status: dto.status as OrderStatusEvent['status'],
      timestamp: dto.timestamp,
      note: dto.note,
    };
  },

  // Model → Request: used by cart.service.ts when placing an order
  fromCart(
    cart: { items: CartItem[]; businessId: string },
    options: {
      orderType: Order['orderType'];
      paymentMethod: Order['paymentMethod'];
      deliveryAddressId: string | null;
      tableNumber: string | null;
      numberOfGuests: number | null;
      couponCode: string | null;
      customerNotes: string | null;
    }
  ): CreateOrderRequest {
    return {
      businessId: cart.businessId,
      orderType: options.orderType,
      paymentMethod: options.paymentMethod,
      deliveryAddressId: options.deliveryAddressId,
      tableNumber: options.tableNumber,
      numberOfGuests: options.numberOfGuests,
      couponCode: options.couponCode,
      customerNotes: options.customerNotes,
      items: cart.items.map(OrderMapper.fromCartItem),
    };
  },

  fromCartItem(item: CartItem): CreateOrderItemRequest {
    return {
      productId: item.productId,
      variationId: item.selectedVariationId ?? null,
      quantity: item.quantity,
      specialInstructions: item.specialInstructions ?? null,
    };
  },

  toOrderList(dtos: OrderDto[]): Order[] {
    return dtos.map(OrderMapper.toOrder);
  },
};
```

**Mapper usage inside a service (shows the pattern):**
```typescript
// libs/services/src/api/catalog-api.service.ts  (abbreviated)
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);

  getProducts(businessId: string): Observable<Product[]> {
    return this.http
      .get<ProductDto[]>(`/api/businesses/${businessId}/products`)
      .pipe(map(dtos => CatalogMapper.toProductList(dtos)));
    //         ↑ service returns typed Model, never raw DTO
  }
}
```

### 4.3 `@zitro/utils`

Pure TypeScript — no Angular, no HTTP. Safe to import anywhere including test files.

```typescript
// libs/utils/src/validators.util.ts
export const Validators = {
  isIndianPhone: (phone: string): boolean =>
    /^[6-9]\d{9}$/.test(phone.replace(/\s/g, '')),

  isValidEmail: (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  isValidOtp: (otp: string): boolean =>
    /^\d{6}$/.test(otp),

  isValidPincode: (pincode: string): boolean =>
    /^\d{6}$/.test(pincode),

  isValidGst: (gst: string): boolean =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst),
};

// libs/utils/src/formatters.util.ts
export const Formatters = {
  currency: (amount: number, currency = 'INR'): string =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(amount),

  // ₹249
  currencyShort: (amount: number): string => `₹${amount}`,

  // "2 mins ago" / "1 hr ago"
  relativeTime: (isoDate: string): string => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
    return new Date(isoDate).toLocaleDateString('en-IN');
  },

  // "20 mins" / "1 hr 15 mins"
  duration: (minutes: number): string => {
    if (minutes < 60) return `${minutes} mins`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
  },

  phone: (phone: string): string =>
    phone.replace(/^\+91/, '').replace(/(\d{5})(\d{5})/, '$1 $2'),
};

// libs/utils/src/geo.util.ts
import { getDistance } from 'geolib';

export const Geo = {
  distanceKm: (from: { lat: number; lng: number }, to: { lat: number; lng: number }): number =>
    getDistance(
      { latitude: from.lat, longitude: from.lng },
      { latitude: to.lat, longitude: to.lng }
    ) / 1000,

  isWithinRadius: (
    point: { lat: number; lng: number },
    center: { lat: number; lng: number },
    radiusKm: number
  ): boolean => Geo.distanceKm(point, center) <= radiusKm,
};
```

### 4.4 `@zitro/services`

#### HTTP Interceptors

```typescript
// libs/services/src/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStateService } from '../auth-state.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStateService);
  const token = auth.getToken();
  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};

// libs/services/src/interceptors/business-id.interceptor.ts
export const businessIdInterceptor: HttpInterceptorFn = (req, next) => {
  const businessId = inject(BusinessSelectionService).getSelectedBusinessId();
  if (!businessId) return next(req);

  return next(req.clone({
    setHeaders: { 'X-Business-Id': businessId }
  }));
};

// libs/services/src/interceptors/error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) inject(AuthStateService).signOut();
      return throwError(() => err);
    })
  );
};
```

#### API Services (one per domain)

```typescript
// libs/services/src/api/order-api.service.ts
@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private http = inject(HttpClient);
  private base = '/api/orders';

  placeOrder(payload: PlaceOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.base, payload);
  }

  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.base}/${orderId}`);
  }

  getMyOrders(params?: { page?: number; pageSize?: number; status?: OrderStatus }): Observable<PagedResult<Order>> {
    return this.http.get<PagedResult<Order>>(this.base, { params: params as Record<string, string> });
  }

  cancelOrder(orderId: string, reason: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${orderId}/cancel`, { reason });
  }

  getTimeline(orderId: string): Observable<OrderStatusEvent[]> {
    return this.http.get<OrderStatusEvent[]>(`${this.base}/${orderId}/timeline`);
  }

  reorder(orderId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${orderId}/reorder`, {});
  }
}

// libs/services/src/api/app-config-api.service.ts
@Injectable({ providedIn: 'root' })
export class AppConfigApiService {
  private http = inject(HttpClient);

  getAppConfig(params: AppConfigRequest): Observable<AppConfig> {
    return this.http.get<AppConfig>('/api/app-config', { params: params as Record<string, string> });
  }

  getTranslations(lang: string, app: string): Observable<TranslationsResponse> {
    return this.http.get<TranslationsResponse>('/api/translations', { params: { lang, app } });
  }

  getSupportedLanguages(): Observable<Language[]> {
    return this.http.get<Language[]>('/api/app-config/supported-languages');
  }
}
```

#### `FeatureFlagService`

```typescript
// libs/services/src/feature-flag.service.ts
@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  private config = signal<AppConfig | null>(null);

  load(appConfig: AppConfig): void {
    this.config.set(appConfig);
  }

  isEnabled(feature: keyof AppFeatureFlags): boolean {
    return this.config()?.features[feature] ?? false;
  }

  get<T>(path: string): T | undefined {
    const parts = path.split('.');
    let current: unknown = this.config()?.ui;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current as T;
  }
}
```

---

## 5. Component Design System

### Philosophy

- Every component: **standalone**, **< 150 lines** of TypeScript
- All behavior controlled by a typed **config input** with defaults
- **Signal inputs** (`input()`, `output()`) — no `@Input()/@Output()`
- Components use **only CSS tokens** — never hardcode colors or pixel values
- Every interactive element has **`data-testid`** — required for Playwright
- Template logic via `@if`, `@for`, `@switch` (Angular 17+ control flow)

### Config Object Pattern

Every non-trivial component ships with a config interface and defaults object:

```typescript
// libs/ui/src/address/address-list/address-list.config.ts
export interface AddressListConfig {
  selectionMode: 'none' | 'single';
  showAddButton: boolean;
  showEditButton: boolean;
  showDeleteButton: boolean;
  showDefaultBadge: boolean;
  maxAddresses: number;
}

export const ADDRESS_LIST_DEFAULTS: AddressListConfig = {
  selectionMode: 'none',
  showAddButton: true,
  showEditButton: true,
  showDeleteButton: true,
  showDefaultBadge: true,
  maxAddresses: 10,
};
```

```typescript
// libs/ui/src/address/address-list/address-list.component.ts
@Component({
  selector: 'zitro-address-list',
  standalone: true,
  imports: [AddressCardComponent, I18nPipe, MatButtonModule],
  templateUrl: './address-list.component.html',
  styleUrl: './address-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressListComponent {
  config = input<Partial<AddressListConfig>>({});
  addresses = input.required<Address[]>();
  addressSelected = output<Address>();
  addNewClicked = output<void>();

  protected effectiveConfig = computed<AddressListConfig>(() => ({
    ...ADDRESS_LIST_DEFAULTS,
    ...this.config(),
  }));

  protected onSelect(address: Address): void {
    if (this.effectiveConfig().selectionMode !== 'none') {
      this.addressSelected.emit(address);
    }
  }
}
```

```html
<!-- libs/ui/src/address/address-list/address-list.component.html -->
<div class="address-list" data-testid="address-list">
  @for (address of addresses(); track address.id) {
    <zitro-address-card
      [address]="address"
      [showEdit]="effectiveConfig().showEditButton"
      [showDelete]="effectiveConfig().showDeleteButton"
      [showDefaultBadge]="effectiveConfig().showDefaultBadge"
      [attr.data-testid]="'address-card-' + address.id"
      (click)="onSelect(address)" />
  } @empty {
    <zitro-empty-state
      [message]="'address.empty_state' | zitroT"
      data-testid="address-empty" />
  }

  @if (effectiveConfig().showAddButton && addresses().length < effectiveConfig().maxAddresses) {
    <button
      mat-stroked-button
      data-testid="add-address-btn"
      (click)="addNewClicked.emit()">
      {{ 'address.add_button' | zitroT }}
    </button>
  }
</div>
```

```scss
/* libs/ui/src/address/address-list/address-list.component.scss */
/* Only CSS tokens — never hex values or hardcoded pixels */
.address-list {
  display: flex;
  flex-direction: column;
  gap: var(--zitro-space-3);
  padding: var(--zitro-space-4);

  button {
    border-radius: var(--zitro-radius-sm);
    border-color: var(--zitro-color-primary);
    color: var(--zitro-color-primary);
  }
}
```

### Usage in Different Apps

```html
<!-- Customer app: select delivery address -->
<zitro-address-list
  [addresses]="userAddresses()"
  [config]="{ selectionMode: 'single' }"
  (addressSelected)="onDeliveryAddressSelected($event)"
  (addNewClicked)="router.navigate(['/add-address'])" />

<!-- Restaurant portal: show branch address (display only) -->
<zitro-address-list
  [addresses]="[branchAddress()]"
  [config]="{ showAddButton: false, showEditButton: false, showDeleteButton: false }" />

<!-- Admin: manage all addresses, no selection -->
<zitro-address-list
  [addresses]="customerAddresses()"
  [config]="{ showAddButton: false, selectionMode: 'none' }" />
```

### Product Card — Multi-App Config

```typescript
// libs/ui/src/catalog/product-card/product-card.config.ts
export interface ProductCardConfig {
  showFavoriteButton: boolean;    // customer app: yes | admin: no
  showAddToCart: boolean;         // customer/POS: yes | restaurant: no
  showEditButton: boolean;        // restaurant/admin: yes | customer: no
  showStockToggle: boolean;       // restaurant portal: yes | others: no
  showPriceOverride: boolean;     // restaurant portal: yes | others: no
  imageAspectRatio: '1:1' | '4:3' | '16:9';
  layout: 'card' | 'row' | 'pos'; // pos layout is compact for touch screens
}

export const PRODUCT_CARD_DEFAULTS: ProductCardConfig = {
  showFavoriteButton: false,
  showAddToCart: true,
  showEditButton: false,
  showStockToggle: false,
  showPriceOverride: false,
  imageAspectRatio: '4:3',
  layout: 'card',
};
```

---

## 6. Multi-Language Architecture

### Overview

Three layers, merged at app startup, highest priority wins:

```
App-level overrides  (app's own static text not in shared libs)
        ↓ merges into
Backend translations  (fetched from /api/translations, cached 24hrs)
        ↓ merges into
Package defaults      (EN strings bundled in @zitro/i18n, always available)
```

### Default English Strings (`@zitro/i18n`)

All translation keys are namespaced by domain. These are the absolute fallback — guaranteed available even offline on first launch.

```typescript
// libs/i18n/src/defaults/en.ts
export const EN_DEFAULTS: Record<string, string> = {
  // ── Address ──────────────────────────────────────────
  'address.title':                  'My Addresses',
  'address.add_button':             'Add New Address',
  'address.save_button':            'Save Address',
  'address.delete_confirm':         'Delete this address?',
  'address.empty_state':            'No saved addresses yet',
  'address.label.home':             'Home',
  'address.label.work':             'Work',
  'address.label.other':            'Other',
  'address.set_default':            'Set as default',
  'address.default_badge':          'Default',
  'address.field.house':            'House / Flat / Building',
  'address.field.landmark':         'Landmark (optional)',
  'address.field.pincode':          'Pincode',
  'address.field.town':             'Town / City',

  // ── Auth ──────────────────────────────────────────────
  'auth.enter_phone':               'Enter your mobile number',
  'auth.phone_placeholder':         '10-digit mobile number',
  'auth.enter_otp':                 'Enter OTP sent to {{phone}}',
  'auth.resend_otp':                'Resend OTP',
  'auth.resend_countdown':          'Resend in {{seconds}}s',
  'auth.continue_guest':            'Continue as Guest',
  'auth.login_title':               'Sign In',
  'auth.otp_sent':                  'OTP sent successfully',
  'auth.otp_invalid':               'Invalid OTP. Please try again.',
  'auth.otp_expired':               'OTP has expired. Please resend.',
  'auth.too_many_attempts':         'Too many attempts. Try again in {{minutes}} minutes.',

  // ── Cart ──────────────────────────────────────────────
  'cart.title':                     'Your Cart',
  'cart.place_order':               'Place Order',
  'cart.empty_state':               'Your cart is empty',
  'cart.empty_cta':                 'Start ordering',
  'cart.coupon_applied':            '{{code}} applied! You save ₹{{amount}}',
  'cart.coupon_remove':             'Remove',
  'cart.free_delivery_message':     'Add ₹{{amount}} more for free delivery',
  'cart.free_delivery_unlocked':    'You got free delivery!',
  'cart.order_type.delivery':       'Delivery',
  'cart.order_type.takeout':        'Takeout',
  'cart.order_type.dine_in':        'Dine-In',
  'cart.payment.cash':              'Cash on Delivery',
  'cart.payment.online':            'Pay Online',
  'cart.payment.wallet':            'Zitro Wallet',

  // ── Catalog / Listing ─────────────────────────────────
  'listing.search_placeholder':     'Search for dishes...',
  'listing.no_results':             'No results for "{{query}}"',
  'listing.no_results_cta':         'Try a different search',
  'listing.veg_filter':             'Pure Veg',
  'listing.filter.all':             'All',
  'listing.filter.new':             'New',
  'listing.filter.spicy':           'Spicy',
  'listing.empty_category':         'No items in this category',

  // ── Order ─────────────────────────────────────────────
  'order.status.pending':           'Order Placed',
  'order.status.confirmed':         'Confirmed',
  'order.status.preparing':         'Being Prepared',
  'order.status.ready':             'Ready',
  'order.status.shipped':           'Out for Delivery',
  'order.status.delivered':         'Delivered',
  'order.status.completed':         'Completed',
  'order.status.cancelled':         'Cancelled',
  'order.cancel_button':            'Cancel Order',
  'order.cancel_confirm':           'Are you sure you want to cancel this order?',
  'order.eta_message':              'Arriving in {{minutes}} minutes',
  'order.empty_state':              'No orders yet',
  'order.reorder_button':           'Reorder',
  'order.timeline_title':           'Order Timeline',

  // ── Common ────────────────────────────────────────────
  'common.retry':                   'Retry',
  'common.cancel':                  'Cancel',
  'common.confirm':                 'Confirm',
  'common.save':                    'Save',
  'common.delete':                  'Delete',
  'common.edit':                    'Edit',
  'common.loading':                 'Loading...',
  'common.no_internet':             'No internet connection',
  'common.no_internet_message':     'Check your connection and try again',
  'common.error':                   'Something went wrong',
  'common.error_retry':             'Something went wrong. Please try again.',
  'common.update_available':        'Update Available',
  'common.update_message':          'A new version of the app is available.',
  'common.update_now':              'Update Now',
  'common.update_later':            'Later',
};
```

### `I18nService`

```typescript
// libs/i18n/src/i18n.service.ts
import { Injectable, signal } from '@angular/core';

export interface I18nInitConfig {
  packageDefaults: Record<string, string>;
  backendKeys?: Record<string, string>;
  appOverrides?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  private translations = signal<Record<string, string>>({});
  private activeLang = signal<string>('en');

  init(config: I18nInitConfig): void {
    this.translations.set({
      ...config.packageDefaults,       // base: EN strings (always present)
      ...(config.backendKeys ?? {}),   // language-specific from API
      ...(config.appOverrides ?? {}),  // app-specific overrides (highest priority)
    });
  }

  get(key: string, params?: Record<string, string | number>): string {
    let text = this.translations()[key];
    if (text === undefined) {
      console.warn(`[I18n] Missing translation key: "${key}"`);
      return key;  // return key as fallback — visible in UI so missing keys are obvious
    }
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }
    return text;
  }

  setLang(lang: string): void {
    this.activeLang.set(lang);
    localStorage.setItem('zitro-lang', lang);
  }

  getLang(): string {
    return this.activeLang();
  }

  // Called when backend translations are hot-swapped (language switch at runtime)
  updateKeys(backendKeys: Record<string, string>, packageDefaults: Record<string, string>): void {
    this.translations.update(current => ({
      ...packageDefaults,
      ...backendKeys,
      // Preserve any app-level overrides that were set
    }));
  }
}
```

### `I18nPipe`

```typescript
// libs/i18n/src/i18n.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

@Pipe({ name: 'zitroT', standalone: true, pure: false })
export class I18nPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.get(key, params);
  }
}
```

### APP_INITIALIZER Integration

```typescript
// apps/zitro-customer/src/app/app.config.ts
import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { I18nService, EN_DEFAULTS } from '@zitro/i18n';
import { ThemeService } from '@zitro/theme';
import { AppConfigApiService, FeatureFlagService } from '@zitro/services';
import {
  authInterceptor,
  businessIdInterceptor,
  errorInterceptor,
} from '@zitro/services';
import { routes } from './app.routes';

function detectUserLanguage(): string {
  return (
    localStorage.getItem('zitro-lang') ??
    navigator.language.split('-')[0] ??
    'en'
  );
}

async function getAppVersion(): Promise<string> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info.version;
  } catch {
    return '1.0.0';  // web fallback
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, businessIdInterceptor, errorInterceptor])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: (
        i18n: I18nService,
        theme: ThemeService,
        flags: FeatureFlagService,
        configApi: AppConfigApiService
      ) => async () => {
        const lang = detectUserLanguage();
        const version = await getAppVersion();

        // Try to fetch app config (translations + themes + feature flags in one call)
        let appConfig = null;
        try {
          appConfig = await configApi
            .getAppConfig({ app: 'customer', platform: 'android', version, lang })
            .toPromise();

          // Cache for offline
          localStorage.setItem('zitro-app-config-cache', JSON.stringify({
            data: appConfig,
            cachedAt: Date.now(),
            lang,
          }));
        } catch {
          // Offline: try cache
          const cached = localStorage.getItem('zitro-app-config-cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.lang === lang) appConfig = parsed.data;
          }
        }

        // i18n: backend keys merged with package defaults
        i18n.init({
          packageDefaults: EN_DEFAULTS,
          backendKeys: appConfig?.translations ?? undefined,
        });

        // themes: backend list or defaults
        theme.init(appConfig?.themes?.available ?? []);

        // feature flags
        if (appConfig) flags.load(appConfig);
      },
      deps: [I18nService, ThemeService, FeatureFlagService, AppConfigApiService],
      multi: true,
    },
  ],
};
```

### Runtime Language Switching

```typescript
// In any settings component
async switchLanguage(newLang: string): Promise<void> {
  this.i18n.setLang(newLang);

  // Fetch new translations from backend
  const response = await this.configApi
    .getTranslations(newLang, 'customer')
    .toPromise();

  // Hot-swap translations → all pipes re-evaluate (pure: false)
  this.i18n.updateKeys(response.keys, EN_DEFAULTS);
}
```

---

## 7. Multi-Theme Architecture

### Design Tokens (`@zitro/theme`)

```scss
/* libs/theme/src/tokens.scss — imported once in each app's styles.scss */
:root {
  /* ── Brand Colors ─────────────────────────────── */
  --zitro-color-primary:          #C73E3A;
  --zitro-color-primary-light:    #E57373;
  --zitro-color-primary-dark:     #9B2D2B;
  --zitro-color-on-primary:       #FFFFFF;
  --zitro-color-secondary:        #FF6B35;
  --zitro-color-on-secondary:     #FFFFFF;

  /* ── Surface & Background ─────────────────────── */
  --zitro-color-surface:          #FFFFFF;
  --zitro-color-on-surface:       #1A1A1A;
  --zitro-color-surface-variant:  #F5F5F5;
  --zitro-color-background:       #F8F8F8;
  --zitro-color-on-background:    #1A1A1A;

  /* ── Semantic ─────────────────────────────────── */
  --zitro-color-error:            #B00020;
  --zitro-color-on-error:         #FFFFFF;
  --zitro-color-success:          #2E7D32;
  --zitro-color-warning:          #F57C00;
  --zitro-color-info:             #0277BD;
  --zitro-color-border:           #E0E0E0;
  --zitro-color-disabled:         #9E9E9E;
  --zitro-color-disabled-bg:      #F5F5F5;
  --zitro-color-overlay:          rgba(0, 0, 0, 0.5);
  --zitro-color-veg:              #2E7D32;
  --zitro-color-non-veg:          #C62828;

  /* ── Typography ───────────────────────────────── */
  --zitro-font-family:            'Roboto', 'Noto Sans', sans-serif;
  --zitro-font-size-xs:           10px;
  --zitro-font-size-sm:           12px;
  --zitro-font-size-md:           14px;
  --zitro-font-size-lg:           16px;
  --zitro-font-size-xl:           20px;
  --zitro-font-size-2xl:          24px;
  --zitro-font-size-3xl:          32px;
  --zitro-font-weight-regular:    400;
  --zitro-font-weight-medium:     500;
  --zitro-font-weight-bold:       700;
  --zitro-line-height-tight:      1.25;
  --zitro-line-height-normal:     1.5;
  --zitro-line-height-relaxed:    1.75;

  /* ── Spacing (4px base unit) ──────────────────── */
  --zitro-space-1:    4px;
  --zitro-space-2:    8px;
  --zitro-space-3:    12px;
  --zitro-space-4:    16px;
  --zitro-space-5:    20px;
  --zitro-space-6:    24px;
  --zitro-space-8:    32px;
  --zitro-space-10:   40px;
  --zitro-space-12:   48px;
  --zitro-space-16:   64px;

  /* ── Shape ────────────────────────────────────── */
  --zitro-radius-xs:   4px;
  --zitro-radius-sm:   8px;
  --zitro-radius-md:   12px;
  --zitro-radius-lg:   16px;
  --zitro-radius-xl:   24px;
  --zitro-radius-full: 9999px;

  /* ── Elevation ────────────────────────────────── */
  --zitro-shadow-xs:  0 1px 3px rgba(0,0,0,0.08);
  --zitro-shadow-sm:  0 2px 6px rgba(0,0,0,0.10);
  --zitro-shadow-md:  0 4px 12px rgba(0,0,0,0.12);
  --zitro-shadow-lg:  0 8px 24px rgba(0,0,0,0.15);

  /* ── Component-specific tokens ────────────────── */
  --zitro-bottom-nav-height:        64px;
  --zitro-header-height:            56px;
  --zitro-card-radius:              var(--zitro-radius-md);
  --zitro-card-shadow:              var(--zitro-shadow-sm);
  --zitro-card-bg:                  var(--zitro-color-surface);
  --zitro-button-radius:            var(--zitro-radius-sm);
  --zitro-input-radius:             var(--zitro-radius-xs);
  --zitro-input-border:             var(--zitro-color-border);
  --zitro-chip-radius:              var(--zitro-radius-full);
}
```

### Built-in Themes

```scss
/* libs/theme/src/themes/_dark.scss */
[data-theme="dark"] {
  --zitro-color-primary:          #FF6B6B;
  --zitro-color-primary-light:    #FF8A80;
  --zitro-color-primary-dark:     #D32F2F;
  --zitro-color-surface:          #1E1E1E;
  --zitro-color-on-surface:       #E8E8E8;
  --zitro-color-surface-variant:  #2C2C2C;
  --zitro-color-background:       #121212;
  --zitro-color-on-background:    #E8E8E8;
  --zitro-color-border:           #3A3A3A;
  --zitro-color-disabled:         #616161;
  --zitro-shadow-sm:              0 2px 6px rgba(0,0,0,0.4);
  --zitro-shadow-md:              0 4px 12px rgba(0,0,0,0.5);
  --zitro-card-bg:                #2C2C2C;
}

/* libs/theme/src/themes/_nature.scss */
[data-theme="nature"] {
  --zitro-color-primary:          #2E7D32;
  --zitro-color-primary-light:    #66BB6A;
  --zitro-color-primary-dark:     #1B5E20;
  --zitro-color-on-primary:       #FFFFFF;
  --zitro-color-secondary:        #F57F17;
}

/* libs/theme/src/themes/_ocean.scss */
[data-theme="ocean"] {
  --zitro-color-primary:          #0277BD;
  --zitro-color-primary-light:    #4FC3F7;
  --zitro-color-primary-dark:     #01579B;
  --zitro-color-secondary:        #00897B;
}
```

### `ThemeService`

```typescript
// libs/theme/src/theme.service.ts
export interface ThemeDefinition {
  id: string;
  name: string;
  previewColor: string;
  isBuiltIn: boolean;
  tokens?: Record<string, string>;
}

export const DEFAULT_THEMES: ThemeDefinition[] = [
  { id: 'default', name: 'Classic Red',  previewColor: '#C73E3A', isBuiltIn: true },
  { id: 'dark',    name: 'Dark Mode',    previewColor: '#1E1E1E', isBuiltIn: true },
  { id: 'nature',  name: 'Fresh Green',  previewColor: '#2E7D32', isBuiltIn: true },
  { id: 'ocean',   name: 'Ocean Blue',   previewColor: '#0277BD', isBuiltIn: true },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly activeThemeId = signal<string>('default');
  readonly availableThemes = signal<ThemeDefinition[]>(DEFAULT_THEMES);

  /** Called at startup with themes from app-config API */
  init(themes: ThemeDefinition[]): void {
    // Merge built-in themes with any backend-added custom themes
    const merged = [
      ...DEFAULT_THEMES,
      ...themes.filter(t => !DEFAULT_THEMES.some(d => d.id === t.id)),
    ];
    this.availableThemes.set(merged);

    const saved = localStorage.getItem('zitro-theme') ?? 'default';
    this.apply(saved, { silent: true });
  }

  apply(themeId: string, options: { silent?: boolean } = {}): void {
    const theme = this.availableThemes().find(t => t.id === themeId);
    if (!theme) return;

    const root = document.documentElement;

    if (theme.isBuiltIn) {
      this.clearCustomTokens(root);
      root.setAttribute('data-theme', themeId);
    } else {
      // Custom theme from backend: inject tokens directly
      root.setAttribute('data-theme', 'custom');
      if (theme.tokens) {
        Object.entries(theme.tokens).forEach(([key, value]) => {
          root.style.setProperty(key, value);
        });
      }
    }

    this.activeThemeId.set(themeId);
    if (!options.silent) {
      localStorage.setItem('zitro-theme', themeId);
    }
  }

  private clearCustomTokens(root: HTMLElement): void {
    // Remove previously injected inline tokens (from a custom theme)
    const toRemove = Array.from(root.style).filter(p => p.startsWith('--zitro-'));
    toRemove.forEach(p => root.style.removeProperty(p));
  }
}
```

### `ThemePickerComponent`

```typescript
// libs/ui/src/common/theme-picker/theme-picker.component.ts
@Component({
  selector: 'zitro-theme-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="theme-picker" role="radiogroup" [attr.aria-label]="'settings.select_theme' | zitroT">
      @for (theme of themeService.availableThemes(); track theme.id) {
        <button
          class="swatch"
          role="radio"
          [class.active]="theme.id === themeService.activeThemeId()"
          [style.background]="theme.previewColor"
          [attr.aria-label]="theme.name"
          [attr.aria-checked]="theme.id === themeService.activeThemeId()"
          [attr.data-testid]="'theme-swatch-' + theme.id"
          (click)="themeService.apply(theme.id)">
          @if (theme.id === themeService.activeThemeId()) {
            <mat-icon class="check">check</mat-icon>
          }
        </button>
      }
    </div>
  `,
})
export class ThemePickerComponent {
  protected themeService = inject(ThemeService);
}
```

---

## 8. Backend-Driven Configuration

### `GET /api/app-config` — Response Structure

```typescript
// libs/models/src/app-config.model.ts
export interface AppConfigRequest {
  app: 'customer' | 'delivery' | 'pos' | 'restaurant' | 'admin' | 'superadmin';
  platform: 'android' | 'ios' | 'web';
  version: string;
  lang: string;
}

export interface AppFeatureFlags {
  wallet: boolean;
  subscriptions: boolean;
  gameRewards: boolean;
  reorder: boolean;
  liveTracking: boolean;
  razorpayPayments: boolean;
  cashPayments: boolean;
  onlinePayments: boolean;
  ratingsAndReviews: boolean;
  referralProgram: boolean;
  pushNotifications: boolean;
  tableBooking: boolean;
  preorderScheduling: boolean;
}

export interface AppUiConfig {
  primaryColor: string;            // Overrides --zitro-color-primary if set
  showRestaurantStatusBadge: boolean;
  homePageSections: ('banners' | 'categories' | 'popular' | 'recommended' | 'near_you')[];
  cartMinOrderAmount: number;
  orderCancellationWindowSeconds: number;
  maxCartItems: number;
  maxAddresses: number;
  searchDebounceMs: number;
}

export interface AppMaintenanceConfig {
  isUnderMaintenance: boolean;
  maintenanceTitle: string | null;
  maintenanceMessage: string | null;
}

export interface AppConfig {
  features: AppFeatureFlags;
  ui: AppUiConfig;
  maintenance: AppMaintenanceConfig;
  translations: Record<string, string>;  // language-specific keys (diff from EN)
  themes: {
    available: ThemeDefinition[];
    userDefault: string;
  };
}
```

---

## 9. Centralized Test Data

This mirrors the backend's `Zitro.TestData` project exactly. One package, all test data, consumed by every test type.

### JSON Fixtures

All data is real-looking, uses actual Indian names and places, matches the backend test data.

```json
// libs/test-data/src/_fixtures/customers.json
[
  {
    "id": "c0000000-0000-0000-0000-000000000001",
    "firebaseUid": "firebase_aarav_001",
    "name": "Aarav Sharma",
    "phoneNumber": "+919876543210",
    "email": "aarav.sharma@gmail.com",
    "referralCode": "AARAV2024",
    "isActive": true,
    "totalOrders": 7,
    "segment": "regular"
  },
  {
    "id": "c0000000-0000-0000-0000-000000000002",
    "firebaseUid": "firebase_priya_002",
    "name": "Priya Gupta",
    "phoneNumber": "+919765432109",
    "email": "priya.gupta@gmail.com",
    "referralCode": "PRIYA2024",
    "isActive": true,
    "totalOrders": 23,
    "segment": "frequent"
  },
  {
    "id": "c0000000-0000-0000-0000-000000000003",
    "firebaseUid": "firebase_rohan_003",
    "name": "Rohan Verma",
    "phoneNumber": "+919654321098",
    "email": "rohan.verma@outlook.com",
    "referralCode": "ROHAN2024",
    "isActive": true,
    "totalOrders": 2,
    "segment": "new"
  },
  {
    "id": "c0000000-0000-0000-0000-000000000004",
    "firebaseUid": "firebase_sneha_004",
    "name": "Sneha Singh",
    "phoneNumber": "+919543210987",
    "email": "sneha.singh@gmail.com",
    "referralCode": "SNEHA2024",
    "isActive": false,
    "totalOrders": 1,
    "segment": "churned"
  }
]
```

```json
// libs/test-data/src/_fixtures/restaurants.json
[
  {
    "id": "b0000000-0000-0000-0000-000000000001",
    "slug": "hunger_point",
    "name": "The Hunger Point",
    "businessType": "Restaurant",
    "description": "Multi-cuisine restaurant in Dibiyapur, UP",
    "phoneNumber": "+919193116659",
    "email": "hungerpointdibiyapur@gmail.com",
    "pincode": "206244",
    "town": "Dibiyapur",
    "state": "Uttar Pradesh",
    "lat": 26.4183,
    "lng": 79.4791,
    "isActive": true,
    "isOpen": true,
    "rating": 4.5,
    "totalRatings": 127,
    "openTime": "10:00",
    "closeTime": "21:00",
    "deliveryFee": 40,
    "minOrderAmount": 250,
    "estimatedDeliveryMinutes": 40
  },
  {
    "id": "b0000000-0000-0000-0000-000000000002",
    "slug": "efc-pizza",
    "name": "EFC Pizza",
    "businessType": "Restaurant",
    "description": "Pizza and fast food in Gurshaiganj",
    "phoneNumber": "+919876543211",
    "email": "efcpizza@gmail.com",
    "pincode": "209722",
    "town": "Gurshaiganj",
    "state": "Uttar Pradesh",
    "lat": 26.7523,
    "lng": 79.5421,
    "isActive": true,
    "isOpen": true,
    "rating": 4.2,
    "totalRatings": 84,
    "openTime": "10:00",
    "closeTime": "21:00",
    "deliveryFee": 40,
    "minOrderAmount": 100,
    "estimatedDeliveryMinutes": 35
  },
  {
    "id": "b0000000-0000-0000-0000-000000000003",
    "slug": "tularam-kirana-store",
    "name": "Tularam Kirana Store",
    "businessType": "Grocery",
    "description": "Daily essentials and grocery in Gurshaiganj",
    "phoneNumber": "+919432109876",
    "email": "tulakaramkirana@gmail.com",
    "pincode": "209722",
    "town": "Gurshaiganj",
    "state": "Uttar Pradesh",
    "lat": 26.7540,
    "lng": 79.5430,
    "isActive": true,
    "isOpen": true,
    "rating": 4.7,
    "totalRatings": 56,
    "openTime": "08:00",
    "closeTime": "21:00",
    "deliveryFee": 40,
    "minOrderAmount": 100,
    "estimatedDeliveryMinutes": 90
  }
]
```

```json
// libs/test-data/src/_fixtures/menu-items.json
[
  {
    "id": "p0000000-0000-0000-0000-000000000001",
    "restaurantSlug": "hunger_point",
    "categoryName": "Main Course",
    "name": "Chicken Biryani",
    "description": "Aromatic basmati rice cooked with tender chicken pieces and whole spices",
    "basePrice": 180,
    "foodType": "NonVeg",
    "isAvailable": true,
    "isFeatured": true,
    "isNew": false,
    "variations": [
      { "name": "Half Plate", "priceModifier": -40, "isDefault": false },
      { "name": "Full Plate", "priceModifier": 0, "isDefault": true }
    ]
  },
  {
    "id": "p0000000-0000-0000-0000-000000000002",
    "restaurantSlug": "hunger_point",
    "categoryName": "Main Course",
    "name": "Paneer Butter Masala",
    "description": "Cottage cheese in rich tomato-cream gravy, best with naan or rice",
    "basePrice": 160,
    "foodType": "Veg",
    "isAvailable": true,
    "isFeatured": true,
    "isNew": false,
    "variations": []
  },
  {
    "id": "p0000000-0000-0000-0000-000000000003",
    "restaurantSlug": "efc-pizza",
    "categoryName": "Pizza",
    "name": "Margherita Pizza",
    "description": "Classic tomato sauce, mozzarella and fresh basil on thin crust",
    "basePrice": 199,
    "foodType": "Veg",
    "isAvailable": true,
    "isFeatured": false,
    "isNew": false,
    "variations": [
      { "name": "Small (6\")",  "priceModifier": -60, "isDefault": false },
      { "name": "Medium (8\")", "priceModifier": 0,   "isDefault": true },
      { "name": "Large (10\")", "priceModifier": 80,  "isDefault": false }
    ]
  },
  {
    "id": "p0000000-0000-0000-0000-000000000004",
    "restaurantSlug": "hunger_point",
    "categoryName": "Starters",
    "name": "Chicken Tikka",
    "description": "Marinated chicken pieces grilled in tandoor, served with mint chutney",
    "basePrice": 220,
    "foodType": "NonVeg",
    "isAvailable": true,
    "isFeatured": false,
    "isNew": true,
    "variations": []
  },
  {
    "id": "p0000000-0000-0000-0000-000000000005",
    "restaurantSlug": "hunger_point",
    "categoryName": "Beverages",
    "name": "Mango Lassi",
    "description": "Fresh yogurt-based mango drink, chilled and refreshing",
    "basePrice": 60,
    "foodType": "Veg",
    "isAvailable": false,
    "isFeatured": false,
    "isNew": false,
    "variations": []
  }
]
```

```json
// libs/test-data/src/_fixtures/orders.json
[
  {
    "id": "o0000000-0000-0000-0000-000000000001",
    "displayId": "ORD-2024-001",
    "customerId": "c0000000-0000-0000-0000-000000000001",
    "customerName": "Aarav Sharma",
    "restaurantSlug": "hunger_point",
    "orderType": "delivery",
    "status": "delivered",
    "subtotal": 340,
    "deliveryCharge": 40,
    "packagingCharge": 10,
    "platformFee": 5,
    "gst": 17,
    "couponDiscount": 0,
    "total": 412,
    "paymentMethod": "cash",
    "isPaid": true,
    "createdAt": "2024-11-15T13:25:00Z"
  },
  {
    "id": "o0000000-0000-0000-0000-000000000002",
    "displayId": "ORD-2024-002",
    "customerId": "c0000000-0000-0000-0000-000000000002",
    "customerName": "Priya Gupta",
    "restaurantSlug": "efc-pizza",
    "orderType": "takeout",
    "status": "preparing",
    "subtotal": 199,
    "deliveryCharge": 0,
    "packagingCharge": 10,
    "platformFee": 5,
    "gst": 10,
    "couponDiscount": 50,
    "total": 174,
    "paymentMethod": "online",
    "isPaid": true,
    "createdAt": "2024-11-15T18:10:00Z"
  },
  {
    "id": "o0000000-0000-0000-0000-000000000003",
    "displayId": "ORD-2024-003",
    "customerId": "c0000000-0000-0000-0000-000000000003",
    "customerName": "Rohan Verma",
    "restaurantSlug": "hunger_point",
    "orderType": "dine-in",
    "status": "cancelled",
    "subtotal": 380,
    "deliveryCharge": 0,
    "packagingCharge": 0,
    "platformFee": 0,
    "gst": 19,
    "couponDiscount": 0,
    "total": 399,
    "paymentMethod": "cash",
    "isPaid": false,
    "createdAt": "2024-11-14T20:45:00Z"
  }
]
```

```json
// libs/test-data/src/_fixtures/addresses.json
[
  {
    "id": "a0000000-0000-0000-0000-000000000001",
    "customerId": "c0000000-0000-0000-0000-000000000001",
    "name": "Aarav Sharma",
    "phone": "+919876543210",
    "houseAndStreet": "Plot 12, Shivaji Nagar, Near Water Tank",
    "landmark": "Opposite SBI Bank",
    "pincode": "206244",
    "town": "Dibiyapur",
    "state": "Uttar Pradesh",
    "type": "Home",
    "isDefault": true,
    "lat": 26.4195,
    "lng": 79.4802
  },
  {
    "id": "a0000000-0000-0000-0000-000000000002",
    "customerId": "c0000000-0000-0000-0000-000000000002",
    "name": "Priya Gupta",
    "phone": "+919765432109",
    "houseAndStreet": "Flat 4B, Radha Apartments, Civil Lines",
    "landmark": "Near District Hospital",
    "pincode": "206244",
    "town": "Dibiyapur",
    "state": "Uttar Pradesh",
    "type": "Home",
    "isDefault": true,
    "lat": 26.4175,
    "lng": 79.4780
  }
]
```

```json
// libs/test-data/src/_fixtures/coupons.json
[
  {
    "id": "cp000000-0000-0000-0000-000000000001",
    "code": "WELCOME50",
    "title": "Welcome Offer",
    "description": "Flat ₹50 off on your first order",
    "discountType": "flat",
    "discountValue": 50,
    "minOrderValue": 200,
    "maxDiscountAmount": 50,
    "applicableOrderTypes": ["delivery", "takeout"],
    "isActive": true,
    "usageLimit": 1000,
    "perUserLimit": 1,
    "validUntil": "2025-12-31T23:59:59Z"
  },
  {
    "id": "cp000000-0000-0000-0000-000000000002",
    "code": "SAVE20",
    "title": "20% Off",
    "description": "20% off up to ₹100 on orders above ₹300",
    "discountType": "percentage",
    "discountValue": 20,
    "minOrderValue": 300,
    "maxDiscountAmount": 100,
    "applicableOrderTypes": ["delivery", "takeout", "dine-in"],
    "isActive": true,
    "usageLimit": 5000,
    "perUserLimit": 3,
    "validUntil": "2025-12-31T23:59:59Z"
  },
  {
    "id": "cp000000-0000-0000-0000-000000000003",
    "code": "EXPIRED10",
    "title": "Old Offer",
    "description": "This coupon has expired",
    "discountType": "flat",
    "discountValue": 10,
    "minOrderValue": 100,
    "maxDiscountAmount": 10,
    "applicableOrderTypes": ["delivery"],
    "isActive": false,
    "usageLimit": 100,
    "perUserLimit": 1,
    "validUntil": "2023-01-01T00:00:00Z"
  }
]
```

### `FixtureLoader` (mirrors `TestDataLoader.cs`)

```typescript
// libs/test-data/src/loaders/fixture-loader.ts
type FixtureFile =
  | 'customers'
  | 'restaurants'
  | 'menu-items'
  | 'categories'
  | 'orders'
  | 'addresses'
  | 'coupons'
  | 'delivery-partners';

// Cached in-memory — loaded once per test suite run
const cache = new Map<string, unknown[]>();

export function loadFixture<T>(name: FixtureFile): T[] {
  if (cache.has(name)) return cache.get(name) as T[];

  // Dynamic import ensures tree-shaking removes fixtures from production builds
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(`../_fixtures/${name}.json`) as T[];
  cache.set(name, data);
  return data;
}

export function clearFixtureCache(): void {
  cache.clear();
}
```

### Builders (mirrors `RepositoryTestFixtures.cs` pattern)

```typescript
// libs/test-data/src/builders/customer.builders.ts
import { loadFixture } from '../loaders/fixture-loader';
import type { User, Address } from '@zitro/models';

type PartialOverride<T> = Partial<T>;

function buildCustomer(
  phoneNumber: string,
  overrides: PartialOverride<User> = {}
): User {
  const all = loadFixture<User>('customers');
  const base = all.find(c => c.phoneNumber === phoneNumber)!;
  return { ...base, ...overrides };
}

export const CustomerBuilders = {
  /** Aarav Sharma — regular customer, 7 orders */
  aaravSharma: (overrides: PartialOverride<User> = {}): User =>
    buildCustomer('+919876543210', overrides),

  /** Priya Gupta — frequent customer, 23 orders */
  priyaGupta: (overrides: PartialOverride<User> = {}): User =>
    buildCustomer('+919765432109', overrides),

  /** Rohan Verma — new customer, 2 orders */
  rohanVerma: (overrides: PartialOverride<User> = {}): User =>
    buildCustomer('+919654321098', overrides),

  /** Sneha Singh — inactive customer */
  snehaInactive: (overrides: PartialOverride<User> = {}): User =>
    buildCustomer('+919543210987', { ...overrides }),

  /** All customers from fixture file */
  all: (): User[] => loadFixture<User>('customers'),

  /** Guest (not in fixture — runtime generated) */
  guest: (): Partial<User> => ({
    id: 'guest-00000001',
    name: 'Guest User',
    phoneNumber: '',
    isActive: true,
  }),
};

export const AddressBuilders = {
  aaravHome: (overrides: PartialOverride<Address> = {}): Address => ({
    ...loadFixture<Address>('addresses').find(a => a.id === 'a0000000-0000-0000-0000-000000000001')!,
    ...overrides,
  }),

  priyaHome: (overrides: PartialOverride<Address> = {}): Address => ({
    ...loadFixture<Address>('addresses').find(a => a.id === 'a0000000-0000-0000-0000-000000000002')!,
    ...overrides,
  }),

  allForCustomer: (customerId: string): Address[] =>
    loadFixture<Address>('addresses').filter(a => a.customerId === customerId),
};
```

```typescript
// libs/test-data/src/builders/catalog.builders.ts
import { loadFixture } from '../loaders/fixture-loader';
import type { Product } from '@zitro/models';

type PartialOverride<T> = Partial<T>;

function buildProduct(name: string, overrides: PartialOverride<Product> = {}): Product {
  const all = loadFixture<Product>('menu-items');
  const base = all.find(p => p.name === name)!;
  return { ...base, ...overrides };
}

export const CatalogBuilders = {
  /** Chicken Biryani — NonVeg, featured, ₹180, 2 variations */
  chickenBiryani: (overrides: PartialOverride<Product> = {}): Product =>
    buildProduct('Chicken Biryani', overrides),

  /** Paneer Butter Masala — Veg, featured, ₹160, no variations */
  paneerButterMasala: (overrides: PartialOverride<Product> = {}): Product =>
    buildProduct('Paneer Butter Masala', overrides),

  /** Margherita Pizza — Veg, 3 size variations */
  margheritaPizza: (overrides: PartialOverride<Product> = {}): Product =>
    buildProduct('Margherita Pizza', overrides),

  /** Chicken Tikka — NonVeg, new item, ₹220 */
  chickenTikka: (overrides: PartialOverride<Product> = {}): Product =>
    buildProduct('Chicken Tikka', overrides),

  /** Mango Lassi — Veg, unavailable (isAvailable: false) */
  mangoLassiUnavailable: (overrides: PartialOverride<Product> = {}): Product =>
    buildProduct('Mango Lassi', overrides),

  allForRestaurant: (slug: string): Product[] =>
    loadFixture<Product>('menu-items').filter(p => p.restaurantSlug === slug),

  allVeg: (): Product[] =>
    loadFixture<Product>('menu-items').filter(p => p.foodType === 'Veg'),

  allAvailable: (): Product[] =>
    loadFixture<Product>('menu-items').filter(p => p.isAvailable),
};
```

```typescript
// libs/test-data/src/builders/order.builders.ts
import { loadFixture } from '../loaders/fixture-loader';
import type { Order, OrderItem, OrderCharges } from '@zitro/models';

export const OrderBuilders = {
  /** Aarav's delivered delivery order — ₹412 total */
  aaravDeliveredOrder: (overrides: Partial<Order> = {}): Order => ({
    ...loadFixture<Order>('orders').find(o => o.displayId === 'ORD-2024-001')!,
    ...overrides,
  }),

  /** Priya's in-progress takeout — currently preparing */
  priyaPreparingOrder: (overrides: Partial<Order> = {}): Order => ({
    ...loadFixture<Order>('orders').find(o => o.displayId === 'ORD-2024-002')!,
    ...overrides,
  }),

  /** Rohan's cancelled dine-in */
  rohanCancelledOrder: (overrides: Partial<Order> = {}): Order => ({
    ...loadFixture<Order>('orders').find(o => o.displayId === 'ORD-2024-003')!,
    ...overrides,
  }),

  /** Build a minimal pending order for unit tests */
  pendingDeliveryOrder: (overrides: Partial<Order> = {}): Order => ({
    id: 'o-test-pending',
    displayId: 'ORD-TEST-001',
    userId: CustomerBuilders.aaravSharma().id,
    businessId: 'b0000000-0000-0000-0000-000000000001',
    businessName: 'The Hunger Point',
    orderType: 'delivery',
    status: 'pending',
    items: [],
    charges: {
      subtotal: 340,
      deliveryCharge: 40,
      packagingCharge: 10,
      platformFee: 5,
      gst: 17,
      couponDiscount: 0,
      walletDiscount: 0,
      total: 412,
    },
    paymentMethod: 'cash',
    isPaid: false,
    deliveryAddress: AddressBuilders.aaravHome(),
    tableNumber: null,
    numberOfGuests: null,
    scheduledPickupTime: null,
    appliedCouponCode: null,
    customerNotes: null,
    statusTimeline: [{ status: 'pending', timestamp: new Date().toISOString(), note: null }],
    estimatedDeliveryMinutes: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  all: (): Order[] => loadFixture<Order>('orders'),
};

// Re-import so it's usable in the same file
import { CustomerBuilders, AddressBuilders } from './customer.builders';
```

```typescript
// libs/test-data/src/builders/cart.builders.ts
import type { CartItem, PricingBreakdown } from '@zitro/models';
import { CatalogBuilders } from './catalog.builders';

export const CartBuilders = {
  /** Two items: Chicken Biryani + Paneer Butter Masala */
  twoItemCart: (): CartItem[] => [
    { ...CatalogBuilders.chickenBiryani(), quantity: 1, selectedVariation: null },
    { ...CatalogBuilders.paneerButterMasala(), quantity: 2, selectedVariation: null },
  ],

  /** Single item at min order amount */
  singleItemMinOrder: (): CartItem[] => [
    { ...CatalogBuilders.chickenBiryani(), quantity: 1, selectedVariation: null },
  ],

  /** Cart with variation selected (Margherita large) */
  cartWithVariation: (): CartItem[] => {
    const pizza = CatalogBuilders.margheritaPizza();
    return [{
      ...pizza,
      quantity: 1,
      selectedVariation: pizza.variations.find(v => v.name.includes('Large'))!,
    }];
  },

  /** Pricing for twoItemCart + delivery */
  twoItemCartPricing: (): PricingBreakdown => ({
    subtotal: 500,
    deliveryCharge: 40,
    packagingCharge: 10,
    platformFee: 5,
    gst: 25,
    couponDiscount: 0,
    total: 580,
    freeDeliveryThreshold: 500,
    amountForFreeDelivery: 0,
    totalSavings: 0,
  }),
};
```

### Central Export

```typescript
// libs/test-data/src/index.ts
export { loadFixture, clearFixtureCache } from './loaders/fixture-loader';
export { CustomerBuilders, AddressBuilders } from './builders/customer.builders';
export { RestaurantBuilders } from './builders/restaurant.builders';
export { CatalogBuilders } from './builders/catalog.builders';
export { OrderBuilders } from './builders/order.builders';
export { CartBuilders } from './builders/cart.builders';
export { CouponBuilders } from './builders/coupon.builders';

// Re-export everything as a single Builders namespace for ergonomic imports
export * as Builders from './builders/index';
```

### MSW Handlers (Integration Tests)

```typescript
// libs/test-data/src/msw/handlers.ts
import { http, HttpResponse } from 'msw';
import { OrderBuilders, CatalogBuilders, CustomerBuilders } from '../builders/index';

export const handlers = [
  // Products
  http.get('/api/products', () =>
    HttpResponse.json({
      items: CatalogBuilders.allAvailable(),
      total: CatalogBuilders.allAvailable().length,
    })
  ),

  // Orders
  http.get('/api/orders', () =>
    HttpResponse.json({
      items: OrderBuilders.all(),
      total: OrderBuilders.all().length,
      page: 1,
      pageSize: 20,
    })
  ),

  http.get('/api/orders/:orderId', ({ params }) => {
    const order = OrderBuilders.all().find(o => o.id === params['orderId']);
    if (!order) return HttpResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
    return HttpResponse.json(order);
  }),

  http.post('/api/orders', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(OrderBuilders.pendingDeliveryOrder({ ...body }), { status: 201 });
  }),

  http.put('/api/orders/:orderId/cancel', () =>
    HttpResponse.json(null, { status: 204 })
  ),

  // Cart coupon
  http.post('/api/cart/coupon', async ({ request }) => {
    const body = await request.json() as { couponCode: string };
    if (body.couponCode === 'INVALID') {
      return HttpResponse.json({ error: 'COUPON_NOT_FOUND' }, { status: 404 });
    }
    if (body.couponCode === 'EXPIRED10') {
      return HttpResponse.json({ error: 'COUPON_EXPIRED' }, { status: 422 });
    }
    return HttpResponse.json({ discountAmount: 50, couponCode: body.couponCode });
  }),

  // User profile
  http.get('/api/users/me', () =>
    HttpResponse.json(CustomerBuilders.aaravSharma())
  ),
];

// Override handlers for specific error scenarios
export const errorHandlers = {
  networkError: http.get('/api/products', () => HttpResponse.error()),
  serverError: http.get('/api/orders', () =>
    HttpResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
  ),
  unauthorized: http.get('/api/users/me', () =>
    HttpResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  ),
};
```

---

## 10. Testing Architecture

### Unit Tests (Vitest)

Every lib has a `vitest.config.ts`:

```typescript
// libs/ui/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        branches: 80,
        functions: 85,
        lines: 85,
        statements: 85,
      },
      exclude: [
        '**/*.model.ts',
        '**/*.config.ts',
        '**/index.ts',
        '**/_fixtures/**',
        '**/test-setup.ts',
      ],
    },
  },
});
```

**Component test pattern:**

```typescript
// libs/ui/src/address/address-list/address-list.component.spec.ts
import { render, screen, fireEvent } from '@testing-library/angular';
import { AddressListComponent } from './address-list.component';
import { AddressBuilders } from '@zitro/test-data';
import { provideI18nForTests } from '../../test-helpers/i18n-test.provider';

describe('AddressListComponent', () => {
  it('renders all addresses passed as input', async () => {
    const addresses = [AddressBuilders.aaravHome(), AddressBuilders.priyaHome()];
    await render(AddressListComponent, {
      inputs: { addresses },
      providers: [provideI18nForTests()],
    });
    expect(screen.getAllByTestId(/^address-card-/)).toHaveLength(2);
  });

  it('shows empty state when no addresses', async () => {
    await render(AddressListComponent, {
      inputs: { addresses: [] },
      providers: [provideI18nForTests()],
    });
    expect(screen.getByTestId('address-empty')).toBeInTheDocument();
  });

  it('hides add button when showAddButton is false in config', async () => {
    await render(AddressListComponent, {
      inputs: {
        addresses: [AddressBuilders.aaravHome()],
        config: { showAddButton: false },
      },
      providers: [provideI18nForTests()],
    });
    expect(screen.queryByTestId('add-address-btn')).not.toBeInTheDocument();
  });

  it('emits addressSelected when selectionMode is single and card is clicked', async () => {
    const onSelect = vi.fn();
    const address = AddressBuilders.aaravHome();
    await render(AddressListComponent, {
      inputs: { addresses: [address], config: { selectionMode: 'single' } },
      on: { addressSelected: onSelect },
      providers: [provideI18nForTests()],
    });
    fireEvent.click(screen.getByTestId(`address-card-${address.id}`));
    expect(onSelect).toHaveBeenCalledWith(address);
  });
});
```

**Service test pattern:**

```typescript
// libs/services/src/api/order-api.service.spec.ts
import { setupServer } from 'msw/node';
import { handlers, errorHandlers } from '@zitro/test-data';
import { OrderApiService } from './order-api.service';
import { OrderBuilders } from '@zitro/test-data';

const server = setupServer(...handlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('OrderApiService', () => {
  let service: OrderApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(OrderApiService);
  });

  it('returns orders list', async () => {
    const result = await firstValueFrom(service.getMyOrders());
    expect(result.items).toHaveLength(OrderBuilders.all().length);
  });

  it('throws 404 for unknown order', async () => {
    await expect(
      firstValueFrom(service.getOrder('nonexistent-id'))
    ).rejects.toMatchObject({ status: 404 });
  });

  it('returns specific order by id', async () => {
    const expected = OrderBuilders.aaravDeliveredOrder();
    const result = await firstValueFrom(service.getOrder(expected.id));
    expect(result.displayId).toBe(expected.displayId);
  });
});
```

**Utility test pattern:**

```typescript
// libs/utils/src/validators.util.spec.ts
import { describe, it, expect } from 'vitest';
import { Validators } from './validators.util';

describe('Validators.isIndianPhone', () => {
  it.each([
    ['9876543210', true],
    ['6543210987', true],
    ['5432109876', false],   // starts with 5 — invalid
    ['123456789', false],    // 9 digits
    ['98765432101', false],  // 11 digits
    ['', false],
  ])('phone %s → %s', (phone, expected) => {
    expect(Validators.isIndianPhone(phone)).toBe(expected);
  });
});
```

### Acceptance Tests (Playwright)

**Structure:**

```typescript
// apps/zitro-customer-e2e/journeys/auth.journey.ts
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { HomePage } from '../pages/home.page';

test.describe('Authentication', () => {
  test('user can sign in with phone OTP', async ({ page }) => {
    const auth = new AuthPage(page);
    const home = new HomePage(page);

    await auth.goto();
    await auth.enterPhone('9876543210');
    await auth.submitPhone();
    await auth.enterOtp('123456');  // test OTP from backend config
    await auth.submitOtp();

    await expect(page).toHaveURL('/home');
    await expect(home.getWelcomeMessage()).toBeVisible();
  });

  test('shows error for invalid OTP', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto();
    await auth.enterPhone('9876543210');
    await auth.submitPhone();
    await auth.enterOtp('000000');
    await auth.submitOtp();

    await expect(auth.getOtpError()).toBeVisible();
    await expect(page).toHaveURL('/auth/signin');
  });

  test('user can continue as guest', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.goto();
    await auth.continueAsGuest();
    await expect(page).toHaveURL('/home');
  });
});

// apps/zitro-customer-e2e/journeys/cart-checkout.journey.ts
test.describe('Cart & Checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Aarav before checkout tests
    await page.goto('/auth/signin');
    // ... login steps
  });

  test('user can add item and place delivery order', async ({ page }) => {
    // Browse → add to cart → checkout → confirm
    await page.goto('/home');
    await page.getByTestId('product-card-p0000000-0000-0000-0000-000000000001').click();
    await page.getByTestId('item-add-to-cart').click();
    await page.getByTestId('cart-summary-bar').click();

    await expect(page).toHaveURL('/cart');
    await page.getByTestId('order-type-delivery').click();
    await page.getByTestId('address-card-a0000000-0000-0000-0000-000000000001').click();
    await page.getByTestId('place-order-btn').click();

    await expect(page).toHaveURL(/\/order-confirmation\//);
    await expect(page.getByTestId('order-status-badge')).toHaveText('Order Placed');
  });

  test('user can apply valid coupon', async ({ page }) => {
    await page.goto('/cart');
    // ... add items
    await page.getByTestId('coupon-input').fill('WELCOME50');
    await page.getByTestId('apply-coupon-btn').click();
    await expect(page.getByTestId('coupon-success')).toBeVisible();
    await expect(page.getByTestId('coupon-discount-row')).toContainText('₹50');
  });
});
```

**Page Objects (data-testid based — never CSS selectors):**

```typescript
// apps/zitro-customer-e2e/pages/auth.page.ts
export class AuthPage {
  constructor(private page: Page) {}

  async goto() { await this.page.goto('/auth/signin'); }
  async enterPhone(phone: string) { await this.page.getByTestId('phone-input').fill(phone); }
  async submitPhone() { await this.page.getByTestId('send-otp-btn').click(); }
  async enterOtp(otp: string) { await this.page.getByTestId('otp-input').fill(otp); }
  async submitOtp() { await this.page.getByTestId('verify-otp-btn').click(); }
  async continueAsGuest() { await this.page.getByTestId('guest-btn').click(); }
  getOtpError() { return this.page.getByTestId('otp-error'); }
}
```

### Security Checks

**`audit-ci.json`:**
```json
{
  "high": true,
  "critical": true,
  "allowlist": [],
  "report-type": "important",
  "output-format": "text"
}
```

**Pre-commit hook (`.husky/pre-commit`):**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Block commits with secrets (API keys, tokens, passwords)
npx trufflehog filesystem . --only-verified --fail --no-update

# Run linting on staged files
npx lint-staged
```

**`lint-staged` config in `package.json`:**
```json
{
  "lint-staged": {
    "libs/**/*.ts": ["eslint --fix", "git add"],
    "apps/**/*.ts": ["eslint --fix", "git add"],
    "**/*.json": ["prettier --write", "git add"]
  }
}
```

---

## 11. The `finalize` Command

### `tools/scripts/finalize.ts`

```typescript
import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as process from 'process';

// ANSI colors without external dependency
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;

interface Step {
  name: string;
  command: string;
  failureMessage?: string;
}

interface Result {
  step: string;
  passed: boolean;
  durationMs: number;
  output?: string;
}

const args = process.argv.slice(2);
const isAffected = args.includes('--affected');
const skipE2e    = args.includes('--skip-e2e');
const nxTarget   = isAffected ? 'affected' : 'run-many';

const steps: Step[] = [
  {
    name: 'Lint',
    command: `nx ${nxTarget} --target=lint --all --parallel=5`,
    failureMessage: 'Linting failed. Run `nx affected:lint` to see errors.',
  },
  {
    name: 'Unit Tests + Coverage',
    command: `nx ${nxTarget} --target=test --all --parallel=3 --coverage`,
    failureMessage: 'Unit tests failed or coverage threshold not met.',
  },
  {
    name: 'Integration Tests',
    command: `nx ${nxTarget} --target=test:integration --all --parallel=3`,
    failureMessage: 'Integration tests failed. Check MSW handlers.',
  },
  {
    name: 'Secret Scan',
    command: 'npx trufflehog filesystem . --only-verified --fail --no-update',
    failureMessage: 'Secrets detected in code! Remove before committing.',
  },
  {
    name: 'Dependency Audit',
    command: 'npx audit-ci --config audit-ci.json',
    failureMessage: 'High/critical vulnerabilities found. Run `npm audit` for details.',
  },
  ...(skipE2e ? [] : [{
    name: 'Acceptance Tests (E2E)',
    command: `nx ${nxTarget} --target=e2e --all`,
    failureMessage: 'Acceptance tests failed.',
  }]),
  {
    name: 'Production Build',
    command: 'nx run-many --target=build --all --configuration=production --parallel=2',
    failureMessage: 'Production build failed.',
  },
  {
    name: 'Bundle Size Check',
    command: 'ts-node tools/scripts/check-bundle-sizes.ts',
    failureMessage: 'Bundle size exceeds budget. Check angular.json budgets.',
  },
];

const results: Result[] = [];

console.log(bold('\n🔍 ZITRO FINALIZE\n'));
console.log(dim(`Mode: ${isAffected ? 'affected only' : 'all projects'}`));
console.log(dim(`E2E: ${skipE2e ? 'skipped' : 'included'}\n`));
console.log('─'.repeat(60));

for (const step of steps) {
  const start = Date.now();
  process.stdout.write(`▶  ${step.name.padEnd(30)}`);

  const result: SpawnSyncReturns<Buffer> = spawnSync(step.command, {
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8',
  });

  const passed = result.status === 0;
  const durationMs = Date.now() - start;

  results.push({ step: step.name, passed, durationMs });

  if (passed) {
    console.log(green(`PASSED  `) + dim(`${(durationMs / 1000).toFixed(1)}s`));
  } else {
    console.log(red(`FAILED  `) + dim(`${(durationMs / 1000).toFixed(1)}s`));
    console.log(red(`\n   ✘  ${step.failureMessage ?? 'Check output above.'}`));
    if (result.stderr) console.log(dim(result.stderr.toString().split('\n').slice(0, 20).join('\n')));
    printSummary(results);
    process.exit(1);
  }
}

printSummary(results);
process.exit(0);

function printSummary(results: Result[]): void {
  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const allPassed = results.every(r => r.passed);

  console.log('\n' + '─'.repeat(60));
  console.log(bold('FINALIZE REPORT'));
  console.log('─'.repeat(60));

  for (const r of results) {
    const icon = r.passed ? green('✔') : red('✘');
    const time = dim(`${(r.durationMs / 1000).toFixed(1)}s`);
    console.log(`  ${icon}  ${r.step.padEnd(28)} ${time}`);
  }

  console.log('─'.repeat(60));
  console.log(dim(`Total time: ${(totalMs / 1000).toFixed(1)}s`));
  console.log(allPassed
    ? green('\n✅  READY TO RELEASE\n')
    : red('\n❌  NOT READY — fix failures above\n')
  );
}
```

### `package.json` scripts

```json
{
  "scripts": {
    "finalize":             "ts-node tools/scripts/finalize.ts",
    "finalize:affected":    "ts-node tools/scripts/finalize.ts --affected",
    "finalize:quick":       "ts-node tools/scripts/finalize.ts --affected --skip-e2e",
    "test:unit":            "nx run-many --target=test --all",
    "test:integration":     "nx run-many --target=test:integration --all",
    "test:e2e":             "nx run-many --target=e2e --all",
    "test:security":        "npx trufflehog filesystem . --only-verified && npx audit-ci --config audit-ci.json",
    "build:prod":           "nx run-many --target=build --all --configuration=production",
    "graph":                "nx graph",
    "affected:test":        "nx affected --target=test",
    "affected:build":       "nx affected --target=build"
  }
}
```

---

## 12. New APIs Required in zitro-api

These endpoints must be implemented before the frontend can use the full configuration system.

### `GET /api/app-config`

**Query params:** `app`, `platform`, `version`, `lang`

**Response:** Full `AppConfig` object (features + ui + maintenance + translations + themes)

**Caching:** `Cache-Control: max-age=3600` (1 hour)

```csharp
// Implementation location: src/Modules/AppConfig/AppConfigModule/
// Handler: GetAppConfigQueryHandler.cs
// Translations stored in DB table: app_translations (app, lang, key, value)
// Feature flags stored in: app_feature_flags (app, platform, key, value)
// UI config stored in: app_ui_configs (app, config JSONB)
// Themes stored in: app_themes (id, name, preview_color, is_built_in, tokens JSONB)
```

### `GET /api/translations`

**Query params:** `lang`, `app`

**Response:** `{ lang: "hi", version: "2024-01-15", keys: { "address.title": "मेरे पते", ... } }`

Returns **only keys that differ from English** (differential payload).

**Caching:** `Cache-Control: max-age=86400` (24 hours, translations rarely change)

### `GET /api/app-config/supported-languages`

**Response:** `[{ code: "en", name: "English", nativeName: "English" }, { code: "hi", name: "Hindi", nativeName: "हिन्दी" }]`

### `POST /api/app-config/language-preference`

**Body:** `{ lang: "hi" }`

**Auth:** Required

Saves user's language preference to DB, synced across devices on next login.

### Admin Endpoints (for Super Admin panel)

```
POST   /api/admin/translations          ← Add/update translation key
DELETE /api/admin/translations/{key}    ← Remove key
POST   /api/admin/themes                ← Add new theme
PUT    /api/admin/themes/{id}           ← Update theme tokens
PUT    /api/admin/feature-flags/{app}   ← Update feature flags for an app
PUT    /api/admin/ui-config/{app}       ← Update UI config for an app
```

---

## 13. Application Specifications

### `zitro-customer` (Customer App)

**Platform:** Android (Capacitor) + Web
**Capacitor App ID:** `com.krisurya.zitro`

**Features:** Business selection, product browsing, cart, checkout, order tracking, wallet, subscriptions, ratings, profile, address management, language/theme settings, 2048 game rewards

**App-specific overrides (not in shared libs):**
```typescript
// apps/zitro-customer/src/i18n/overrides.ts
export const CUSTOMER_OVERRIDES = {
  'app.name': 'Zitro',
  'business_selection.title': 'Select a Restaurant',
  'home.greeting': 'What are you craving?',
};
```

**Capacitor plugins:** `@capacitor/app`, `@capacitor/geolocation`, `@capacitor/browser`, `@capacitor-firebase/analytics`

### `zitro-delivery` (Delivery Partner App)

**Platform:** Android (Capacitor)
**Capacitor App ID:** `com.krisurya.zitro.delivery`

**Features:** Assigned orders list, order accept/reject, live location update (every 30s), delivery status update, earnings summary, profile

**Key services used:** `DeliveryApiService`, `OrderApiService`, `LocationService`

**Background location:** Requires `ACCESS_BACKGROUND_LOCATION` permission + `@capacitor/geolocation` watchPosition

### `zitro-pos` (POS System)

**Platform:** Android tablet + Web
**Capacitor App ID:** `com.krisurya.zitro.pos`

**Features:** Product grid (compact POS layout), cart, dine-in/takeout order placement, order queue view, receipt printing, daily sales summary

**UI note:** `ProductCard` uses `layout: 'pos'` config — compact touch-friendly layout for 10" tablets

### `zitro-restaurant` (Restaurant Partner App)

**Platform:** Web (full management portal) + Android APK via Capacitor
**Capacitor App ID:** `com.krisurya.zitro.restaurant`

**Dual-mode design:** The same codebase serves two contexts:
- **Web browser** — restaurant manager opens on desktop/laptop for full operations: menu management, order history, payout reports, zone configuration
- **Android app** — restaurant owner/staff uses on phone/tablet for live operations: incoming order notifications (FCM), quick accept/reject, order queue, kitchen display

**Features:**
- Order management — live incoming orders, accept/reject/mark ready, order queue view
- Menu management — product CRUD, price overrides, variation management, availability toggle, category reorder
- Business settings — hours, delivery zones, dine-in table config, minimum order amounts
- Staff management — multiple login accounts per restaurant
- Ratings & reviews — view and respond to customer reviews
- Reports — daily sales summary, payout history, top products

**Auth:** Business JWT from `POST /api/business-auth/login`

**Note:** This replaces the need for a separate "Restaurant Portal" — there is only one app serving both web and Android. Capacitor plugins used: `@capacitor/push-notifications` (FCM order alerts), `@capacitor/haptics` (tactile feedback on new order), `@capacitor/app` (background/foreground handling).

### `zitro-admin` (Admin Dashboard)

**Platform:** Web (desktop-first)

**Features:** All businesses management, product catalog management, order oversight, delivery partner management, coupon management, payment and payout management, rating moderation, user management

### `zitro-superadmin` (Super Admin)

**Platform:** Web (desktop-first)

**Features:** All admin features + feature flag management, translation management (add/edit i18n keys), theme management, app config management, brand management, platform-wide analytics

---

### `zitro-jobs` (Background Jobs)

**Platform:** Server — Firebase Cloud Functions (Node.js 20)
**Deploy:** `firebase deploy --only functions` (from `apps/zitro-jobs/`)
**Firebase Project:** `the-hunger-point` (same project as existing `zitro-jobs`)

**Relationship to existing `zitro-jobs`:** The existing repo at `E:/Github/krisuryagroup/zitro-jobs/` stays in place and handles its current functions. This new `apps/zitro-jobs/` is the successor — new functions are written here. Existing functions are migrated here one by one as they are enhanced.

**Why inside the `apps/` monorepo (not a separate repo):**
- Can import `@zitro/models` interfaces directly → type-safe API responses inside Cloud Functions
- Nx tags enforce that jobs code never imports Angular libs
- Single `npm install` / `npm run finalize` covers everything
- CI/CD covers jobs alongside apps

**Functions:**

| Function | Trigger | What it does |
|----------|---------|--------------|
| `onOrderCreated` | Firestore trigger: `orders/{id}` create | Send FCM push to restaurant partner app |
| `onOrderStatusChanged` | Firestore trigger: `orders/{id}` update | Send FCM push to customer (preparing / ready / shipped) |
| `orderTimeoutCheck` | Scheduled: every 5 min | Auto-cancel `pending` orders older than 15 min (no restaurant response) |
| `dailyRevenueReport` | Scheduled: 11:59 PM IST | Aggregate daily orders per business → store summary in Firestore |
| `couponExpiryCleanup` | Scheduled: midnight IST | Mark expired coupons as inactive via `PATCH /api/coupons/{id}/deactivate` |
| `cacheInvalidationSignal` | HTTP callable | Called by Admin/Superadmin UI to trigger cache bust signal on all active app sessions |

**`@zitro/jobs-shared` spec:**
```typescript
// libs/jobs-shared/src/fcm.helpers.ts
import type { Order } from '@zitro/models';

export const FcmPayloads = {

  orderReceivedForRestaurant(order: Order) {
    return {
      notification: {
        title: '🔔 New Order',
        body: `Order #${order.displayId} — ₹${order.charges.total}`,
      },
      data: {
        type: 'NEW_ORDER',
        orderId: order.id,
        displayId: order.displayId,
        orderType: order.orderType,
        total: String(order.charges.total),
      },
    };
  },

  orderStatusUpdateForCustomer(order: Order) {
    const messages: Record<string, string> = {
      confirmed:  'Your order has been confirmed!',
      preparing:  'Restaurant is preparing your order 🍳',
      ready:      'Your order is ready for pickup!',
      shipped:    'Your order is on the way 🛵',
      delivered:  'Order delivered! Enjoy your meal 😊',
      cancelled:  'Your order has been cancelled.',
    };
    return {
      notification: {
        title: `Order #${order.displayId}`,
        body: messages[order.status] ?? `Order status: ${order.status}`,
      },
      data: {
        type: 'ORDER_STATUS',
        orderId: order.id,
        status: order.status,
      },
    };
  },
};
```

```typescript
// libs/jobs-shared/src/api-client.ts
// Typed HTTP client used by Cloud Functions to call zitro-api
import type { Order } from '@zitro/models';

const API_BASE = process.env['ZITRO_API_BASE_URL']!;
const API_KEY  = process.env['ZITRO_JOBS_API_KEY']!;  // Internal service key

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'x-jobs-api-key': API_KEY, 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const JobsApiClient = {
  getPendingOrders: () =>
    apiRequest<Order[]>('/api/internal/orders?status=pending'),

  cancelOrder: (orderId: string, reason: string) =>
    apiRequest<void>(`/api/internal/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  deactivateCoupon: (couponId: string) =>
    apiRequest<void>(`/api/coupons/${couponId}/deactivate`, { method: 'PATCH' }),
};
```

```typescript
// apps/zitro-jobs/src/functions/order-timeout.ts
import * as functions from 'firebase-functions/v2/scheduler';
import { JobsApiClient } from '@zitro/jobs-shared';
import type { Order } from '@zitro/models';

export const orderTimeoutCheck = functions.onSchedule('every 5 minutes', async () => {
  const pending: Order[] = await JobsApiClient.getPendingOrders();
  const cutoff = Date.now() - 15 * 60 * 1000;  // 15 min ago

  const stale = pending.filter(o => new Date(o.createdAt).getTime() < cutoff);

  await Promise.allSettled(
    stale.map(o => JobsApiClient.cancelOrder(o.id, 'Restaurant did not respond in time'))
  );

  functions.logger.info(`Cancelled ${stale.length} stale orders`);
});
```

**Environment variables required (set via `firebase functions:config:set` or Secret Manager):**

| Variable | Value |
|----------|-------|
| `ZITRO_API_BASE_URL` | `https://api.zitro.app` (production) |
| `ZITRO_JOBS_API_KEY` | Internal service key generated in zitro-api |
| `FIREBASE_PROJECT_ID` | `the-hunger-point` |

---

## 14. CI/CD

### GitHub Actions — PR Check

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  finalize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for Nx affected commands

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Set NX_BASE for affected detection
        run: echo "NX_BASE=origin/main" >> $GITHUB_ENV

      - name: Run finalize (affected only)
        run: npm run finalize:affected

      - name: Upload coverage reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-reports
          path: 'coverage/'

      - name: Upload E2E screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots
          path: 'test-results/'
```

### GitHub Actions — Release

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  finalize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Full finalize (all projects, including E2E)
        run: npm run finalize

      - name: Build Android APKs (customer + delivery)
        run: |
          npm run build:prod
          cd apps/zitro-customer/android && ./gradlew assembleRelease
          cd apps/zitro-delivery/android && ./gradlew assembleRelease

      - name: Upload APKs
        uses: actions/upload-artifact@v4
        with:
          name: release-apks
          path: 'apps/*/android/app/build/outputs/apk/release/*.apk'
```

---

## 15. Implementation Order

> **Migration-first principle:** The existing `zitro-app` (at `E:/Github/krisuryagroup/zitro-app/`) is live on the Play Store. We do NOT rewrite from scratch. We extract, adapt, and migrate working code into the new library structure. Business logic must remain intact; only structure and patterns change.

Implement strictly in this order. Each phase builds on the previous.

---

### Phase 1: Workspace Foundation (do once)

```bash
# 1. Bootstrap Nx workspace (run inside apps/)
npx create-nx-workspace@latest . --preset=apps --packageManager=npm --nxCloud=skip

# 2. Install all dependencies (run the commands from Section 2)

# 3. Create @zitro/models lib
nx g @nx/js:lib models --directory=libs/models --importPath=@zitro/models

# 4. Create @zitro/utils lib
nx g @nx/js:lib utils --directory=libs/utils --importPath=@zitro/utils

# 5. Create @zitro/theme lib
nx g @nx/js:lib theme --directory=libs/theme --importPath=@zitro/theme

# 6. Create @zitro/i18n lib
nx g @nx/angular:lib i18n --directory=libs/i18n --importPath=@zitro/i18n --standalone

# 7. Create @zitro/services lib
nx g @nx/angular:lib services --directory=libs/services --importPath=@zitro/services --standalone

# 8. Create @zitro/ui lib
nx g @nx/angular:lib ui --directory=libs/ui --importPath=@zitro/ui --standalone

# 9. Create @zitro/test-data lib (no Angular — pure TS)
nx g @nx/js:lib test-data --directory=libs/test-data --importPath=@zitro/test-data

# 10. Create @zitro/mappers lib (pure TS — no Angular)
nx g @nx/js:lib mappers --directory=libs/mappers --importPath=@zitro/mappers

# 11. Create @zitro/jobs-shared lib (pure TS — no Angular)
nx g @nx/js:lib jobs-shared --directory=libs/jobs-shared --importPath=@zitro/jobs-shared

# 12. Create zitro-jobs Node.js app
npm install -D @nx/node
nx g @nx/node:app zitro-jobs --directory=apps/zitro-jobs --framework=none
```

---

### Phase 2: Models, Mappers & Utils — Migrate from zitro-app

**Source:** `zitro-app/src/app/core/models/` and `zitro-app/src/app/core/utils/`

**2a — `@zitro/models`:**
1. Copy all interfaces, applying the field renames from the migration mapping table in Section 4.1
2. `ProductVariation.price` (absolute) → `priceModifier` (delta) — document note in `MIGRATION.md`
3. Flatten `OrderCharges` nested `{ calculated, applied, waived }` → flat applied values
4. Add `visibility` block to `PricingBreakdown` (copy from legacy `ChargesVisibility`)

**2b — `@zitro/mappers`:**
1. Create DTO files mirroring the new .NET API response shapes (see Section 4.2)
2. Create request DTO files (`CreateOrderRequest`, `CreateAddressRequest`, etc.)
3. Implement all mapper classes (`CatalogMapper`, `OrderMapper`, `UserMapper`, `CouponMapper`, `PricingMapper`)
4. Write unit tests for every mapper method — use fixture data from `@zitro/test-data` once Phase 3 is done; use inline objects until then

**2c — `@zitro/utils`:**
1. Copy validators and formatters from `zitro-app/src/app/core/utils/` — no logic changes, only import paths
2. Write unit tests for all validators and formatters

---

### Phase 3: Test Data (needed before any service or component tests)

**Source:** No existing test data in zitro-app — create fresh using real Indian data patterns

1. Create JSON fixture files (names, phone numbers, addresses from UP/India — see Section 9)
2. Implement `FixtureLoader`
3. Implement all Builders (Customer, Restaurant, Catalog, Order, Cart, Coupon)
4. Implement MSW handlers (simulate the new .NET API endpoints)

---

### Phase 4: Theme Library — Migrate from zitro-app

**Source:** `zitro-app/src/app/core/services/theme.service.ts` and `zitro-app/src/styles/`

**What to do:**
1. Extract all SCSS variables and color tokens from `zitro-app/src/styles/` → rename to CSS custom properties in `tokens.scss`
2. Map existing theme names → new token system; preserve existing visual appearance
3. Migrate `ThemeService` → adapt to use `data-theme` attribute pattern (Section 7)
4. Add dark, nature, ocean themes based on the existing color palette
5. Write unit tests for `ThemeService`

---

### Phase 5: i18n Library — Extract from zitro-app

**Source:** All user-visible strings in `zitro-app/src/app/` (inline template strings, service messages, constants)

**What to do:**
1. Scan all components and services in `zitro-app` and collect every hardcoded user-visible string
2. Build `EN_DEFAULTS` translation map (Section 6) using those exact strings — zero user-visible text change
3. Implement `I18nService` and `I18nPipe`
4. Write unit tests
5. Create `provideI18nForTests()` helper

---

### Phase 6: Services Library — Migrate from zitro-app

**Source:** `zitro-app/src/app/core/services/` (36 services)

**Strategy:** Extract the business logic; replace Firebase direct calls with HTTP calls to the .NET API. The logic (validation, state management, BehaviorSubjects, caching strategy) stays identical.

**Migration map:**

| Legacy service | Target in `@zitro/services` | Change needed |
|---|---|---|
| `products.service.ts` | `catalog.service.ts` | Replace Firestore reads → `GET /api/products` |
| `categories.service.ts` | merged into `catalog.service.ts` | Replace Firestore reads → `GET /api/categories` |
| `cart.service.ts` | `cart.service.ts` | No Firebase calls — logic migrates as-is |
| `pricing.service.ts` | `pricing.service.ts` | Adapt to flat `OrderCharges` model |
| `order.service.ts` | `order.service.ts` | Replace Firestore writes → `POST /api/orders` |
| `firebase-auth.service.ts` | `auth.service.ts` | Keep Firebase Auth; replace Firestore user doc → `POST /api/users` |
| `coupon.service.ts` | `coupon.service.ts` | Replace Firestore reads → `GET /api/coupons` |
| `address.service.ts` | `address.service.ts` | Replace Firestore reads/writes → `/api/users/addresses` |
| `image-cache.service.ts` | `image-cache.service.ts` | No API calls — migrate as-is |
| `app-settings.service.ts` | `config.service.ts` | Replace Firestore reads → `GET /api/config` (Section 12) |
| `google-geocoding.service.ts` | `geocoding.service.ts` | Replace direct Google API call → `GET /api/geo/reverse` proxy (Section 12) |

**Steps:**
1. Implement HTTP interceptors (auth token, business-id header, error handling)
2. Migrate services one by one in the order above — write integration test using MSW after each
3. Implement `FeatureFlagService` and `CacheService` (new — no legacy equivalent)

---

### Phase 7: UI Component Library — Migrate from zitro-app

**Source:** `zitro-app/src/app/shared/components/` (29 components) and `zitro-app/src/app/features/` (18 pages)

**Strategy:** Extract shared components into `@zitro/ui`, add config object pattern and signal inputs (`input()` / `output()`), add `data-testid` attributes. Do NOT change visual appearance or UX behavior.

Build in this order (simple → complex):
1. Common: `loader`, `empty-state`, `error-state`, `no-internet`, `splash-screen` — extract from existing; add config objects
2. Common: `truncated-text`, `zoomable-image`, `confirmation-dialog`, `bottom-sheet` — extract as-is
3. Theme: `theme-picker` — new component (no legacy equivalent)
4. Auth: `phone-input`, `otp-input` — extract from `SignInPage`; split into standalone components
5. Catalog: `category-bar`, `search-bar`, `product-card`, `product-grid`, `item-detail-sheet` — extract from `HomePage` and `MenuPage`
6. Address: `address-card`, `add-address-form`, `address-list` — extract from `AddressesPage`
7. Cart: `cart-item-row`, `pricing-summary`, `cart-summary-bar` — extract from `CartPage`
8. Order: `order-status-badge`, `order-card`, `order-timeline` — extract from `OrdersPage` and `OrderDetailPage`
9. Ratings: `star-rating`, `rating-summary` — new components (no legacy equivalent)
10. Banners: `banner-carousel` — extract from `HomePage`

**For each component:**
- Preserve exact HTML structure and CSS class names where possible
- Add `data-testid` attributes to interactive elements
- Replace `@Input()` / `@Output()` decorators with `input()` / `output()` signals
- Add typed config interface with defaults
- Write unit test

---

### Phase 8: Finalize Command & Security Setup
1. Copy `finalize.ts` to `tools/scripts/`
2. Configure `audit-ci.json`
3. Setup Husky pre-commit hook
4. Run `npm run finalize` — fix all issues before proceeding

---

### Phase 9: First Application — `zitro-customer` (Migrate from zitro-app)

```bash
nx g @nx/angular:app zitro-customer --directory=apps/zitro-customer --standalone --routing
```

**Strategy:** This is a migration of `zitro-app`, not a new build. All 18 feature pages already exist. We port them page by page, replacing internal service/component imports with `@zitro/*` library imports.

1. Setup `app.config.ts` — copy providers from `zitro-app/src/app/app.config.ts`, update to use `@zitro/services` and `@zitro/i18n`
2. Setup `styles.scss` — import `@zitro/theme/tokens.scss`; migrate existing SCSS variables
3. Copy routes from `zitro-app/src/app/app.routes.ts` exactly — same URLs, same guards
4. Port feature pages in this order (least to most complex):
   - `SplashPage`, `BusinessSelectionPage` — first boot flow
   - `SignInPage`, `OtpPage` — auth (uses `@zitro/ui` auth components)
   - `HomePage` — banner + categories + product grid
   - `MenuPage`, `ProductDetailPage` — catalog browsing
   - `CartPage` — cart + pricing summary
   - `AddressesPage`, `AddAddressPage` — address management
   - `CheckoutPage`, `OrderConfirmationPage` — order flow
   - `OrdersPage`, `OrderDetailPage` — order history
   - `ProfilePage`, `FavoritesPage`, `CouponsPage`, `ContactPage` — secondary screens
5. For each ported page: delete the original business logic code only after the new page passes all tests
6. Setup Capacitor for Android — copy `capacitor.config.ts` and `android/` config from `zitro-app`
7. Write E2E journey tests (Playwright) for 5 critical paths (Section 10)

---

### Phase 10: Remaining Applications

Build in this order (each reuses shared libs — **no migration, these are new builds**):
1. `zitro-restaurant` — most critical for live operations (web + Android via Capacitor)
2. `zitro-admin`
3. `zitro-delivery`
4. `zitro-pos`
5. `zitro-superadmin`

### Phase 10b: Background Jobs (`zitro-jobs`)

Can be built in parallel with Phase 10 — no Angular dependencies.

1. Implement `@zitro/jobs-shared`:
   - `fcm.helpers.ts` — FCM payload builders (copy from Section 13 `zitro-jobs` spec)
   - `api-client.ts` — typed HTTP client for internal zitro-api calls
   - Write unit tests for payload builders

2. Implement `apps/zitro-jobs/`:
   - Setup Firebase Admin SDK in `shared/firebase-admin.ts`
   - Implement functions one by one in this order (least risky first):
     a. `couponExpiryCleanup` — scheduled, read-only risk
     b. `dailyRevenueReport` — scheduled, read-only risk
     c. `orderTimeoutCheck` — scheduled, write (cancel orders)
     d. `onOrderStatusChanged` — Firestore trigger → FCM to customer
     e. `onOrderCreated` — Firestore trigger → FCM to restaurant
     f. `cacheInvalidationSignal` — HTTP callable
   - Write integration tests for each function using Firebase emulators

3. Set environment variables and deploy:
   ```bash
   cd apps/zitro-jobs
   firebase functions:secrets:set ZITRO_API_BASE_URL
   firebase functions:secrets:set ZITRO_JOBS_API_KEY
   firebase deploy --only functions
   ```

4. **Migration from existing `zitro-jobs`:** After each function is tested in the new location:
   - Disable the corresponding function in `E:/Github/krisuryagroup/zitro-jobs/`
   - Monitor logs for 24hrs
   - Delete old function once stable

---

### Phase 11: New API Implementation (in zitro-api)

Implement the 4 new endpoints from Section 12 in parallel with Phase 9/10.

---

### Phase 12: CI/CD
1. Create `.github/workflows/pr-check.yml`
2. Create `.github/workflows/release.yml`
3. Add repository secrets (Play Store keys, etc.)

---

## Quick Reference: All Commands

| Command | What it does |
|---------|-------------|
| `npm run finalize` | Full check: all tests + security + build. Run before every release. |
| `npm run finalize:affected` | Same but only changed code. Run on every PR. |
| `npm run finalize:quick` | Affected only, no E2E. Fastest local check. |
| `npm run test:unit` | All unit tests with coverage report |
| `npm run test:integration` | All MSW-based integration tests |
| `npm run test:e2e` | All Playwright acceptance tests |
| `npm run test:security` | Secret scan + dependency vulnerability audit |
| `npm run build:prod` | Production build all apps |
| `nx run zitro-customer:test --watch` | Watch mode for customer app unit tests |
| `nx affected:test` | Tests for changed files only |
| `nx graph` | Visual dependency graph |

---

*This document is the single source of truth for the ZITRO frontend platform.*
*Update it as decisions change — keep it in sync with the code.*
