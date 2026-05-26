import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PricingBreakdown } from '@zitro/models';

/**
 * PricingSummaryComponent - Reusable component for displaying order pricing breakdown
 *
 * Can be used in:
 * - Cart page
 * - Checkout page
 * - Order confirmation page
 * - Order details page
 */
@Component({
  selector: 'app-pricing-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-summary.component.html',
  styleUrls: ['./pricing-summary.component.scss'],
})
export class PricingSummaryComponent implements OnInit, OnChanges {
  /**
   * Pricing breakdown data
   */
  @Input() pricing: PricingBreakdown | null = null;

  /**
   * Display variant
   * - cart: Full display with all details
   * - checkout: Compact display for checkout
   * - confirmation: Read-only display for order confirmation
   */
  @Input() variant: 'cart' | 'checkout' | 'confirmation' = 'cart';

  /**
   * Show or hide coupon input section
   */
  @Input() showCouponSection = true;

  /**
   * Show or hide the header
   */
  @Input() showHeader = true;

  /**
   * Custom header title
   */
  @Input() headerTitle = 'Bill Details';

  /**
   * Show expanded view by default
   */
  @Input() expandedByDefault = true;

  /**
   * Event emitted when user wants to apply/change coupon
   */
  @Output() couponAction = new EventEmitter<void>();

  /**
   * Event emitted when user removes coupon
   */
  @Output() removeCoupon = new EventEmitter<void>();

  isExpanded = true;

  ngOnInit(): void {
    this.isExpanded = this.expandedByDefault;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pricing'] && this.pricing) {
      console.log('PricingSummary: Pricing data updated', this.pricing);
    }
  }

  /**
   * Toggle expanded/collapsed state
   */
  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  /**
   * Handle coupon button click
   */
  onCouponClick(): void {
    this.couponAction.emit();
  }

  /**
   * Handle remove coupon click
   */
  onRemoveCouponClick(): void {
    this.removeCoupon.emit();
  }

  /**
   * Check if component has pricing data
   */
  get hasPricing(): boolean {
    return this.pricing !== null;
  }

  /**
   * Check if any savings exist
   */
  get hasSavings(): boolean {
    return this.pricing ? this.pricing.savings.totalSavings > 0 : false;
  }

  /**
   * Check if coupon is applied
   */
  get hasCoupon(): boolean {
    return this.pricing ? !!this.pricing.discounts.couponCode : false;
  }

  /**
   * Get strikethrough class for waived charges
   */
  getStrikethroughClass(waived: number): string {
    return waived > 0 ? 'strikethrough' : '';
  }
}
