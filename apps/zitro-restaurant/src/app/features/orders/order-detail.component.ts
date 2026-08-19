import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BusinessApiService, BusinessOrderDetailDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'app-restaurant-order-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, I18nPipe],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ order()?.orderId ?? '' }}</h1>
      <a class="btn btn-outline" routerLink="/orders">← Orders</a>
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (order()) {
      <div class="detail-grid">
        <section class="card" data-testid="order-detail-items">
          <h2 class="section-title">Items</h2>
          @for (item of order()!.items; track item.name) {
            <div class="item-row">
              <span
                >{{ item.qty }}× {{ item.name }}
                {{
                  item.selectedVariationLabel
                    ? '(' + item.selectedVariationLabel + ')'
                    : ''
                }}</span
              >
              <span
                >₹{{
                  item.qty * (item.selectedVariationPrice ?? item.price)
                }}</span
              >
            </div>
          }
        </section>
        <section class="card" data-testid="order-detail-charges">
          <h2 class="section-title">Charges</h2>
          <div class="item-row">
            <span>Total</span><strong>₹{{ order()!.total }}</strong>
          </div>
        </section>
        <section class="card" data-testid="order-detail-customer">
          <h2 class="section-title">Customer</h2>
          <p>{{ order()!.customerPhone }}</p>
          <p>Payment: {{ order()!.paymentMethod ?? '—' }}</p>
        </section>
        <section class="card" data-testid="order-detail-timeline">
          <h2 class="section-title">Timeline</h2>
          @for (entry of order()!.statusTimeline; track entry.timestamp) {
            <div class="timeline-entry">
              <span class="badge" [class]="'badge-' + entry.status">{{
                entry.status
              }}</span>
              <span class="timeline-time">{{
                entry.timestamp | date: 'HH:mm'
              }}</span>
              @if (entry.note) {
                <span class="timeline-note">{{ entry.note }}</span>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
  styles: `
    @use '../../_restaurant-shared' as *;
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--zitro-spacing-md);
    }
    .section-title {
      font-size: var(--zitro-font-size-md);
      font-weight: 700;
      margin: 0 0 var(--zitro-spacing-md);
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      padding: var(--zitro-spacing-xs) 0;
      border-bottom: 1px solid var(--zitro-divider);
    }
    .item-note {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
      padding: var(--zitro-spacing-xs) 0;
    }
    .timeline-entry {
      display: flex;
      align-items: center;
      gap: var(--zitro-spacing-sm);
      padding: var(--zitro-spacing-xs) 0;
    }
    .timeline-time {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
    }
    .timeline-note {
      font-size: var(--zitro-font-size-sm);
      color: var(--zitro-on-surface-variant);
    }
    .btn {
      padding: var(--zitro-spacing-xs) var(--zitro-spacing-md);
      border: 1px solid transparent;
      border-radius: var(--zitro-radius-md);
      cursor: pointer;
      text-decoration: none;
    }
    .btn-outline {
      background: transparent;
      color: var(--zitro-primary);
      border-color: var(--zitro-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantOrderDetailComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  private readonly route = inject(ActivatedRoute);
  protected order = signal<BusinessOrderDetailDto | null>(null);
  protected loading = signal(true);

  ngOnInit(): void {
    const id = this.api.businessId()!;
    const orderId = this.route.snapshot.paramMap.get('orderId')!;
    this.api.getOrderDetail(id, orderId).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
