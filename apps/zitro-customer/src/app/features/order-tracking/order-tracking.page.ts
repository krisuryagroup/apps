import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { firstValueFrom, interval } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { CallRestaurantButtonComponent } from '@zitro/ui';
import { OrderApiService, NavigationService } from '@zitro/services';
import type { Order, OrderDisplay } from '@zitro/models';
import {
  getOrderStatusDisplay,
  getOrderStatusClass,
  getOrderItemName,
} from '@zitro/utils';
import { UI_TEXT } from '../../core/constants/app.constants';

function toDisplay(order: Order): OrderDisplay {
  return {
    ...order,
    date: order.createdAt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: order.createdAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }),
    statusDisplay: getOrderStatusDisplay(order.status),
    totalDisplay: `₹${order.total.toFixed(2)}`,
    orderTypeDisplay: order.orderType === 'dine-in' ? 'Dine In' : order.orderType === 'takeout' ? 'Takeout' : 'Delivery',
  };
}

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [I18nPipe, DecimalPipe, DatePipe, FormsModule, CallRestaurantButtonComponent],
  templateUrl: './order-tracking.page.html',
  styleUrl: './order-tracking.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderApi = inject(OrderApiService);
  private readonly navService = inject(NavigationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = signal<OrderDisplay | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal('');
  readonly autoRefreshEnabled = signal(true);

  private orderId = '';

  readonly statusProgress = computed(() => {
    switch (this.order()?.status) {
      case 'pending': return 20;
      case 'confirmed': return 40;
      case 'preparing': return 60;
      case 'shipped': return 80;
      case 'delivered': return 100;
      default: return 0;
    }
  });

  readonly latestStatusDisplay = computed(() => {
    const o = this.order();
    if (!o?.statusTimeline?.length) return 'Unknown';
    const latest = o.statusTimeline[o.statusTimeline.length - 1];
    const map: Record<string, string> = {
      pending: 'Order Placed',
      confirmed: 'Order Confirmed',
      preparing: 'Preparing',
      shipped: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return map[latest.status] ?? latest.status;
  });

  readonly estimatedTimeRemaining = computed(() => {
    const o = this.order();
    if (!o) return '';
    if (o.status === 'cancelled') return UI_TEXT.ORDER_WAS_CANCELLED;
    if (!o.estimatedDeliveryTime) return UI_TEXT.NOT_AVAILABLE;
    const diff = Math.max(0, Math.floor((new Date(o.estimatedDeliveryTime).getTime() - Date.now()) / 60000));
    if (diff === 0) return 'Should arrive soon';
    if (diff < 60) return `${diff} minutes`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  });

  async ngOnInit(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('orderId');
    const queryId = this.route.snapshot.queryParamMap.get('orderId');
    this.orderId = routeId ?? queryId ?? '';
    if (this.orderId) {
      await this.loadOrder();
      this.startAutoRefresh();
    } else {
      this.error.set('Order ID is required');
    }
  }

  async loadOrder(): Promise<void> {
    if (!this.orderId.trim()) {
      this.error.set('Order ID is required');
      return;
    }
    this.isLoading.set(true);
    this.error.set('');
    try {
      const order = await firstValueFrom(this.orderApi.getOrder(this.orderId.trim()));
      this.order.set(toDisplay(order));
    } catch {
      this.error.set('Failed to load order details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private startAutoRefresh(): void {
    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const o = this.order();
        if (this.autoRefreshEnabled() && o?.status !== 'delivered' && o?.status !== 'cancelled') {
          this.loadOrder();
        }
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled.update(v => !v);
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status as Order['status']);
  }

  getStatusTimestamp(status: string): Date | null {
    const timeline = this.order()?.statusTimeline;
    if (!timeline) return null;
    return timeline.find(t => t.status === status)?.timestamp ?? null;
  }

  getStatusNote(status: string): string | null {
    const timeline = this.order()?.statusTimeline;
    if (!timeline) return null;
    return timeline.find(t => t.status === status)?.note ?? null;
  }

  isStatusCompleted(status: string): boolean {
    return this.getStatusTimestamp(status) !== null;
  }

  getItemName(item: { name: string; selectedVariationLabel?: string }): string {
    return getOrderItemName(item);
  }

  getPackagingCharges(): number {
    return this.order()?.charges?.packagingCharge ?? this.order()?.totalPackagingCharges ?? 0;
  }

  getPlatformFee(): number {
    return this.order()?.charges?.platformFee ?? 0;
  }

  getGSTAmount(): number {
    return this.order()?.charges?.gst ?? this.order()?.tax ?? 0;
  }

  getGSTPercentage(): number {
    return 5;
  }

  getDeliveryCharge(): number {
    return this.order()?.charges?.deliveryCharge ?? this.order()?.deliveryCharge ?? 0;
  }

  getCouponCode(): string {
    return this.order()?.couponCode ?? '';
  }

  getCouponDiscount(): number {
    return this.order()?.charges?.couponDiscount ?? this.order()?.couponDiscount ?? 0;
  }

  hasCoupon(): boolean {
    return this.getCouponDiscount() > 0;
  }

  getTotalSavings(): number {
    return this.getCouponDiscount();
  }

  goBack(): void {
    this.navService.goBack();
  }

  goHome(): void {
    this.navService.navigateToHome();
  }
}
