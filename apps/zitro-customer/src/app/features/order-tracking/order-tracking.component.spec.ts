import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OrderTrackingComponent } from './order-tracking.component';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { NavigationService } from '../../core/services/navigation.service';
import { OrderDisplay } from '../../core/models/order.model';
import { of } from 'rxjs';

describe('OrderTrackingComponent', () => {
  let component: OrderTrackingComponent;
  let mockRoute: any;
  let mockRouter: any;
  let mockOrderService: any;
  let mockNavigationService: any;

  const mockOrder: OrderDisplay = {
    status: 'confirmed',
    createdAt: new Date(),
  } as OrderDisplay;

  beforeEach(() => {
    mockRoute = {
      paramMap: of(new Map()),
      queryParams: of({}),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    mockOrderService = {
      getOrderById: vi.fn(),
    };

    mockNavigationService = {
      goBack: vi.fn(),
      navigateToHome: vi.fn(),
    };

    component = new OrderTrackingComponent(
      mockRoute,
      mockRouter,
      mockOrderService,
      mockNavigationService
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it.each([
      { field: 'orderDetails', value: null },
      { field: 'loading', value: false },
      { field: 'error', value: '' },
      { field: 'autoRefreshEnabled', value: true },
    ])('should initialize $field to $value', ({ field, value }) => {
      expect((component as any)[field]).toEqual(value);
    });
  });

  // Manual order search tests removed - order details should be passed via navigation

  describe('Refresh Order', () => {
    // TODO: Update tests for new refresh logic without orderId dependency
  });

  describe('Auto Refresh', () => {
    it('should start auto refresh on init', () => {
      const startSpy = vi.spyOn(component, 'startAutoRefresh');
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);

      component.ngOnInit();

      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop auto refresh on destroy', () => {
      const stopSpy = vi.spyOn(component, 'stopAutoRefresh');

      component.ngOnDestroy();

      expect(stopSpy).toHaveBeenCalled();
    });

    it.each([
      { status: 'delivered', shouldRefresh: false },
      { status: 'cancelled', shouldRefresh: false },
      { status: 'confirmed', shouldRefresh: true },
      { status: 'preparing', shouldRefresh: true },
    ])('should handle auto-refresh for status $status', ({ status, shouldRefresh }) => {
      component.orderDetails = { ...mockOrder, status } as OrderDisplay;
      component.autoRefreshEnabled = true;

      component.startAutoRefresh();

      if (!shouldRefresh) {
        expect(component['refreshSubscription']).toBeUndefined();
      }
    });
  });

  describe('Toggle Auto Refresh', () => {
    it('should toggle auto refresh state', () => {
      component.autoRefreshEnabled = true;

      component.toggleAutoRefresh();

      expect(component.autoRefreshEnabled).toBe(false);
    });

    it('should start refresh when enabled', () => {
      component.autoRefreshEnabled = false;
      const startSpy = vi.spyOn(component, 'startAutoRefresh');

      component.toggleAutoRefresh();

      expect(component.autoRefreshEnabled).toBe(true);
      expect(startSpy).toHaveBeenCalled();
    });

    it('should stop refresh when disabled', () => {
      component.autoRefreshEnabled = true;
      const stopSpy = vi.spyOn(component, 'stopAutoRefresh');

      component.toggleAutoRefresh();

      expect(component.autoRefreshEnabled).toBe(false);
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back using navigation service', () => {
      component.goBack();

      expect(mockNavigationService.goBack).toHaveBeenCalled();
    });

    it('should navigate to home', () => {
      component.goHome();

      expect(mockNavigationService.navigateToHome).toHaveBeenCalled();
    });
  });

  describe('Order Status Display', () => {
    it('should get correct status class', () => {
      const result = component.getStatusClass('confirmed');

      expect(result).toContain('status-confirmed');
    });
  });
});
