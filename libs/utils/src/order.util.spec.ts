import { describe, it, expect } from 'vitest';
import { getOrderStatusDisplay, getOrderStatusClass, ORDER_STATUS_DISPLAY } from './order.util';
import { Order } from '@zitro/models';

describe('order.util', () => {

  describe('ORDER_STATUS_DISPLAY', () => {
    it('should have correct mapping for all statuses', () => {
      expect(ORDER_STATUS_DISPLAY).toEqual({
        pending: 'Order Placed',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Ready for Pickup',
        shipped: 'On the Way',
        delivered: 'Delivered',
        completed: 'Completed',
        cancelled: 'Cancelled'
      });
    });
  });

  describe('getOrderStatusDisplay', () => {
    it.each([
      ['pending', 'Order Placed'],
      ['confirmed', 'Confirmed'],
      ['preparing', 'Preparing'],
      ['shipped', 'On the Way'],
      ['delivered', 'Delivered'],
      ['cancelled', 'Cancelled']
    ])('should return "%s" for status "%s"', (status, expected) => {
      expect(getOrderStatusDisplay(status as Order['status'])).toBe(expected);
    });

    it('should return "Unknown" for invalid status', () => {
      expect(getOrderStatusDisplay('invalid' as any)).toBe('Unknown');
    });
  });

  describe('getOrderStatusClass', () => {
    it.each([
      ['pending', 'status-pending'],
      ['confirmed', 'status-confirmed'],
      ['preparing', 'status-preparing'],
      ['shipped', 'status-shipping'],
      ['delivered', 'status-delivered'],
      ['cancelled', 'status-cancelled']
    ])('should return "%s" class for status "%s"', (status, expected) => {
      expect(getOrderStatusClass(status as Order['status'])).toBe(expected);
    });

    it('should return "status-unknown" for invalid status', () => {
      expect(getOrderStatusClass('invalid' as any)).toBe('status-unknown');
    });
  });
});
