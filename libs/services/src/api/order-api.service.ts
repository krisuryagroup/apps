import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Order, CartItem } from '@zitro/models';
import { OrderMapper } from '@zitro/mappers';
import type {
  OrderDto,
  PlaceOrderResponseDto,
  OrderListResponseDto,
} from '@zitro/mappers';
import { ZITRO_API_BASE_URL, CART_BUSINESS_SLUG } from '../tokens';
import { CustomerEndpoints } from '../endpoints';

export interface CreateOrderOptions {
  orderType: Order['orderType'];
  paymentMethod: Order['paymentMethod'];
  deliveryAddressId: string | null;
  tableNumber: string | null;
  numberOfGuests: number | null;
  couponCode: string | null;
  customerNotes: string | null;
}

@Injectable({ providedIn: 'root' })
export class OrderApiService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  createOrder(
    cart: { items: CartItem[]; businessId: string },
    options: CreateOrderOptions,
    businessSlug?: string,
  ): Observable<{ orderId: string }> {
    const request = OrderMapper.fromCart(cart, options);
    const context = businessSlug
      ? new HttpContext().set(CART_BUSINESS_SLUG, businessSlug)
      : undefined;
    return this.http
      .post<PlaceOrderResponseDto>(
        `${this.baseUrl}${CustomerEndpoints.orders.create()}`,
        request,
        {
          context,
        },
      )
      .pipe(map((dto) => ({ orderId: dto.orderId })));
  }

  // Order status is live, fast-changing data (restaurant/delivery updates it
  // continuously) — never cache it. A 5-minute client cache here used to make
  // order-tracking's 30s auto-refresh and the order-history list serve a
  // stale status for up to 5 minutes after every status change.
  getOrder(orderId: string): Observable<Order> {
    return this.http
      .get<OrderDto>(`${this.baseUrl}${CustomerEndpoints.orders.byId(orderId)}`)
      .pipe(map((dto) => OrderMapper.toOrder(dto)));
  }

  /** GET /api/orders/{orderId}/invoice — PDF blob. Serves both "Download bill" and "Invoice". */
  getInvoicePdf(orderId: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}${CustomerEndpoints.orders.invoice(orderId)}`,
      {
        responseType: 'blob',
      },
    );
  }

  getOrderHistory(page = 1, status?: string): Observable<Order[]> {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: '20',
    };
    if (status) params['status'] = status;
    return this.http
      .get<OrderListResponseDto>(
        `${this.baseUrl}${CustomerEndpoints.orders.list()}`,
        { params },
      )
      .pipe(map((res) => OrderMapper.toOrderListFromSummary(res.orders ?? [])));
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http
      .put<OrderDto>(
        `${this.baseUrl}${CustomerEndpoints.orders.cancel(orderId)}`,
        {},
      )
      .pipe(map((dto) => OrderMapper.toOrder(dto)));
  }
}
