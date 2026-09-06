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

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    component: AdminLoginComponent,
    data: { appTitle: 'ZITRO Admin' },
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardComponent },
      {
        path: 'businesses',
        component: AdminBusinessesComponent,
        canActivate: [requirePermissionGuard('businesses:read')],
      },
      {
        path: 'businesses/:id',
        component: AdminBusinessDetailComponent,
        canActivate: [requirePermissionGuard('businesses:read')],
      },
      {
        path: 'businesses/:id/edit',
        component: AdminBusinessEditComponent,
        canActivate: [requirePermissionGuard('businesses:write')],
      },
      {
        path: 'brands',
        component: AdminBrandsComponent,
        canActivate: [requirePermissionGuard('brands:read')],
      },
      {
        path: 'tags',
        component: AdminTagsComponent,
        canActivate: [requirePermissionGuard('tags:read')],
      },
      {
        path: 'products',
        component: AdminProductsComponent,
        canActivate: [requirePermissionGuard('products:read')],
      },
      {
        path: 'categories',
        component: AdminCategoriesComponent,
        canActivate: [requirePermissionGuard('categories:read')],
      },
      {
        path: 'orders',
        component: AdminOrdersComponent,
        canActivate: [requirePermissionGuard('orders:read')],
      },
      {
        path: 'users',
        component: AdminUsersComponent,
        canActivate: [requirePermissionGuard('users:read')],
      },
      {
        path: 'coupons',
        component: AdminCouponsComponent,
        canActivate: [requirePermissionGuard('coupons:read')],
      },
      {
        path: 'cashback-rules',
        component: AdminCashbackRulesComponent,
        canActivate: [requirePermissionGuard('cashback:read')],
      },
      {
        path: 'delivery-partners',
        component: AdminDeliveryPartnersComponent,
        canActivate: [requirePermissionGuard('delivery:read')],
      },
      {
        path: 'delivery-zones',
        component: AdminDeliveryZonesComponent,
        canActivate: [requirePermissionGuard('delivery:read')],
      },
      {
        path: 'payouts',
        component: AdminPayoutsComponent,
        canActivate: [requirePermissionGuard('payouts:read')],
      },
      {
        path: 'subscriptions',
        component: AdminSubscriptionsComponent,
        canActivate: [requirePermissionGuard('subscriptions:read')],
      },
      {
        path: 'banners',
        component: AdminBannersComponent,
        canActivate: [requirePermissionGuard('banners:read')],
      },
      {
        path: 'admins',
        component: AdminAdminUsersComponent,
        canActivate: [requirePermissionGuard('admins:read')],
      },
      { path: 'my-profile', component: AdminMyProfileComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
