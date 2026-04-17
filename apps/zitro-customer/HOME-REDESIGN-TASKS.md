# Home Page Redesign — Location Gate + Business Tabs + Cuisine Tags + Business Cards

## Context

The current home page loads Firebase-based product data for a hardcoded restaurant. The new design
(inspired by Swiggy/Zepto) requires:

1. A **location gate** — prompt user to set location before showing the home screen
2. **Business type tabs** — dynamically generated from nearby API response (Food, Grocery, etc.)
3. **Cuisine tag chips** — horizontal scrollable icons using `/api/tags` + nearby businesses' tags
4. **Business cards** — list of nearby businesses from `/api/businesses/nearby`
5. **Per-business-type theming** — color scheme changes when switching tabs

**Prerequisite:** Platform tags (tags API in `zitro-api`) must be deployed before HRD-002 onwards.

---

## Task Status

| Task | Title | Status |
|------|-------|--------|
| HRD-001 | Location Gate | `done` |
| HRD-002 | Environment Config + Data Layer | `done` |
| HRD-003 | Business Card Component | `done` |
| HRD-004 | Home Page Redesign | `in-progress` |
| HRD-005 | Per-Business-Type Theming | `in-progress` |
| HRD-006 | Cleanup + Routing | `pending` |

---

## TASK HRD-001 — Location Gate

**Goal:** Force location selection before showing home. Show Zepto-style UI if no location is set.

### New files
- `src/app/features/location-selection/location-selection.component.ts`
- `src/app/features/location-selection/location-selection.component.html`
- `src/app/features/location-selection/location-selection.component.scss`
- `src/app/core/guards/location.guard.ts`

### Modified files
- `src/app/app.routes.ts` — add `/location-selection` route + `LocationGuard` on MainLayout
- `src/app/core/constants/app.constants.ts` — add `LOCATION_STORAGE_KEY = 'zitro_user_location'`

### LocationGuard logic
```typescript
// Check localStorage for 'zitro_user_location'
// If missing → redirect to /location-selection
// If present → allow through
```

### Location Selection UI (Zepto-style)
- Full-screen white page with location pin illustration at top
- Title: "Your device location is off" / "Set your delivery location"
- **Use my Current Location** row with `Enable` button → calls `LocationService.getCurrentLocation()`
- **Saved addresses** section — lists user's saved addresses from `UserManagementService`
- **Search your Location** button → navigates to existing `/add-address` flow
- On location selected → save as `zitro_user_location` in localStorage → navigate to `/home`

### Stored location shape
```typescript
interface UserLocation {
  lat: number;
  lng: number;
  label: string;    // "Home", "Current Location", etc.
  address: string;  // Display address string
}
```

### Acceptance criteria
- [ ] Fresh app open with no saved location → redirected to `/location-selection`
- [ ] Tapping Enable → GPS prompt appears
- [ ] GPS granted → location saved → navigated to `/home`
- [ ] Saved address tapped → location saved → navigated to `/home`
- [ ] Tapping Search → navigates to `/add-address`

---

## TASK HRD-002 — Environment Config + Data Layer

**Goal:** Set up environment files with API URL and add models/services for nearby businesses and tags.

### Environment files (`src/environments/`)

**`environment.ts`** (dev default — add `apiUrl`):
```typescript
apiUrl: 'http://0.0.0.0:8080',   // local dev API
```

**`environment.prod.ts`** (new file):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.zitroapp.in',
  appVersion: '1.0.0',
  google: { /* same keys */ }
};
```

**`project.json`** — add `fileReplacements` in production build:
```json
"fileReplacements": [
  {
    "replace": "apps/zitro-customer/src/environments/environment.ts",
    "with": "apps/zitro-customer/src/environments/environment.prod.ts"
  }
]
```

### New model files (`libs/models/src/`)

**`nearby-business.model.ts`:**
```typescript
export interface NearbyBusiness {
  id: string;
  slug: string;
  name: string;
  businessType: string;        // "restaurant" | "grocery" | etc.
  rating: number;
  deliveryTimeDisplay: string | null;
  deliveryFee: number;
  minOrderAmount: number;
  isActive: boolean;
  isFeatured: boolean;
  distanceMetres: number;
  tags: string[];              // tag slugs e.g. ["pizza", "biryani"]
}
```

**`platform-tag.model.ts`:**
```typescript
export interface PlatformTag {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
}
```

### New service files (`libs/services/src/`)

**`nearby-businesses.service.ts`:**
```typescript
// GET {environment.apiUrl}/api/businesses/nearby?lat=X&lng=Y&radiusKm=10
// HttpClient-based; cache result in memory per session
getNearbyBusinesses(lat: number, lng: number): Observable<NearbyBusiness[]>
getByType(businesses: NearbyBusiness[], type: string): NearbyBusiness[]
```

**`tags.service.ts`:**
```typescript
// GET {environment.apiUrl}/api/tags
// Cache in localStorage for 1 hour (key: 'zitro_tags_cache')
getTags(): Observable<PlatformTag[]>
getTagsForSlugs(slugs: string[], allTags: PlatformTag[]): PlatformTag[]
```

### Constants to add (`src/app/core/constants/app.constants.ts`)
```typescript
LOCATION_STORAGE_KEY: 'zitro_user_location',

BUSINESS_TYPE_ORDER: ['restaurant', 'grocery', 'gift_center', 'pharmacy'],

BUSINESS_TYPE_LABELS: {
  restaurant: 'Food',
  grocery: 'Grocery',
  gift_center: 'Gifts',
  pharmacy: 'Pharma',
},

BUSINESS_TYPE_ICONS: {
  restaurant: '🍔',
  grocery: '🛒',
  gift_center: '🎁',
  pharmacy: '💊',
},

NEARBY_API_RADIUS_KM: 10,
TAGS_CACHE_KEY: 'zitro_tags_cache',
NEARBY_CACHE_KEY: 'zitro_nearby_cache',
```

### Also modify
- `libs/models/src/index.ts` — export new models
- `libs/services/src/index.ts` — export new services
- `src/app/app.config.ts` — ensure `provideHttpClient()` is present

### Acceptance criteria
- [ ] `environment.ts` has `apiUrl: 'http://0.0.0.0:8080'`
- [ ] `environment.prod.ts` created with production URL
- [ ] `NearbyBusiness` and `PlatformTag` exported from `@zitro/models`
- [ ] `NearbyBusinessesService` and `TagsService` exported from `@zitro/services`
- [ ] `nx build zitro-customer` passes with no errors

---

## TASK HRD-003 — Business Card Component

**Goal:** New reusable `BusinessCardComponent` in `@zitro/ui` for displaying a nearby business.

### New files (`libs/ui/src/components/business-card/`)
- `business-card.component.ts`
- `business-card.component.html`
- `business-card.component.scss`

### Component API
```typescript
@Input() business!: NearbyBusiness;
@Input() tags: PlatformTag[] = [];   // full tag objects to resolve slugs to names

@Output() businessClick = new EventEmitter<NearbyBusiness>();
```

### Card UI
- Full-width card, rounded corners, `--zitro-shadow-card`
- **Image area** — cover image (placeholder if no image) with overlay badges:
  - Top-left: "Featured" badge if `isFeatured`
  - Top-right: delivery time display (e.g. "30-40 MINS")
- **Body:**
  - Business name (bold, `--zitro-on-surface`)
  - ⭐ `rating` · `distanceMetres` m · cuisine tags comma-separated
  - Min order + delivery fee row
- Uses `--zitro-*` CSS tokens only (no hardcoded colors)

### Also modify
- `libs/ui/src/index.ts` — export `BusinessCardComponent`

### Acceptance criteria
- [ ] Component renders with mock `NearbyBusiness` input
- [ ] Tag names resolve correctly from slugs
- [ ] `businessClick` emits on card tap
- [ ] No hardcoded colors — all from `--zitro-*` tokens

---

## TASK HRD-004 — Home Page Redesign

**Goal:** Replace Firebase product-based home with new API-driven Swiggy-style layout.

### Modified files
- `src/app/features/home/home.component.ts`
- `src/app/features/home/home.component.html`
- `src/app/features/home/home.component.scss`

### New layout structure

```
┌─────────────────────────────────────────┐
│ 📍 [address label] ▼    [wallet]  [👤]  │  ← Location header
├─────────────────────────────────────────┤
│ [🍔 Food]  [🛒 Grocery]  [🎁 Gifts]   │  ← Business type tabs
├─────────────────────────────────────────┤
│ 🔍 Search for 'Pizza'        [VEG 🔘]  │  ← Search bar + veg toggle
├─────────────────────────────────────────┤
│         [ Banner Carousel ]             │  ← Keep existing
├─────────────────────────────────────────┤
│ What's on your mind?                    │
│ ○Pizza  ○Biryani  ○Burger  ○N.Indian   │  ← Tag chips (filterable)
├─────────────────────────────────────────┤
│ Top rated near you          View all >  │
│ [BusinessCard]  [BusinessCard]  ...     │  ← Nearby businesses list
└─────────────────────────────────────────┘
```

### Component state
```typescript
userLocation: UserLocation | null       // from localStorage
nearbyBusinesses: NearbyBusiness[]      // from API
allTags: PlatformTag[]                  // from API
businessTypeTabs: string[]              // unique types, ordered by BUSINESS_TYPE_ORDER
activeTab: string                       // currently selected tab
activeTagFilter: string | null          // selected cuisine chip slug

// Derived (getters/computed)
filteredByTab: NearbyBusiness[]         // nearbyBusinesses filtered by activeTab
displayTags: PlatformTag[]              // tags that appear in filteredByTab businesses
displayBusinesses: NearbyBusiness[]     // filteredByTab further filtered by activeTagFilter
```

### Services injected
- `NearbyBusinessesService` (new)
- `TagsService` (new)
- `ThemeService` (existing — for tab switch theming)
- `Router` (existing — for location header click)

### Remove from home component
- `CategoriesService`, `ProductsService`, `AppSettingsService` injections
- Firebase product/category loading calls
- `category-cards` section
- Recommended / popular product sliders (move to business menu page later)

### Keep in home component
- Banner carousel
- Search bar + VEG toggle
- Cart summary bar (bottom)
- Analytics logging

### Acceptance criteria
- [ ] Location header shows `userLocation.label` and `userLocation.address`
- [ ] Clicking location header navigates to `/location-selection`
- [ ] Tabs render from `businessTypeTabs` in correct order
- [ ] Switching tab updates `filteredByTab` and `displayTags`
- [ ] Cuisine chips show only tags relevant to active tab's businesses
- [ ] Clicking a chip filters `displayBusinesses`
- [ ] Clicking a `BusinessCardComponent` navigates to `/listing?businessSlug=X` (or business detail)
- [ ] No Firebase product calls on home load

---

## TASK HRD-005 — Per-Business-Type Theming

**Goal:** Switch app theme when the user switches business type tab.

### Modified file
`libs/theme/src/theme.service.ts`

### New method
```typescript
applyBusinessTypeTheme(businessType: string): void {
  const themeMap: Record<string, ThemeName> = {
    restaurant:  'default',  // red   — food / warmth
    grocery:     'nature',   // green — fresh / organic
    pharmacy:    'ocean',    // blue  — clinical / trust
    gift_center: 'default',  // no dedicated theme yet
  };
  this.setTheme(themeMap[businessType] ?? 'default');
}
```

**No new colors.** Only the four existing themes are used: `default`, `dark`, `nature`, `ocean`.

### Trigger
Called in `HomeComponent.onTabChange(type: string)`.

### Acceptance criteria
- [ ] Switching to Grocery tab → `data-theme="nature"` on `<html>`
- [ ] Switching to Pharmacy tab → `data-theme="ocean"` on `<html>`
- [ ] Switching back to Food tab → `data-theme="default"` on `<html>`
- [ ] Theme persists if user navigates away and returns to home

---

## TASK HRD-006 — Cleanup + Routing

**Goal:** Remove old business-selection flow, fix routing, ensure build passes.

### Modified files

**`src/app/app.routes.ts`:**
- Add `{ path: 'location-selection', component: LocationSelectionComponent }`
- Add `LocationGuard` to `MainLayout` route's `canActivate`
- Remove `/business-selection` route (superseded by `/location-selection`)

**`src/app/features/home/home.component.ts`:**
- Confirm unused Firebase service injections are removed
- Confirm `NearbyBusinessesService` and `TagsService` are injected

### Acceptance criteria
- [ ] `/business-selection` route no longer exists
- [ ] `/location-selection` route is accessible
- [ ] `MainLayout` has `canActivate: [LocationGuard]`
- [ ] `nx build zitro-customer --configuration=production` — zero errors
- [ ] `nx build zitro-customer --configuration=production` — zero budget violations

---

## API Reference

| Endpoint | Called By | Cache |
|----------|-----------|-------|
| `GET /api/businesses/nearby?lat=X&lng=Y&radiusKm=10` | `NearbyBusinessesService` | Memory (session) |
| `GET /api/tags` | `TagsService` | localStorage 1 hr |

### Nearby businesses response shape
```json
[
  {
    "id": "uuid",
    "slug": "efc-pizza",
    "name": "EFC Pizza",
    "businessType": "restaurant",
    "rating": 4.2,
    "deliveryTimeDisplay": "30-40 mins",
    "deliveryFee": 0,
    "minOrderAmount": 0,
    "isActive": true,
    "isFeatured": false,
    "distanceMetres": 850,
    "tags": ["pizza", "burger", "north-indian"]
  }
]
```

### Tags response shape
```json
[
  { "id": "uuid", "slug": "pizza", "name": "Pizza", "iconUrl": "https://..." },
  { "id": "uuid", "slug": "biryani", "name": "Biryani", "iconUrl": "https://..." }
]
```
