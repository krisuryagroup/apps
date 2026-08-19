import { Routes } from '@angular/router';
import {
  AdminLoginComponent,
  AdminDashboardComponent,
  AdminBusinessesComponent,
  AdminBusinessDetailComponent,
  AdminBusinessEditComponent,
  AdminBrandsComponent,
  AdminTagsComponent,
  AdminProductsComponent,
  AdminCategoriesComponent,
  AdminOrdersComponent,
  AdminUsersComponent,
  AdminCouponsComponent,
  AdminCashbackRulesComponent,
  AdminDeliveryPartnersComponent,
  AdminDeliveryZonesComponent,
  AdminPayoutsComponent,
  AdminSubscriptionsComponent,
  AdminBannersComponent,
  AdminAdminUsersComponent,
  AdminMyProfileComponent,
} from '@zitro/admin-ui';
import {
  adminAuthGuard,
  guestOnlyGuard,
  requirePermissionGuard,
} from './core/guards/admin-auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { FeatureFlagsComponent } from './features/feature-flags/feature-flags.component';
import { TranslationsComponent } from './features/translations/translations.component';
import { ThemesComponent } from './features/themes/themes.component';
import { UiConfigComponent } from './features/ui-config/ui-config.component';

// SA-002 — shared admin screens now composed from @zitro/admin-ui components.
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    component: AdminLoginComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'businesses', component: AdminBusinessesComponent },
      { path: 'businesses/:id', component: AdminBusinessDetailComponent },
      { path: 'businesses/:id/edit', component: AdminBusinessEditComponent },
      { path: 'brands', component: AdminBrandsComponent },
      { path: 'tags', component: AdminTagsComponent },
      { path: 'products', component: AdminProductsComponent },
      { path: 'categories', component: AdminCategoriesComponent },
      { path: 'orders', component: AdminOrdersComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'coupons', component: AdminCouponsComponent },
      { path: 'cashback-rules', component: AdminCashbackRulesComponent },
      { path: 'delivery-partners', component: AdminDeliveryPartnersComponent },
      { path: 'delivery-zones', component: AdminDeliveryZonesComponent },
      { path: 'payouts', component: AdminPayoutsComponent },
      { path: 'subscriptions', component: AdminSubscriptionsComponent },
      { path: 'banners', component: AdminBannersComponent },
      {
        path: 'admins',
        component: AdminAdminUsersComponent,
        canActivate: [requirePermissionGuard('admins:read')],
      },
      { path: 'my-profile', component: AdminMyProfileComponent },
      { path: 'feature-flags', component: FeatureFlagsComponent },
      { path: 'translations', component: TranslationsComponent },
      { path: 'themes', component: ThemesComponent },
      { path: 'ui-config', component: UiConfigComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
