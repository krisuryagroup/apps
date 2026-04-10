import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderHistoryComponent } from './order-history.component';
import { Router } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrderDisplay } from '../../core/models/order.model';

describe('OrderHistoryComponent', () => {
  let component: OrderHistoryComponent;
  let mockRouter: any;
  let mockOrderService: any;

  const mockOrder: OrderDisplay = {
    orderId: 'ORD-123',
    date: '2024-01-07',
    time: '10:30 AM',
    items: [],
    subtotal: 299,
    deliveryCharge: 40,
    couponDiscount: 0,
    total: 339,
    status: 'pending',
    paymentMethod: 'cash',
    statusDisplay: 'Order Placed',
    totalDisplay: '₹339.00',
    createdAt: new Date('2024-01-07T10:30:00'),
    userId: 'user123',
    userPhone: '+1234567890',
    updatedAt: new Date('2024-01-07T10:30:00'),
  };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockOrderService = {
      getUserOrders: vi.fn(),
      canCancelOrder: vi.fn(),
      getRemainingCancellationTime: vi.fn(),
      cancelOrder: vi.fn(),
    };

    component = new OrderHistoryComponent(mockRouter, mockOrderService);
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

    it('should initialize with empty orders array', () => {
      expect(component.orders).toEqual([]);
    });

    it('should initialize cancel dialog state', () => {
      expect(component.showCancelDialog).toBe(false);
      expect(component.selectedOrderId).toBe('');
      expect(component.isProcessingCancel).toBe(false);
    });
  });

  describe('Load Orders', () => {
    it('should load orders successfully', async () => {
      const mockOrders = [mockOrder, { ...mockOrder, orderId: 'ORD-124' }];
      mockOrderService.getUserOrders.mockResolvedValue(mockOrders);

      await component.ngOnInit();

      expect(mockOrderService.getUserOrders).toHaveBeenCalled();
      expect(component.orders).toEqual(mockOrders);
    });

    it('should sort orders by date descending', async () => {
      const order1 = { ...mockOrder, orderId: 'ORD-1', createdAt: new Date('2024-01-05') };
      const order2 = { ...mockOrder, orderId: 'ORD-2', createdAt: new Date('2024-01-07') };
      const order3 = { ...mockOrder, orderId: 'ORD-3', createdAt: new Date('2024-01-06') };
      
      mockOrderService.getUserOrders.mockResolvedValue([order1, order2, order3]);

      await component.ngOnInit();

      expect(component.orders[0].orderId).toBe('ORD-2');
      expect(component.orders[1].orderId).toBe('ORD-3');
      expect(component.orders[2].orderId).toBe('ORD-1');
    });

    it('should handle load error gracefully', async () => {
      mockOrderService.getUserOrders.mockRejectedValue(new Error('Load failed'));

      await component.ngOnInit();

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back to account', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/account']);
    });

    it('should navigate to home to explore menu', () => {
      component.exploreMenu();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should navigate to track order', () => {
      component.trackOrder('ORD-123');

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/track-order', 'ORD-123']);
    });
  });

  describe('Order Status', () => {
    it.each([
      { status: 'pending', expectedClass: 'status-pending' },
      { status: 'confirmed', expectedClass: 'status-confirmed' },
      { status: 'preparing', expectedClass: 'status-preparing' },
      { status: 'delivered', expectedClass: 'status-delivered' },
      { status: 'cancelled', expectedClass: 'status-cancelled' },
    ])('should return $expectedClass for status $status', ({ status, expectedClass }) => {
      const result = component.getStatusClass(status);

      expect(result).toContain(expectedClass);
    });
  });

  describe('Cancel Order Functionality', () => {
    it('should check if order can be cancelled', () => {
      mockOrderService.canCancelOrder.mockReturnValue(true);

      const result = component.canCancelOrder(mockOrder);

      expect(result).toBe(true);
      expect(mockOrderService.canCancelOrder).toHaveBeenCalledWith(mockOrder);
    });

    it('should get remaining cancellation time', () => {
      mockOrderService.getRemainingCancellationTime.mockReturnValue(3);

      const result = component.getRemainingTime(mockOrder);

      expect(result).toBe(3);
      expect(mockOrderService.getRemainingCancellationTime).toHaveBeenCalledWith(mockOrder);
    });

    it('should open cancel dialog', () => {
      component.cancelOrder('ORD-123');

      expect(component.showCancelDialog).toBe(true);
      expect(component.selectedOrderId).toBe('ORD-123');
    });

    it('should close cancel dialog', () => {
      component.selectedOrderId = 'ORD-123';
      component.showCancelDialog = true;
      component.isProcessingCancel = true;

      component.onCancelDialogClose();

      expect(component.showCancelDialog).toBe(false);
      expect(component.selectedOrderId).toBe('');
      expect(component.isProcessingCancel).toBe(false);
    });

    it('should confirm cancellation successfully', async () => {
      component.selectedOrderId = 'ORD-123';
      mockOrderService.cancelOrder.mockResolvedValue({ success: true, message: 'Order cancelled' });
      mockOrderService.getUserOrders.mockResolvedValue([]);

      await component.onConfirmCancel();

      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('ORD-123');
      expect(window.alert).toHaveBeenCalledWith('Order cancelled');
      expect(component.showCancelDialog).toBe(false);
    });

    it('should handle cancellation failure', async () => {
      component.selectedOrderId = 'ORD-123';
      mockOrderService.cancelOrder.mockResolvedValue({ success: false, message: 'Cannot cancel' });

      await component.onConfirmCancel();

      expect(window.alert).toHaveBeenCalledWith('Cannot cancel');
      expect(component.isProcessingCancel).toBe(false);
    });

    it('should handle cancellation error', async () => {
      component.selectedOrderId = 'ORD-123';
      mockOrderService.cancelOrder.mockRejectedValue(new Error('Network error'));

      await component.onConfirmCancel();

      expect(console.error).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('Failed to cancel order. Please try again.');
      expect(component.isProcessingCancel).toBe(false);
    });

    it('should not confirm cancel without order ID', async () => {
      component.selectedOrderId = '';

      await component.onConfirmCancel();

      expect(mockOrderService.cancelOrder).not.toHaveBeenCalled();
    });
  });
});
