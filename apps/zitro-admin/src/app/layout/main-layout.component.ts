import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarNavComponent, SidebarNavItem } from '@zitro/admin-ui';
import { AdminApiService, AdminAuthTokenService } from '@zitro/services';

const NAV_ITEMS: SidebarNavItem[] = [
  { labelKey: 'nav.dashboard', icon: '📊', route: '/dashboard' },
  { labelKey: 'nav.businesses', icon: '🏬', route: '/businesses' },
  { labelKey: 'nav.brands', icon: '🏷️', route: '/brands' },
  { labelKey: 'nav.tags', icon: '🔖', route: '/tags' },
  { labelKey: 'nav.products', icon: '🍔', route: '/products' },
  { labelKey: 'nav.categories', icon: '📁', route: '/categories' },
  { labelKey: 'nav.orders', icon: '🧾', route: '/orders' },
  { labelKey: 'nav.users', icon: '👤', route: '/users' },
  { labelKey: 'nav.coupons', icon: '🎟️', route: '/coupons' },
  { labelKey: 'nav.cashback', icon: '💰', route: '/cashback-rules' },
  { labelKey: 'nav.delivery', icon: '🛵', route: '/delivery-partners' },
  { labelKey: 'nav.deliveryZones', icon: '🗺️', route: '/delivery-zones' },
  { labelKey: 'nav.payouts', icon: '💸', route: '/payouts' },
  { labelKey: 'nav.subscriptions', icon: '⭐', route: '/subscriptions' },
  { labelKey: 'nav.banners', icon: '🖼️', route: '/banners' },
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
export class MainLayoutComponent {
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

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
