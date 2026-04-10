import { Routes } from '@angular/router';
import { Component } from '@angular/core';

// MT009: guards uncommented when core/guards are copied
// import { AuthGuard, LoginGuard } from './core/guards/auth.guard';
// import { BusinessSelectionGuard } from './core/guards/business-selection.guard';

// MT009: layout uncommented when layout is copied
// import { MainLayoutComponent } from './layout/main-layout.component';

// MT010: feature routes uncommented as each feature task completes
// import { BusinessSelectionComponent } from './features/business-selection/business-selection.component';
// MT011: auth features
// import { SigninComponent } from './features/auth/signin.component';
// import { SignupComponent } from './features/auth/signup.component';
// import { ForgotPasswordComponent } from './features/auth/forgot-password.component';
// MT012: home
// import { HomeComponent } from './features/home/home.component';
// MT013: listing, search, categories
// import { ListingComponent } from './features/listing/listing.component';
// import { SearchComponent } from './features/search/search.component';
// import { CategoriesComponent } from './features/categories/categories.component';
// MT014: cart, coupons
// import { CartComponent } from './features/cart/cart.component';
// import { CouponSelectionComponent } from './features/coupon-selection/coupon-selection.component';
// MT015: account, addresses
// import { AccountComponent } from './features/account/account.component';
// import { ManageAddressesComponent } from './features/manage-addresses';
// import { AddAddressComponent } from './features/add-address';
// MT016: orders
// import { OrderHistoryComponent } from './features/order-history';
// import { OrderConfirmationComponent } from './features/order-confirmation';
// import { OrderTrackingComponent } from './features/order-tracking/order-tracking.component';
// MT017: misc pages
// import { ContactUsComponent } from './features/contact-us.component';
// import { CacheManagementComponent } from './shared/components/cache-management/cache-management.component';
// import { Game2048Component } from './features/game-2048/game-2048.component';

/** Placeholder shown until feature routes are wired in MT010–MT017 */
@Component({
  standalone: true,
  template: `<div style="padding:2rem;font-family:sans-serif">
    <h2>🚧 Zitro Customer</h2>
    <p>App shell bootstrapped. Feature routes wired in MT010–MT017.</p>
  </div>`,
})
export class PlaceholderComponent {}

export const routes: Routes = [
  { path: '', component: PlaceholderComponent },
  { path: '**', component: PlaceholderComponent },
];
