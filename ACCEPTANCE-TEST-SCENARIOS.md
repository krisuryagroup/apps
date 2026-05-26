# ZITRO — Acceptance (E2E) Test Scenarios

> **Philosophy:** Every scenario here was written assuming the bug has already happened in production once.
> If a scenario feels obvious, that means it has burned someone before.

Test account: `+919876543210` / Aarav Sharma (OTP bypass: `123456`)

---

## PAGE: Home Page

---

### FEATURE 1: Business Listing — Data Rendering

#### SCENARIO 1.1 — Business cards render all fields correctly
- **What to validate:**
  - Each card shows business name exactly as returned by API (`The Hunger Point`, not `the hunger point`)
  - Rating shown as single decimal (e.g. `4.3`, not `4.30` or `4`)
  - Distance shown with unit (e.g. `1.2 km`, not `1.2` or `1200 m`)
  - Delivery time shown with unit (e.g. `25 min`)
  - Minimum order shown with ₹ symbol (e.g. `Min ₹149`)
  - Delivery fee shown correctly (e.g. `₹40 delivery` or `Free delivery`)
  - Cuisine tags visible (e.g. `North Indian · Chinese`)
  - Business image rendered (img element has non-empty `src`)
- **What can break:**
  - Rating shows as `4.30000001` due to float precision
  - Distance shows as `1.19999` due to float rounding
  - Image src is empty string — blank white box renders
  - `₹` symbol missing on low-end Android WebView fonts
  - Cuisine array is empty — tags section collapses but leaves gap
- **Assertions:**
  ```
  expect(card.name).toBe('The Hunger Point')
  expect(card.rating).toMatch(/^\d\.\d$/)
  expect(card.distance).toMatch(/^\d+(\.\d+)? km$/)
  expect(card.deliveryTime).toMatch(/^\d+ min$/)
  expect(card.image.src).not.toBe('')
  expect(card.image.naturalWidth).toBeGreaterThan(0)  // image actually loaded
  ```

#### SCENARIO 1.2 — Open vs Closed business visual distinction
- **What to validate:**
  - Open businesses show no closed overlay
  - Closed businesses show overlay with text ("Currently Closed" or "Opens at HH:MM")
  - Closed business card is visually dimmed (opacity or grayscale class applied)
  - Clicking a closed business card still navigates to listing page (shows closed state there)
  - Closed badge is not present on open businesses
- **What can break:**
  - `isOpen: false` but overlay not rendered (missing conditional in template)
  - Overlay renders for ALL cards due to wrong CSS z-index
  - Open businesses show "Opens at" text from stale cache
  - Clicking closed business card does nothing (navigation blocked when it should navigate)

#### SCENARIO 1.3 — Business list count matches API response
- **What to validate:**
  - Number of rendered cards equals `businesses.length` from API
  - No duplicate cards (same business appears twice)
  - No ghost cards (extra empty card elements)
- **What can break:**
  - `*ngFor` with `trackBy` missing — Angular re-renders duplicates on route back
  - Off-by-one error in pagination concatenation
  - API returns 3 businesses but 4 cards render (from stale state)
- **Assertions:**
  ```
  expect(page.getByTestId('business-card').count()).toBe(apiResponse.length)
  const ids = await page.getByTestId('business-id').allInnerTexts()
  expect(new Set(ids).size).toBe(ids.length)  // no duplicates
  ```

#### SCENARIO 1.4 — Image loading and fallback
- **What to validate:**
  - Business image loads within 3s on normal network
  - Skeleton/placeholder shown while image is loading
  - Broken image URL shows fallback image (not broken icon)
  - Fallback image is the correct ZITRO placeholder, not browser's broken icon
- **What can break:**
  - No `(error)` handler on `<img>` — broken images show browser default broken icon
  - Skeleton never hides if image load event fires before skeleton is mounted
  - Fallback src is also broken (typo in asset path)
  - Image loads but is wrong aspect ratio — card layout breaks

#### SCENARIO 1.5 — Ordering of businesses
- **What to validate:**
  - Businesses are displayed in the order returned by the API
  - After applying a filter, order updates to match new API response
  - Sponsored/featured restaurants appear at top if API indicates so
- **What can break:**
  - Array mutation in service causes random reordering
  - Sort applied client-side overrides server-side relevance ranking

---

### FEATURE 2: Filters

#### SCENARIO 2.1 — Apply single cuisine filter
- **What to validate:**
  - Clicking "Pizza" chip sends API request with `cuisine=pizza` param
  - Only pizza restaurants appear in results
  - "Pizza" chip has active/selected visual state (highlighted background, checkmark)
  - "All" chip is deselected when another chip is selected
  - URL updates to reflect selected filter (if deep-linkable)
- **What can break:**
  - API called with wrong param name (e.g. `filter=pizza` instead of `cuisine=pizza`)
  - API called but UI still shows old results (results not replaced, concatenated)
  - Chip shows active state but API not called (state/API desync)
  - Multiple API calls fire simultaneously on fast double-click
- **Assertions:**
  ```
  await page.getByTestId('filter-chip-pizza').click()
  // intercept network
  expect(request.url).toContain('cuisine=pizza')
  expect(page.getByTestId('business-card').count()).toBeLessThanOrEqual(fullListCount)
  expect(page.getByTestId('filter-chip-pizza')).toHaveClass(/active/)
  expect(page.getByTestId('filter-chip-all')).not.toHaveClass(/active/)
  ```

#### SCENARIO 2.2 — Apply multiple filters simultaneously
- **What to validate:**
  - Selecting "Veg" AND "Pizza" sends request with both params
  - Result set is intersection (only veg pizza places)
  - Both chips show active state
  - Count of results can be zero (handled gracefully)
- **What can break:**
  - Second filter click clears first filter (radio behavior instead of multi-select)
  - API receives only last selected filter (state overwritten, not accumulated)
  - UI shows both chips active but API only receives one

#### SCENARIO 2.3 — Remove single filter (deselect)
- **What to validate:**
  - Clicking active "Pizza" chip again deselects it
  - API re-called without `cuisine` param
  - Results revert to unfiltered list
  - "All" chip becomes active if no filter selected
- **What can break:**
  - Deselect click doesn't fire (requires double-click)
  - API not re-called on deselect (results stay filtered)
  - "All" chip never re-activates

#### SCENARIO 2.4 — Filter with no results
- **What to validate:**
  - When API returns empty array, empty state UI is shown
  - Empty state has descriptive message ("No [cuisine] restaurants nearby")
  - "Clear filters" CTA visible in empty state
  - Clicking "Clear filters" removes filter and reloads list
  - No "ghost" cards from previous results remain visible
- **What can break:**
  - Empty state not shown — old results persist
  - Empty state shown even when results exist (race condition)
  - "Clear filters" button navigates away instead of resetting

#### SCENARIO 2.5 — Filter persists on scroll and lazy load
- **What to validate:**
  - After applying "Grocery" filter and scrolling to load more, new results are also grocery only
  - Filter chip remains active after lazy load
  - Lazy-loaded page requests include filter param
- **What can break:**
  - Pagination request omits filter param — unfiltered results mix in
  - Filter chip UI resets to "All" after scroll event fires

#### SCENARIO 2.6 — Filter state after navigation
- **What to validate:**
  - Navigate to listing page → back to home → filter selection is preserved
  - Browser back button restores filter state
  - Hard refresh clears filters (expected behavior)
- **What can break:**
  - Filter state not in URL/history — back button shows wrong state
  - Filter state persists in service even after full navigation away and back

#### SCENARIO 2.7 — Rating filter (if applicable)
- **What to validate:**
  - Selecting "4.0+" rating filter shows only businesses with rating ≥ 4.0
  - A business with rating exactly 4.0 IS included (boundary condition)
  - A business with rating 3.9 is NOT included

#### SCENARIO 2.8 — Slow API response during filter change
- **What to validate:**
  - Loading skeleton shown while filter API call is pending
  - Previous results are hidden (not shown alongside skeleton)
  - If user changes filter before response, only latest filter's results show
  - In-flight cancelled request does not populate results
- **What can break:**
  - Stale closure: first filter's results arrive after second filter change, overwrite correct results
  - No loading state — UI freezes for 2s with no feedback
  - Both loading + results shown simultaneously

---

### FEATURE 3: Category Selection

#### SCENARIO 3.1 — Category tabs/chips render
- **What to validate:**
  - All categories from API render as chips (Restaurants, Groceries, etc.)
  - Active/default category chip is highlighted on page load
  - Category icon (if present) renders alongside label
- **What can break:**
  - Categories hardcoded in frontend, don't reflect API data
  - Default active state not applied on first render

#### SCENARIO 3.2 — Switch between categories
- **What to validate:**
  - Clicking "Groceries" shows only grocery businesses
  - Clicking "Restaurants" shows only restaurant businesses
  - API called with correct `type` param on each click
  - Previously selected category becomes inactive
  - Results update completely (no mixing of types)
- **What can break:**
  - `businessType` filter applied client-side only — API still returns all types
  - Slow click: double-click fires two API calls and race condition populates wrong results

#### SCENARIO 3.3 — Category "All" shows all business types
- **What to validate:**
  - "All" category shows restaurants AND grocery stores interleaved
  - Business type badge visible on each card ("Restaurant" / "Grocery")
- **What can break:**
  - "All" fires API with `type=all` — API rejects unknown type value
  - "All" omits the `type` param but API defaults to restaurants-only

---

### FEATURE 4: Location Selection

#### SCENARIO 4.1 — Location bar displays current location
- **What to validate:**
  - Location bar shows current area/locality name (not raw coordinates)
  - Pincode or area name is visible (e.g. "Auraiya, 206244")
  - Location bar is tappable (has pointer cursor, correct size)
- **What can break:**
  - Location stored as `{ lat, lng }` but display shows raw JSON object
  - Area name reverse-geocoding fails silently — shows empty string
  - Location from previous session shown if current session has no location set

#### SCENARIO 4.2 — No location set (first-time user)
- **What to validate:**
  - "Select your location" prompt shown instead of location name
  - Businesses list is empty or shows "Set location to see nearby options"
  - Location selection modal/page opens when bar is tapped
- **What can break:**
  - No location set but API called with `lat=0&lng=0` — returns wrong businesses
  - Location selection modal opens behind another element (z-index issue)

#### SCENARIO 4.3 — Tapping location bar opens location selection
- **What to validate:**
  - Tapping opens location selection modal or navigates to `/location-selection`
  - Location selection page has current location pre-filled
  - Selecting new location updates the location bar immediately
  - After selection, businesses reload for new location
- **What can break:**
  - Modal opens but tapping outside doesn't close it
  - New location saved to state but businesses API not re-called
  - Location selection page opens twice (double-tap registers two navigations)

#### SCENARIO 4.4 — Saved address selection (logged-in user)
- **What to validate:**
  - Location selection shows "Saved Addresses" section for logged-in users
  - Each saved address shows label (Home/Work/Other) and address text
  - Tapping a saved address sets it as current location
  - Home page businesses reload for that address's lat/lng
  - Previously selected address is highlighted (if applicable)
- **What can break:**
  - Saved addresses shown but API uses GPS coordinates, not address coordinates
  - Address pincode used but lat/lng not fetched — nearby businesses wrong
  - Guest user sees empty "Saved Addresses" section (should not render)

#### SCENARIO 4.5 — Location selection for guest user
- **What to validate:**
  - Guest user sees only "Use Current Location" option (no saved addresses)
  - "Use Current Location" triggers browser geolocation API
  - If geolocation denied, fallback message shown with manual entry option
  - Granting permission sets location and returns to home with businesses loaded
- **What can break:**
  - `navigator.geolocation` not wrapped in try/catch — unhandled exception on deny
  - Geolocation returns but lat/lng not persisted — next app open shows empty location

---

### FEATURE 5: Scroll & Lazy Loading / Pagination

#### SCENARIO 5.1 — Initial load shows first page of businesses
- **What to validate:**
  - Page 1 loads automatically on mount
  - Correct number of businesses shown (e.g. 10 per page)
  - Loading indicator shown while first batch is fetching
- **What can break:**
  - Page loads 0 businesses (default state not cleared before first API call)
  - 20 businesses load when 10 expected (pagination params ignored)

#### SCENARIO 5.2 — Scroll to bottom triggers next page
- **What to validate:**
  - Scrolling to within 200px of page bottom triggers next page load
  - New businesses append to existing list (not replace)
  - Loading spinner appears at bottom during fetch
  - Spinner disappears after load completes
  - Scroll position preserved (page doesn't jump to top)
- **What can break:**
  - Intersection observer not set up — no auto-load on scroll
  - New page replaces existing results (pagination treated as filter)
  - `page` param not incremented — same page 1 results loaded repeatedly
  - Scroll jump to top after new items append (no `trackBy` on `*ngFor`)
- **Assertions:**
  ```
  const initialCount = await page.getByTestId('business-card').count()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForResponse('**/businesses/nearby**')
  expect(page.getByTestId('business-card').count()).toBeGreaterThan(initialCount)
  ```

#### SCENARIO 5.3 — End of list — no more results
- **What to validate:**
  - When last page loaded, "You've seen all restaurants nearby" message shown
  - No loading spinner remains visible
  - Further scrolling does not fire additional API calls
  - `hasNextPage: false` from API prevents infinite reload
- **What can break:**
  - End-of-list detection missing — `?page=100` fires with empty response repeatedly
  - "End of list" message shows prematurely (after page 1 if API returns fewer than page size)

#### SCENARIO 5.4 — Scroll with active filter
- **What to validate:**
  - Lazy load requests include the active filter param
  - New businesses match the active filter
  - Page counter resets to 1 when filter changes (not continues from page 3)
- **What can break:**
  - Filter state lost in pagination closure — page 2 arrives unfiltered
  - Page counter not reset on filter change — page 2 fetched before page 1

#### SCENARIO 5.5 — Pull-to-refresh (if mobile)
- **What to validate:**
  - Pull-to-refresh triggers fresh page-1 load
  - Existing list replaced entirely (not appended to)
  - Filter state preserved after refresh
  - Scroll position resets to top after refresh

---

### FEATURE 6: Image Sliders / Banners

#### SCENARIO 6.1 — Banners render on load
- **What to validate:**
  - Correct number of banner images shown (matches API response)
  - Banner images load (not broken)
  - First banner visible without any user interaction
  - Banner title/subtitle text renders if present in API response
- **What can break:**
  - Banners loaded from hardcoded array, not API — stale/wrong banners shown
  - Swiper/carousel library not initialized — static first image only
  - Banner image 404s silently — white rectangle shown

#### SCENARIO 6.2 — Auto-advance behavior
- **What to validate:**
  - Banner advances to next slide every N seconds (typically 3–5s)
  - Auto-advance pauses when user swipes/taps (prevents mid-interaction jump)
  - Loops back to first banner after last
  - Pagination dots update to reflect current slide
- **What can break:**
  - Auto-advance fires even when tab is not visible (battery drain / user sees jump on return)
  - Advancing speed is 0ms (immediate flip) — looks like a bug
  - Dots out of sync with current slide index

#### SCENARIO 6.3 — Manual swipe
- **What to validate:**
  - Swiping left shows next banner
  - Swiping right shows previous banner
  - Swipe is smooth (no jank/jump)
  - At last banner, swiping left wraps to first
  - Pagination dots update correctly on swipe
- **What can break:**
  - Swipe gesture captured by scroll handler — page scrolls instead of banner sliding
  - Swipe threshold too sensitive — slight vertical scroll triggers banner change

#### SCENARIO 6.4 — Single banner (edge case)
- **What to validate:**
  - When only one banner, no pagination dots shown
  - No auto-advance fires
  - Swipe does nothing
- **What can break:**
  - Swipe on single banner shows blank slide (index out of bounds)
  - Pagination dot shown for single item

#### SCENARIO 6.5 — Zero banners
- **What to validate:**
  - When API returns empty banners array, banner section is hidden completely
  - No empty container/gap left in layout
  - Business list fills space correctly
- **What can break:**
  - Empty `<div class="banner-container">` leaves visible gap
  - App crashes on `banners[0]` access when array is empty

#### SCENARIO 6.6 — Banner with tappable link
- **What to validate:**
  - Tapping a banner with `actionUrl` navigates to correct page
  - Tapping a banner with no `actionUrl` does nothing
  - Navigation happens correctly (internal route vs external URL handled)

---

### FEATURE 7: Logged-in vs Guest Behavior

#### SCENARIO 7.1 — Logged-in user sees personalized header
- **What to validate:**
  - "Hello, Aarav" or user name shown in header
  - Cart icon shows current cart count badge
  - No "Login" CTA visible
- **What can break:**
  - Name shows as `null` if profile not loaded yet
  - Cart count from previous session shown before current session's cart loaded

#### SCENARIO 7.2 — Guest user UI
- **What to validate:**
  - No personalized greeting
  - No cart badge (or zero badge not shown)
  - "Sign In" CTA visible somewhere on screen
  - Can browse freely without login prompt
- **What can break:**
  - Guest user sees 0-item cart badge (noisy UI)
  - Login CTA missing entirely

#### SCENARIO 7.3 — Session expiry on home page
- **What to validate:**
  - If JWT expires while on home page, public data (businesses) still loads
  - User not abruptly logged out without action
  - Attempting cart/checkout triggers re-login, not crash
- **What can break:**
  - Expired JWT sent to `/api/businesses/nearby` — API returns 401 — entire page breaks
  - Silent token refresh fails and leaves user in half-authenticated state

---

## PAGE: Sign-In (Login / OTP Flow)

---

### FEATURE 1: Phone Number Input

#### SCENARIO 1.1 — Renders and accepts input
- **What to validate:**
  - Input field renders with correct placeholder ("Enter your mobile number")
  - Keyboard type is `tel` (numeric keyboard on mobile)
  - Country code `+91` is pre-filled/shown (not editable or clearly separated)
  - Input accepts only numeric characters (10 digits)
  - "Continue" / "Send OTP" button renders below input
- **What can break:**
  - Input type `text` instead of `tel` — QWERTY keyboard on mobile
  - Country code not shown — user enters 10 digits but server receives without `+91`
  - Non-numeric characters accepted — `+91 abc` sent to API

#### SCENARIO 1.2 — Validation before submission
- **What to validate:**
  - Button disabled when field is empty
  - Button disabled when input < 10 digits
  - Button disabled when input > 10 digits (not trimmed)
  - Entering exactly 10 digits enables button
  - Non-10-digit number shows inline error: "Enter a valid 10-digit mobile number"
  - Error appears on blur or on button click (not on every keystroke)
- **What can break:**
  - Button enabled with 9 digits
  - Error shown on first keystroke (annoying UX)
  - No error shown for 9-digit number — API returns confusing error

#### SCENARIO 1.3 — Submit valid phone number
- **What to validate:**
  - Clicking button calls `POST /api/auth/otp/request` with `{ phone: "+919876543210" }`
  - Loading spinner shown on button
  - Button disabled during API call (prevent double submit)
  - On success (`sessionId` returned), navigate to `/auth/otp`
  - Phone number visible on OTP page ("OTP sent to +91 ••••• 43210")
- **What can break:**
  - Phone sent as `"9876543210"` without `+91` prefix — API rejects
  - Double-click submits two OTP requests — user receives two SMSes
  - Navigation to OTP page happens before API responds (no sessionId)
  - Spinner never removed on error

#### SCENARIO 1.4 — API error handling
- **What to validate:**
  - If API returns 429 (rate limited): "Too many attempts. Try again in X minutes" shown
  - If API returns 400 (invalid phone): field-level error shown
  - If API returns 500: "Something went wrong, please try again" shown
  - Error messages are dismissible
  - After error, user can retry (button re-enabled)
- **What can break:**
  - Raw JSON error displayed to user (`{"error":"InvalidPhoneNumber"}`)
  - Button stays disabled after error — user stuck
  - 429 not differentiated from 500 — wrong message shown

---

### FEATURE 2: OTP Entry

#### SCENARIO 2.1 — OTP page renders correctly
- **What to validate:**
  - 6 individual digit boxes render
  - First box is auto-focused on mount
  - Masked phone number shown ("Sent to +91 ••••• 43210")
  - Timer countdown visible ("Resend in 30s")
  - "Resend OTP" button disabled while timer is running
  - "Change number" link present and navigates back
- **What can break:**
  - First box not focused — user doesn't know to start typing
  - Unmasked phone number shown — privacy issue
  - Timer doesn't start — resend button always enabled

#### SCENARIO 2.2 — Auto-advance between digit boxes
- **What to validate:**
  - Typing digit in box 1 auto-focuses box 2
  - Continuing through all 6 boxes auto-focuses each next
  - After box 6, focus stays on box 6 (no out-of-bounds focus)
- **What can break:**
  - Focus advance too slow — user types into box 1 twice
  - Digit typed in box 1 duplicates into box 2 due to focus advance timing

#### SCENARIO 2.3 — Backspace navigation
- **What to validate:**
  - Backspace in non-empty box clears that digit, stays focused
  - Backspace in empty box moves focus to previous box
  - Backspace on box 1 (empty) does nothing (no negative focus)
- **What can break:**
  - Backspace navigates back to phone entry page
  - Backspace in empty box 3 jumps to box 1 (skips box 2)

#### SCENARIO 2.4 — Paste 6-digit OTP
- **What to validate:**
  - Pasting "123456" fills all 6 boxes correctly
  - Auto-submit triggered after paste
  - Android SMS auto-fill injects into correct boxes
- **What can break:**
  - Paste goes into box 1 only (shows "123456" in single box)
  - Pasting "OTP: 123456" — non-digit prefix breaks parsing

#### SCENARIO 2.5 — Auto-submit when complete
- **What to validate:**
  - When 6th digit entered, verification API called automatically
  - No separate "Verify" button click required
  - Loading state shown during verification
- **What can break:**
  - Auto-submit fires before 6th digit registered (fires on 5th digit)
  - Auto-submit doesn't fire — user stuck waiting

#### SCENARIO 2.6 — Wrong OTP entered
- **What to validate:**
  - All 6 boxes highlighted red
  - Error message: "Incorrect OTP. X attempts remaining"
  - Boxes cleared automatically for retry
  - After max attempts (e.g. 3): "OTP expired. Request a new one" + redirect or resend CTA
- **What can break:**
  - Error shown but boxes not cleared — user types over old digits (confusing)
  - Attempt count not shown — user doesn't know they're being locked out
  - After max attempts, resend button still disabled (timer not reset)

#### SCENARIO 2.7 — OTP bypass for tests (`123456`)
- **What to validate:**
  - Entering `123456` when `Otp:BypassForDevelopment=true` on backend succeeds
  - Real OTP flow for production env (bypass doesn't work in prod)
- **What can break:**
  - Bypass code `123456` works in production — critical security vulnerability

#### SCENARIO 2.8 — Resend OTP
- **What to validate:**
  - After timer reaches 0, "Resend OTP" button enables
  - Clicking resend calls `POST /api/auth/otp/request` again
  - Timer resets to 30s after resend
  - Previous OTP invalidated (old OTP rejected after resend)
  - Success toast: "OTP resent successfully"
- **What can break:**
  - Resend enabled before timer 0 due to timer drift
  - Old OTP still accepted after resend (session not invalidated server-side)
  - Resend spam: rapid clicking sends 5 OTP requests before rate limit kicks in

#### SCENARIO 2.9 — Successful OTP verification
- **What to validate:**
  - After correct OTP, JWT received and stored in localStorage
  - Navigate to home (or to intended redirect URL if login was triggered mid-flow)
  - Auth state updated immediately (`isAuthenticated: true`)
  - User name visible in header after navigation
  - No visible delay between navigation and auth state reflecting
- **What can break:**
  - JWT stored but auth state not updated — user sees guest UI despite being logged in
  - No redirect to original page — user lands on home when they were checking out
  - JWT stored in plain localStorage without expiry tracking

---

## PAGE: Restaurant / Business Listing Page

---

### FEATURE 1: Restaurant Header

#### SCENARIO 1.1 — Header data renders correctly
- **What to validate:**
  - Restaurant name, rating, total ratings count rendered
  - Delivery time, delivery fee, min order amount rendered
  - Banner/hero image loads
  - Open/Closed status badge correct
  - If business is closed: "Opens at HH:MM" or day shown
- **What can break:**
  - Rating shows 0 if `totalRatings` is 0 (divide by zero case)
  - `deliveryFee: 0` shown as `₹0` instead of `Free delivery`
  - Business details fetched with wrong slug (URL param not read correctly)

#### SCENARIO 1.2 — Business not found
- **What to validate:**
  - Navigating to `/listing/nonexistent-slug` shows 404/error state
  - Error message: "Restaurant not found or no longer available"
  - CTA to return to home
- **What can break:**
  - Empty page renders (no products, no error)
  - App crashes with null reference on missing business data

---

### FEATURE 2: Product Grid

#### SCENARIO 2.1 — Products render with correct data
- **What to validate:**
  - Product name, price, description (truncated if long), image render
  - `₹249` formatted correctly (not `249.00` or `249`)
  - Veg badge (green square) on veg items
  - Non-veg badge (brown/red triangle) on non-veg items
  - "BESTSELLER" tag on `isBestseller: true` items
  - "RECOMMENDED" tag when applicable
  - Rating on product card if present
- **What can break:**
  - ₹ symbol missing due to font fallback
  - Veg/non-veg badge logic inverted (shows wrong badge)
  - Description not truncated — breaks card layout on long text
  - Images all same URL (wrong property referenced in template)

#### SCENARIO 2.2 — Out-of-stock product behavior
- **What to validate:**
  - `isAvailable: false` product shows "OUT OF STOCK" overlay
  - Add-to-cart button disabled
  - Disabled button cursor is `not-allowed`
  - Item is visible but cannot be added
  - If `isEnabledForOnlineOrders: false`: similar disabled state with different message
- **What can break:**
  - Out-of-stock overlay applied to wrong item (index off by one)
  - Disabled button still clickable in touch events (pointer-events not disabled)
  - `isAvailable` check missing — out-of-stock item can be added to cart

#### SCENARIO 2.3 — ADD to cart button interaction
- **What to validate:**
  - Clicking ADD calls cart service with `{ productId, qty: 1 }`
  - ADD button replaced by +/- stepper immediately (optimistic UI)
  - Cart badge count increments immediately
  - Floating cart bar appears at bottom showing item count and total
- **What can break:**
  - Stepper replaces button but quantity shows 0
  - Cart badge shows stale count from previous session
  - Floating cart appears for 0-item cart (triggering threshold wrong)

#### SCENARIO 2.4 — Stepper quantity controls
- **What to validate:**
  - Pressing + increments quantity, updates line total
  - Pressing + beyond max allowed quantity shows toast ("Max X per order")
  - Pressing − decrements quantity
  - Pressing − at 1 shows confirmation: "Remove item?" (or removes directly)
  - Pressing − at 0 is impossible (button disabled or hidden)
  - Floating cart total updates in real time with each +/−
- **What can break:**
  - Rapid +/+ sends two cart API requests simultaneously — quantity becomes 3 instead of 2
  - − at 1 removes item without confirmation (UX regression)
  - Total in floating cart recalculates incorrectly if floats not rounded (₹498.0000001)

#### SCENARIO 2.5 — Category sidebar navigation
- **What to validate:**
  - All categories listed in sidebar
  - Tapping category scrolls to that section smoothly
  - Scrolling past a section updates active category in sidebar
  - Active category highlighted in sidebar
- **What can break:**
  - Scroll-to-category scrolls to wrong position (height calculation off with sticky header)
  - IntersectionObserver for active section fires wrong threshold — 2 categories active at once
  - Category with zero available items doesn't render section heading (sidebar item leads nowhere)

#### SCENARIO 2.6 — Search within listing
- **What to validate:**
  - Typing "chicken" filters to matching products
  - Search is case-insensitive
  - Partial match works ("biry" matches "Biryani")
  - Clearing search restores full list
  - Empty search shows "No items match" state
  - Category sidebar hidden or updated during search
- **What can break:**
  - Search fires API call per keystroke (N+1 requests, use debounce)
  - Search case-sensitive — "Chicken" ≠ "chicken"
  - Clearing search doesn't restore list (state not reset)

---

## PAGE: Cart

---

### FEATURE 1: Cart Item Rendering

#### SCENARIO 1.1 — Items render with full detail
- **What to validate:**
  - Each item shows: name, image, unit price, quantity, line total
  - Line total = unit price × quantity (e.g. `₹249 × 2 = ₹498`)
  - Veg/non-veg badge on each item
  - Business name shown at top (items grouped by restaurant)
- **What can break:**
  - Line total shows unit price (multiplication not applied)
  - Items from different restaurants mixed without grouping header
  - Cart loads stale items from IndexedDB/localStorage instead of server

#### SCENARIO 1.2 — Empty cart state
- **What to validate:**
  - "Your cart is empty" illustration and message shown
  - "Explore Restaurants" CTA visible
  - No pricing section visible
  - Checkout button not visible
- **What can break:**
  - Pricing section renders with all zeros for empty cart
  - Checkout button visible but disabled — confusing

#### SCENARIO 1.3 — Items from closed restaurant
- **What to validate:**
  - If restaurant is now closed, cart shows warning banner: "[Restaurant] is not accepting orders right now"
  - Checkout is blocked with explanation
  - Items can still be removed/managed
- **What can break:**
  - Cart loads, checkout attempted, order creation fails with unhelpful error

---

### FEATURE 2: Pricing Summary

#### SCENARIO 2.1 — All fee components render correctly
- **What to validate:**
  - Subtotal = sum of (qty × price) for all items
  - Delivery fee shows correct value from business config
  - Packaging fee shown if `packagingFee > 0`
  - GST computed correctly: `subtotal × gstRate / 100`
  - Platform fee shown if configured
  - Grand total = subtotal + delivery + packaging + GST + platform − discount
- **What can break:**
  - GST not applied — total shows without tax
  - Delivery fee 0 shown as `₹0` not `Free`
  - Grand total calculated in float: `₹289.0000001` shown
  - Packaging fee shown as separate line even when 0 (clutter)

#### SCENARIO 2.2 — Free delivery threshold
- **What to validate:**
  - When subtotal < threshold, delivery fee shown
  - When subtotal ≥ threshold, delivery fee shows "FREE" (crossed out original amount optional)
  - Progress bar showing "Add ₹X more for free delivery" when below threshold
  - Adding items that cross threshold updates delivery fee in real time
- **What can break:**
  - Threshold check is strict greater-than (exactly at threshold not free)
  - Adding item doesn't re-evaluate threshold
  - "FREE" text shows but backend still charges delivery fee

#### SCENARIO 2.3 — Coupon applied
- **What to validate:**
  - Discount line shows coupon code and savings amount
  - Grand total reduced by discount amount
  - Discount cannot make total negative (capped at subtotal)
  - Removing coupon restores original total immediately
- **What can break:**
  - Coupon discount applied twice (client-side + server-side)
  - Negative total after 100% discount coupon

---

### FEATURE 3: Coupon Input

#### SCENARIO 3.1 — Apply valid coupon
- **What to validate:**
  - Input accepts code and applies on button click or Enter key
  - API called with `{ code: "SAVE50" }`
  - Discount shown in pricing summary
  - Input field disabled after coupon applied
  - "Remove" button appears next to applied coupon
- **What can break:**
  - Code sent with extra whitespace — API rejects "SAVE50 " (trailing space)
  - Input not disabled after apply — user types new code that does nothing

#### SCENARIO 3.2 — Invalid coupon
- **What to validate:**
  - API returns 400 with reason: "Coupon not found" / "Coupon expired" / "Minimum order not met"
  - Specific error message shown below input (not generic)
  - Input remains editable for retry
- **What can break:**
  - All error cases show "Invalid coupon" — no useful differentiation
  - Previous coupon's discount remains visible after new invalid attempt

#### SCENARIO 3.3 — Expired coupon
- **What to validate:**
  - "This coupon has expired" message shown
  - No discount applied
- **What can break:**
  - Expired coupon accepted by frontend validation (expiry check only on server)

#### SCENARIO 3.4 — Minimum order not met
- **What to validate:**
  - "This coupon requires a minimum order of ₹299" shown
  - Discount not applied
  - Adding items to meet minimum and re-applying works
- **What can break:**
  - Error shown but disappears when new item added, old error state lingers

---

### FEATURE 4: Checkout Flow

#### SCENARIO 4.1 — Guest user taps Checkout
- **What to validate:**
  - Login modal or navigation to sign-in page triggered
  - Cart preserved after login (not cleared)
  - After login, user returned to cart with same items
- **What can break:**
  - Cart cleared on login (auth state change triggers fresh cart fetch, discarding guest cart)
  - After login, user redirected to home not back to cart

#### SCENARIO 4.2 — Logged-in user with no address
- **What to validate:**
  - Checkout button shows "Add Delivery Address"
  - Tapping opens address addition flow
  - After adding address, checkout button becomes "Place Order"
- **What can break:**
  - Checkout button enabled without address — order API called without deliveryAddressId — backend 400 error

#### SCENARIO 4.3 — Checkout button final state
- **What to validate:**
  - Button label shows total amount: "Place Order • ₹289"
  - Button disabled if: cart empty, no address, restaurant closed
  - Tapping places order (navigates to payment or COD confirmation)

---

## PAGE: Order History

---

### FEATURE 1: Order List

#### SCENARIO 1.1 — Orders render with all fields
- **What to validate:**
  - Order display ID (ORD1234567801) shown
  - Restaurant name shown
  - Order date formatted: "15 Jan 2024" or "Today, 10:30 AM"
  - Order total shown: "₹289"
  - Status badge with correct text and color:
    - pending → yellow
    - confirmed → blue
    - preparing → orange
    - shipped → purple
    - delivered → green
    - cancelled → red
  - Item summary shown: "Chicken Biryani + 1 more"
- **What can break:**
  - Timestamp shown in UTC, not IST (time off by 5:30)
  - Status badge color hardcoded, doesn't reflect actual status
  - "1 more" shown even when only 1 item

#### SCENARIO 1.2 — Empty order history
- **What to validate:**
  - "You haven't placed any orders yet" illustration shown
  - "Order Now" CTA navigates to home
  - No order list skeleton remains visible
- **What can break:**
  - Infinite skeleton shown when API returns empty array
  - "Order Now" CTA missing

#### SCENARIO 1.3 — Loading state
- **What to validate:**
  - Skeleton cards shown while API is pending
  - Correct number of skeletons (e.g. 3, not 1 or 20)
  - Skeletons replaced by real data after load
- **What can break:**
  - 1 skeleton shown but 8 orders load (jarring layout shift)
  - Skeleton never removed (API error not handled)

#### SCENARIO 1.4 — Tap order card navigates to detail
- **What to validate:**
  - Tapping navigates to `/order-confirmation/ORD1234567801`
  - Correct order data loads on detail page
- **What can break:**
  - Tapping navigates but with wrong order ID (index vs ID confusion)

#### SCENARIO 1.5 — Pagination / pull-to-refresh
- **What to validate:**
  - Older orders load on scroll
  - Pull-to-refresh fetches latest orders (a new order from another tab appears)
  - Loading indicator during refresh
  - After refresh, list reflects any status changes (pending → confirmed)

---

## PAGE: Order Confirmation / Detail

---

### FEATURE 1: Order Detail Rendering

#### SCENARIO 1.1 — All order fields render
- **What to validate:**
  - Display ID ("ORD1234567801")
  - Each line item: name, qty, price
  - Subtotal, delivery fee, total
  - Payment method ("Cash on Delivery" / "Online - Razorpay")
  - Placed-at timestamp in IST
  - Delivery address: house, landmark, area, pincode
  - ETA shown when order is active
- **What can break:**
  - Payment method shows enum value "Cash" instead of "Cash on Delivery"
  - Delivery address missing landmark when landmark is null (shows "null" text)

#### SCENARIO 1.2 — Status timeline
- **What to validate:**
  - All statuses in correct order: Confirmed → Preparing → Ready → Shipped → Delivered
  - Completed statuses show filled checkmark
  - Current status is highlighted (active indicator)
  - Future statuses are grayed
  - For Cancelled order: cancellation step shown, future steps not shown
- **What can break:**
  - Timeline shows all steps as completed for delivered order
  - Timeline shows all steps as pending for preparing order
  - Cancelled order still shows delivery step as upcoming

#### SCENARIO 1.3 — Real-time status update
- **What to validate:**
  - If Firebase RTDB / WebSocket updates status, page updates without manual refresh
  - Status badge in timeline updates immediately
  - ETA updates when status changes
- **What can break:**
  - WebSocket listener not attached — stale status shown
  - Multiple listeners attached on each visit — status updates arrive 3x

---

### FEATURE 2: Order Actions

#### SCENARIO 2.1 — Cancel Order
- **What to validate:**
  - "Cancel Order" button visible only when status is "Pending" or "Confirmed"
  - Tapping shows confirmation modal ("Cancel order for ₹289?")
  - Confirming calls cancel API
  - On success: status updates to "Cancelled", cancel button disappears
  - Refund info shown if payment was online: "Refund of ₹289 in 5-7 days"
- **What can break:**
  - Cancel button visible even after preparing starts
  - No confirmation modal — accidental cancellations
  - Status not updated after successful cancel (stale state)
  - No refund message for paid orders

#### SCENARIO 2.2 — Cancel order too late
- **What to validate:**
  - API returns 422 when cancellation window expired
  - Error: "Order cannot be cancelled once it's being prepared"
  - Cancel button hidden after this error
- **What can break:**
  - API error not shown — silent failure, user thinks order was cancelled

#### SCENARIO 2.3 — Rate Order
- **What to validate:**
  - "Rate Order" button visible when status is "Delivered"
  - Tapping opens rating modal with star selector
  - Submitting rating calls rating API
  - After rating: button changes to "Rated ★★★★☆"
  - Cannot re-rate (button disabled or hidden after rating submitted)

---

## PAGE: Profile / Account Management

---

### FEATURE 1: Profile Display

#### SCENARIO 1.1 — Profile data renders
- **What to validate:**
  - User name rendered exactly as stored (not all-caps, not lowercased)
  - Phone number rendered with masking: "+91 ••••• 43210"
  - Profile photo renders if set
  - Initials avatar shown if no profile photo
  - Initials are first letters of first and last name
- **What can break:**
  - Phone shown unmasked — privacy issue
  - Initials show "AA" instead of "AS" (first name doubled)

---

### FEATURE 2: Address Management

#### SCENARIO 2.1 — Address list renders
- **What to validate:**
  - All saved addresses listed
  - Address label (Home/Work/Other) and full address shown
  - Default address has "DEFAULT" chip
  - Add New Address button present
- **What can break:**
  - Addresses from another user visible (wrong user context)
  - Default chip on non-default address

#### SCENARIO 2.2 — Add new address
- **What to validate:**
  - Form fields: house/flat number, street, landmark (optional), area, city, pincode
  - Type selection: Home, Work, Other
  - "Set as Default" toggle
  - Validation: pincode must be 6 digits, house number required
  - On submit: address saved, list updated, navigates back
- **What can break:**
  - Pincode accepts letters
  - Address saves with blank house number (validation skipped)
  - List not refreshed after add — new address only visible after app restart

#### SCENARIO 2.3 — Delete address
- **What to validate:**
  - Delete button shows confirmation: "Delete Home address?"
  - Confirming removes from list immediately (optimistic)
  - If API fails, address re-appears with error toast
  - Cannot delete if it's the only address and there's an active order
- **What can break:**
  - No confirmation — accidental deletion
  - Address disappears but API failed (data out of sync)

#### SCENARIO 2.4 — Set as default address
- **What to validate:**
  - Tapping "Set as Default" calls update API
  - Selected address gets DEFAULT chip
  - Previous default address loses chip
  - Only one address can be default at a time
- **What can break:**
  - Two addresses marked as default (race condition on fast taps)
  - DEFAULT chip doesn't move (UI not updated after API success)

---

## CROSS-CUTTING SCENARIOS

---

### Network Conditions

#### SCENARIO N.1 — Offline state
- **What to validate:**
  - Offline banner shown: "No internet connection"
  - Cached data shown (if offline-first implemented)
  - No infinite spinner (fail gracefully)
  - Retry button available
  - Banner dismisses when connection restored

#### SCENARIO N.2 — Slow network (3G simulation)
- **What to validate:**
  - Skeleton loaders shown for all async data
  - No content layout shift after data loads
  - Images use progressive loading (blur-up or skeleton)
  - User can still interact with available UI (e.g. close modals)

#### SCENARIO N.3 — Request timeout
- **What to validate:**
  - After 10s without response, timeout error shown
  - "Request timed out. Pull to refresh." message
  - No stale data from partial response shown

### Navigation

#### SCENARIO Nav.1 — Back navigation state preservation
- **What to validate:**
  - Back from listing page → home page scroll position preserved
  - Back from cart → listing page, cart item count badge correct
  - Back from OTP → sign-in page, phone number pre-filled
  - Browser back does not trigger duplicate API calls

#### SCENARIO Nav.2 — Deep link handling
- **What to validate:**
  - Opening `/listing/hunger_point` directly loads correct restaurant
  - Opening `/order-confirmation/ORD1234567801` requires auth — redirects to login, then back
  - Invalid deep link shows not-found page

### Authentication Edge Cases

#### SCENARIO Auth.1 — Concurrent login from another device
- **What to validate:**
  - If token revoked on another device, next API call returns 401
  - App shows "Session expired. Please log in again"
  - User redirected to sign-in
  - No loop of infinite 401 retries

#### SCENARIO Auth.2 — Token refresh
- **What to validate:**
  - Near-expiry JWT auto-refreshed in background
  - No visible logout during normal usage
  - If refresh fails (e.g. server error), graceful logout
