import { Order, OrderDisplay } from '@zitro/models';
import {
  UI_TEXT,
  ORDER_BASE_TIME_MINUTES,
  ORDER_STATUS_TIME_ADJUSTMENTS,
  ORDER_TIMELINE_STEPS,
  ORDER_STATUS_DISPLAY
} from './app.constants';

/**
 * Timeline step interface
 */
export interface TimelineStep {
  status: string;
  label: string;
  icon: string;
}

// Re-export constants for convenience (they are now centralized in app.constants.ts)
export { ORDER_BASE_TIME_MINUTES, ORDER_STATUS_TIME_ADJUSTMENTS, ORDER_TIMELINE_STEPS, ORDER_STATUS_DISPLAY };

/**
 * Order status display mappings
 * Centralized utility for consistent status display across the application
 */

/**
 * Get display text for order status
 * @param status - The order status
 * @returns The display text for the status
 */
export function getOrderStatusDisplay(status: Order['status']): string {
  return ORDER_STATUS_DISPLAY[status] || UI_TEXT.UNKNOWN;
}

/**
 * Get CSS class for order status styling
 * @param status - The order status
 * @returns The CSS class name for the status
 */
export function getOrderStatusClass(status: Order['status']): string {
  switch (status) {
    case 'pending': return 'status-pending';
    case 'confirmed': return 'status-confirmed';
    case 'preparing': return 'status-preparing';
    case 'ready': return 'status-ready';
    case 'shipped': return 'status-shipping';
    case 'delivered': return 'status-delivered';
    case 'completed': return 'status-completed';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-unknown';
  }
}

/**
 * Get timeline steps for a specific order type
 * @param orderType - The order type (dine-in, takeout, delivery)
 * @returns Array of timeline steps
 */
export function getOrderTimelineSteps(orderType: string): TimelineStep[] {
  const steps = ORDER_TIMELINE_STEPS[orderType as keyof typeof ORDER_TIMELINE_STEPS];
  return steps ? [...steps] : [...ORDER_TIMELINE_STEPS['delivery']];
}

/**
 * Check if a timeline step is completed
 * @param order - The order object
 * @param stepStatus - The status to check
 * @returns True if the step is completed
 */
export function isTimelineStepCompleted(order: OrderDisplay, stepStatus: string): boolean {
  const steps = getOrderTimelineSteps(order.orderType);
  const currentIndex = steps.findIndex(s => s.status === order.status);
  const stepIndex = steps.findIndex(s => s.status === stepStatus);
  return stepIndex <= currentIndex;
}

/**
 * Check if a timeline step is current
 * @param order - The order object
 * @param stepStatus - The status to check
 * @returns True if the step is current
 */
export function isTimelineStepCurrent(order: OrderDisplay, stepStatus: string): boolean {
  return order.status === stepStatus;
}

/**
 * Calculate estimated time remaining in minutes based on order placed time
 * @param order - The order object
 * @returns Estimated time remaining in minutes
 */
export function getEstimatedTimeMinutes(order: OrderDisplay): number {
  // If order is completed or delivered, no time remaining
  if (order.status === 'delivered' || order.status === 'completed') {
    return 0;
  }

  // Get base time for order type
  const baseTime = ORDER_BASE_TIME_MINUTES[order.orderType as keyof typeof ORDER_BASE_TIME_MINUTES] || 30;

  // Calculate time elapsed since order was placed (in minutes)
  const now = new Date();
  const orderPlacedTime = new Date(order.createdAt);
  const elapsedMinutes = Math.floor((now.getTime() - orderPlacedTime.getTime()) / (1000 * 60));

  // Calculate remaining time
  const remainingTime = Math.max(0, baseTime - elapsedMinutes);

  return remainingTime;
}

/**
 * Get ETA display message
 * @param order - The order object
 * @returns Formatted ETA display string
 */
export function getEstimatedTimeDisplay(order: OrderDisplay): string {
  const minutes = getEstimatedTimeMinutes(order);

  if (minutes === 0) {
    return order.orderType === 'dine-in' ? 'Served' : 'Completed';
  }

  if (minutes < 5) {
    return 'Almost ready!';
  }

  return `~${minutes} mins`;
}

/**
 * Format timestamp for display (relative or absolute)
 * @param timestamp - The timestamp to format
 * @returns Formatted timestamp string
 */
export function formatTimestamp(timestamp: Date | null): string {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  // If less than 1 hour ago, show relative time
  if (diffInMinutes < 60) {
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 min ago';
    return `${diffInMinutes} mins ago`;
  }

  // Otherwise show time in HH:mm format
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? '0' + minutes : minutes;

  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Get timestamp for a specific status from the timeline
 * @param order - The order object
 * @param status - The status to get timestamp for
 * @returns The timestamp or null
 */
export function getStatusTimestamp(order: OrderDisplay, status: string): Date | null {
  if (!order.statusTimeline) return null;

  const timelineEntry = order.statusTimeline.find(timeline => timeline.status === status);
  return timelineEntry ? timelineEntry.timestamp : null;
}

/**
 * Get item name with variation
 * @param item - The order item
 * @returns Formatted item name
 */
export function getOrderItemName(item: any): string {
  if (item.selectedVariationLabel) {
    return `${item.name} - (${item.selectedVariationLabel})`;
  }
  return item.name;
}

/**
 * Calculate item total before any charges
 * @param order - The order object
 * @returns Item total
 */
export function getItemTotal(order: OrderDisplay): number {
  return order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

/**
 * Get packaging charges (applied amount)
 * @param order - The order object
 * @returns Packaging charges
 */
export function getPackagingCharges(order: OrderDisplay): number {
  if (order.charges?.packagingCharges) {
    return order.charges.packagingCharges.applied;
  }
  return order.totalPackagingCharges || 0;
}

/**
 * Get calculated packaging charges (before waiver)
 * @param order - The order object
 * @returns Calculated packaging charges
 */
export function getCalculatedPackaging(order: OrderDisplay): number {
  if (order.charges?.packagingCharges) {
    return order.charges.packagingCharges.calculated;
  }
  return getPackagingCharges(order);
}

/**
 * Get waived packaging charges
 * @param order - The order object
 * @returns Waived packaging amount
 */
export function getWaivedPackaging(order: OrderDisplay): number {
  if (!order.charges?.packagingCharges) return 0;
  return order.charges.packagingCharges.waived;
}

/**
 * Get platform fee (applied amount)
 * @param order - The order object
 * @returns Platform fee
 */
export function getPlatformFee(order: OrderDisplay): number {
  if (order.charges?.platformFee) {
    return order.charges.platformFee.applied;
  }
  return order.deliveryFee || 0;
}

/**
 * Get calculated platform fee (before waiver)
 * @param order - The order object
 * @returns Calculated platform fee
 */
export function getCalculatedPlatformFee(order: OrderDisplay): number {
  if (order.charges?.platformFee) {
    return order.charges.platformFee.calculated;
  }
  return getPlatformFee(order);
}

/**
 * Get waived platform fee
 * @param order - The order object
 * @returns Waived platform fee
 */
export function getWaivedPlatformFee(order: OrderDisplay): number {
  if (!order.charges?.platformFee) return 0;
  return order.charges.platformFee.waived;
}

/**
 * Get GST amount (applied)
 * @param order - The order object
 * @returns GST amount
 */
export function getGSTAmount(order: OrderDisplay): number {
  if (order.charges?.gst) {
    return order.charges.gst.applied;
  }
  return order.tax || (order.subtotal * 0.05);
}

/**
 * Get calculated GST (before waiver)
 * @param order - The order object
 * @returns Calculated GST
 */
export function getCalculatedGST(order: OrderDisplay): number {
  if (order.charges?.gst) {
    return order.charges.gst.calculated;
  }
  return getGSTAmount(order);
}

/**
 * Get waived GST amount
 * @param order - The order object
 * @returns Waived GST
 */
export function getWaivedGST(order: OrderDisplay): number {
  if (!order.charges?.gst) return 0;
  return order.charges.gst.waived;
}

/**
 * Get delivery charge (applied amount)
 * @param order - The order object
 * @returns Delivery charge
 */
export function getDeliveryCharge(order: OrderDisplay): number {
  if (order.charges?.deliveryCharge) {
    return order.charges.deliveryCharge.applied;
  }
  return order.deliveryCharge || 0;
}

/**
 * Get calculated delivery charge (before waiver)
 * @param order - The order object
 * @returns Calculated delivery charge
 */
export function getCalculatedDeliveryCharge(order: OrderDisplay): number {
  if (order.charges?.deliveryCharge) {
    return order.charges.deliveryCharge.calculated;
  }
  return getDeliveryCharge(order);
}

/**
 * Get waived delivery charge
 * @param order - The order object
 * @returns Waived delivery charge
 */
export function getWaivedDeliveryCharge(order: OrderDisplay): number {
  if (!order.charges?.deliveryCharge) return 0;
  return order.charges.deliveryCharge.waived;
}

/**
 * Get coupon code
 * @param order - The order object
 * @returns Coupon code or empty string
 */
export function getCouponCode(order: OrderDisplay): string {
  if (order.charges?.couponDiscount?.code) {
    return order.charges.couponDiscount.code;
  }
  return order.couponCode || '';
}

/**
 * Get coupon discount amount
 * @param order - The order object
 * @returns Coupon discount amount
 */
export function getCouponDiscount(order: OrderDisplay): number {
  if (order.charges?.couponDiscount?.amount) {
    return order.charges.couponDiscount.amount;
  }
  return order.couponDiscount || 0;
}

/**
 * Check if order has coupon applied
 * @param order - The order object
 * @returns True if coupon applied
 */
export function hasCoupon(order: OrderDisplay): boolean {
  return getCouponDiscount(order) > 0 && getCouponCode(order).length > 0;
}

/**
 * Calculate total savings from all waivers
 * @param order - The order object
 * @returns Total savings amount
 */
export function getTotalSavings(order: OrderDisplay): number {
  let totalSavings = 0;

  totalSavings += getWaivedPackaging(order);
  totalSavings += getWaivedPlatformFee(order);
  totalSavings += getWaivedGST(order);

  if (order.orderType === 'delivery') {
    totalSavings += getWaivedDeliveryCharge(order);
  }

  return totalSavings;
}

