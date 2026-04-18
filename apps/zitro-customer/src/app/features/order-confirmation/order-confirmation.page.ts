import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { firstValueFrom, interval, startWith, map } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { CancelOrderDialogComponent, CallRestaurantButtonComponent } from '@zitro/ui';
import {
  OrderApiService,
  AppSettingsService,
  AnalyticsService,
} from '@zitro/services';
import type { Order, OrderDisplay } from '@zitro/models';
import {
  getOrderStatusDisplay,
  getOrderTimelineSteps,
  isTimelineStepCompleted,
  isTimelineStepCurrent,
  getEstimatedTimeDisplay,
  getStatusTimestamp,
  formatTimestamp,
  getItemTotal,
  getGSTAmount,
  getPackagingCharges,
  getPlatformFee,
  getDeliveryCharge,
  getCouponCode,
  getCouponDiscount,
  hasCoupon,
  getOrderItemName,
} from '@zitro/utils';

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
  selector: 'app-order-confirmation-page',
  standalone: true,
  imports: [I18nPipe, DecimalPipe, DatePipe, CancelOrderDialogComponent, CallRestaurantButtonComponent],
  templateUrl: './order-confirmation.page.html',
  styleUrl: './order-confirmation.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderConfirmationPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(OrderApiService);
  private readonly appSettings = inject(AppSettingsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = signal<OrderDisplay | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  readonly showCancelDialog = signal(false);
  readonly isProcessingCancel = signal(false);
  readonly remainingCancelSeconds = signal(0);

  private cancellationTimeLimit = 90;
  private cancellationEnabled = true;
  private allowedCancellationStatuses = ['pending', 'confirmed'];

  readonly canCancel = computed(() => {
    const o = this.order();
    if (!o || !this.cancellationEnabled) return false;
    const status = o.status?.toLowerCase() ?? '';
    if (!this.allowedCancellationStatuses.includes(status)) return false;
    return this.remainingCancelSeconds() > 0;
  });

  readonly statusTitle = computed(() => {
    const o = this.order();
    if (!o) return 'order.status';
    switch (o.status) {
      case 'pending': return '✅ Order Placed!';
      case 'confirmed': return '✅ Order Confirmed!';
      case 'preparing': return '👨‍🍳 Preparing Your Order';
      case 'ready': return o.orderType === 'dine-in' ? '✅ Order Ready!' : '🎉 Order Ready for Pickup!';
      case 'shipped': return '🚚 Order On the Way!';
      case 'delivered': return '✅ Order Delivered!';
      case 'completed': return o.orderType === 'dine-in' ? '✅ Enjoy Your Meal!' : '✅ Order Completed!';
      case 'cancelled': return '❌ Order Cancelled';
      default: return '📦 Order Status';
    }
  });

  readonly statusSubtitle = computed(() => {
    const o = this.order();
    if (!o) return '';
    switch (o.status) {
      case 'pending': return 'Your order has been placed successfully';
      case 'confirmed': return 'Your order has been confirmed and will be prepared soon';
      case 'preparing': return 'Your order is being prepared with care';
      case 'ready': return o.orderType === 'dine-in' ? 'Your order is ready to be served' : 'Your order is ready. Please come and collect it';
      case 'shipped': return 'Your order is on the way to your location';
      case 'delivered': return 'Your order has been successfully delivered';
      case 'completed': return o.orderType === 'dine-in' ? 'Thank you for dining with us!' : 'Thank you for your order!';
      case 'cancelled': return 'This order has been cancelled';
      default: return 'Track your order status below';
    }
  });

  readonly statusIcon = computed(() => {
    switch (this.order()?.status) {
      case 'pending': case 'confirmed': return 'check_circle';
      case 'preparing': return 'restaurant';
      case 'ready': return 'done_all';
      case 'shipped': return 'local_shipping';
      case 'delivered': case 'completed': return 'task_alt';
      case 'cancelled': return 'cancel';
      default: return 'info';
    }
  });

  readonly statusIconColor = computed(() => {
    switch (this.order()?.status) {
      case 'pending': case 'confirmed': return '#4CAF50';
      case 'preparing': return '#FF9800';
      case 'ready': return '#2196F3';
      case 'shipped': return '#9C27B0';
      case 'delivered': case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#607D8B';
    }
  });

  readonly statusClass = computed(() => {
    switch (this.order()?.status) {
      case 'cancelled': return 'status-cancelled';
      default: return 'status-success';
    }
  });

  readonly timelineSteps = computed(() => {
    const o = this.order();
    return o ? getOrderTimelineSteps(o.orderType) : [];
  });

  readonly etaDisplay = computed(() => {
    const o = this.order();
    return o ? getEstimatedTimeDisplay(o) : '';
  });

  readonly itemTotal = computed(() => {
    const o = this.order();
    return o ? getItemTotal(o) : 0;
  });

  readonly packagingCharges = computed(() => {
    const o = this.order();
    return o ? getPackagingCharges(o) : 0;
  });

  readonly platformFee = computed(() => {
    const o = this.order();
    return o ? getPlatformFee(o) : 0;
  });

  readonly gstAmount = computed(() => {
    const o = this.order();
    return o ? getGSTAmount(o) : 0;
  });

  readonly deliveryCharge = computed(() => {
    const o = this.order();
    return o ? getDeliveryCharge(o) : 0;
  });

  readonly couponCode = computed(() => {
    const o = this.order();
    return o ? getCouponCode(o) : '';
  });

  readonly couponDiscount = computed(() => {
    const o = this.order();
    return o ? getCouponDiscount(o) : 0;
  });

  readonly hasAppliedCoupon = computed(() => {
    const o = this.order();
    return o ? hasCoupon(o) : false;
  });

  readonly hasNotes = computed(() => {
    const o = this.order();
    return !!(o?.customerNotes?.trim());
  });

  readonly showEta = computed(() => {
    const s = this.order()?.status;
    return s !== 'completed' && s !== 'delivered' && s !== 'cancelled';
  });

  async ngOnInit(): Promise<void> {
    this.loadCancellationConfig();

    const orderId =
      this.route.snapshot.queryParamMap.get('orderId') ??
      (history.state as { orderId?: string })?.orderId;

    if (orderId) {
      await this.loadOrder(orderId);
    } else {
      this.error.set('Order ID not found');
      this.isLoading.set(false);
    }
  }

  private loadCancellationConfig(): void {
    this.appSettings.getOrderCancellationTimeLimit()
      .then(l => (this.cancellationTimeLimit = l))
      .catch(console.error);
    this.appSettings.isOrderCancellationEnabled()
      .then(e => (this.cancellationEnabled = e))
      .catch(console.error);
    this.appSettings.getAllowedCancellationStatuses()
      .then(s => (this.allowedCancellationStatuses = s))
      .catch(console.error);
  }

  private async loadOrder(orderId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const order = await firstValueFrom(this.orderApi.getOrder(orderId));
      this.order.set(toDisplay(order));
      this.startCancellationTimer(order.createdAt);
    } catch {
      this.error.set('Failed to load order details');
    } finally {
      this.isLoading.set(false);
    }
  }

  private startCancellationTimer(createdAt: Date): void {
    interval(1000)
      .pipe(
        startWith(0),
        map(() => {
          const elapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000);
          return Math.max(0, this.cancellationTimeLimit - elapsed);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(secs => this.remainingCancelSeconds.set(secs));
  }

  getItemName(item: { name: string; selectedVariationLabel?: string }): string {
    return getOrderItemName(item);
  }

  isStepCompleted(stepStatus: string): boolean {
    const o = this.order();
    return o ? isTimelineStepCompleted(o, stepStatus) : false;
  }

  isStepCurrent(stepStatus: string): boolean {
    const o = this.order();
    return o ? isTimelineStepCurrent(o, stepStatus) : false;
  }

  getStepTimestamp(stepStatus: string): Date | null {
    const o = this.order();
    return o ? getStatusTimestamp(o, stepStatus) : null;
  }

  formatTime(ts: Date | null): string {
    return formatTimestamp(ts);
  }

  openCancelDialog(): void {
    this.showCancelDialog.set(true);
  }

  onCancelDialogClose(): void {
    this.showCancelDialog.set(false);
    this.isProcessingCancel.set(false);
  }

  async onConfirmCancel(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.isProcessingCancel.set(true);
    try {
      await firstValueFrom(this.orderApi.cancelOrder(o.orderId));
      alert('Order cancelled successfully.');
      this.router.navigate(['/orders']);
    } catch {
      alert('Failed to cancel order. Please try again.');
      this.isProcessingCancel.set(false);
    }
  }

  goToHome(): void {
    this.router.navigate(['/home']);
  }

  viewOrders(): void {
    this.router.navigate(['/orders']);
  }

  needHelp(): void {
    this.router.navigate(['/contact']);
  }
}
