import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { BusinessAuthTokenService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, I18nPipe],
  template: `
    <nav class="sidebar">
      <div class="sidebar-header">
        <span class="app-name">{{ 'app.restaurantName' | i18n }}</span>
      </div>
      <ul class="nav-list">
        <li><a class="nav-item" routerLink="/dashboard" routerLinkActive="active">📊 {{ 'nav.dashboard' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/orders" routerLinkActive="active">🧾 {{ 'nav.orders' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/menu" routerLinkActive="active">🍔 {{ 'restaurant.menu' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/inventory" routerLinkActive="active">📦 {{ 'restaurant.inventory' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/ratings" routerLinkActive="active">⭐ {{ 'restaurant.ratings' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/payouts" routerLinkActive="active">💸 {{ 'nav.payouts' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/delivery-zones" routerLinkActive="active">🗺️ {{ 'nav.deliveryZones' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/staff" routerLinkActive="active">👥 {{ 'restaurant.staff' | i18n }}</a></li>
        <li><a class="nav-item" routerLink="/profile" routerLinkActive="active">⚙️ {{ 'restaurant.profile' | i18n }}</a></li>
      </ul>
      <button class="logout-btn" (click)="logout()">{{ 'nav.logout' | i18n }}</button>
    </nav>
    <main class="main-content"><router-outlet /></main>
  `,
  styles: `
    :host { display: flex; min-height: 100vh; }
    .sidebar {
      width: 220px; flex-shrink: 0; background: var(--zitro-color-surface-container);
      border-right: 1px solid var(--zitro-color-outline-variant);
      display: flex; flex-direction: column; padding: var(--zitro-spacing-lg) 0;
      position: fixed; top: 0; left: 0; height: 100vh; overflow-y: auto;
    }
    .sidebar-header { padding: 0 var(--zitro-spacing-lg) var(--zitro-spacing-lg); border-bottom: 1px solid var(--zitro-color-outline-variant); margin-bottom: var(--zitro-spacing-md); }
    .app-name { font-weight: var(--zitro-font-weight-bold); font-size: var(--zitro-font-size-lg); color: var(--zitro-color-primary); }
    .nav-list { list-style: none; padding: 0; margin: 0; flex: 1; }
    .nav-item { display: block; padding: var(--zitro-spacing-sm) var(--zitro-spacing-lg); color: var(--zitro-color-on-surface); text-decoration: none; font-size: var(--zitro-font-size-sm); &:hover { background: var(--zitro-color-surface-container-high); } &.active { color: var(--zitro-color-primary); font-weight: var(--zitro-font-weight-medium); background: color-mix(in srgb, var(--zitro-color-primary) 8%, transparent); } }
    .logout-btn { margin: var(--zitro-spacing-lg); background: none; border: 1px solid var(--zitro-color-outline); border-radius: var(--zitro-radius-md); padding: var(--zitro-spacing-sm); cursor: pointer; color: var(--zitro-color-on-surface-variant); font-size: var(--zitro-font-size-sm); }
    .main-content { margin-left: 220px; flex: 1; padding: var(--zitro-spacing-xl); }
    @media (max-width: 768px) { .sidebar { width: 100%; height: auto; position: static; flex-direction: row; flex-wrap: wrap; } .main-content { margin-left: 0; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantLayoutComponent {
  private readonly tokenService = inject(BusinessAuthTokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/login']);
  }
}
