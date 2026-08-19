import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BusinessApiService, BusinessDashboardDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-dashboard',
  standalone: true,
  imports: [RouterLink, I18nPipe],
  template: `
    @if (loading()) { <p class="loading">{{ 'common.loading' | i18n }}</p> }
    @else if (data()) {
      <h1 class="page-title">{{ 'nav.dashboard' | i18n }}</h1>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-value" data-testid="dashboard-today-orders">{{ data()!.todayOrderCount }}</div><div class="stat-label">{{ 'dashboard.todayOrders' | i18n }}</div></div>
        <div class="stat-card"><div class="stat-value" data-testid="dashboard-today-revenue">₹{{ data()!.todayRevenue }}</div><div class="stat-label">{{ 'dashboard.todayRevenue' | i18n }}</div></div>
        <div class="stat-card"><div class="stat-value" data-testid="dashboard-pending-count" style="color:var(--zitro-color-error)">{{ data()!.pendingOrderCount }}</div><div class="stat-label">{{ 'restaurant.pendingOrders' | i18n }}</div></div>
        <div class="stat-card" data-testid="dashboard-stock-alert-count"><div class="stat-value">{{ data()!.lowStockAlertCount }}</div><div class="stat-label">{{ 'restaurant.lowStockAlerts' | i18n }}</div></div>
      </div>
      <div class="quick-links">
        <a class="btn btn-primary" routerLink="/orders" [queryParams]="{status:'pending'}">{{ 'restaurant.viewPendingOrders' | i18n }}</a>
        <a class="btn btn-outline" routerLink="/menu">{{ 'restaurant.addMenuItem' | i18n }}</a>
      </div>
    }
  `,
  styles: `@use '../../_restaurant-shared' as *; .quick-links{display:flex;gap:var(--zitro-spacing-md);} .btn{padding:var(--zitro-spacing-sm) var(--zitro-spacing-lg);border:1px solid transparent;border-radius:var(--zitro-radius-md);cursor:pointer;text-decoration:none;font-weight:var(--zitro-font-weight-medium);} .btn-primary{background:var(--zitro-color-primary);color:var(--zitro-color-on-primary);} .btn-outline{background:transparent;color:var(--zitro-color-primary);border-color:var(--zitro-color-primary);}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantDashboardComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected data = signal<BusinessDashboardDto | null>(null);
  protected loading = signal(true);

  ngOnInit(): void {
    const id = this.api.businessId();
    if (!id) return;
    this.api.getDashboard(id).subscribe({
      next: d => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
