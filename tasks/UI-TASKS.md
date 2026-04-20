# ZITRO Customer — UI Task Definitions (UI-001 to UI-016 + TEST-001 to TEST-002)

> **Read `UI-STATUS.md` first** for the status board and execution order.
>
> **Every task follows the 5-stage protocol:**
> - Stage 0: Audit current page + extract design spec + verify APIs in Postman collection
> - Stage 1: Scaffold (structure + API wiring, no styling)
> - Stage 2: Style (design matching using `--zitro-*` tokens)
> - Stage 3: Browser validation (screenshot vs design, iterate until diff is zero)
> - Stage 4: Functional verification (console, network, build)
> - Stage 5: Handoff (screenshot pair shared, you sign off)
>
> **Hard rule:** If an API endpoint is not in the Postman collection → Claude stops and tells you.
> No implementation until you confirm backend is ready or approve a workaround.

---

## UI-001 — Splash Screen

**Size:** S | **Stage 1 skipped** (no new APIs)

**Current file:** `apps/zitro-customer/src/app/features/splash/splash.page.ts`

**Expected behaviour:**
- App logo centered, brief animation (fade or scale)
- Auto-navigates after animation: if location saved → `/home`, else → `/location-selection`
- No loading spinner — if data isn't ready, show logo until it is

**`data-testid` required:** `splash-logo`, `splash-screen`

**Acceptance criteria:**
- [ ] Animation plays on cold start
- [ ] Navigates to correct route based on `zitro_user_location` in localStorage
- [ ] No flash of blank screen on fast devices
- [ ] `nx build zitro-customer --configuration=production` passes clean

---

## UI-002 — Auth: Sign In + OTP

**Size:** M

**Current files:**
- `apps/zitro-customer/src/app/features/auth/sign-in/`
- `apps/zitro-customer/src/app/features/auth/otp/`

**APIs:** Firebase Phone Auth (`firebase-auth.service.ts`, `firebase-otp.service.ts`) — permanent, no .NET API call

**Expected behaviour:**
- Phone number input with India (+91) prefix, 10-digit validation
- "Send OTP" → Firebase phone auth flow
- OTP screen: 6-digit input, 60s countdown timer, "Resend" enabled after countdown
- Error states: invalid phone, wrong OTP, too many attempts, network error
- On success → navigate to `/home` (or redirect to original route if guard intercepted)

**`data-testid` required:** `phone-input`, `send-otp-btn`, `otp-input`, `verify-btn`, `resend-btn`, `countdown-timer`, `error-message`

**Acceptance criteria:**
- [ ] Phone validation rejects non-10-digit inputs
- [ ] OTP countdown timer works accurately
- [ ] Resend button disabled during countdown, enabled after
- [ ] All 4 error states show correct messages via i18n
- [ ] Successful OTP → user is signed in (Firebase currentUser is set)
- [ ] `nx build` passes

---

## UI-003 — Auth: Sign Up

**Size:** S

**Current file:** `apps/zitro-customer/src/app/features/auth/signup.component.ts`

**API:** `POST /api/users/profile` — creates user profile post first-time OTP verification

**Expected behaviour:**
- Shown only on first login (no existing profile)
- Fields: Full name (required), optional profile photo
- On submit → `POST /api/users/profile` → navigate to `/home`

**`data-testid` required:** `name-input`, `photo-upload`, `submit-btn`

**Acceptance criteria:**
- [ ] Name is required; submit disabled when empty
- [ ] Successful submit → profile created → navigates to home
- [ ] Skipped entirely if user already has a profile (returning user)

---

## UI-004 — Location Selection

**Size:** S

**Current file:** `apps/zitro-customer/src/app/features/location-selection/location-selection.component.ts`

**Status:** HRD-001 implemented — this task is polish + edge case fixes only.

**Expected behaviour:**
- "Use my current location" → GPS permission prompt → on grant, reverse geocode → save to `localStorage` as `zitro_user_location` → navigate to `/home`
- Saved addresses list (if user logged in) → tap to select
- "Search location" → navigate to address add flow
- GPS denied state: show manual search prompt, no crash

**`data-testid` required:** `use-location-btn`, `address-item`, `search-location-btn`, `location-denied-msg`

**Acceptance criteria:**
- [ ] GPS granted → location saved → navigates to home
- [ ] GPS denied → shows helpful message, doesn't crash
- [ ] Saved address tap → location saved → navigates to home
- [ ] Fresh install with no saved addresses shows correct empty state

---

## UI-005 — Home Page

**Size:** L | **Mockup:** `apps/UI-mockups/UI-005-home-page.html`

**Current file:** `apps/zitro-customer/src/app/features/home/home.component.ts`

**APIs to verify in Postman:**
| Endpoint | Service | Purpose |
|----------|---------|---------|
| `GET /api/businesses/nearby` | `NearbyBusinessesService` | Business cards list — **extend with filters below** |
| `GET /api/tags` | `TagsService` | Cuisine tag chips |
| `GET /api/businesses/{slug}/banners` | `EngagementApiService` | Banner carousel |

---

### Backend Changes Required — Extend `GET /api/businesses/nearby`

> ⚠️ **Flag for backend dev before UI-005 T4 starts.** Do NOT create a new endpoint — extend the existing one to avoid duplicate APIs. The existing `lat`, `lng`, `radiusKm` params stay unchanged.

#### Updated Query Parameter Contract

```
# Existing (unchanged)
lat          required  float    28.6086
lng          required  float    77.4523
radiusKm     optional  float    10        default: 10

# New params to add
businessType optional  string   food|grocery|gifts|pharma   — tab filter
tagIds       optional  string   "1,2,3"   comma-separated tag IDs — cuisine chip filter
vegOnly      optional  bool     true|false — show businesses with veg options
sort         optional  string   distance|rating|new|offers  default: distance
openNow      optional  bool     true|false
hasOffers    optional  bool     true|false
freeDelivery optional  bool     true|false
cursor       optional  string   opaque base64 cursor (for next page)
limit        optional  int      20    max: 40
```

#### Updated Response Shape — add these fields to each business object

```json
{
  "businesses": [
    {
      "id": "uuid",
      "slug": "efc-pizza",
      "name": "EFC Pizza",
      "businessType": "food",
      "imageUrl": "https://storage.googleapis.com/...",
      "rating": 4.2,
      "totalRatings": 128,
      "distanceM": 1500,
      "deliveryTimeMinutes": { "min": 25, "max": 30 },
      "deliveryCharge": 0,
      "isVeg": false,
      "isPureVeg": false,
      "isOpen": true,
      "tags": [{ "id": 1, "name": "Pizza" }, { "id": 2, "name": "Burger" }],
      "activeOffer": { "label": "60% off up to ₹120", "type": "discount" }
    }
  ],
  "meta": {
    "nextCursor": "eyJkIjoxNTAwLCJpZCI6ImFiYyJ9",
    "hasMore": true
  }
}
```

> **`isPureVeg`** — `true` means the entire restaurant serves only vegetarian food (e.g. a South Indian veg-only restaurant). Show a solid green "PURE VEG" badge on the card. Different from `isVeg` (which means "has veg options").

#### Pagination: Cursor-based, not offset

**Why not `page=2&limit=20`:**
- `OFFSET 40` forces DB to scan and discard 40 rows — gets slower as data grows
- If a new business is inserted between pages, page 2 shows a duplicate or skips an item

**Cursor format** (base64-encoded, opaque to frontend):
```json
{ "distanceM": 1500, "id": "uuid-of-last-item" }
```
DB query: `WHERE (distance_m, id) > (cursor.distanceM, cursor.id)` — index seek, no scan.
Response `meta.hasMore = false` tells frontend to stop calling.

#### DB Indexes Required

```sql
-- Existing earthdistance index (confirm it exists)
CREATE INDEX IF NOT EXISTS idx_businesses_location
  ON businesses USING gist (ll_to_earth(lat, lng));

-- New: type filter (most common first filter — food/grocery)
CREATE INDEX IF NOT EXISTS idx_businesses_type_active
  ON businesses (business_type) WHERE is_active = true;

-- New: pure veg + veg filter
CREATE INDEX IF NOT EXISTS idx_businesses_veg
  ON businesses (is_veg, is_pure_veg) WHERE is_active = true;

-- New: tag junction table
CREATE INDEX IF NOT EXISTS idx_business_tags_tag ON business_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_business_tags_biz ON business_tags (business_id);
```

#### Caching Strategy — Do NOT Cache the `nearby` Response

`GET /api/businesses/nearby` is **user-position-specific** and cannot be cached:
- Distance ordering is different for every user (user at 1.5km vs 1.9km from same restaurant → different sorted list)
- Moving 500m near the radius boundary changes which businesses appear entirely
- Cache hit rate would be near-zero — every lat/lng combination is a different key

**What to cache instead:**

| Endpoint | Cache | TTL constant | Reason |
|----------|-------|-----|--------|
| `GET /api/businesses/nearby` | ❌ None | — | User-position-specific |
| `GET /api/businesses/{slug}` | ✅ Redis | `CacheTtl.BusinessDetails` | Same data for all users |
| `GET /api/tags` | ✅ Redis | `CacheTtl.Tags` | Global, rarely changes |
| `GET /api/businesses/{slug}/banners` | ✅ Redis | `CacheTtl.BusinessBanners` | Per-business, not per-user |
| `GET /api/businesses/{slug}/config` | ✅ Redis | `CacheTtl.BusinessConfig` | Per-business pricing config |

#### Centralized Cache Configuration (backend — one place to change all TTLs)

All TTL values and cache key patterns must live in two files in `zitro-api/`. No magic numbers scattered across services.

**`Infrastructure/Cache/CacheTtl.cs`**
```csharp
/// <summary>
/// Single source of truth for all cache TTLs.
/// Change here — takes effect everywhere.
/// </summary>
public static class CacheTtl
{
    public static readonly TimeSpan Tags           = TimeSpan.FromHours(1);
    public static readonly TimeSpan BusinessDetails = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan BusinessBanners = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan BusinessConfig  = TimeSpan.FromMinutes(1);
}
```

**`Infrastructure/Cache/CacheKeys.cs`**
```csharp
/// <summary>
/// Single source of truth for all Redis key patterns.
/// Prevents key typos and makes invalidation safe.
/// </summary>
public static class CacheKeys
{
    public static string Tags()                     => "tags:all";
    public static string BusinessDetails(string slug) => $"biz:{slug}:details";
    public static string BusinessBanners(string slug) => $"biz:{slug}:banners";
    public static string BusinessConfig(string slug)  => $"biz:{slug}:config";
}
```

**Usage in any service (never hardcode TTL inline):**
```csharp
// ✅ correct
await _cache.SetAsync(CacheKeys.Tags(), data, CacheTtl.Tags);

// ❌ never do this
await _cache.SetAsync("tags:all", data, TimeSpan.FromHours(1));
```

**Invalidation on business update:**
```csharp
// When a business is saved/updated, bust all its cache entries in one call
await _cache.RemoveAsync(CacheKeys.BusinessDetails(slug));
await _cache.RemoveAsync(CacheKeys.BusinessBanners(slug));
await _cache.RemoveAsync(CacheKeys.BusinessConfig(slug));
// Tags cache is global — only invalidate when a tag is added/removed
```

**Backend pre-requisite checklist (must be done before T4 starts):**
- [ ] Create `zitro-api/Zitro.Infrastructure/Cache/CacheTtl.cs` with all TTL constants (1 hr for Tags, 5 min for BusinessDetails/Banners, 1 min for BusinessConfig)
- [ ] Create `zitro-api/Zitro.Infrastructure/Cache/CacheKeys.cs` with all Redis key patterns
- [ ] Apply `CacheTtl.*` and `CacheKeys.*` in every service that touches Redis — zero inline `TimeSpan` or hardcoded key strings anywhere in the codebase
- [ ] Code review gate: PR reviewer must reject any `TimeSpan.FromMinutes(...)` or `"biz:..."` string literal found outside these two files

**How `nearby` stays fast without caching:**
The PostgreSQL `earthdistance` extension with a GiST index on `ll_to_earth(lat, lng)` resolves a radius query in **~5–20ms** regardless of total row count (up to millions). At 10k orders/day, peak load is ~50–100 nearby API calls/min — well within what a single indexed PostgreSQL instance handles.

**Scale path:**
- Now → 10k orders/day: GiST index only. No cache.
- 100k orders/day: Add a PostgreSQL read replica. Route all GETs to replica.
- 1M+ orders/day: Replace with Elasticsearch `geo_distance` query or Typesense.

---

### Finalized Design Spec (extracted from approved mockup)

#### Hero Banner Zone (top section — single background image)
The banner image is the background for the **entire** top section: notch area + header + category tabs + search bar + promo text. All UI elements float on top.

| Element | Spec |
|---------|------|
| Banner background | `background-image` from API; fallback gradient `#2c0a14 → #7a1828 → #c0312a → #e8503a` |
| Banner aspect ratio | `1080 × 900 px` (height = width × 900/1080 ≈ 83%) |
| Dark overlay at top | `linear-gradient(to bottom, rgba(0,0,0,0.28), transparent)` over first 70px — keeps header readable |

#### Header (transparent, on banner)
| Element | Spec |
|---------|------|
| Background | `transparent` (switches to `#e23744` after user scrolls past hero) |
| Location label | White, 13px, 800 weight. Shows `zitro_user_location` label, tap → `/location-selection` |
| Location address | `rgba(255,255,255,0.85)`, 11px, ellipsis after 190px |
| Cart icon | 36×36 circle, `rgba(255,255,255,0.18)` bg, white icon. Badge: white bg, `#e23744` text |
| Profile icon | Same as cart |

#### Category Tabs (on banner, no card background)
| Element | Spec |
|---------|------|
| Container | `background: transparent` — no white card |
| Tab icons | 52×52 rounded squares, light-tinted bg (Food `#fff0ee/92%`, Grocery `#f0fff6/92%`, Gifts `#fff8ec/92%`, Pharma `#eef4ff/92%`) |
| Tab labels | `rgba(255,255,255,0.85)`, 11px, 600 weight; active → white, 800 weight |
| Active indicator | `box-shadow: 0 0 0 2.5px white` on icon |

#### Search Bar (on banner)
| Element | Spec |
|---------|------|
| Search pill | White bg, 10px border-radius, `box-shadow: 0 2px 8px rgba(0,0,0,0.12)` |
| Placeholder | `#aaa`, 13px |
| Mic icon | `#e23744` |
| VEG toggle | Separate white pill, 9px "VEG" label, toggle 34×19px; on = `#1ba672` |

#### Banner Promo Content (bottom of hero)
| Element | Spec |
|---------|------|
| "LIMITED TIME" badge | `#ff6b35` bg, white text, 9px, 800w, 4px border-radius |
| Offer headline | `#ffd600`, 28px, 900 weight |
| Sub-text | `rgba(255,255,255,0.85)`, 12px |
| CTA button | White bg, `#e23744` text, 11px, 800w, 20px border-radius |
| Food illustration | Right side, 95px emoji; real app → PNG from Firebase Storage |
| Carousel dots | White (`opacity 0.4`); active = fully white, 18px wide pill |

---

#### Below Hero (white sections)

**"What's on your mind?" — Cuisine Chips (auto-hides on scroll down)**
| Element | Spec |
|---------|------|
| Section header | 15px, 800w, `#1c1c1c`, `bg: white`, padding `13px 16px 8px` |
| Chip circle | 60×60, `border-radius: 50%`, `bg: #fff5f5`; active → `border: 2px solid #e23744`, `bg: #fff0ef` |
| Chip label | 11px, `#555`; active → `#e23744`, 700w |
| Scroll behavior | Hides (max-height → 0, opacity → 0) when scrolled >300px down; reappears on scroll up |

**Filter Pills (auto-hides with chips)**
| Element | Spec |
|---------|------|
| Pill | `border: 1px solid #e0e0e0`, `border-radius: 20px`, 11px, 600w, `#333` |
| Active pill | `bg: #e23744`, white text, `border-color: #e23744` |
| Filters | Near & Fast (default active), Top Rated, New, Offers, Free Delivery |

**Restaurant Cards**
| Element | Spec |
|---------|------|
| Card image | Full-width, 170px tall; Firebase Storage URL in `<img>`; `onerror` → grey placeholder |
| Offer badge | Bottom of image, gradient overlay `transparent → rgba(0,0,0,0.68)`, white text, 11px, 700w |
| Delivery time | Top-right of image, white bg, `#1c1c1c`, 10px, 800w, 4px radius |
| Restaurant name | 15px, 700w, `#1c1c1c` |
| Rating badge | `bg: #1ba672`, white text, 11px, 700w, 4px radius |
| Distance | 12px, `#666` |
| FREE DELIVERY | 12px, 700w, `#1ba672`; paid delivery → 12px, `#666` |
| Cuisine tags | 12px, `#888` |
| Favourite icon | `♡` 17px `#ccc`; saved → `♥ #e23744` |
| **PURE VEG badge** | `isPureVeg: true` → small solid green square `■` + "PURE VEG" text, 9px, 700w, `#1ba672`, shown top-left of card name row |

**Section Title**
| Element | Spec |
|---------|------|
| "Top rated near you" | 16px, 800w, `#1c1c1c`, `bg: #f8f8f8`, padding `14px 16px 8px` |

**Bottom Navigation**
| Element | Spec |
|---------|------|
| Active item | `#e23744` icon + label, 800w label |
| Inactive | `#aaa` |

---

### Implementation Sub-tasks

#### T1 — Hero Banner Component
- [ ] Create `.hero-banner` CSS class structure matching spec above
- [ ] `background-image` from banner API; fallback gradient hardcoded
- [ ] Header transparent → `#e23744` on scroll past hero height (use `HostListener scroll`)
- [ ] Dark overlay pseudo-element for header readability

#### T2 — Category Tabs (transparent on banner)
- [ ] Render tabs from business types (Food, Grocery, Gifts, Pharma)
- [ ] `background: transparent` — no white card
- [ ] Icon tinted backgrounds per type
- [ ] Active = white label + white ring on icon
- [ ] Tab switch → filter business cards + cuisine chips

#### T3 — Search Bar + VEG Toggle
- [ ] White pill search box with shadow on banner
- [ ] VEG toggle signal (`vegOnly = signal(false)`)
- [ ] Tap search bar → navigate to `/search`
- [ ] VEG on → re-calls `GET /api/businesses/nearby` with `vegOnly=true` (server-side filter, not client-side — client never has the full unfiltered list)

#### T4 — Banner Carousel
- [ ] API: `GET /api/businesses/{slug}/banners` — verify in Postman first
- [ ] Auto-scroll every 3s with `setInterval`, clears on destroy
- [ ] Dot indicators sync with active slide
- [ ] If API returns 0 banners → show default promo card (no crash)

#### T5 — Cuisine Chips (scroll-hide behaviour)
- [ ] Render from `GET /api/tags`
- [ ] Horizontal scroll, single-select
- [ ] `IntersectionObserver` or scroll listener: hide when user scrolls >300px, show on scroll up
- [ ] CSS transition: `max-height` + `opacity` for smooth hide/show

#### T6 — Filter Pills
- [ ] Static pills: Near & Fast, Top Rated, New, Offers, Free Delivery
- [ ] Single-select, active = red
- [ ] Selection changes sort/filter applied to business card list
- [ ] Same scroll-hide as cuisine chips

#### T7 — Restaurant Cards (BusinessCard component)
- [ ] Reuse/update `BusinessCardComponent` from `@zitro/ui`
- [ ] `<img>` with Firebase Storage URL; `onerror` → grey placeholder (never broken image icon)
- [ ] Offer badge from `activeOffer.label` (if present)
- [ ] Delivery time badge from `deliveryTimeMinutes.min–max`
- [ ] **PURE VEG badge** — if `isPureVeg === true`, show solid green "■ PURE VEG" 9px label top-left of name
- [ ] Favourite toggle (local signal for now, API later)
- [ ] Tap → navigate to `/listing/:slug`
- [ ] Infinite scroll trigger: `IntersectionObserver` on last card → call `loadMore()` → append next page

#### T8 — Loading Skeletons
- [ ] Skeleton for banner (full-width rectangle)
- [ ] Skeleton for cuisine chips (row of circles)
- [ ] Skeleton for business cards (image + 3 lines)
- [ ] Use `@zitro/ui` skeleton component if exists, else create simple CSS pulse

---

**State managed:**
- `activeTab = signal<BusinessType>('food')`
- `vegOnly = signal(false)`
- `activeTagFilter = signal<string | null>(null)`
- `activeFilter = signal<FilterPill>('near_fast')`
- Loading skeletons for cards and banners while APIs resolve

**`data-testid` required:**
`location-header`, `business-tab`, `search-bar`, `banner-carousel`, `banner-slide`, `cuisine-chip`, `filter-pill`, `business-card`, `veg-toggle`, `restaurant-image`, `restaurant-name`, `rating-badge`, `favourite-btn`

**Acceptance criteria:**
- [ ] Hero banner fills top zone — no separate red header bg on page load
- [ ] Header transparent on hero, turns `#e23744` after scrolling past banner
- [ ] Category tabs float directly on banner (no white card bg)
- [ ] Banner carousel loads from API, auto-scrolls, dots sync
- [ ] Cuisine chips auto-hide on scroll down, reappear on scroll up
- [ ] Filter pills auto-hide with chips
- [ ] Tab switch sends `businessType` param to API and refreshes list from page 1
- [ ] VEG toggle sends `vegOnly=true` to API (server-side — not client-side filter)
- [ ] Cuisine chip sends `tagIds` param to API and refreshes list
- [ ] Filter pill sends `sort` param to API and refreshes list
- [ ] All filter changes reset cursor to null and replace list (not append)
- [ ] Scroll to last card → infinite scroll loads next page and appends
- [ ] `isPureVeg` businesses show green "PURE VEG" badge on card
- [ ] Business card tap navigates to `/listing/:slug`
- [ ] Network tab shows `GET /api/businesses/nearby` with correct params on every filter change
- [ ] Loading skeletons show while API resolves
- [ ] Empty state if no nearby businesses
- [ ] `nx build zitro-customer --configuration=production` passes clean

---

## UI-006 — Category / Menu Listing

**Size:** L

**Current file:** `apps/zitro-customer/src/app/features/listing/listing.component.ts`

**APIs to verify in Postman:**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/businesses/{slug}/menu` | Full product list with categories |
| `GET /api/categories?businessSlug={slug}` | Category list for sidebar |

**Expected layout:**
```
┌──────────────────────────────────────┐
│ ← [Business name]      🔍  [cart 2] │  ← Header
├──────────┬───────────────────────────┤
│ Category │ Product Grid              │
│ Sidebar  │ [ProductCard] [ProductCard│
│ ─────── │ [ProductCard] [ProductCard│
│ Starters │                           │
│ Mains    │  ← scrollable             │
│ Drinks   │                           │
└──────────┴───────────────────────────┘
│ [VEG] [Sort ▼]                       │  ← Filter bar
```

**State managed:**
- Active category (syncs scroll position ↔ sidebar selection)
- Veg filter toggle (filters products client-side)
- Cart item count badge on header
- Add/remove from cart (updates `CartService`)

**`data-testid` required:** `category-item`, `product-card`, `add-to-cart-btn`, `veg-filter`, `cart-badge`, `quantity-stepper`

**Acceptance criteria:**
- [ ] Categories load and sidebar scrolls independently from product list
- [ ] Tapping category scrolls product list to that section
- [ ] Scrolling product list updates active category in sidebar
- [ ] Veg filter hides non-veg products
- [ ] Add to cart → cart badge updates, item appears in cart
- [ ] Quantity stepper increments/decrements correctly
- [ ] Empty category shows correct empty state
- [ ] `nx build` passes

---

## UI-007 — Product Search

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/search/search.component.ts`

**API to verify:** `GET /api/businesses/{slug}/search?q=pizza` or `GET /api/search?q=pizza&slug=X`

**Expected behaviour:**
- Search input with debounce (300ms)
- Results show product cards (same `ProductCard` component)
- Empty state: "No results for 'X'" with suggestion to try different keywords
- Loading state during API call
- Add to cart directly from search results

**`data-testid` required:** `search-input`, `search-result-card`, `empty-search-state`, `add-from-search-btn`

**Acceptance criteria:**
- [ ] Debounce fires API only after 300ms idle
- [ ] Results render using existing `ProductCard` component
- [ ] Empty state shown when no results
- [ ] Add to cart from results works correctly
- [ ] Back navigation preserves search query

---

## UI-008 — Cart Page

**Size:** L

**Current file:** `apps/zitro-customer/src/app/features/cart/cart.page.ts`

**APIs to verify:**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/businesses/{slug}/config` | Pricing config (delivery fee, packaging, GST) |
| `GET /api/coupons` | Available coupons count/badge |

**Expected layout:**
```
┌─────────────────────────────┐
│ ← Cart               [Edit] │
├─────────────────────────────┤
│ [Item 1]  Qty: 2   ₹240    │
│ [Item 2]  Qty: 1   ₹120    │
├─────────────────────────────┤
│ 🎟 Apply Coupon      →      │  ← tap → UI-009
├─────────────────────────────┤
│ Bill Summary                │
│ Item total:       ₹360     │
│ Delivery fee:     ₹40      │
│ Packaging:        ₹10      │
│ GST (5%):         ₹18      │
│ Coupon discount: -₹50      │
│ ─────────────────────────  │
│ To pay:           ₹378     │
├─────────────────────────────┤
│ [Place Order — COD] ₹378   │  ← sticky footer
└─────────────────────────────┘
```

**State managed:**
- Cart items from `CartService` (in-memory)
- Pricing from `BusinessConfigApiService`
- Applied coupon from `CouponSelectionPage`
- COD only — no payment gateway in this phase

**`data-testid` required:** `cart-item`, `item-qty-stepper`, `remove-item`, `apply-coupon-row`, `bill-summary`, `total-amount`, `place-order-btn`

**Acceptance criteria:**
- [ ] All items render with correct qty and line totals
- [ ] Pricing breakdown matches `PricingConfig` shape exactly (see API Contracts in CLAUDE.md)
- [ ] Coupon discount shows when applied; removed cleanly when cleared
- [ ] Empty cart shows empty state with CTA to browse menu
- [ ] "Place Order" → navigates to address selection → order creation flow
- [ ] `nx build` passes

---

## UI-009 — Coupon Selection

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/coupon-selection/coupon-selection.page.ts`

**API:** `GET /api/coupons?businessSlug={slug}`

**Expected behaviour:**
- List of available coupons with code, description, min order, discount
- "Apply" button per coupon
- Validation feedback inline (e.g. "Min order ₹249 required")
- Applied coupon highlighted; tap to remove
- Returns selected coupon to cart page on back navigation

**`data-testid` required:** `coupon-item`, `apply-coupon-btn`, `coupon-validation-msg`, `remove-coupon-btn`

**Acceptance criteria:**
- [ ] Coupons load from API
- [ ] Apply sets coupon in cart state and navigates back
- [ ] Validation message shows if coupon conditions aren't met
- [ ] Already-applied coupon shows "Remove" instead of "Apply"
- [ ] Empty state if no coupons available

---

## UI-010 — Addresses: List

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/addresses/address-list.page.ts`

**API:** `GET /api/users/addresses`

**Expected behaviour:**
- List of saved addresses with type icon (Home/Office/Other)
- Default address has badge
- Tap address → selects for delivery (returns to cart)
- Swipe or kebab menu → delete address
- "Add new address" button → navigates to UI-011

**`data-testid` required:** `address-item`, `default-badge`, `delete-address-btn`, `add-address-btn`, `select-address-btn`

**Acceptance criteria:**
- [ ] Addresses load from API
- [ ] Default address shown first with badge
- [ ] Selecting address returns to cart with address set
- [ ] Delete removes address (with confirmation dialog)
- [ ] "Add new" navigates correctly

---

## UI-011 — Addresses: Add / Edit

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/addresses/add-address.page.ts`

**APIs:**
| Endpoint | Purpose |
|----------|---------|
| `POST /api/users/addresses` | Create new address |
| `PUT /api/users/addresses/{id}` | Update existing address |

**Critical field name:** `houseAndStreet` (NOT `addressLine`, NOT `street`) — see API Contracts in CLAUDE.md.

**Form fields:**
- Full name (required)
- Phone (required, 10 digits)
- House & Street (required) → maps to `houseAndStreet`
- Landmark (optional)
- Town (required) → maps to `town` (NOT `city`)
- Pincode (required, 6 digits)
- State (required)
- Type: Home / Office / Other

**`data-testid` required:** `name-input`, `phone-input`, `house-street-input`, `landmark-input`, `town-input`, `pincode-input`, `state-input`, `address-type-selector`, `save-address-btn`

**Acceptance criteria:**
- [ ] All required fields validated before submit
- [ ] `houseAndStreet` field name sent to API (not `addressLine`)
- [ ] `town` field name sent to API (not `city`)
- [ ] Success → navigates back to address list
- [ ] Edit mode pre-fills form from existing address

---

## UI-012 — Order Confirmation

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/order-confirmation/order-confirmation.page.ts`

**API:** `GET /api/orders/{orderId}`

**Expected layout:**
```
┌─────────────────────────────┐
│    ✅ Order Placed!         │  ← success animation
│  Order #ORD123456789012     │
├─────────────────────────────┤
│  Items: 3   Total: ₹378    │
│  Delivery: 30-45 mins       │
│  Address: [selected address]│
├─────────────────────────────┤
│  [Track Order]              │  → UI-014
│  [Back to Home]             │
└─────────────────────────────┘
```

**`data-testid` required:** `order-id`, `order-total`, `track-order-btn`, `back-home-btn`

**Acceptance criteria:**
- [ ] Order ID (`ORD...` format) shown prominently
- [ ] Success animation plays once
- [ ] Order summary matches API response
- [ ] "Track Order" navigates to UI-014 with correct orderId
- [ ] Back press goes to home (not cart — order is placed)

---

## UI-013 — Order History

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/order-history/order-history.page.ts`

**API:** `GET /api/orders` (paginated)

**Expected behaviour:**
- List of past orders, newest first
- Each item: order ID, date, items count, total, status chip
- Status chip colours: pending=yellow, confirmed/preparing=blue, delivered=green, cancelled=red
- Tap order → navigates to order tracking (UI-014)
- Pull to refresh
- Pagination / infinite scroll

**`data-testid` required:** `order-history-item`, `order-status-chip`, `order-total`, `reorder-btn`

**Acceptance criteria:**
- [ ] Orders load from API
- [ ] Status chips show correct colour per status string
- [ ] Tap navigates to correct order tracking page
- [ ] Pull to refresh works
- [ ] Empty state for new users with no orders

---

## UI-014 — Order Tracking

**Size:** L

**Current file:** `apps/zitro-customer/src/app/features/order-tracking/order-tracking.page.ts`

**APIs:**
| Source | Purpose |
|--------|---------|
| `GET /api/orders/{orderId}` | Order details + status timeline |
| Firebase Realtime DB `/orders/{orderId}/status` | Live status updates |
| Firebase Realtime DB `/deliveries/{orderId}/location` | Delivery partner live location |

**Expected layout:**
```
┌─────────────────────────────┐
│ ← Order #ORD123456789012   │
├─────────────────────────────┤
│  [Map with delivery pin]    │  ← live location (if shipped)
├─────────────────────────────┤
│  Status Timeline:           │
│  ✅ Order placed   10:30   │
│  ✅ Confirmed      10:32   │
│  🔵 Preparing      10:35   │  ← current
│  ○  Out for delivery        │
│  ○  Delivered               │
├─────────────────────────────┤
│  Estimated: 25-35 mins      │
│  [Contact Restaurant]       │
└─────────────────────────────┘
```

**`data-testid` required:** `order-status-timeline`, `status-step`, `estimated-time`, `delivery-map`, `contact-restaurant-btn`

**Acceptance criteria:**
- [ ] Timeline shows all statuses with timestamps from API
- [ ] Current status highlighted
- [ ] Firebase Realtime DB subscription updates status in real time (no page refresh)
- [ ] Delivery location pin moves on map when `shipped` status is active
- [ ] Map hidden for statuses before `shipped`
- [ ] Page unsubscribes from Firebase on destroy

---

## UI-015 — Account / Profile

**Size:** M

**Current file:** `apps/zitro-customer/src/app/features/account/account.page.ts`

**APIs:**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/users/profile` | Load current profile |
| `PUT /api/users/profile` | Update name / photo |

**Expected behaviour:**
- Avatar (tap to upload via Firebase Storage)
- Name (editable inline or via edit button)
- Phone number (read-only — auth-managed)
- Links: My Orders, My Addresses, Contact Us, Sign Out
- Sign Out → Firebase `auth.signOut()` → navigate to `/auth/signin`

**`data-testid` required:** `avatar-upload`, `name-field`, `phone-display`, `edit-name-btn`, `save-name-btn`, `orders-link`, `addresses-link`, `sign-out-btn`

**Acceptance criteria:**
- [ ] Profile loads from API
- [ ] Name edit saves via `PUT /api/users/profile`
- [ ] Phone field is read-only
- [ ] Avatar upload goes to Firebase Storage, URL saved to profile
- [ ] Sign out clears session and redirects correctly

---

## UI-016 — Contact Us

**Size:** S

**Current file:** `apps/zitro-customer/src/app/features/contact-us/contact-us.page.ts`

**API:** `GET /api/businesses/{slug}` — for phone number and hours (if dynamic)

**Expected content:**
- Business phone with tap-to-call
- WhatsApp button (opens `wa.me/` link)
- Operating hours
- Address of the restaurant

**`data-testid` required:** `call-btn`, `whatsapp-btn`, `operating-hours`, `business-address`

**Acceptance criteria:**
- [ ] Phone number tappable (opens dialler)
- [ ] WhatsApp button opens correct number
- [ ] Hours shown correctly
- [ ] `nx build` passes

---

---

## TEST-001 — Unit + Integration Tests

**Trigger:** Start only after all UI-001–UI-016 pages are manually verified and approved.

**Framework:** Vitest (already configured)
**Test data:** `@zitro/test-data` builders — never inline objects

**Scope and targets:**

| Target | Coverage goal | Key scenarios |
|--------|--------------|---------------|
| `@zitro/mappers` — all mapper functions | 100% | DTO → model, null fields, missing fields |
| `@zitro/services` — API services | ≥ 80% | Correct URL, headers (`Authorization`, `X-Business-Id`), payload shape |
| `@zitro/services` — CartService | 100% | add/remove/update qty, pricing totals, coupon apply/remove |
| `@zitro/ui` — all components | ≥ 70% | Signal inputs render, outputs emit, loading/empty/error states |
| Guards (`AuthGuard`, `locationGuard`) | 100% | Redirect on unauthenticated, redirect on no-location |
| Interceptors | 100% | Token attached, X-Business-Id attached, error codes → toast |

**File convention:** `*.spec.ts` next to source file. Integration tests: `*.integration.spec.ts`.

**Done when:**
- [ ] `npx nx test zitro-customer --coverage` passes with zero failures
- [ ] Coverage ≥ 80% on `@zitro/services` and `@zitro/mappers`
- [ ] `npm run finalize:affected` passes end-to-end

---

## TEST-002 — Acceptance / E2E Tests

**Trigger:** Start only after TEST-001 passes.

**Framework:** Playwright (`apps/zitro-customer-e2e/`)
**Selectors:** `data-testid` only — never CSS class or text content

**12 Critical Journeys:**

| ID | Journey | Pages covered |
|----|---------|--------------|
| E2E-01 | Fresh open → location prompt → GPS grant → home | UI-001, UI-004, UI-005 |
| E2E-02 | Phone input → OTP → verify → home (logged in) | UI-002, UI-005 |
| E2E-03 | Home → tab switch → cuisine filter → business cards update | UI-005 |
| E2E-04 | Open menu → browse category → add item → cart badge updates | UI-006 |
| E2E-05 | Cart → apply coupon → discount shown → remove → price resets | UI-008, UI-009 |
| E2E-06 | Cart → address select → place COD order → confirmation screen | UI-008, UI-010, UI-012 |
| E2E-07 | Order confirmation → Track Order → status timeline visible | UI-012, UI-014 |
| E2E-08 | Account → edit name → save → updated name shown | UI-015 |
| E2E-09 | Addresses → add new → set default → appears first | UI-010, UI-011 |
| E2E-10 | Search "pizza" → results appear → add item → cart badge updates | UI-007 |
| E2E-11 | Close and reopen app with saved session → goes to home, no re-login | UI-001, auth persistence |
| E2E-12 | Add item → navigate away → return to cart → item still present | UI-006, UI-008 |

**Done when:**
- [ ] All 12 journeys pass: `npx nx e2e zitro-customer-e2e`
- [ ] Tests run against dev server with backend API (or full MSW intercepts)
- [ ] Zero flaky tests (each test passes 3 consecutive runs)
