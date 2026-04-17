import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export type EvolvedOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export const STATUS_COLOR_MAP: Record<EvolvedOrderStatus, string> = {
  pending: 'orange',
  confirmed: 'blue',
  preparing: 'purple',
  ready: 'teal',
  shipped: 'cyan',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
};

export const STATUS_I18N_MAP: Record<EvolvedOrderStatus, string> = {
  pending: 'order.pending',
  confirmed: 'order.confirmed',
  preparing: 'order.preparing',
  ready: 'order.ready',
  shipped: 'order.shipped',
  delivered: 'order.delivered',
  completed: 'order.delivered',
  cancelled: 'order.cancelled',
};

@Component({
  selector: 'lib-order-status-badge',
  standalone: true,
  imports: [I18nPipe],
  template: `
    <span
      class="order-status-badge"
      [attr.data-color]="color()"
      data-testid="order-status-badge"
    >
      <span data-testid="order-status-label">{{ labelKey() | i18n }}</span>
    </span>
  `,
  styles: [`
    .order-status-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .order-status-badge[data-color="orange"] { background: #fff3e0; color: #e65100; }
    .order-status-badge[data-color="blue"] { background: #e3f2fd; color: #1565c0; }
    .order-status-badge[data-color="purple"] { background: #f3e5f5; color: #6a1b9a; }
    .order-status-badge[data-color="teal"] { background: #e0f2f1; color: #00695c; }
    .order-status-badge[data-color="cyan"] { background: #e0f7fa; color: #006064; }
    .order-status-badge[data-color="green"] { background: #e8f5e9; color: #2e7d32; }
    .order-status-badge[data-color="red"] { background: #ffebee; color: #c62828; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderStatusBadgeComponent {
  status = input.required<EvolvedOrderStatus>();

  color = computed(() => STATUS_COLOR_MAP[this.status()] ?? 'orange');
  labelKey = computed(() => STATUS_I18N_MAP[this.status()] ?? 'order.pending');
}
