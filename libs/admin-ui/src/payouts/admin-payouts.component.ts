import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

interface PayoutRow {
  id: string;
  businessName?: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  periodFrom?: string;
  periodTo?: string;
}

@Component({
  selector: 'lib-admin-payouts',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.payouts' | i18n }}</h1>
      <div style="display:flex;gap:8px;align-items:center">
        <input
          class="input"
          type="date"
          [(ngModel)]="fromDate"
          id="payout-from"
        />
        <input class="input" type="date" [(ngModel)]="toDate" id="payout-to" />
        <button
          class="btn btn-primary"
          [disabled]="!fromDate || !toDate || generating()"
          (click)="generate()"
        >
          {{
            generating()
              ? ('common.saving' | i18n)
              : ('payouts.generate' | i18n)
          }}
        </button>
      </div>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else {
      <p class="empty">{{ 'payouts.hint' | i18n }}</p>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPayoutsComponent {
  private readonly api = inject(AdminApiService);
  protected loading = signal(false);
  protected generating = signal(false);
  protected fromDate = '';
  protected toDate = '';

  protected generate(): void {
    this.generating.set(true);
    this.api.generatePayouts(this.fromDate, this.toDate).subscribe({
      next: () => this.generating.set(false),
      error: () => this.generating.set(false),
    });
  }
}
