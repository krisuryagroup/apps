import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DecimalPipe, DatePipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import { CancelOrderDialogComponent } from '@zitro/ui';
import { OrderApiService, AppSettingsService } from '@zitro/services';
import type { Order, OrderDisplay } from '@zitro/models';
import {
  getOrderStatusDisplay,
  getOrderStatusClass,
  getOrderTimelineSteps,
  isTimelineStepCompleted,
  getEstimatedTimeMinutes,
} from '@zitro/utils';

function toDisplay(order: Order): OrderDisplay {
  return {
    ...order,
    date: order.createdAt.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    time: order.createdAt.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    statusDisplay: getOrderStatusDisplay(order.status),
    totalDisplay: `₹${order.total.toFixed(2)}`,
    orderTypeDisplay:
      order.orderType === 'dine-in'
        ? 'Dine In'
        : order.orderType === 'takeout'
          ? 'Takeout'
          : 'Delivery',
  };
}

@Component({
  selector: 'app-order-history-page',
  standalone: true,
  imports: [I18nPipe, DecimalPipe, DatePipe, CancelOrderDialogComponent],
  templateUrl: './order-history.page.html',
  styleUrl: './order-history.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryPage implements OnInit {
  private readonly router = inject(Router);
  private readonly orderApi = inject(OrderApiService);
  private readonly appSettings = inject(AppSettingsService);

  readonly orders = signal<OrderDisplay[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly showCancelDialog = signal(false);
  readonly selectedOrderId = signal('');
  readonly isProcessingCancel = signal(false);
  readonly selectedOrderRemainingTime = signal(0);
  readonly openMenuOrderId = signal<string | null>(null);

  readonly currentPage = signal(1);
  readonly pageSize = 5;

  readonly totalPages = computed(() =>
    Math.ceil(this.orders().length / this.pageSize),
  );
  readonly paginatedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.orders().slice(start, start + this.pageSize);
  });
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  private cancellationTimeLimit = 90;
  private cancellationEnabled = true;
  private allowedCancellationStatuses = ['pending', 'confirmed'];

  async ngOnInit(): Promise<void> {
    await this.loadCancellationConfig();
    await this.loadOrders();
  }

  private async loadCancellationConfig(): Promise<void> {
    await Promise.allSettled([
      this.appSettings
        .getOrderCancellationTimeLimit()
        .then((l) => (this.cancellationTimeLimit = l)),
      this.appSettings
        .isOrderCancellationEnabled()
        .then((e) => (this.cancellationEnabled = e)),
      this.appSettings
        .getAllowedCancellationStatuses()
        .then((s) => (this.allowedCancellationStatuses = s)),
    ]);
  }

  private async loadOrders(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const orders = await firstValueFrom(this.orderApi.getOrderHistory());
      const sorted = [...orders].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      this.orders.set(sorted.map(toDisplay));
    } catch {
      this.errorMessage.set('errors.loadFailed');
      this.orders.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status as Order['status']);
  }

  getTimelineSteps(orderType: string) {
    return getOrderTimelineSteps(orderType);
  }

  isStepCompleted(order: OrderDisplay, stepStatus: string): boolean {
    return isTimelineStepCompleted(order, stepStatus);
  }

  getEtaMinutes(order: OrderDisplay): number {
    return getEstimatedTimeMinutes(order);
  }

  canCancelOrder(order: OrderDisplay): boolean {
    if (!this.cancellationEnabled) return false;
    const status = order.status?.toLowerCase() ?? '';
    if (!this.allowedCancellationStatuses.includes(status)) return false;
    const elapsed = Math.floor((Date.now() - order.createdAt.getTime()) / 1000);
    return elapsed <= this.cancellationTimeLimit;
  }

  trackOrder(orderId: string): void {
    this.router.navigate(['/order-tracking'], { queryParams: { orderId } });
  }

  viewMenu(slug?: string): void {
    if (slug) {
      this.router.navigate(['/listing'], {
        queryParams: { businessSlug: slug },
      });
    }
  }

  toggleOrderMenu(orderId: string): void {
    this.openMenuOrderId.update((current) =>
      current === orderId ? null : orderId,
    );
  }

  async openCancelDialog(orderId: string): Promise<void> {
    const order = this.orders().find((o) => o.orderId === orderId);
    if (order) {
      const elapsed = Math.floor(
        (Date.now() - order.createdAt.getTime()) / 1000,
      );
      this.selectedOrderRemainingTime.set(
        Math.max(0, this.cancellationTimeLimit - elapsed),
      );
    }
    this.selectedOrderId.set(orderId);
    this.showCancelDialog.set(true);
  }

  onCancelDialogClose(): void {
    this.showCancelDialog.set(false);
    this.selectedOrderId.set('');
    this.selectedOrderRemainingTime.set(0);
    this.isProcessingCancel.set(false);
  }

  async onConfirmCancel(): Promise<void> {
    const orderId = this.selectedOrderId();
    if (!orderId) return;
    this.isProcessingCancel.set(true);
    try {
      await firstValueFrom(this.orderApi.cancelOrder(orderId));
      alert('Order cancelled successfully.');
      await this.loadOrders();
      this.onCancelDialogClose();
    } catch {
      alert('Failed to cancel order. Please try again.');
      this.isProcessingCancel.set(false);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) this.currentPage.update((p) => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages())
      this.currentPage.update((p) => p + 1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) this.currentPage.set(page);
  }

  exploreMenu(): void {
    this.router.navigate(['/home']);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
