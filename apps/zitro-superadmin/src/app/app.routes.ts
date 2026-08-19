import { Routes } from '@angular/router';
import { ComingSoonComponent } from '@zitro/ui';
import { adminAuthGuard, guestOnlyGuard } from './core/guards/admin-auth.guard';
import { MainLayoutComponent } from './layout/main-layout.component';

// NOTE: the AD-002..AD-019 routes below are placeholders today, same as zitro-admin's.
// SA-002 (compose shared admin screens) is the task that rewires these to import the
// real components built for zitro-admin instead of duplicating ComingSoonComponent —
// do that once those components exist for real, not before.
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    component: ComingSoonComponent,
    data: { title: 'SA-001 — Login' },
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
        data: { title: 'AD-002 — Dashboard (shared via SA-002)' },
      },
      {
        path: 'businesses',
        component: ComingSoonComponent,
        data: { title: 'AD-003 — Businesses (shared via SA-002)' },
      },
      {
        path: 'businesses/:id',
        component: ComingSoonComponent,
        data: { title: 'AD-004 — Business Detail (shared via SA-002)' },
      },
      {
        path: 'brands',
        component: ComingSoonComponent,
        data: { title: 'AD-006 — Brands (shared via SA-002)' },
      },
      {
        path: 'tags',
        component: ComingSoonComponent,
        data: { title: 'AD-007 — Tags (shared via SA-002)' },
      },
      {
        path: 'products',
        component: ComingSoonComponent,
        data: { title: 'AD-008 — Products (shared via SA-002)' },
      },
      {
        path: 'categories',
        component: ComingSoonComponent,
        data: { title: 'AD-009 — Categories (shared via SA-002)' },
      },
      {
        path: 'orders',
        component: ComingSoonComponent,
        data: { title: 'AD-010 — Order Oversight (shared via SA-002)' },
      },
      {
        path: 'users',
        component: ComingSoonComponent,
        data: { title: 'AD-011 — Users (shared via SA-002)' },
      },
      {
        path: 'coupons',
        component: ComingSoonComponent,
        data: { title: 'AD-012 — Coupons (shared via SA-002)' },
      },
      {
        path: 'cashback-rules',
        component: ComingSoonComponent,
        data: { title: 'AD-013 — Cashback Rules (shared via SA-002)' },
      },
      {
        path: 'delivery-partners',
        component: ComingSoonComponent,
        data: { title: 'AD-014 — Delivery Partners (shared via SA-002)' },
      },
      {
        path: 'delivery-zones',
        component: ComingSoonComponent,
        data: { title: 'AD-015 — Delivery Zones (shared via SA-002)' },
      },
      {
        path: 'payouts',
        component: ComingSoonComponent,
        data: { title: 'AD-016 — Payouts (shared via SA-002)' },
      },
      {
        path: 'subscriptions',
        component: ComingSoonComponent,
        data: { title: 'AD-017 — Subscriptions (shared via SA-002)' },
      },
      {
        path: 'banners',
        component: ComingSoonComponent,
        data: { title: 'AD-018 — Banners (shared via SA-002)' },
      },
      {
        path: 'admins',
        component: ComingSoonComponent,
        data: { title: 'AD-019 — Admin Users (shared via SA-002)' },
      },
      {
        path: 'feature-flags',
        component: ComingSoonComponent,
        data: { title: 'SA-003 — Feature Flags Management' },
      },
      {
        path: 'translations',
        component: ComingSoonComponent,
        data: { title: 'SA-004 — Translations Management' },
      },
      {
        path: 'themes',
        component: ComingSoonComponent,
        data: { title: 'SA-005 — Theme Management' },
      },
      {
        path: 'ui-config',
        component: ComingSoonComponent,
        data: { title: 'SA-006 — Per-App UI Config Management' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
