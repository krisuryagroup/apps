import { Routes } from '@angular/router';
import { ComingSoonComponent } from '@zitro/ui';
import {
  businessAuthGuard,
  guestOnlyGuard,
} from './core/guards/business-auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },

  // ── Onboarding (public) — RS-001, RS-002, RS-002b ────────────────────────
  {
    path: 'login',
    canActivate: [guestOnlyGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-001 — Login' },
  },
  {
    path: 'apply',
    canActivate: [guestOnlyGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-002 — Partner Application' },
  },
  {
    path: 'accept-invite',
    canActivate: [guestOnlyGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-002b — Accept Admin Invite' },
  },

  // ── Everything below requires a logged-in business account ──────────────
  {
    path: 'onboarding',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-003 — Onboarding / KYC Completion' },
  },
  {
    path: 'dashboard',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-004 — Dashboard' },
  },
  {
    path: 'orders',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-005 — Live Orders Queue' },
  },
  {
    path: 'orders/:orderId',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-006 — Order Detail' },
  },
  {
    path: 'menu',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-007 — Menu Management' },
  },
  {
    path: 'menu/import',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-008 — Menu Import (AI Photo/PDF)' },
  },
  {
    path: 'menu/bulk-import',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-009 — Menu Import (Bulk Spreadsheet)' },
  },
  {
    path: 'menu/clone',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-010 — Menu Clone from Branch/Brand' },
  },
  {
    path: 'inventory',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-011 — Inventory Management' },
  },
  {
    path: 'delivery-zones',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-012 — Delivery Zones' },
  },
  {
    path: 'ratings',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-013 — Ratings & Reviews' },
  },
  {
    path: 'payouts',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-014 — Payouts' },
  },
  {
    path: 'profile',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-015 — Business Profile & Settings' },
  },
  {
    path: 'staff',
    canActivate: [businessAuthGuard],
    component: ComingSoonComponent,
    data: { title: 'RS-016 — Staff Management' },
  },

  { path: '**', redirectTo: 'dashboard' },
];
