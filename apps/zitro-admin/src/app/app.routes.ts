import { Routes } from '@angular/router';
import { AdminLoginComponent } from '@zitro/admin-ui';
import { ComingSoonComponent } from '@zitro/ui';
import { adminAuthGuard, guestOnlyGuard } from './core/guards/admin-auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

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
      {
        path: 'dashboard',
        component: ComingSoonComponent,
        data: { title: 'AD-002 — Dashboard' },
      },
      {
        path: 'businesses',
        component: ComingSoonComponent,
        data: { title: 'AD-003 — Businesses List/Search + Invite Partner' },
      },
      {
        path: 'businesses/:id',
        component: ComingSoonComponent,
        data: { title: 'AD-004 — Business Detail + Approve/Reject' },
      },
      {
        path: 'businesses/:id/edit',
        component: ComingSoonComponent,
        data: { title: 'AD-005 — Business Edit' },
      },
      {
        path: 'brands',
        component: ComingSoonComponent,
        data: { title: 'AD-006 — Brands Management' },
      },
      {
        path: 'tags',
        component: ComingSoonComponent,
        data: { title: 'AD-007 — Tags Management' },
      },
      {
        path: 'products',
        component: ComingSoonComponent,
        data: { title: 'AD-008 — Products (Global Catalog)' },
      },
      {
        path: 'categories',
        component: ComingSoonComponent,
        data: { title: 'AD-009 — Categories (Global)' },
      },
      {
        path: 'orders',
        component: ComingSoonComponent,
        data: { title: 'AD-010 — Order Oversight / Cross-Business Search' },
      },
      {
        path: 'users',
        component: ComingSoonComponent,
        data: { title: 'AD-011 — Users' },
      },
      {
        path: 'coupons',
        component: ComingSoonComponent,
        data: { title: 'AD-012 — Coupons Management' },
      },
      {
        path: 'cashback-rules',
        component: ComingSoonComponent,
        data: { title: 'AD-013 — Cashback Rules' },
      },
      {
        path: 'delivery-partners',
        component: ComingSoonComponent,
        data: { title: 'AD-014 — Delivery Partners Management' },
      },
      {
        path: 'delivery-zones',
        component: ComingSoonComponent,
        data: { title: 'AD-015 — Delivery Zones (Global Admin)' },
      },
      {
        path: 'payouts',
        component: ComingSoonComponent,
        data: { title: 'AD-016 — Payouts — Generate/Mark Paid' },
      },
      {
        path: 'subscriptions',
        component: ComingSoonComponent,
        data: { title: 'AD-017 — Subscription Plans' },
      },
      {
        path: 'banners',
        component: ComingSoonComponent,
        data: { title: 'AD-018 — Banners Management' },
      },
      {
        path: 'admins',
        component: ComingSoonComponent,
        data: { title: 'AD-019 — Admin Users Management' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
