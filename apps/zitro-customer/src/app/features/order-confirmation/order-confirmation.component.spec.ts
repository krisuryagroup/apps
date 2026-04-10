import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderConfirmationComponent } from './order-confirmation.component';
import { Router, ActivatedRoute } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrderDisplay } from '../../core/models/order.model';

describe('OrderConfirmationComponent', () => {
  let component: OrderConfirmationComponent;
  let mockRouter: any;
  let mockRoute: any;
  let mockOrderService: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockRoute = {
      snapshot: { params: {} },
    };

    mockOrderService = {
      cancelOrder: vi.fn(),
    };

    component = new OrderConfirmationComponent(mockRouter, mockRoute, mockOrderService);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it('should initialize with default order details', () => {
      expect(component.orderDetails.orderId).toBe('');
      expect(component.orderDetails.items).toEqual([]);
      expect(component.orderDetails.total).toBe(0);
    });

    it('should initialize cancel dialog state', () => {
      expect(component.showCancelDialog).toBe(false);
      expect(component.isProcessingCancel).toBe(false);
    });
  });

  describe('Load from Navigation State', () => {
    it('should load order details from navigation state', () => {
      const navigationState = {
        orderId: 'ORD-123',
        items: [{ name: 'Pizza', price: 199 }],
        subtotal: 199,
        deliveryCharge: 40,
        couponDiscount: 20,
        couponCode: 'SAVE20',
        total: 219,
        paymentMethod: 'online',
        date: '2024-01-07',
        time: '10:30 AM',
      };

      vi.spyOn(history, 'state', 'get').mockReturnValue(navigationState);

      component.ngOnInit();

      expect(component.orderDetails.orderId).toBe('ORD-123');
      expect(component.orderDetails.subtotal).toBe(199);
      expect(component.orderDetails.total).toBe(219);
      expect(component.orderDetails.couponCode).toBe('SAVE20');
    });

    it('should generate order ID if no navigation state', () => {
      vi.spyOn(history, 'state', 'get').mockReturnValue({});

      component.ngOnInit();

      expect(component.orderDetails.orderId).toMatch(/^ORD-\d+-\d+$/);
    });

    it('should generate current date if no navigation state', () => {
      vi.spyOn(history, 'state', 'get').mockReturnValue({});

      component.ngOnInit();

      expect(component.orderDetails.date).toBeTruthy();
      expect(component.orderDetails.time).toBeTruthy();
    });
  });

  describe('Cancel Order Functionality', () => {
    it('should allow cancellation within 5 minutes', () => {
      component.orderDetails.orderId = 'ORD-123';
      component.orderCreatedAt = new Date();

      const canCancel = component.canCancelOrder();

      expect(canCancel).toBe(true);
    });

    it('should not allow cancellation after 5 minutes', () => {
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 6);
      component.orderCreatedAt = pastDate;

      const canCancel = component.canCancelOrder();

      expect(canCancel).toBe(false);
    });

    it('should not allow cancellation without order ID', () => {
      component.orderDetails.orderId = '';

      const canCancel = component.canCancelOrder();

      expect(canCancel).toBe(false);
    });

    it.each([
      { minutesElapsed: 0, expectedRemaining: 5 },
      { minutesElapsed: 2, expectedRemaining: 3 },
      { minutesElapsed: 4, expectedRemaining: 1 },
      { minutesElapsed: 5, expectedRemaining: 0 },
      { minutesElapsed: 10, expectedRemaining: 0 },
    ])('should calculate remaining time: $minutesElapsed min elapsed = $expectedRemaining min remaining',
      ({ minutesElapsed, expectedRemaining }) => {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - minutesElapsed);
        component.orderCreatedAt = pastDate;

        const remaining = component.getRemainingCancellationTime();

        expect(remaining).toBe(expectedRemaining);
      }
    );

    it('should open cancel dialog', () => {
      component.cancelOrder();

      expect(component.showCancelDialog).toBe(true);
    });

    it('should close cancel dialog', () => {
      component.showCancelDialog = true;
      component.isProcessingCancel = true;

      component.onCancelDialogClose();

      expect(component.showCancelDialog).toBe(false);
      expect(component.isProcessingCancel).toBe(false);
    });

    it('should confirm cancellation successfully', async () => {
      component.orderDetails.orderId = 'ORD-123';
      mockOrderService.cancelOrder.mockResolvedValue({ success: true, message: 'Cancelled' });

      await component.onConfirmCancel();

      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('ORD-123');
      expect(window.alert).toHaveBeenCalledWith('Cancelled');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders']);
    });

    it('should handle cancellation failure', async () => {
      component.orderDetails.orderId = 'ORD-123';
      mockOrderService.cancelOrder.mockResolvedValue({ success: false, message: 'Too late' });

      await component.onConfirmCancel();

      expect(window.alert).toHaveBeenCalledWith('Too late');
      expect(component.isProcessingCancel).toBe(false);
    });

    it('should handle cancellation error', async () => {
      component.orderDetails.orderId = 'ORD-123';
      mockOrderService.cancelOrder.mockRejectedValue(new Error('Network error'));

      await component.onConfirmCancel();

      expect(window.alert).toHaveBeenCalledWith('Failed to cancel order. Please try again.');
      expect(component.isProcessingCancel).toBe(false);
    });
  });

  describe('Navigation', () => {
    it('should navigate to home', () => {
      component.goToHome();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should navigate to order history', () => {
      component.viewOrders();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/orders']);
    });
  });

  describe('Helper Methods', () => {
    it('should format total display', () => {
      vi.spyOn(history, 'state', 'get').mockReturnValue({
        orderId: 'ORD-123',
        total: 299,
        items: [],
      });

      component.ngOnInit();

      expect(component.orderDetails.totalDisplay).toMatch(/₹299\.00/);
    });
  });
});
