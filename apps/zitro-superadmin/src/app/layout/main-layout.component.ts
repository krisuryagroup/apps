import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarNavComponent, SidebarNavItem } from '@zitro/admin-ui';
import { AdminAuthTokenService } from '@zitro/services';

// Same items as zitro-admin (SA-002 composes those screens here too) plus the
// superadmin-only config screens (SA-003..SA-006) at the end.
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
  { labelKey: 'nav.admins', icon: '🛡️', route: '/admins' },
  { labelKey: 'nav.myProfile', icon: '👤', route: '/my-profile' },
  { labelKey: 'nav.featureFlags', icon: '🚩', route: '/feature-flags' },
  { labelKey: 'nav.translations', icon: '🌐', route: '/translations' },
  { labelKey: 'nav.themes', icon: '🎨', route: '/themes' },
  { labelKey: 'nav.uiConfig', icon: '⚙️', route: '/ui-config' },
];

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarNavComponent],
  template: `
    <lib-sidebar-nav
      [items]="navItems"
      titleKey="app.superadminName"
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
  private readonly router = inject(Router);

  protected readonly navItems = NAV_ITEMS;

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
