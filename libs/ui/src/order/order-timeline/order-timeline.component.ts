import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrderStatusTimeline } from '@zitro/models';
import {
  OrderStatusBadgeComponent,
  EvolvedOrderStatus,
} from '../order-status-badge/order-status-badge.component';

@Component({
  selector: 'lib-order-timeline',
  standalone: true,
  imports: [DatePipe, OrderStatusBadgeComponent],
  templateUrl: './order-timeline.component.html',
  styleUrl: './order-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTimelineComponent {
  events = input<OrderStatusTimeline[]>([]);

  toEvolvedStatus(status: string): EvolvedOrderStatus {
    return status as EvolvedOrderStatus;
  }
}
