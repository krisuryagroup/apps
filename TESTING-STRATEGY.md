# ZITRO — Frontend Testing Strategy (apps)

## Context

`apps` is an Nx 22.6.4 monorepo with Angular 20, one customer app (`zitro-customer`), and 8 shared libs. 110+ spec files already exist. The gaps are: no page-level integration tests validating that mocked API data actually renders, and a nearly empty Playwright E2E suite (`example.spec.ts` only).

**Core goal:** Every page has integration tests that prove mock data renders correctly. Every user journey has an E2E test with screenshots. Zero inline mocks — all mocks live in `libs/test-data`.

---

## Test Account (matches backend)

```typescript
// libs/test-data/src/accounts/test-accounts.ts
export const TEST_ACCOUNTS = {
  CUSTOMER: {
    phone: '+919876543210',
    name: 'Aarav Sharma',
    uid: 'c0000000-0000-0000-0000-000000000001',
    firebaseUid: 'firebase_aarav_001',
    // Token injected via localStorage in E2E, or via mock in unit/integration
    mockJwt: 'test-jwt-aarav-001',
  },
} as const;
```

---

## Architecture Rule: All Mocks in libs/test-data

**Never define mocks inline in spec files.** All MSW handlers, service mocks, and Firebase mocks live in `libs/test-data/src/`. When an API shape changes, fix it in one place.

```
libs/test-data/src/
├── accounts/
│   └── test-accounts.ts            ← test user credentials (NEW)
│
├── fixtures/                       ← realistic JSON matching real API shapes
│   ├── nearby-businesses.fixture.ts
│   ├── products.fixture.ts         ← hunger_point + efc-pizza products
│   ├── categories.fixture.ts
│   ├── orders.fixture.ts
│   ├── addresses.fixture.ts
│   ├── user-profile.fixture.ts
│   ├── banners.fixture.ts
│   ├── coupons.fixture.ts
│   ├── cart.fixture.ts
│   ├── pricing-config.fixture.ts
│   └── app-config.fixture.ts
│
├── mocks/
│   ├── services/                   ← Angular service substitutes (NEW)
│   │   ├── nearby-businesses.mock.ts
│   │   ├── products.mock.ts
│   │   ├── categories.mock.ts
│   │   ├── orders.mock.ts
│   │   ├── cart.mock.ts
│   │   ├── auth.mock.ts
│   │   ├── user.mock.ts
│   │   ├── location.mock.ts
│   │   ├── banners.mock.ts
│   │   ├── coupon.mock.ts
│   │   └── app-settings.mock.ts
│   └── firebase/                   ← Firebase module mocks (NEW)
│       ├── firebase-auth.mock.ts
│       └── firebase-storage.mock.ts
│
├── msw/
│   ├── handlers/                   ← split by domain (NEW — extend existing)
│   │   ├── auth.handlers.ts
│   │   ├── businesses.handlers.ts
│   │   ├── catalog.handlers.ts
│   │   ├── cart.handlers.ts
│   │   ├── orders.handlers.ts
│   │   ├── users.handlers.ts
│   │   ├── payments.handlers.ts
│   │   └── config.handlers.ts
│   ├── handlers.ts                 ← composes all handlers (already exists)
│   └── server.ts                   ← setupServer export for node env (NEW)
│
└── index.ts                        ← barrel export
```

---

## Realistic Fixtures

All fixtures use real business slugs and realistic Indian food data.

### fixtures/nearby-businesses.fixture.ts
```typescript
import type { NearbyBusiness } from '@zitro/models';

export const NearbyBusinessesFixture = {
  getAll: (): NearbyBusiness[] => ([
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      slug: 'hunger_point',
      name: 'The Hunger Point',
      businessType: 'restaurant',
      rating: 4.3,
      totalRatings: 312,
      distanceKm: 1.2,
      prepTimeMinutes: 25,
      deliveryFee: 40,
      minOrderAmount: 149,
      isOpen: true,
      isAcceptingOrders: true,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/businesses/hunger-point.jpg',
      cuisines: ['North Indian', 'Chinese', 'Fast Food'],
      tags: ['bestseller', 'popular'],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      slug: 'efc-pizza',
      name: 'EFC Pizza',
      businessType: 'restaurant',
      rating: 4.1,
      totalRatings: 198,
      distanceKm: 2.5,
      prepTimeMinutes: 20,
      deliveryFee: 40,
      minOrderAmount: 199,
      isOpen: true,
      isAcceptingOrders: true,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/businesses/efc-pizza.jpg',
      cuisines: ['Pizza', 'Italian', 'Fast Food'],
      tags: ['new'],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      slug: 'tularam-kirana-store',
      name: 'Tularam Kirana Store',
      businessType: 'grocery',
      rating: 4.5,
      totalRatings: 521,
      distanceKm: 0.8,
      prepTimeMinutes: 15,
      deliveryFee: 20,
      minOrderAmount: 99,
      isOpen: true,
      isAcceptingOrders: true,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/businesses/tularam.jpg',
      cuisines: [],
      tags: ['grocery'],
    },
  ]),

  getClosedRestaurant: (): NearbyBusiness => ({
    ...NearbyBusinessesFixture.getAll()[0],
    isOpen: false,
    isAcceptingOrders: false,
  }),

  getEmpty: (): NearbyBusiness[] => [],
};
```

### fixtures/products.fixture.ts
```typescript
import type { Product } from '@zitro/models';

export const ProductsFixture = {
  getHungerPointProducts: (): Product[] => ([
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      name: 'Chicken Biryani',
      description: 'Fragrant basmati rice slow-cooked with tender chicken and whole spices',
      price: 249,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/chicken-biryani.jpg',
      categoryId: 'cat-main-course',
      categoryName: 'Main Course',
      foodType: 'non-veg',
      isVeg: false,
      isAvailable: true,
      isEnabledForOnlineOrders: true,
      isBestseller: true,
      isRecommended: true,
      rating: 4.5,
      prepTimeMinutes: 25,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      name: 'Paneer Butter Masala',
      description: 'Creamy tomato-based paneer curry with aromatic spices',
      price: 199,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/paneer-butter-masala.jpg',
      categoryId: 'cat-main-course',
      categoryName: 'Main Course',
      foodType: 'veg',
      isVeg: true,
      isAvailable: true,
      isEnabledForOnlineOrders: true,
      isBestseller: false,
      isRecommended: true,
      rating: 4.2,
      prepTimeMinutes: 20,
    },
    {
      id: 'a0000000-0000-0000-0000-000000000005',
      name: 'Cold Coffee',
      description: 'Chilled blended arabica coffee with full-cream milk and caramel',
      price: 99,
      imageUrl: 'https://storage.googleapis.com/the-hunger-point.appspot.com/products/cold-coffee.jpg',
      categoryId: 'cat-beverages',
      categoryName: 'Beverages',
      foodType: 'veg',
      isVeg: true,
      isAvailable: false, // out of stock
      isEnabledForOnlineOrders: true,
      isBestseller: false,
      isRecommended: false,
      rating: 4.0,
      prepTimeMinutes: 5,
    },
  ]),
};
```

### fixtures/orders.fixture.ts
```typescript
import type { Order } from '@zitro/models';

export const OrdersFixture = {
  getOrderHistory: (): Order[] => ([
    {
      id: 'b0000000-0000-0000-0000-000000000001',
      displayId: 'ORD1234567801',
      businessName: 'The Hunger Point',
      businessSlug: 'hunger_point',
      status: 'pending',
      paymentMethod: 'cash',
      total: 289,
      subtotal: 249,
      deliveryCharge: 40,
      orderType: 'delivery',
      placedAt: '2024-01-15T10:30:00Z',
      items: [{ name: 'Chicken Biryani', qty: 1, price: 249 }],
    },
    {
      id: 'b0000000-0000-0000-0000-000000000002',
      displayId: 'ORD1234567802',
      businessName: 'The Hunger Point',
      businessSlug: 'hunger_point',
      status: 'delivered',
      paymentMethod: 'online',
      total: 438,
      subtotal: 398,
      deliveryCharge: 40,
      orderType: 'delivery',
      placedAt: '2024-01-10T14:20:00Z',
      items: [
        { name: 'Paneer Butter Masala', qty: 1, price: 199 },
        { name: 'Chicken Biryani', qty: 1, price: 249 },
      ],
    },
  ]),

  getOrderById: (displayId: string): Order =>
    OrdersFixture.getOrderHistory().find(o => o.displayId === displayId)!,

  getEmptyHistory: (): Order[] => [],
};
```

---

## Service Mocks Pattern

### mocks/services/nearby-businesses.mock.ts
```typescript
import { vi } from 'vitest';
import { NearbyBusinessesFixture } from '../../fixtures/nearby-businesses.fixture';
import type { NearbyBusinessesService } from '@zitro/services';

export const mockNearbyBusinessesService: Partial<NearbyBusinessesService> = {
  getBusinesses: vi.fn().mockResolvedValue(NearbyBusinessesFixture.getAll()),
  getBusinessBySlug: vi.fn().mockImplementation((slug: string) =>
    Promise.resolve(NearbyBusinessesFixture.getAll().find(b => b.slug === slug) ?? null)
  ),
};

// Variants for testing edge cases
export const mockNearbyBusinessesServiceEmpty: Partial<NearbyBusinessesService> = {
  getBusinesses: vi.fn().mockResolvedValue(NearbyBusinessesFixture.getEmpty()),
};

export const mockNearbyBusinessesServiceError: Partial<NearbyBusinessesService> = {
  getBusinesses: vi.fn().mockRejectedValue(new Error('Network error')),
};
```

### mocks/services/auth.mock.ts
```typescript
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { TEST_ACCOUNTS } from '../../accounts/test-accounts';

export const mockAuthService = {
  isAuthenticated: signal(true),
  isGuest: signal(false),
  currentUser: signal({ uid: TEST_ACCOUNTS.CUSTOMER.uid, phone: TEST_ACCOUNTS.CUSTOMER.phone }),
  token: signal(TEST_ACCOUNTS.CUSTOMER.mockJwt),
  signOut: vi.fn().mockResolvedValue(undefined),
  requestOtp: vi.fn().mockResolvedValue({ sessionId: 'test-session-001' }),
  verifyOtp: vi.fn().mockResolvedValue({ token: TEST_ACCOUNTS.CUSTOMER.mockJwt }),
};

export const mockAuthServiceUnauthenticated = {
  ...mockAuthService,
  isAuthenticated: signal(false),
  isGuest: signal(true),
  currentUser: signal(null),
  token: signal(null),
};
```

---

## MSW Handlers (split by domain)

### msw/handlers/businesses.handlers.ts
```typescript
import { http, HttpResponse } from 'msw';
import { NearbyBusinessesFixture } from '../../fixtures/nearby-businesses.fixture';

export const businessHandlers = [
  http.get('*/api/businesses/nearby', () =>
    HttpResponse.json(NearbyBusinessesFixture.getAll())
  ),
  http.get('*/api/businesses/:slug', ({ params }) =>
    HttpResponse.json(
      NearbyBusinessesFixture.getAll().find(b => b.slug === params['slug']) ?? null
    )
  ),
  http.get('*/api/businesses/:slug/menu', () =>
    HttpResponse.json({ categories: CategoriesFixture.getHungerPointCategories(), products: ProductsFixture.getHungerPointProducts() })
  ),
  http.get('*/api/businesses/:id/banners', () =>
    HttpResponse.json(BannersFixture.getAll())
  ),
  http.get('*/api/businesses/:id/config', () =>
    HttpResponse.json(PricingConfigFixture.hungerPoint())
  ),
];
```

### msw/server.ts (NEW — for Node environment integration tests)
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## 3-Tier Testing Approach

| Tier | Tool | Purpose | Runs in |
|---|---|---|---|
| **Unit** | Vitest + TestBed | Pure service logic, mapper transforms, guard conditions | CI always |
| **Integration** | Vitest + TestBed + service mocks | Page renders mocked data correctly, interactions update DOM | CI always |
| **E2E** | Playwright | Full user journeys across pages, screenshots as evidence | CI on main |

**The integration tier is new and is the most important gap to fill.**

---

## Integration Test Strategy: Page by Page

The pattern for every page integration test:
1. Mount the full page component (not just the class) via TestBed
2. Inject mocks from `libs/test-data/src/mocks/services/` — never inline
3. `await fixture.whenStable()` after render
4. Assert DOM content using `data-testid` selectors
5. Simulate interactions (click, input), then re-assert

### Home Page (`features/home/`)

**File:** `apps/zitro-customer/src/app/features/home/home.page.spec.ts`

```typescript
describe('HomePage — data rendering', () => {
  // Uses: mockNearbyBusinessesService, mockBannersService, mockLocationService, mockAppSettingsService

  describe('Business list rendering', () => {
    it('renders one card per nearby business returned by service')
    it('renders business name on each card')
    it('renders rating value (e.g. "4.3") on each card')
    it('renders distance (e.g. "1.2 km") on each card')
    it('renders delivery time (e.g. "25 min") on each card')
    it('renders cuisine tags on restaurant cards')
    it('renders business image (img src matches fixture url)')
    it('renders "Open" badge on open businesses')
    it('renders "Closed" overlay badge on closed businesses')
    it('renders minimum order amount text')
    it('shows skeleton loaders while businesses are loading (before resolves)')
    it('shows empty state message when getBusinesses returns empty array')
    it('shows error state when getBusinesses throws')
  })

  describe('Category filter chips', () => {
    it('renders a chip for each unique cuisine in nearby businesses list')
    it('clicking "All" chip shows all businesses')
    it('clicking "Pizza" chip filters to only pizza restaurants')
    it('clicking "Grocery" chip filters to grocery stores only')
    it('active chip has highlighted styling (via data-testid="chip-active")')
  })

  describe('Banner carousel', () => {
    it('renders the correct number of banners from fixture')
    it('renders banner image src from fixture')
    it('renders banner title text from fixture')
    it('shows next banner on slide/arrow click')
  })

  describe('Location bar', () => {
    it('displays the current saved location label')
    it('clicking location bar emits navigation to location-selection')
    it('shows "Select Location" when no location set')
  })

  describe('Interactions', () => {
    it('clicking business card navigates to /listing with correct slug')
    it('business card emits correct slug via router.navigate')
  })
})
```

---

### Listing Page (`features/listing/`)

**File:** `apps/zitro-customer/src/app/features/listing/listing.page.spec.ts`

```typescript
describe('ListingPage — data rendering', () => {
  // Uses: mockProductsService, mockCategoriesService, mockCartService, mockNearbyBusinessesService

  describe('Business header', () => {
    it('renders restaurant name from fixture')
    it('renders average rating')
    it('renders delivery time')
    it('renders min order amount')
    it('shows "Closed — Not accepting orders" overlay when closed')
  })

  describe('Product grid rendering', () => {
    it('renders one card per product returned by service')
    it('renders product name on each card')
    it('renders product price formatted as ₹249')
    it('renders product image (img src matches fixture url)')
    it('renders "VEG" green badge for veg items')
    it('renders "NON-VEG" red badge for non-veg items')
    it('renders "BESTSELLER" tag when isBestseller is true')
    it('renders "OUT OF STOCK" label when isAvailable is false')
    it('disables add-to-cart button when isAvailable is false')
    it('renders "ADD" button when item is not in cart')
    it('renders quantity stepper when item is already in cart')
  })

  describe('Category sidebar', () => {
    it('renders one entry per category from fixture')
    it('clicking category scrolls to that section (calls scrollIntoView)')
    it('active category is highlighted (data-testid="category-active")')
  })

  describe('Cart badge', () => {
    it('shows cart item count when cart has items')
    it('count updates after adding an item')
    it('hides badge when cart is empty')
  })

  describe('Search', () => {
    it('typing in search input calls service filter method')
    it('filtered results show only matching products')
    it('clearing search input restores full list')
    it('no-results state shown when search yields empty')
  })

  describe('Add to cart', () => {
    it('clicking ADD calls cartService.addItem with correct productId')
    it('pressing + increments quantity and updates total in floating cart')
    it('pressing − to zero removes item from cart')
  })
})
```

---

### Cart Page (`features/cart/`)

**File:** `apps/zitro-customer/src/app/features/cart/cart.page.spec.ts`

```typescript
describe('CartPage — data rendering', () => {
  // Uses: mockCartService (with seeded cart items), mockPricingService, mockCouponService

  describe('Cart items rendering', () => {
    it('renders one row per cart item from fixture')
    it('renders item name on each row')
    it('renders item image')
    it('renders unit price formatted as ₹249')
    it('renders item quantity')
    it('renders line total (qty × price) formatted correctly')
    it('shows empty cart state when cart is empty')
  })

  describe('Pricing summary', () => {
    it('renders subtotal matching sum of line items')
    it('renders delivery fee from pricing config')
    it('renders packaging fee when enabled in config')
    it('renders GST amount when enabled in config')
    it('renders platform fee when enabled in config')
    it('renders "FREE" for delivery when order exceeds free_delivery_above threshold')
    it('renders grand total = subtotal + fees − discount')
    it('renders discount line with coupon code when coupon applied')
  })

  describe('Coupon field', () => {
    it('renders coupon input and apply CTA')
    it('applying valid coupon shows discount in pricing summary')
    it('applying invalid coupon shows error message below input')
    it('applying expired coupon shows "Coupon expired" message')
    it('removing coupon restores original total')
  })

  describe('Delivery address', () => {
    it('renders selected delivery address when logged in')
    it('shows "Add Address" CTA when no address selected')
    it('shows "Select Address" when user has addresses but none selected')
  })

  describe('Quantity controls', () => {
    it('pressing + increases quantity and updates line total and grand total')
    it('pressing − to 1 keeps item in cart')
    it('pressing − to 0 removes item and updates cart badge')
  })

  describe('Checkout CTA', () => {
    it('checkout button is enabled when cart has items and address is set')
    it('checkout button is disabled when cart is empty')
    it('checkout button shows login prompt when user is not authenticated')
  })
})
```

---

### Order Confirmation Page (`features/orders/order-confirmation/`)

**File:** `apps/zitro-customer/src/app/features/orders/order-confirmation.page.spec.ts`

```typescript
describe('OrderConfirmationPage — data rendering', () => {
  // Uses: mockOrdersService (returns ORD1234567801 data)

  describe('Order details rendering', () => {
    it('renders order display ID (e.g. ORD1234567801)')
    it('renders restaurant name')
    it('renders all order items with name and qty')
    it('renders each item price')
    it('renders order total')
    it('renders delivery address (house, landmark, town)')
    it('renders order status badge with correct label')
    it('renders placed-at timestamp formatted correctly')
    it('renders payment method label (Cash on Delivery / Online)')
  })

  describe('Status timeline', () => {
    it('renders each status step from timeline array')
    it('completed steps show checkmark')
    it('current step is highlighted')
    it('future steps are greyed out')
  })

  describe('CTAs', () => {
    it('shows "Track Order" button when status is shipped')
    it('shows "Cancel Order" button when status is pending')
    it('hides "Cancel Order" when status is preparing or later')
    it('shows "Rate Order" button when status is delivered')
    it('"View all orders" navigates to /orders')
  })
})
```

---

### Order History Page (`features/orders/`)

**File:** `apps/zitro-customer/src/app/features/orders/order-history.page.spec.ts`

```typescript
describe('OrderHistoryPage — data rendering', () => {
  // Uses: mockOrdersService

  describe('Order list rendering', () => {
    it('renders one card per order in fixture')
    it('renders order display ID on each card')
    it('renders restaurant name on each card')
    it('renders order date formatted correctly')
    it('renders order total formatted as ₹289')
    it('renders status badge with correct text per status')
    it('renders "pending" badge in yellow')
    it('renders "delivered" badge in green')
    it('renders "cancelled" badge in red')
    it('shows skeleton loaders while fetching')
    it('shows empty state with CTA when history is empty')
  })

  describe('Interactions', () => {
    it('clicking order card navigates to /order-confirmation/:displayId')
    it('pull-to-refresh calls orderService.getOrders again')
  })
})
```

---

### Account Page (`features/account/`)

**File:** `apps/zitro-customer/src/app/features/account/account.page.spec.ts` (extend existing 196-line spec)

```typescript
describe('AccountPage — data rendering', () => {
  // Uses: mockAuthService (authenticated), mockUserManagementService

  describe('Profile rendering', () => {
    it('renders user name from profile fixture ("Aarav Sharma")')
    it('renders phone number (+91 98765 43210 formatted)')
    it('renders profile image when photoUrl is set')
    it('renders initials avatar placeholder when photoUrl is null')
  })

  describe('Navigation items', () => {
    it('renders "My Orders" nav item')
    it('renders "Saved Addresses" nav item')
    it('renders "Notifications" nav item')
    it('renders "Help & Support" nav item')
    it('renders "Delete Account" option')
  })

  describe('Interactions', () => {
    it('clicking "My Orders" navigates to /orders')
    it('clicking "Saved Addresses" navigates to /addresses')
    it('clicking "Logout" calls authService.signOut()')
    it('after signOut resolves, navigates to /auth/signin')
  })
})
```

---

### Addresses Page (`features/addresses/`)

**File:** `apps/zitro-customer/src/app/features/addresses/address-list.page.spec.ts`

```typescript
describe('AddressListPage — data rendering', () => {
  // Uses: mockAddressApiService

  describe('Address list rendering', () => {
    it('renders one card per address in fixture')
    it('renders house and street on each card')
    it('renders landmark when present')
    it('renders town and pincode on each card')
    it('renders "HOME" / "WORK" / "OTHER" type badge')
    it('renders "DEFAULT" chip on the default address')
    it('shows empty state when user has no addresses')
  })

  describe('Interactions', () => {
    it('clicking "Add New Address" navigates to /add-address')
    it('clicking "Delete" on an address calls addressApiService.deleteAddress()')
    it('deleted address disappears from list after API call')
    it('clicking "Set as Default" calls addressApiService.updateAddress with isDefault:true')
  })
})
```

---

### Location Selection Page (`features/location-selection/`)

**File:** `apps/zitro-customer/src/app/features/location-selection/location-selection.page.spec.ts`

```typescript
describe('LocationSelectionPage — data rendering', () => {
  // Uses: mockLocationService, mockAddressApiService (logged-in variant)

  describe('When user is logged in (with saved addresses)', () => {
    it('renders "Saved Addresses" section header')
    it('renders one row per saved address from fixture')
    it('renders address label (house + town) on each row')
    it('renders "Home" / "Work" type icon')
    it('clicking saved address calls locationService.setLocation(address)')
  })

  describe('When user is guest (no saved addresses)', () => {
    it('does not render saved addresses section')
    it('renders "Use Current Location" CTA')
  })

  describe('Search', () => {
    it('renders geocoding search input')
    it('typing triggers geocodingService.search after debounce')
    it('search results render as a selectable list')
    it('selecting a result calls locationService.setLocation')
  })
})
```

---

### Sign In Page (`features/auth/sign-in/`)

**File:** `apps/zitro-customer/src/app/features/auth/sign-in/sign-in.page.spec.ts`

```typescript
describe('SignInPage', () => {
  // Uses: mockAuthService

  describe('Rendering', () => {
    it('renders phone number input field')
    it('renders "Send OTP" / "Continue" button')
    it('button is disabled when phone is empty')
    it('button is disabled when phone is less than 10 digits')
  })

  describe('Validation', () => {
    it('shows "Enter a valid phone number" when non-numeric entered')
    it('shows "Phone number must be 10 digits" for 9-digit input on blur')
    it('accepts 10-digit number without error')
  })

  describe('Submission', () => {
    it('clicking CTA with valid phone calls authService.requestOtp()')
    it('shows loading spinner while requestOtp is in progress')
    it('navigates to /auth/otp on successful OTP request')
    it('shows error message when requestOtp throws')
  })
})
```

---

### OTP Page (`features/auth/otp/`)

**File:** `apps/zitro-customer/src/app/features/auth/otp/otp.page.spec.ts`

```typescript
describe('OtpPage', () => {
  // Uses: mockAuthService

  describe('Rendering', () => {
    it('renders 6 OTP digit input boxes')
    it('renders masked phone number (e.g. +91 ••••• 43210)')
    it('renders resend timer countdown')
    it('renders "Resend OTP" CTA (disabled while timer > 0)')
  })

  describe('Input behaviour', () => {
    it('typing a digit in box 1 auto-focuses box 2')
    it('backspace on empty box shifts focus to previous box')
    it('pasting 6 digits fills all boxes')
    it('auto-submits when all 6 digits entered')
  })

  describe('Verification', () => {
    it('calls authService.verifyOtp with entered 6-digit code')
    it('shows loading state while verifying')
    it('navigates to /home on successful verification')
    it('shows "Invalid OTP" error on wrong code')
    it('clears inputs and shows error on failed attempt')
  })

  describe('Resend', () => {
    it('resend CTA enabled after countdown reaches 0')
    it('clicking resend calls authService.requestOtp again')
  })
})
```

---

### Search Page (`features/search/`)

**File:** `apps/zitro-customer/src/app/features/search/search.page.spec.ts`

```typescript
describe('SearchPage', () => {
  // Uses: mockProductsService, mockNearbyBusinessesService

  describe('Rendering', () => {
    it('renders search input focused on mount')
    it('renders recent searches list when input is empty')
    it('renders business results section when query matches businesses')
    it('renders product results section when query matches products')
    it('renders "No results found" when nothing matches')
  })

  describe('Search behaviour', () => {
    it('typing triggers search after 300ms debounce')
    it('clearing input shows recent searches again')
    it('each product result shows name, price, and restaurant name')
    it('each business result shows name, rating, and distance')
  })
})
```

---

### Contact Us Page (`features/contact-us/`)

**File:** `apps/zitro-customer/src/app/features/contact-us/contact-us.page.spec.ts`

```typescript
describe('ContactUsPage', () => {
  describe('Rendering', () => {
    it('renders name input field')
    it('renders message textarea')
    it('renders submit button')
    it('renders support phone number / WhatsApp link')
  })

  describe('Form validation', () => {
    it('submit disabled when name is empty')
    it('submit disabled when message is under 10 characters')
    it('shows required error on blur when field is empty')
  })

  describe('Submission', () => {
    it('shows success message after submit')
    it('clears form after successful submit')
  })
})
```

---

## E2E Tests (Playwright)

### Updated playwright.config.ts
```typescript
export default defineConfig({
  testDir: './src/flows',
  fullyParallel: false,
  retries: process.env['CI'] ? 2 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    screenshot: 'on',
    video: 'on-first-retry',
    trace: 'on-first-retry',
  },
  outputDir: 'test-results/',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx nx run zitro-customer:serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
  },
});
```

### E2E Folder Structure
```
apps/zitro-customer-e2e/
├── playwright.config.ts                         ← update (add reporters + screenshot)
├── src/
│   ├── flows/
│   │   ├── auth/
│   │   │   ├── login.flow.spec.ts               ← phone → OTP → home
│   │   │   └── logout.flow.spec.ts
│   │   ├── home/
│   │   │   └── home-browse.spec.ts              ← category filter, business card click
│   │   ├── catalog/
│   │   │   └── listing-page.spec.ts             ← browse products, add to cart
│   │   ├── cart/
│   │   │   ├── cart-operations.spec.ts          ← add, update qty, remove
│   │   │   └── coupon-application.spec.ts       ← apply valid + invalid coupon
│   │   ├── orders/
│   │   │   ├── place-order-cod.spec.ts          ← GOLDEN PATH
│   │   │   ├── place-order-wallet.spec.ts
│   │   │   ├── order-history.spec.ts
│   │   │   └── cancel-order.spec.ts
│   │   ├── account/
│   │   │   ├── manage-addresses.spec.ts
│   │   │   └── profile.spec.ts
│   │   └── search/
│   │       └── search.spec.ts
│   ├── helpers/
│   │   ├── auth.helper.ts                       ← bypass OTP via /api/auth/dev-login
│   │   ├── cart.helper.ts                       ← seed cart state via API
│   │   ├── api.helper.ts                        ← direct API calls for test setup
│   │   └── screenshot.helper.ts                 ← named screenshot wrapper
│   ├── pages/                                   ← Page Object Model
│   │   ├── home.page.ts
│   │   ├── listing.page.ts
│   │   ├── cart.page.ts
│   │   ├── otp.page.ts
│   │   ├── order-confirmation.page.ts
│   │   ├── order-history.page.ts
│   │   └── account.page.ts
│   └── fixtures/
│       └── test.fixtures.ts                     ← Playwright fixture extensions
└── test-results/                                ← gitignored
```

### auth.helper.ts — bypass OTP for non-auth E2E tests
```typescript
// Calls a dev-only API endpoint (App:Environment != Production)
// that issues a real JWT without OTP, so E2E tests skip the OTP UI
export async function loginAsTestUser(page: Page): Promise<void> {
  const res = await page.request.post(`${process.env['API_BASE'] ?? 'http://localhost:8080'}/api/auth/dev-login`, {
    data: { phone: TEST_ACCOUNTS.CUSTOMER.phone },
    headers: { 'X-Business-Id': 'hunger_point' },
  });
  const { token } = await res.json();
  await page.evaluate((t) => localStorage.setItem('auth_token', t), token);
  await page.reload();
}
```

> **Requires:** Add `POST /api/auth/dev-login` to zitro-api, guarded by `App:Environment != "Production"`. Returns a real JWT for the test phone number, skipping OTP. This is the only backend change required to unblock all E2E tests.

### screenshot.helper.ts
```typescript
export async function step(
  page: Page,
  stepName: string,
  action: () => Promise<void>
): Promise<void> {
  await test.step(stepName, async () => {
    await action();
    const safeName = stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const testName = test.info().title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    await page.screenshot({
      path: `test-results/${testName}/${safeName}.png`,
      fullPage: false,
    });
  });
}
```

### Golden Path E2E — place-order-cod.spec.ts
```typescript
test('Guest browses → adds item → logs in → places COD order → sees confirmation', async ({ page }) => {
  const home = new HomePage(page);
  const listing = new ListingPage(page);
  const cart = new CartPage(page);
  const otp = new OtpPage(page);
  const confirmation = new OrderConfirmationPage(page);

  await step(page, '01-open-home', () => page.goto('/home'));
  await step(page, '02-tap-restaurant', () => home.tapFirstRestaurant());
  await step(page, '03-listing-loaded', () => expect(listing.productCards.first()).toBeVisible());
  await step(page, '04-add-first-item', () => listing.addFirstItemToCart());
  await step(page, '05-open-cart', () => page.goto('/cart'));
  await step(page, '06-cart-has-item', () => expect(cart.itemRows.first()).toBeVisible());
  await step(page, '07-tap-checkout', () => cart.tapCheckout());

  // Login wall
  await step(page, '08-enter-phone', () => otp.enterPhone(TEST_ACCOUNTS.CUSTOMER.phone));
  await step(page, '09-enter-otp', () => otp.enterOtp('123456'));   // bypass code

  // Back to checkout
  await step(page, '10-order-placed', () =>
    expect(page).toHaveURL(/order-confirmation/)
  );
  await step(page, '11-order-id-visible', () =>
    expect(confirmation.orderDisplayId).toBeVisible()
  );
  await step(page, '12-order-id-has-prefix', async () => {
    const text = await confirmation.orderDisplayId.innerText();
    expect(text).toMatch(/^ORD/);
  });
});
```

### Page Object — listing.page.ts
```typescript
export class ListingPage {
  constructor(private page: Page) {}

  get productCards()   { return this.page.getByTestId('product-card'); }
  get addToCartBtn()   { return this.page.getByTestId('add-to-cart').first(); }
  get cartBadge()      { return this.page.getByTestId('cart-badge'); }
  get searchInput()    { return this.page.getByTestId('search-input'); }
  get categoryItems()  { return this.page.getByTestId('category-item'); }
  get closedOverlay()  { return this.page.getByTestId('business-closed-overlay'); }

  async addFirstItemToCart() {
    await this.addToCartBtn.click();
    await expect(this.cartBadge).toBeVisible();
  }

  async searchFor(term: string) {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(350); // debounce
  }
}
```

### Screenshot Output Structure
```
test-results/
├── guest-browses-adds-item-logs-in-places-cod-order/
│   ├── 01-open-home.png
│   ├── 02-tap-restaurant.png
│   ├── 03-listing-loaded.png
│   ├── 04-add-first-item.png
│   ├── 05-open-cart.png
│   ├── 06-cart-has-item.png
│   ├── 07-tap-checkout.png
│   ├── 08-enter-phone.png
│   ├── 09-enter-otp.png
│   ├── 10-order-placed.png
│   ├── 11-order-id-visible.png
│   └── 12-order-id-has-prefix.png
├── login-flow/
│   ├── 01-sign-in-page.png
│   ├── 02-phone-entered.png
│   ├── 03-otp-screen.png
│   └── 04-home-redirect.png
```

HTML report at `playwright-report/index.html` includes all screenshots inline.

---

## Complete File Structure (frontend)

```
libs/test-data/src/
├── accounts/
│   └── test-accounts.ts                    ← NEW
├── fixtures/
│   ├── nearby-businesses.fixture.ts        ← NEW (realistic data)
│   ├── products.fixture.ts                 ← NEW
│   ├── categories.fixture.ts               ← NEW
│   ├── orders.fixture.ts                   ← NEW
│   ├── addresses.fixture.ts                ← NEW
│   ├── user-profile.fixture.ts             ← NEW
│   ├── banners.fixture.ts                  ← NEW
│   ├── coupons.fixture.ts                  ← NEW
│   ├── cart.fixture.ts                     ← NEW
│   ├── pricing-config.fixture.ts           ← NEW
│   └── app-config.fixture.ts               ← NEW
├── mocks/
│   ├── services/                           ← NEW directory
│   │   ├── nearby-businesses.mock.ts
│   │   ├── products.mock.ts
│   │   ├── categories.mock.ts
│   │   ├── orders.mock.ts
│   │   ├── cart.mock.ts
│   │   ├── auth.mock.ts
│   │   ├── user.mock.ts
│   │   ├── location.mock.ts
│   │   ├── banners.mock.ts
│   │   ├── coupon.mock.ts
│   │   └── app-settings.mock.ts
│   └── firebase/                           ← NEW directory
│       ├── firebase-auth.mock.ts
│       └── firebase-storage.mock.ts
├── msw/
│   ├── handlers/                           ← NEW: split from monolithic handlers.ts
│   │   ├── auth.handlers.ts
│   │   ├── businesses.handlers.ts
│   │   ├── catalog.handlers.ts
│   │   ├── cart.handlers.ts
│   │   ├── orders.handlers.ts
│   │   ├── users.handlers.ts
│   │   └── config.handlers.ts
│   ├── handlers.ts                         ← already exists, refactor to import above
│   ├── handlers.spec.ts                    ← already exists, extend
│   └── server.ts                           ← NEW: setupServer for node env
└── index.ts                                ← export everything

apps/zitro-customer/src/app/
├── features/
│   ├── home/
│   │   └── home.page.spec.ts               ← NEW (35+ assertions)
│   ├── listing/
│   │   └── listing.page.spec.ts            ← NEW (35+ assertions)
│   ├── cart/
│   │   └── cart.page.spec.ts               ← NEW (30+ assertions)
│   ├── orders/
│   │   ├── order-confirmation.page.spec.ts ← NEW (25+ assertions)
│   │   └── order-history.page.spec.ts      ← NEW (15+ assertions)
│   ├── auth/
│   │   ├── sign-in/sign-in.page.spec.ts    ← NEW (12 assertions)
│   │   └── otp/otp.page.spec.ts            ← NEW (14 assertions)
│   ├── account/
│   │   └── account.page.spec.ts            ← extend existing (196 lines)
│   ├── addresses/
│   │   └── address-list.page.spec.ts       ← NEW (15+ assertions)
│   ├── location-selection/
│   │   └── location-selection.page.spec.ts ← NEW (12+ assertions)
│   ├── search/
│   │   └── search.page.spec.ts             ← NEW (10+ assertions)
│   └── contact-us/
│       └── contact-us.page.spec.ts         ← NEW (10+ assertions)

apps/zitro-customer-e2e/
├── playwright.config.ts                    ← update
├── src/
│   ├── flows/                              ← ALL NEW
│   ├── helpers/                            ← ALL NEW
│   ├── pages/                              ← ALL NEW
│   └── fixtures/test.fixtures.ts           ← NEW
└── test-results/                           ← gitignored
```

---

## CI/CD — GitHub Actions

```yaml
# In apps/.github/workflows/ci.yml (or root)

test-unit-integration:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - run: npx nx affected --target=test --parallel=4 --coverage --ci
    - uses: actions/upload-artifact@v4
      with: { name: unit-coverage, path: coverage/ }

test-e2e:
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npx nx e2e zitro-customer-e2e --reporter=html
      env:
        BASE_URL: 'http://localhost:4200'
        API_BASE: 'http://localhost:8080'
        CI: 'true'
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: apps/zitro-customer-e2e/playwright-report/
```

---

## Phase Roadmap (Frontend)

**Week 1 — Fixtures + Mocks + Home + Auth**
1. Create all fixture files in `libs/test-data/src/fixtures/`
2. Create all service mocks in `libs/test-data/src/mocks/services/`
3. Refactor `msw/handlers.ts` into `msw/handlers/` domain split
4. Write `home.page.spec.ts` (35+ assertions)
5. Write `sign-in.page.spec.ts` + `otp.page.spec.ts`
6. Update `playwright.config.ts` with HTML reporter + screenshot capture
7. Write `auth/login.flow.spec.ts` E2E (requires `/api/auth/dev-login` on backend)

**Week 2 — Listing + Cart + Orders**
8. Write `listing.page.spec.ts` (35+ assertions)
9. Write `cart.page.spec.ts` (30+ assertions)
10. Write `order-confirmation.page.spec.ts` + `order-history.page.spec.ts`
11. Write E2E golden path: `place-order-cod.spec.ts`
12. Write E2E: `cart-operations.spec.ts` + `coupon-application.spec.ts`

**Week 3 — Account + Addresses + Search + Coverage**
13. Write `account.page.spec.ts` (extend), `address-list.page.spec.ts`, `location-selection.page.spec.ts`, `search.page.spec.ts`, `contact-us.page.spec.ts`
14. Write E2E: `manage-addresses.spec.ts`, `order-history.spec.ts`, `search.spec.ts`
15. Add CI workflow with E2E artifact upload

---

## Running Tests

```bash
# All unit + integration tests (affected only)
npx nx affected --target=test --parallel=4

# All tests across all projects
npx nx run-many --target=test --all

# Single page spec
npx nx test zitro-customer --testFile=src/app/features/home/home.page.spec.ts

# E2E tests
npx nx e2e zitro-customer-e2e

# E2E with HTML report
npx nx e2e zitro-customer-e2e --reporter=html
npx playwright show-report apps/zitro-customer-e2e/playwright-report

# Coverage report
npx nx test zitro-customer --coverage
open coverage/apps/zitro-customer/lcov-report/index.html
```
