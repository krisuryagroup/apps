import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApiService, AdminDashboardDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { StatCardComponent } from '../stat-card/stat-card.component';

@Component({
  selector: 'lib-admin-dashboard',
  standalone: true,
  imports: [RouterLink, I18nPipe, StatCardComponent],
  template: `
    <h1 class="page-title">{{ 'nav.dashboard' | i18n }}</h1>

    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (error()) {
      <p class="error">{{ 'common.error' | i18n }}</p>
    } @else if (data()) {
      <div class="stats-grid">
        <lib-stat-card
          data-testid="dashboard-stat-todayOrderCount"
          labelKey="dashboard.todayOrders"
          [value]="data()!.todayOrderCount"
          [config]="{ icon: '🧾', trend: null }"
        />
        <lib-stat-card
          data-testid="dashboard-stat-todayRevenue"
          labelKey="dashboard.todayRevenue"
          [value]="'₹' + data()!.todayRevenue.toLocaleString('en-IN')"
          [config]="{ icon: '💰', trend: null }"
        />
        <lib-stat-card
          data-testid="dashboard-stat-newUsersToday"
          labelKey="dashboard.newUsers"
          [value]="data()!.newUsersToday"
          [config]="{ icon: '👤', trend: null }"
        />
        <lib-stat-card
          data-testid="dashboard-stat-activeBusinesses"
          labelKey="dashboard.activeBusinesses"
          [value]="data()!.activeBusinesses"
          [config]="{ icon: '🏬', trend: null }"
        />
        <a
          class="stat-link"
          routerLink="/businesses"
          data-testid="dashboard-pending-approvals-link"
        >
          <lib-stat-card
            data-testid="dashboard-stat-pendingOnboardingCount"
            labelKey="dashboard.pendingOnboarding"
            [value]="data()!.pendingOnboardingCount"
            [config]="{ icon: '⏳', trend: null }"
          />
        </a>
        <lib-stat-card
          data-testid="dashboard-stat-pendingPayoutCount"
          labelKey="dashboard.pendingPayouts"
          [value]="data()!.pendingPayoutCount"
          [config]="{ icon: '💸', trend: null }"
        />
      </div>
    }
  `,
  styles: `
    .page-title {
      font-size: var(--zitro-font-size-2xl);
      font-weight: var(--zitro-font-weight-bold);
      margin: 0 0 var(--zitro-spacing-xl);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--zitro-spacing-lg);
    }
    .stat-link {
      text-decoration: none;
      color: inherit;
    }
    .loading,
    .error {
      color: var(--zitro-color-on-surface-variant);
      padding: var(--zitro-spacing-xl);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected data = signal<AdminDashboardDto | null>(null);
  protected loading = signal(true);
  protected error = signal(false);

  ngOnInit(): void {
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
