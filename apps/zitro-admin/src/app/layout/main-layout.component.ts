import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import {
  SidebarAccountSummary,
  SidebarNavComponent,
  SidebarNavItem,
} from '@zitro/admin-ui';
import { AdminApiService, AdminAuthTokenService } from '@zitro/services';

/** GetMyProfileHandler returns `admin.Role.ToString().ToLowerInvariant()` — no
 * underscore for SuperAdmin ("superadmin"), unlike the JWT's "super_admin" claim. */
function formatRole(role: string): string {
  if (role === 'superadmin') return 'Super Admin';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Permission tags mirror the backend gating added for the admin/superadmin RBAC audit
// (RequirePermissionAttribute + AdminRolePermissions.cs) — every domain below now has a
// real permission check server-side, so the nav should hide what a role can't use rather
// than showing a link that 403s. Dashboard/Orders(view-only via search)/My Profile have
// no backend gate (dashboard is intentionally open — see AdminDashboardController's own
// doc comment; my-profile is self-service) so they carry no permission tag.
const NAV_ITEMS: SidebarNavItem[] = [
  { labelKey: 'nav.dashboard', icon: '📊', route: '/dashboard' },
  {
    labelKey: 'nav.businesses',
    icon: '🏬',
    route: '/businesses',
    permission: 'businesses:read',
  },
  {
    labelKey: 'nav.brands',
    icon: '🏷️',
    route: '/brands',
    permission: 'brands:read',
  },
  { labelKey: 'nav.tags', icon: '🔖', route: '/tags', permission: 'tags:read' },
  {
    labelKey: 'nav.products',
    icon: '🍔',
    route: '/products',
    permission: 'products:read',
  },
  {
    labelKey: 'nav.categories',
    icon: '📁',
    route: '/categories',
    permission: 'categories:read',
  },
  {
    labelKey: 'nav.orders',
    icon: '🧾',
    route: '/orders',
    permission: 'orders:read',
  },
  {
    labelKey: 'nav.users',
    icon: '👤',
    route: '/users',
    permission: 'users:read',
  },
  {
    labelKey: 'nav.coupons',
    icon: '🎟️',
    route: '/coupons',
    permission: 'coupons:read',
  },
  {
    labelKey: 'nav.cashback',
    icon: '💰',
    route: '/cashback-rules',
    permission: 'cashback:read',
  },
  {
    labelKey: 'nav.delivery',
    icon: '🛵',
    route: '/delivery-partners',
    permission: 'delivery:read',
  },
  {
    labelKey: 'nav.deliveryZones',
    icon: '🗺️',
    route: '/delivery-zones',
    permission: 'delivery:read',
  },
  {
    labelKey: 'nav.payouts',
    icon: '💸',
    route: '/payouts',
    permission: 'payouts:read',
  },
  {
    labelKey: 'nav.subscriptions',
    icon: '⭐',
    route: '/subscriptions',
    permission: 'subscriptions:read',
  },
  {
    labelKey: 'nav.banners',
    icon: '🖼️',
    route: '/banners',
    permission: 'banners:read',
  },
  {
    labelKey: 'nav.admins',
    icon: '🛡️',
    route: '/admins',
    permission: 'admins:read',
  },
  { labelKey: 'nav.myProfile', icon: '👤', route: '/my-profile' },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarNavComponent],
  template: `
    <lib-sidebar-nav
      [items]="navItems()"
      titleKey="app.name"
      [accountSummary]="accountSummary()"
      (logoutClicked)="logout()"
    />
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: `
    .main-content {
      padding: var(--zitro-spacing-lg);

      @media (min-width: 768px) {
        margin-left: 240px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private readonly tokenService = inject(AdminAuthTokenService);
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);

  // Was previously unfiltered — every NAV_ITEM rendered regardless of its `permission`
  // field, so a non-SuperAdmin role saw "Admins" in the sidebar even though every write
  // (and the list itself) 403s server-side. The item's own `permission: 'admins:read'`
  // tag existed but nothing ever read it.
  protected readonly navItems = computed(() =>
    NAV_ITEMS.filter(
      (item) => !item.permission || this.api.hasPermission(item.permission),
    ),
  );

  protected readonly accountSummary = signal<SidebarAccountSummary | null>(
    null,
  );

  ngOnInit(): void {
    this.api.getMyProfile().subscribe({
      next: (p) =>
        this.accountSummary.set({ name: p.name, role: formatRole(p.role) }),
    });
  }

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
