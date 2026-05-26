import { Component, inject, OnInit } from '@angular/core';
import { Observable, interval, map, startWith } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { OrderDisplay } from '@zitro/models';
import * as OrderUtils from '@zitro/utils';
import { OrderService } from '@zitro/services';
import { AppSettingsService } from '@zitro/services';
import { CancelOrderDialogComponent } from '@zitro/ui';
import { CallRestaurantButtonComponent } from '@zitro/ui';
import { AnalyticsService } from '@zitro/services';
import { PricingService } from '@zitro/services';
import { PricingBreakdown } from '@zitro/models';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    CancelOrderDialogComponent,
    CallRestaurantButtonComponent,
  ],
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss'],
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private orderService = inject(OrderService);
  private analyticsService = inject(AnalyticsService);
  private appSettingsService = inject(AppSettingsService);
  private pricingService = inject(PricingService);

  orderDetails: OrderDisplay | null = null;
  isLoading = true;
  error: string | null = null;

  // Pricing breakdown from centralized service
  pricingBreakdown: PricingBreakdown | null = null;

  // Cancel dialog state
  showCancelDialog = false;
  isProcessingCancel = false;
  orderCreatedAt: Date = new Date(); // Track when order was created

  // Preloaded cancellation configuration
  private cancellationTimeLimit = 90;
  private cancellationEnabled = true;
  private allowedCancellationStatuses: string[] = ['pending', 'confirmed'];

  async ngOnInit() {
    // Preload cancellation configuration from Firebase (non-blocking)
    this.appSettingsService
      .getOrderCancellationTimeLimit()
      .then((limit) => (this.cancellationTimeLimit = limit))
      .catch((err) =>
        console.error('Error loading cancellation time limit:', err),
      );

    this.appSettingsService
      .isOrderCancellationEnabled()
      .then((enabled) => (this.cancellationEnabled = enabled))
      .catch((err) =>
        console.error('Error loading cancellation enabled flag:', err),
      );

    this.appSettingsService
      .getAllowedCancellationStatuses()
      .then((statuses) => (this.allowedCancellationStatuses = statuses))
      .catch((err) => console.error('Error loading allowed statuses:', err));

    // Get order ID from query parameter
    const orderId = this.route.snapshot.queryParamMap.get('orderId');

    if (orderId) {
      await this.loadOrderDetails(orderId);
    } else {
      // Fallback: try to get from navigation state (backward compatibility)
      const navigation = history.state;
      if (navigation && navigation.orderId) {
        await this.loadOrderDetails(navigation.orderId);
      } else {
        this.error = 'Order ID not found';
        this.isLoading = false;
      }
    }
  }

  async loadOrderDetails(orderId: string) {
    try {
      this.isLoading = true;
      const order = await this.orderService.getOrderById(orderId);

      if (order) {
        this.orderDetails = order;
        this.orderCreatedAt = order.createdAt;

        // Calculate pricing using centralized service
        await this.calculateOrderPricing();
      } else {
        this.error = 'Order not found';
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      this.error = 'Failed to load order details';
    } finally {
      this.isLoading = false;
    }
  }

  getItemName(item: any): string {
    return OrderUtils.getOrderItemName(item);
  }

  /**
   * Calculate order pricing using centralized PricingService
   * This ensures consistent charge display based on order type rules
   */
  private async calculateOrderPricing() {
    if (!this.orderDetails) return;

    try {
      const config = await this.pricingService.getPricingConfig();

      // Extract coupon info if available
      const appliedCoupon = this.hasCoupon()
        ? {
            coupon: {
              code: this.getCouponCode(),
              discountType: 'fixed' as const,
            },
            discountAmount: this.getCouponDiscount(),
          }
        : null;

      this.pricingBreakdown = await this.pricingService.calculatePricing({
        cartItems: this.orderDetails.items,
        subtotal: this.getItemTotal(),
        orderType: this.orderDetails.orderType,
        appliedCoupon: appliedCoupon,
        pricingConfig: config,
      });

      console.log('Order pricing calculated:', this.pricingBreakdown);
    } catch (error) {
      console.error('Error calculating order pricing:', error);
    }
  }

  // Cancel order functionality - SYNCHRONOUS for template binding
  canCancelOrder(): boolean {
    if (!this.orderDetails) return false;

    // Check if cancellation is enabled globally
    if (!this.cancellationEnabled) {
      return false;
    }

    // Check if order status allows cancellation
    const currentStatus = this.orderDetails.status?.toLowerCase() || '';
    if (!this.allowedCancellationStatuses.includes(currentStatus)) {
      return false;
    }

    // Check time limit
    const now = new Date();
    const timeDiff = now.getTime() - this.orderCreatedAt.getTime();
    const secondsDiff = Math.floor(timeDiff / 1000);

    return secondsDiff <= this.cancellationTimeLimit;
  }

  getRemainingCancellationTime(): Observable<number> {
    return interval(1000).pipe(
      startWith(0),
      map(() => {
        if (!this.orderDetails) return 0;

        const now = new Date();
        const timeDiff = now.getTime() - this.orderCreatedAt.getTime();
        const secondsDiff = Math.floor(timeDiff / 1000);
        const remaining = Math.max(0, this.cancellationTimeLimit - secondsDiff);

        return remaining;
      }),
    );
  }

  cancelOrder() {
    this.showCancelDialog = true;
  }

  onCancelDialogClose() {
    this.showCancelDialog = false;
    this.isProcessingCancel = false;
  }

  async onConfirmCancel() {
    if (!this.orderDetails) return;

    this.isProcessingCancel = true;

    try {
      const result = await this.orderService.cancelOrder(
        this.orderDetails.orderId,
      );

      if (result.success) {
        // Show success message
        alert(result.message);

        // Navigate to order history
        this.router.navigate(['/orders']);
      } else {
        // Show error message
        alert(result.message);
        this.isProcessingCancel = false;
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Failed to cancel order. Please try again.');
      this.isProcessingCancel = false;
    }
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  viewOrders() {
    this.router.navigate(['/orders']);
  }

  needHelp() {
    this.router.navigate(['/contact']);
  }

  // Get dynamic status display based on current order status
  getStatusTitle(): string {
    if (!this.orderDetails) return 'Order Status';

    const status = this.orderDetails.status;
    const orderType = this.orderDetails.orderType;

    switch (status) {
      case 'pending':
        return '✅ Order Placed!';
      case 'confirmed':
        return '✅ Order Confirmed!';
      case 'preparing':
        return '👨‍🍳 Preparing Your Order';
      case 'ready':
        if (orderType === 'dine-in') return '✅ Order Ready!';
        return '🎉 Order Ready for Pickup!';
      case 'shipped':
        return '🚚 Order On the Way!';
      case 'delivered':
        return '✅ Order Delivered!';
      case 'completed':
        if (orderType === 'dine-in') return '✅ Enjoy Your Meal!';
        return '✅ Order Completed!';
      case 'cancelled':
        return '❌ Order Cancelled';
      default:
        return '📦 Order Status';
    }
  }

  // Get dynamic subtitle based on status
  getStatusSubtitle(): string {
    if (!this.orderDetails) return '';

    const status = this.orderDetails.status;
    const orderType = this.orderDetails.orderType;

    switch (status) {
      case 'pending':
        return 'Your order has been placed successfully';
      case 'confirmed':
        return 'Your order has been confirmed and will be prepared soon';
      case 'preparing':
        return 'Your order is being prepared with care';
      case 'ready':
        if (orderType === 'dine-in') return 'Your order is ready to be served';
        return 'Your order is ready. Please come and collect it';
      case 'shipped':
        return 'Your order is on the way to your location';
      case 'delivered':
        return 'Your order has been successfully delivered';
      case 'completed':
        if (orderType === 'dine-in') return 'Thank you for dining with us!';
        return 'Thank you for your order!';
      case 'cancelled':
        return 'This order has been cancelled';
      default:
        return 'Track your order status below';
    }
  }

  // Get icon for current status
  getStatusIcon(): string {
    if (!this.orderDetails) return 'check_circle';

    const status = this.orderDetails.status;

    switch (status) {
      case 'pending':
      case 'confirmed':
        return 'check_circle';
      case 'preparing':
        return 'restaurant';
      case 'ready':
        return 'done_all';
      case 'shipped':
        return 'local_shipping';
      case 'delivered':
      case 'completed':
        return 'task_alt';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  }

  // Get CSS class for status styling
  getStatusClass(): string {
    if (!this.orderDetails) return 'status-success';

    const status = this.orderDetails.status;

    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'preparing':
      case 'ready':
      case 'shipped':
      case 'delivered':
      case 'completed':
        return 'status-success';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-default';
    }
  }

  // Get icon background color
  getStatusIconColor(): string {
    if (!this.orderDetails) return '#4CAF50';

    const status = this.orderDetails.status;

    switch (status) {
      case 'pending':
      case 'confirmed':
        return '#4CAF50'; // Green
      case 'preparing':
        return '#FF9800'; // Orange
      case 'ready':
        return '#2196F3'; // Blue
      case 'shipped':
        return '#9C27B0'; // Purple
      case 'delivered':
      case 'completed':
        return '#4CAF50'; // Green
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#607D8B'; // Grey
    }
  }

  // Get timeline steps for current order type
  getTimelineSteps() {
    if (!this.orderDetails) return [];
    return OrderUtils.getOrderTimelineSteps(this.orderDetails.orderType);
  }

  // Check if a step is completed
  isStepCompleted(stepStatus: string): boolean {
    if (!this.orderDetails) return false;
    return OrderUtils.isTimelineStepCompleted(this.orderDetails, stepStatus);
  }

  // Check if a step is current
  isStepCurrent(stepStatus: string): boolean {
    if (!this.orderDetails) return false;
    return OrderUtils.isTimelineStepCurrent(this.orderDetails, stepStatus);
  }

  // Calculate estimated time remaining in minutes based on order placed time
  getEstimatedTimeMinutes(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getEstimatedTimeMinutes(this.orderDetails);
  }

  // Get ETA display message
  getEstimatedTimeDisplay(): string {
    if (!this.orderDetails) return '';
    return OrderUtils.getEstimatedTimeDisplay(this.orderDetails);
  }

  // Call waiter handler for dine-in orders
  callWaiter() {
    // TODO: Implement actual waiter call functionality (push notification, etc.)
    console.log(
      'Call waiter requested for table:',
      this.orderDetails?.tableNumber,
    );
    alert('Your server has been notified and will attend to you shortly.');
  }

  // Get timestamp for a specific status from the timeline
  getStatusTimestamp(status: string): Date | null {
    if (!this.orderDetails) return null;
    return OrderUtils.getStatusTimestamp(this.orderDetails, status);
  }

  // Format timestamp for display
  formatTimestamp(timestamp: Date | null): string {
    return OrderUtils.formatTimestamp(timestamp);
  }

  // Get item total before any charges
  getItemTotal(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getItemTotal(this.orderDetails);
  }

  // Get GST amount (5% of subtotal)
  // Get GST amount (from PricingService if available, fallback to OrderUtils)
  getGSTAmount(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.gst.applied;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getGSTAmount(this.orderDetails);
  }

  // Get calculated GST (before waiver)
  getCalculatedGST(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.gst.calculated;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getCalculatedGST(this.orderDetails);
  }

  // Get waived GST amount
  getWaivedGST(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.gst.waived;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getWaivedGST(this.orderDetails);
  }

  // Get packaging charges (from PricingService if available, fallback to OrderUtils)
  getPackagingCharges(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.packaging.applied;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getPackagingCharges(this.orderDetails);
  }

  // Get calculated packaging charges
  getCalculatedPackaging(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.packaging.calculated;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getCalculatedPackaging(this.orderDetails);
  }

  // Get waived packaging charges
  getWaivedPackaging(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.packaging.waived;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getWaivedPackaging(this.orderDetails);
  }

  // Get platform fee (from PricingService if available, fallback to OrderUtils)
  getPlatformFee(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.platformFee.applied;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getPlatformFee(this.orderDetails);
  }

  // Get calculated platform fee
  getCalculatedPlatformFee(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.platformFee.calculated;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getCalculatedPlatformFee(this.orderDetails);
  }

  // Get waived platform fee
  getWaivedPlatformFee(): number {
    if (this.pricingBreakdown) {
      return this.pricingBreakdown.charges.platformFee.waived;
    }
    if (!this.orderDetails) return 0;
    return OrderUtils.getWaivedPlatformFee(this.orderDetails);
  }

  // Get delivery charge
  getDeliveryCharge(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getDeliveryCharge(this.orderDetails);
  }

  // Get calculated delivery charge
  getCalculatedDeliveryCharge(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getCalculatedDeliveryCharge(this.orderDetails);
  }

  // Get waived delivery charge
  getWaivedDeliveryCharge(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getWaivedDeliveryCharge(this.orderDetails);
  }

  // Get coupon code
  getCouponCode(): string {
    if (!this.orderDetails) return '';
    return OrderUtils.getCouponCode(this.orderDetails);
  }

  // Get coupon discount amount
  getCouponDiscount(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getCouponDiscount(this.orderDetails);
  }

  // Check if coupon was applied
  hasCoupon(): boolean {
    if (!this.orderDetails) return false;
    return OrderUtils.hasCoupon(this.orderDetails);
  }

  // Calculate total savings
  getTotalSavings(): number {
    if (!this.orderDetails) return 0;
    return OrderUtils.getTotalSavings(this.orderDetails);
  }

  // Check if order has notes
  hasNotes(): boolean {
    return !!(
      this.orderDetails?.customerNotes && this.orderDetails.customerNotes.trim()
    );
  }
}
