import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OrderService } from '@zitro/services';
import { OrderDisplay } from '@zitro/models';
import * as OrderUtils from '@zitro/utils';
import { CancelOrderDialogComponent } from '@zitro/ui';
import { CallRestaurantButtonComponent } from '@zitro/ui';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    CommonModule,
    CancelOrderDialogComponent,
    CallRestaurantButtonComponent,
  ],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.scss'],
})
export class OrderHistoryComponent implements OnInit {
  private router = inject(Router);
  private orderService = inject(OrderService);

  orders: OrderDisplay[] = [];
  isCancelling: { [orderId: string]: boolean } = {};

  // Cancel dialog state
  showCancelDialog = false;
  selectedOrderId = '';
  isProcessingCancel = false;
  selectedOrderRemainingTime = 0;

  // Pagination
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;

  async ngOnInit() {
    await this.loadOrders();
  }

  goBack() {
    this.router.navigate(['/account']);
  }

  exploreMenu() {
    this.router.navigate(['/home']);
  }

  getStatusClass(status: string): string {
    return OrderUtils.getOrderStatusClass(status as any);
  }

  trackOrder(orderId: string) {
    this.router.navigate(['/order-confirmation'], { queryParams: { orderId } });
  }

  reorderOrder(order: OrderDisplay) {
    // TODO: Implement reorder functionality
    console.log('Reorder:', order.orderId);
  }

  // Get timeline steps based on order type
  getTimelineSteps(orderType: string) {
    return OrderUtils.getOrderTimelineSteps(orderType);
  }

  // Check if a timeline step is completed
  isTimelineStepCompleted(order: OrderDisplay, stepStatus: string): boolean {
    return OrderUtils.isTimelineStepCompleted(order, stepStatus);
  }

  // Calculate estimated time for the order based on order placed time
  getEstimatedTimeMinutes(order: OrderDisplay): number {
    return OrderUtils.getEstimatedTimeMinutes(order);
  }

  // Get restaurant name (placeholder - replace with actual data)
  getRestaurantName(): string {
    return 'The Hunger Point'; // TODO: Get from order or business config
  }

  // Cancel order functionality
  async canCancelOrder(order: OrderDisplay): Promise<boolean> {
    return await this.orderService.canCancelOrder(order);
  }

  async getRemainingTime(order: OrderDisplay): Promise<number> {
    return await this.orderService.getRemainingCancellationTime(order);
  }

  async cancelOrder(orderId: string) {
    this.selectedOrderId = orderId;
    const order = this.orders.find((o) => o.orderId === orderId);
    if (order) {
      // Preload remaining time for the dialog
      this.selectedOrderRemainingTime = await this.getRemainingTime(order);
    }
    this.showCancelDialog = true;
  }

  onCancelDialogClose() {
    this.showCancelDialog = false;
    this.selectedOrderId = '';
    this.selectedOrderRemainingTime = 0;
    this.isProcessingCancel = false;
  }

  async onConfirmCancel() {
    if (!this.selectedOrderId) return;

    this.isProcessingCancel = true;

    try {
      const result = await this.orderService.cancelOrder(this.selectedOrderId);

      if (result.success) {
        // Show success message
        alert(result.message);

        // Refresh orders to show updated status
        await this.loadOrders();

        // Close dialog
        this.onCancelDialogClose();
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

  private async loadOrders() {
    try {
      this.orders = await this.orderService.getUserOrders();
      this.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      this.updatePagination();
    } catch (error) {
      console.error('Error loading order history:', error);
      this.orders = [];
      this.updatePagination();
    }
  }

  getSelectedOrder(): OrderDisplay | null {
    return (
      this.orders.find((order) => order.orderId === this.selectedOrderId) ||
      null
    );
  }

  // Pagination methods
  get paginatedOrders(): OrderDisplay[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.orders.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.orders.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }
}
