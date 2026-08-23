import { Routes } from '@angular/router';
import {
  businessAuthGuard,
  guestOnlyGuard,
} from './core/guards/business-auth.guard';
import { RestaurantLayoutComponent } from './layout/restaurant-layout.component';
import { RestaurantLoginComponent } from './features/login/login.component';
import {
  RestaurantApplyComponent,
  RestaurantAcceptInviteComponent,
} from './features/onboarding/apply.component';
import { RestaurantOnboardingComponent } from './features/misc/restaurant-features.component';
import { RestaurantDashboardComponent } from './features/dashboard/dashboard.component';
import { RestaurantOrdersComponent } from './features/orders/orders.component';
import { RestaurantOrderDetailComponent } from './features/orders/order-detail.component';
import { RestaurantMenuComponent } from './features/menu/menu.component';
import { RestaurantMenuImportComponent } from './features/menu/menu-import.component';
import { RestaurantMenuBulkAddComponent } from './features/menu/menu-bulk-add.component';
import { RestaurantProfileComponent } from './features/profile/profile.component';
import {
  RestaurantStaffComponent,
  RestaurantInventoryComponent,
  RestaurantRatingsComponent,
  RestaurantPayoutsComponent,
  RestaurantDeliveryZonesComponent,
} from './features/misc/restaurant-features.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // ── Public / onboarding ──────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    component: RestaurantLoginComponent,
  },
  {
    path: 'apply',
    canActivate: [guestOnlyGuard],
    component: RestaurantApplyComponent,
  },
  {
    path: 'accept-invite',
    canActivate: [guestOnlyGuard],
    component: RestaurantAcceptInviteComponent,
  },

  // ── Authenticated ────────────────────────────────────────────────────────
  {
    path: '',
    component: RestaurantLayoutComponent,
    canActivate: [businessAuthGuard],
    children: [
      { path: 'onboarding', component: RestaurantOnboardingComponent },
      { path: 'dashboard', component: RestaurantDashboardComponent },
      { path: 'orders', component: RestaurantOrdersComponent },
      { path: 'orders/:orderId', component: RestaurantOrderDetailComponent },
      { path: 'menu', component: RestaurantMenuComponent },
      { path: 'menu/import', component: RestaurantMenuImportComponent },
      { path: 'menu/bulk-add', component: RestaurantMenuBulkAddComponent },
      { path: 'inventory', component: RestaurantInventoryComponent },
      { path: 'delivery-zones', component: RestaurantDeliveryZonesComponent },
      { path: 'ratings', component: RestaurantRatingsComponent },
      { path: 'payouts', component: RestaurantPayoutsComponent },
      { path: 'profile', component: RestaurantProfileComponent },
      { path: 'staff', component: RestaurantStaffComponent },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
