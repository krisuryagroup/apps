# @zitro/models — Migration Notes

## Structural Changes (T003)

Two structural changes were made to align models with the .NET API contract.
All other field names are copied verbatim from legacy `zitro-app` models.

---

### 1. `Product.imageUrl` — single field (was `image` + `imageURL`)

**Legacy shape:**
```typescript
image?: string;
imageURL?: string;
```

**New shape:**
```typescript
imageUrl?: string;
```

**Why:** Firebase accumulated two separate image fields over time (`image` was original, `imageURL` was
added later by different code). The .NET API returns a single `imageUrl` field. Keeping two fields
served no purpose once Firebase is replaced.

**Migration impact:** Any code reading `product.image` or `product.imageURL` must be updated to
read `product.imageUrl`. This is handled in T010 when services switch from Firebase to .NET API.
The same change applies to `OrderItem.imageUrl` and `ProductVariation.imageUrl`.

---

### 2. `OrderCharges` — flat structure (was nested per-charge objects)

**Legacy shape:**
```typescript
interface OrderCharges {
  packagingCharges: { calculated: number; applied: number; waived: number; };
  platformFee:      { calculated: number; applied: number; waived: number; };
  gst:              { calculated: number; applied: number; waived: number; percentage: number; };
  deliveryCharge?:  { calculated: number; applied: number; waived: number; };
  couponDiscount?:  { code: string; amount: number; };
}
```

**New shape:**
```typescript
interface OrderCharges {
  packagingCharge: number;
  platformFee:     number;
  gst:             number;
  deliveryCharge?: number;
  couponDiscount?: number;
}
```

**Why:** Firebase Cloud Functions updated each sub-field (`calculated`, `applied`, `waived`) as
separate writes during order processing, requiring the nested structure in Firestore. The .NET API
computes all charges server-side and returns only the final applied value. There is no concept of
"calculated vs applied vs waived" at the API boundary — the API already handles that logic
internally. Keeping the nested structure would require mapping between the two shapes in every
service call.

---

## New Models Added (T003)

| File | Models | Notes |
|------|--------|-------|
| `catalog.model.ts` | `Category`, `MenuCategory`, `BusinessMenu` | Re-exports `Product`, `ProductVariation` |
| `cart.model.ts` | `CartItem`, `CartItemDisplay` | Re-exports from `product.model` |
| `user.model.ts` | `User`, `UserProfile` | New — matches `/api/users/profile` response |
| `business.model.ts` | `Business`, `BusinessConfig` | New — matches `/api/businesses/{slug}/config` |
| `nearby-business.model.ts` | `NearbyBusiness` | New — matches `/api/businesses/nearby` response |
| `platform-tag.model.ts` | `PlatformTag` | New — matches `/api/tags` response |
| `delivery.model.ts` | `DeliveryTracking`, `DeliveryPartner`, `DeliveryLocation`, `DeliveryStatus` | New |
| `app-config.model.ts` | `AppConfig` | New — matches `/api/app-version` response |
| `auth.model.ts` | Re-exports from `auth-config.model` | Canonical name alignment |
| `cache.model.ts` | Re-exports from `cache-config.model` | Canonical name alignment |
