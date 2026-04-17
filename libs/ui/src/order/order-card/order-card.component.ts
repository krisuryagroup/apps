import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import { Order } from '@zitro/models';
import { OrderStatusBadgeComponent, EvolvedOrderStatus } from '../order-status-badge/order-status-badge.component';

export interface OrderCardConfig {
  showReorderButton: boolean;
  showTrackButton: boolean;
}
export const ORDER_CARD_DEFAULT_CONFIG: OrderCardConfig = {
  showReorderButton: true,
  showTrackButton: true,
};

@Component({
  selector: 'lib-order-card',
  standalone: true,
  imports: [I18nPipe, DatePipe, OrderStatusBadgeComponent],
  templateUrl: './order-card.component.html',
  styleUrl: './order-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderCardComponent {
  config = input<OrderCardConfig>(ORDER_CARD_DEFAULT_CONFIG);
  order = input.required<Order>();

  viewDetails = output<Order>();
  reorder = output<Order>();
  track = output<Order>();

  isTrackable(status: string): boolean {
    return ['confirmed', 'preparing', 'shipped', 'ready'].includes(status);
  }

  isReorderable(status: string): boolean {
    return ['delivered', 'completed', 'cancelled'].includes(status);
  }

  get safeStatus(): EvolvedOrderStatus {
    return this.order().status as EvolvedOrderStatus;
  }
}
