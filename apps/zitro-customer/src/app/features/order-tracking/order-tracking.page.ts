import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { I18nPipe } from '@zitro/i18n';
import { OrderApiService, NavigationService } from '@zitro/services';
import type { Order } from '@zitro/models';
import { getOrderStatusClass, getOrderItemName } from '@zitro/utils';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [I18nPipe, DecimalPipe, DatePipe],
  templateUrl: './order-tracking.page.html',
  styleUrl: './order-tracking.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderApi = inject(OrderApiService);
  private readonly navService = inject(NavigationService);

  readonly order = signal<Order | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal('');

  private orderId = '';

  readonly statusBannerText = computed(() => {
    const status = this.order()?.status;
    const map: Record<string, string> = {
      pending: 'Order received',
      confirmed: 'Order confirmed',
      preparing: 'Food is being prepared',
      ready: 'Order is ready for pickup',
      shipped: 'Order is on the way',
      delivered: 'Order was delivered',
      completed: 'Order completed',
      cancelled: 'Order was cancelled',
    };
    return map[status ?? ''] ?? 'Order placed';
  });

  readonly statusBannerIcon = computed(() => {
    const status = this.order()?.status;
    const map: Record<string, string> = {
      pending: 'receipt_long',
      confirmed: 'check_circle',
      preparing: 'restaurant',
      ready: 'check_circle',
      shipped: 'delivery_dining',
      delivered: 'inventory_2',
      completed: 'check_circle',
      cancelled: 'cancel',
    };
    return map[status ?? ''] ?? 'receipt_long';
  });

  readonly statusBannerIconClass = computed(() => {
    const status = this.order()?.status ?? 'pending';
    return `od-status-icon od-status-icon--${status}`;
  });

  readonly gstAndPackagingAmount = computed(() => {
    const c = this.order()?.charges;
    return (c?.gst ?? this.order()?.tax ?? 0) + (c?.packagingCharge ?? 0);
  });

  readonly isDeliveryFree = computed(() => {
    const c = this.order()?.charges;
    if (!c) return false;
    return (
      (c.deliveryChargeCalculated ?? 0) > 0 && (c.deliveryCharge ?? 0) === 0
    );
  });

  readonly deliveryCalculatedAmount = computed(() => {
    return (
      this.order()?.charges?.deliveryChargeCalculated ??
      this.order()?.deliveryCharge ??
      0
    );
  });

  readonly paymentMethodDisplay = computed(() => {
    const method = this.order()?.paymentMethod;
    if (method === 'cash') return 'Cash on Delivery';
    if (method === 'online') return 'UPI';
    return method ?? '';
  });

  readonly deliveryAddressDisplay = computed(() => {
    const addr = this.order()?.deliveryAddress;
    if (!addr) return '';
    return [addr.name, addr.street, addr.city, addr.state, addr.pincode]
      .filter(Boolean)
      .join(', ');
  });

  readonly customerName = computed(() => {
    return (
      this.order()?.deliveryAddress?.name ?? this.order()?.userName ?? null
    );
  });

  readonly customerPhoneMasked = computed(() => {
    const phone =
      this.order()?.deliveryAddress?.phone ?? this.order()?.userPhone ?? '';
    return this.maskPhone(phone);
  });

  async ngOnInit(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('orderId');
    const queryId = this.route.snapshot.queryParamMap.get('orderId');
    this.orderId = routeId ?? queryId ?? '';
    if (this.orderId) {
      await this.loadOrder();
    } else {
      this.error.set('Order ID is required');
    }
  }

  async loadOrder(): Promise<void> {
    if (!this.orderId.trim()) {
      this.error.set('Order ID is required');
      return;
    }
    this.isLoading.set(true);
    this.error.set('');
    try {
      const order = await firstValueFrom(
        this.orderApi.getOrder(this.orderId.trim()),
      );
      this.order.set(order);
    } catch {
      this.error.set('Failed to load order details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getStatusClass(status: string): string {
    return getOrderStatusClass(status as Order['status']);
  }

  getItemName(item: { name: string; selectedVariationLabel?: string }): string {
    return getOrderItemName(item);
  }

  getDeliveryCharge(): number {
    return (
      this.order()?.charges?.deliveryCharge ?? this.order()?.deliveryCharge ?? 0
    );
  }

  getPlatformFee(): number {
    return this.order()?.charges?.platformFee ?? 0;
  }

  getCouponDiscount(): number {
    return (
      this.order()?.charges?.couponDiscount ?? this.order()?.couponDiscount ?? 0
    );
  }

  hasCoupon(): boolean {
    return this.getCouponDiscount() > 0;
  }

  getTotalSavings(): number {
    return this.order()?.charges?.totalSavings ?? this.getCouponDiscount();
  }

  copyOrderId(): void {
    const orderId = this.order()?.orderId ?? '';
    navigator.clipboard.writeText(orderId).catch(() => {
      /* clipboard not available */
    });
  }

  callRestaurant(): void {
    const phone =
      this.order()?.businessPhone ?? this.order()?.businessAlternatePhone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  goBack(): void {
    this.navService.goBack();
  }

  goHome(): void {
    this.navService.navigateToHome();
  }

  goToSupport(): void {
    this.router.navigate(['/contact']);
  }

  private maskPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    const local = digits.length > 10 ? digits.slice(-10) : digits;
    if (local.length < 6) return local;
    return local.slice(0, 6) + 'XXXX';
  }
}
