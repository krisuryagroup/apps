import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { BusinessApiService, BusinessAuthTokenService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

@Component({
  selector: 'app-restaurant-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, I18nPipe],
  template: `
    <nav class="sidebar">
      <div class="sidebar-header">
        <span class="app-name">{{ 'app.restaurantName' | i18n }}</span>
        @if (businessName(); as name) {
          <div class="account-summary" data-testid="account-summary">
            <div class="account-summary__business">{{ name }}</div>
            @if (brandName(); as brand) {
              <div class="account-summary__line">
                {{ 'restaurant.branchOfBrand' | i18n: { brand } }}
              </div>
            } @else {
              <div class="account-summary__line">
                {{ 'restaurant.independentBranch' | i18n }}
              </div>
            }
            @if (staffName(); as name2) {
              <div class="account-summary__line">
                {{
                  'restaurant.staffSummary'
                    | i18n: { name: name2, role: staffRoleDisplay() }
                }}
              </div>
            }
          </div>
        }
      </div>
      <ul class="nav-list">
        <li>
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active"
            >📊 {{ 'nav.dashboard' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/orders" routerLinkActive="active"
            >🧾 {{ 'nav.orders' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/menu" routerLinkActive="active"
            >🍔 {{ 'restaurant.menu' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/inventory" routerLinkActive="active"
            >📦 {{ 'restaurant.inventory' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/ratings" routerLinkActive="active"
            >⭐ {{ 'restaurant.ratings' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/payouts" routerLinkActive="active"
            >💸 {{ 'nav.payouts' | i18n }}</a
          >
        </li>
        <li>
          <a
            class="nav-item"
            routerLink="/delivery-zones"
            routerLinkActive="active"
            >🗺️ {{ 'nav.deliveryZones' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/staff" routerLinkActive="active"
            >👥 {{ 'restaurant.staff' | i18n }}</a
          >
        </li>
        <li>
          <a class="nav-item" routerLink="/profile" routerLinkActive="active"
            >⚙️ {{ 'restaurant.profile' | i18n }}</a
          >
        </li>
      </ul>
      <button class="logout-btn" (click)="logout()">
        {{ 'nav.logout' | i18n }}
      </button>
    </nav>
    <main class="main-content"><router-outlet /></main>
  `,
  styles: `
    :host {
      display: flex;
      min-height: 100vh;
    }
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background: var(--zitro-surface-variant);
      border-right: 1px solid var(--zitro-divider);
      display: flex;
      flex-direction: column;
      padding: var(--zitro-spacing-lg) 0;
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar-header {
      padding: 0 var(--zitro-spacing-lg) var(--zitro-spacing-lg);
      border-bottom: 1px solid var(--zitro-divider);
      margin-bottom: var(--zitro-spacing-md);
    }
    .app-name {
      font-weight: 700;
      font-size: var(--zitro-font-size-lg);
      color: var(--zitro-primary);
    }
    .account-summary {
      margin-top: var(--zitro-spacing-xs);
      font-size: 11px;
      color: var(--zitro-on-surface-variant);
      line-height: 1.4;
    }
    .account-summary__business {
      font-weight: 500;
      color: var(--zitro-on-surface);
    }
    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
    }
    .nav-item {
      display: block;
      padding: var(--zitro-spacing-sm) var(--zitro-spacing-lg);
      color: var(--zitro-on-surface);
      text-decoration: none;
      font-size: var(--zitro-font-size-sm);
      &:hover {
        background: var(--zitro-surface-variant);
      }
      &.active {
        color: var(--zitro-primary);
        font-weight: 500;
        background: color-mix(in srgb, var(--zitro-primary) 8%, transparent);
      }
    }
    .logout-btn {
      margin: var(--zitro-spacing-lg);
      background: none;
      border: 1px solid var(--zitro-divider);
      border-radius: var(--zitro-radius-md);
      padding: var(--zitro-spacing-sm);
      cursor: pointer;
      color: var(--zitro-on-surface-variant);
      font-size: var(--zitro-font-size-sm);
    }
    .main-content {
      margin-left: 220px;
      flex: 1;
      padding: var(--zitro-spacing-xl);
    }
    @media (max-width: 768px) {
      /* :host stays a flex row by default (desktop: sidebar beside main-content). The
         mobile override below turns .sidebar into a static, full-width horizontal bar —
         but without also switching :host to column, the flex row layout keeps trying to
         fit that now-100%-wide sidebar and .main-content side by side, squeezing
         main-content to zero width and pushing it off-screen. Found live: every page's
         content was completely invisible below 768px, only the nav bar showed. */
      :host {
        flex-direction: column;
      }
      .sidebar {
        width: 100%;
        height: auto;
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
      }
      .main-content {
        margin-left: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantLayoutComponent implements OnInit {
  private readonly tokenService = inject(BusinessAuthTokenService);
  private readonly api = inject(BusinessApiService);
  private readonly router = inject(Router);

  protected businessName = signal<string | null>(null);
  protected brandName = signal<string | null>(null);
  protected staffName = signal<string | null>(null);
  protected staffRoleDisplay = signal('');

  ngOnInit(): void {
    const businessId = this.api.businessId();
    if (!businessId) return;

    this.api.getProfile(businessId).subscribe({
      next: (profile) => {
        this.businessName.set(profile.name);
        this.brandName.set(
          profile.menuMode === 'shared' ? (profile.brandName ?? null) : null,
        );
      },
    });

    const userId = this.api.currentUserId();
    const jwtRole = this.api.currentUser()?.role ?? '';
    this.staffRoleDisplay.set(capitalize(jwtRole));
    this.api.listStaff(businessId).subscribe({
      next: (staff) => {
        const me = staff.find((s) => s.id === userId);
        if (!me) return;
        this.staffName.set(me.name);
        this.staffRoleDisplay.set(capitalize(me.role));
      },
    });
  }

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
