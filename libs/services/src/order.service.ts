import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Order, CreateOrderData, OrderDisplay, OrderType } from '@zitro/models';
import { getOrderStatusDisplay } from '@zitro/utils';
import { OrderApiService } from './api/order-api.service';
import { AppSettingsService } from './app-settings.service';
import { AnalyticsService } from './analytics.service';
import { BusinessContextService } from './business-context.service';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private orderApi = inject(OrderApiService);
  private appSettingsService = inject(AppSettingsService);
  private analyticsService = inject(AnalyticsService);
  private businessContext = inject(BusinessContextService);

  /**
   * Create an order by delegating to OrderApiService.
   */
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    const slug = this.businessContext.businessId();

    const cart = {
      items: orderData.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        selectedVariationId: (item as any).selectedVariationId ?? undefined,
      })),
      businessId: slug,
    };

    const options = {
      orderType: orderData.orderType,
      paymentMethod: orderData.paymentMethod,
      deliveryAddressId:
        (orderData.deliveryAddress as any)?.id ??
        (orderData.deliveryAddress as any)?.addressId ??
        null,
      tableNumber: orderData.tableNumber ?? null,
      numberOfGuests: orderData.numberOfGuests ?? null,
      couponCode: orderData.couponCode ?? null,
      customerNotes: orderData.customerNotes ?? null,
    };

    try {
      const result = await firstValueFrom(
        this.orderApi.createOrder(cart as any, options, slug),
      );

      // Fire-and-forget analytics
      this.analyticsService
        .logPurchase({
          orderId: result.orderId,
          value: orderData.total,
          tax: 0,
          shipping: orderData.deliveryCharge,
          coupon: orderData.couponCode,
          paymentMethod: orderData.paymentMethod,
          items: orderData.items.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.qty,
          })),
        })
        .catch(() => {
          console.error('Failed to log purchase analytics');
        });

      // Return a minimal Order shape with orderId for navigation
      return {
        ...orderData,
        id: result.orderId,
        orderId: result.orderId,
        userId: '',
        userPhone: '',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        statusTimeline: [],
      } as unknown as Order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  /**
   * Get all orders for the current user.
   */
  async getUserOrders(): Promise<OrderDisplay[]> {
    try {
      const orders = await firstValueFrom(this.orderApi.getOrderHistory());
      return orders.map((order) => this.toOrderDisplay(order));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get a single order by its display ID.
   */
  async getOrderById(orderId: string): Promise<OrderDisplay | null> {
    try {
      const order = await firstValueFrom(this.orderApi.getOrder(orderId));
      return this.toOrderDisplay(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Check if the order can still be cancelled based on time limit and status.
   */
  async canCancelOrder(order: Order | OrderDisplay): Promise<boolean> {
    try {
      const isEnabled =
        await this.appSettingsService.isOrderCancellationEnabled();
      if (!isEnabled) return false;

      const allowedStatuses =
        await this.appSettingsService.getAllowedCancellationStatuses();
      const currentStatus = order.status?.toLowerCase() || '';
      if (!allowedStatuses.includes(currentStatus)) return false;

      const timeLimit =
        await this.appSettingsService.getOrderCancellationTimeLimit();
      const elapsed = Date.now() - order.createdAt.getTime();
      return elapsed <= timeLimit * 1000;
    } catch {
      return false;
    }
  }

  /**
   * Cancel an order via the API.
   */
  async cancelOrder(
    orderId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const order = await this.getOrderById(orderId);
      if (!order) return { success: false, message: 'Order not found' };

      const canCancel = await this.canCancelOrder(order);
      if (!canCancel) {
        const timeLimit =
          await this.appSettingsService.getOrderCancellationTimeLimit();
        const elapsed = Math.ceil(
          (Date.now() - order.createdAt.getTime()) / 1000,
        );
        if (elapsed > timeLimit) {
          const msg =
            await this.appSettingsService.getOrderCancellationMessage(
              'timeExpiredMessage',
            );
          return { success: false, message: msg };
        }
        return {
          success: false,
          message: 'Order cannot be cancelled at this stage.',
        };
      }

      await firstValueFrom(this.orderApi.cancelOrder(orderId));

      this.analyticsService
        .logOrderCancelled(orderId, order.total, 'user_cancelled')
        .catch(() => {
          console.error('Failed to log order cancellation analytics');
        });

      const successMessage =
        await this.appSettingsService.getOrderCancellationMessage(
          'successMessage',
        );
      return { success: true, message: successMessage };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        message: 'Failed to cancel order. Please try again or contact support.',
      };
    }
  }

  /**
   * Get remaining cancellation time in seconds.
   */
  async getRemainingCancellationTime(
    order: Order | OrderDisplay,
  ): Promise<number> {
    try {
      const timeLimit =
        await this.appSettingsService.getOrderCancellationTimeLimit();
      const elapsed = Date.now() - order.createdAt.getTime();
      const remaining = timeLimit * 1000 - elapsed;
      return Math.max(0, Math.ceil(remaining / 1000));
    } catch {
      return 0;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private toOrderDisplay(order: Order): OrderDisplay {
    const orderTypeLabels: { [key in OrderType]: string } = {
      'dine-in': 'Dine-in',
      takeout: 'Takeout',
      delivery: 'Home Delivery',
    };
    return {
      ...order,
      date: order.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: order.createdAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      statusDisplay: getOrderStatusDisplay(order.status),
      totalDisplay: `₹${order.total.toFixed(2)}`,
      orderTypeDisplay: orderTypeLabels[order.orderType] || 'Unknown',
    };
  }
}
