import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService } from '@zitro/services';
import { NavigationService } from '@zitro/services';
import { CallRestaurantButtonComponent } from '@zitro/ui';
import { OrderDisplay } from '@zitro/models';
import { getOrderStatusClass } from '@zitro/utils';
import { interval, Subscription } from 'rxjs';
import { UI_TEXT } from '../../core/constants/app.constants';

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, CallRestaurantButtonComponent],
  templateUrl: './order-tracking.component.html',
  styleUrls: ['./order-tracking.component.scss'],
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private navigationService = inject(NavigationService);

  orderDetails: OrderDisplay | null = null;
  orderId = '';
  loading = false;
  error = '';
  autoRefreshEnabled = true;
  private refreshSubscription?: Subscription;

  async ngOnInit() {
    // Get order ID from route params or query params
    this.route.paramMap.subscribe((params) => {
      const orderIdFromRoute = params.get('orderId');
      if (orderIdFromRoute) {
        this.orderId = orderIdFromRoute;
        this.loadOrderDetails();
      }
    });

    // Also check query params
    this.route.queryParams.subscribe((params) => {
      const orderIdFromQuery = params['orderId'];
      if (orderIdFromQuery && !this.orderId) {
        this.orderId = orderIdFromQuery;
        this.loadOrderDetails();
      }
    });

    // Start auto-refresh every 30 seconds
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  async loadOrderDetails() {
    if (!this.orderId.trim()) {
      this.error = 'Order ID is required';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      this.orderDetails = await this.orderService.getOrderById(
        this.orderId.trim(),
      );

      if (!this.orderDetails) {
        this.error = 'Order not found. Please check your Order ID.';
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      this.error = 'Failed to load order details. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  getItemName(item: any): string {
    if (item.selectedVariationLabel) {
      return `${item.name} - (${item.selectedVariationLabel})`;
    }
    return item.name;
  }

  async refreshOrder() {
    if (this.orderId) {
      await this.loadOrderDetails();
    }
  }

  startAutoRefresh() {
    // Don't auto-refresh for delivered or cancelled orders
    if (
      this.autoRefreshEnabled &&
      this.orderDetails?.status !== 'delivered' &&
      this.orderDetails?.status !== 'cancelled'
    ) {
      this.refreshSubscription = interval(30000).subscribe(() => {
        if (
          this.orderId &&
          !this.loading &&
          this.orderDetails?.status !== 'delivered' &&
          this.orderDetails?.status !== 'cancelled'
        ) {
          this.refreshOrder();
        }
      });
    }
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status as any);
  }

  getStatusProgress(status: string): number {
    switch (status) {
      case 'pending':
        return 20;
      case 'confirmed':
        return 40;
      case 'preparing':
        return 60;
      case 'shipped':
        return 80;
      case 'delivered':
        return 100;
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get timestamp for a specific status from the timeline
   */
  getStatusTimestamp(status: string): Date | null {
    if (!this.orderDetails?.statusTimeline) return null;

    const timelineEntry = this.orderDetails.statusTimeline.find(
      (timeline) => timeline.status === status,
    );
    return timelineEntry ? timelineEntry.timestamp : null;
  }

  /**
   * Get note for a specific status from the timeline
   */
  getStatusNote(status: string): string | null {
    if (!this.orderDetails?.statusTimeline) return null;

    const timelineEntry = this.orderDetails.statusTimeline.find(
      (timeline) => timeline.status === status,
    );
    return timelineEntry ? timelineEntry.note || null : null;
  }

  /**
   * Get the latest timeline entry's status display
   */
  getLatestStatusDisplay(): string {
    if (
      !this.orderDetails?.statusTimeline ||
      this.orderDetails.statusTimeline.length === 0
    ) {
      return 'Unknown';
    }

    // Get the latest timeline entry (last in the array)
    const latestEntry =
      this.orderDetails.statusTimeline[
        this.orderDetails.statusTimeline.length - 1
      ];

    // Map timeline status to display text matching the timeline labels
    const statusMap: { [key: string]: string } = {
      pending: 'Order Placed',
      confirmed: 'Order Confirmed',
      preparing: 'Preparing',
      shipped: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    return statusMap[latestEntry.status] || latestEntry.status;
  }

  /**
   * Check if a status has been completed
   */
  isStatusCompleted(status: string): boolean {
    return this.getStatusTimestamp(status) !== null;
  }

  getEstimatedTimeRemaining(): string {
    // Don't show delivery time for cancelled orders
    if (this.orderDetails?.status === 'cancelled') {
      return UI_TEXT.ORDER_WAS_CANCELLED;
    }

    if (!this.orderDetails?.estimatedDeliveryTime) {
      return UI_TEXT.NOT_AVAILABLE;
    }

    const now = new Date();
    const estimatedTime = new Date(this.orderDetails.estimatedDeliveryTime);
    const diffInMinutes = Math.max(
      0,
      Math.floor((estimatedTime.getTime() - now.getTime()) / (1000 * 60)),
    );

    if (diffInMinutes === 0) {
      return 'Should arrive soon';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      const minutes = diffInMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }

  // Charge helper methods — OrderCharges is now flat (applied values only)
  getPackagingCharges(): number {
    return (
      this.orderDetails?.charges?.packagingCharge ??
      this.orderDetails?.totalPackagingCharges ??
      0
    );
  }

  getCalculatedPackaging(): number {
    return this.getPackagingCharges();
  }

  getWaivedPackaging(): number {
    return 0;
  }

  getPlatformFee(): number {
    return this.orderDetails?.charges?.platformFee ?? 0;
  }

  getCalculatedPlatformFee(): number {
    return this.getPlatformFee();
  }

  getWaivedPlatformFee(): number {
    return 0;
  }

  getGSTAmount(): number {
    return this.orderDetails?.charges?.gst ?? this.orderDetails?.tax ?? 0;
  }

  getCalculatedGST(): number {
    return this.getGSTAmount();
  }

  getWaivedGST(): number {
    return 0;
  }

  getGSTPercentage(): number {
    return 5;
  }

  getDeliveryCharge(): number {
    return (
      this.orderDetails?.charges?.deliveryCharge ??
      this.orderDetails?.deliveryCharge ??
      this.orderDetails?.deliveryFee ??
      0
    );
  }

  getCalculatedDeliveryCharge(): number {
    return this.getDeliveryCharge();
  }

  getWaivedDeliveryCharge(): number {
    return 0;
  }

  getCouponCode(): string {
    return this.orderDetails?.couponCode || '';
  }

  getCouponDiscount(): number {
    return (
      this.orderDetails?.charges?.couponDiscount ??
      this.orderDetails?.couponDiscount ??
      0
    );
  }

  hasCoupon(): boolean {
    return this.getCouponDiscount() > 0;
  }

  getTotalSavings(): number {
    let savings = 0;
    savings += this.getWaivedPackaging();
    savings += this.getWaivedPlatformFee();
    savings += this.getWaivedGST();
    savings += this.getWaivedDeliveryCharge();
    savings += this.getCouponDiscount();
    return savings;
  }

  goBack() {
    // Use navigation service for better back navigation
    this.navigationService.goBack();
  }

  goHome() {
    // Use navigation service to go home
    this.navigationService.navigateToHome();
  }

  onImageError(event: any) {
    event.target.src = '/assets/foodCategories/default.png';
  }
}
