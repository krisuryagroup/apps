import { Routes } from '@angular/router';

// MT009: guards now available
import { AuthGuard, LoginGuard } from './core/guards/auth.guard';
// HRD-001: location gate
import { locationGuard } from './core/guards/location.guard';
import { LocationSelectionComponent } from './features/location-selection/location-selection.component';

// MT009: layout now available
import { MainLayoutComponent } from './layout/main-layout.component';

// T021: evolved splash page
import { SplashPage } from './features/splash/splash.page';
// MT011: auth features (legacy)
import { SigninComponent } from './features/auth/signin.component';
import { SignupComponent } from './features/auth/signup.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password.component';
// T022: evolved auth pages
import { SignInPage } from './features/auth/sign-in/sign-in.page';
import { OtpPage } from './features/auth/otp/otp.page';
// MT012: home + categories
import { HomeComponent } from './features/home/home.component';
import { CategoriesComponent } from './features/categories/categories.component';
import { CategoryListingComponent } from './features/category-listing/category-listing.component';
// MT013: listing, search
import { ListingComponent } from './features/listing/listing.component';
import { SearchComponent } from './features/search/search.component';
// MT014: cart, coupons
import { CartComponent } from './features/cart/cart.component';
import { CouponSelectionComponent } from './features/coupon-selection/coupon-selection.component';
// MT015: addresses
import { ManageAddressesComponent } from './features/manage-addresses';
import { AddAddressComponent } from './features/add-address';
// MT016: orders
import { OrderHistoryComponent } from './features/order-history';
import { OrderConfirmationComponent } from './features/order-confirmation';
import { OrderTrackingComponent } from './features/order-tracking/order-tracking.component';
// MT017: misc pages
import { AccountComponent } from './features/account/account.component';
import { ContactUsComponent } from './features/contact-us.component';
import { CacheManagementComponent } from './shared/components/cache-management/cache-management.component';
import { Game2048Component } from './features/game-2048/game-2048.component';

export const routes: Routes = [
  // T021: splash entry point
  { path: '', component: SplashPage, pathMatch: 'full' },

  // HRD-001: Location Gate — shown when no delivery location is saved
  { path: 'location-selection', component: LocationSelectionComponent },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [locationGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'categories', component: CategoriesComponent },
      { path: 'category-listing', component: CategoryListingComponent },
      { path: 'listing', component: ListingComponent },
      { path: 'favorites', component: ListingComponent },
      { path: 'search', component: SearchComponent },
      { path: 'cart', component: CartComponent },
      { path: 'coupons', component: CouponSelectionComponent },
      { path: 'contact', component: ContactUsComponent },
      { path: 'order-confirmation', component: OrderConfirmationComponent },
      { path: 'order-confirmation/:orderId', component: OrderConfirmationComponent },
      { path: 'addresses', component: ManageAddressesComponent, canActivate: [AuthGuard] },
      { path: 'add-address', component: AddAddressComponent, canActivate: [AuthGuard] },
      { path: 'orders', component: OrderHistoryComponent, canActivate: [AuthGuard] },
      { path: 'track-order', component: OrderTrackingComponent, canActivate: [AuthGuard] },
      { path: 'track-order/:orderId', component: OrderTrackingComponent, canActivate: [AuthGuard] },
      { path: 'account', component: AccountComponent, canActivate: [AuthGuard] },
      { path: 'cache-management', component: CacheManagementComponent }, // Development only
      { path: 'game-2048', component: Game2048Component }, // 2048 Game with rewards
    ]
  },

  {
    path: 'auth',
    canActivate: [LoginGuard],
    children: [
      // T022: evolved auth pages
      { path: 'signin', component: SignInPage },
      { path: 'otp', component: OtpPage },
      // MT011: legacy auth pages (kept for reference)
      // { path: 'signin', component: SigninComponent },
      { path: 'signup', component: SignupComponent },
      { path: 'forgot-password', component: ForgotPasswordComponent },
    ]
  },

  { path: '**', redirectTo: 'home' }
];
