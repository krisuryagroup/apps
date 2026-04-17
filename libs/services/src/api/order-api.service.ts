import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Order, CartItem } from '@zitro/models';
import { OrderMapper } from '@zitro/mappers';
import type { OrderDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const ORDER_HISTORY_KEY = 'order:history';

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
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  createOrder(
    cart: { items: CartItem[]; businessId: string },
    options: CreateOrderOptions,
  ): Observable<Order> {
    const request = OrderMapper.fromCart(cart, options);
    return this.http.post<OrderDto>(`${this.baseUrl}/api/orders`, request).pipe(
      map(dto => OrderMapper.toOrder(dto)),
      tap(() => this.cache.invalidate(ORDER_HISTORY_KEY)),
    );
  }

  getOrder(orderId: string): Observable<Order> {
    const cacheKey = `order:${orderId}`;
    const cached = this.cache.get<Order>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<OrderDto>(`${this.baseUrl}/api/orders/${orderId}`).pipe(
      map(dto => OrderMapper.toOrder(dto)),
      tap(order => this.cache.set(cacheKey, order, { ttlHours: 1 / 12 })),
    );
  }

  getOrderHistory(page = 1, status?: string): Observable<Order[]> {
    const cacheKey = ORDER_HISTORY_KEY;
    if (!status) {
      const cached = this.cache.get<Order[]>(cacheKey);
      if (cached) return of(cached);
    }
    const params: Record<string, string> = { page: String(page), pageSize: '20' };
    if (status) params['status'] = status;
    return this.http.get<OrderDto[]>(`${this.baseUrl}/api/orders`, { params }).pipe(
      map(dtos => OrderMapper.toOrderList(dtos)),
      tap(orders => {
        if (!status) {
          this.cache.set(cacheKey, orders, { ttlHours: 1 / 12 });
        }
      }),
    );
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.put<OrderDto>(`${this.baseUrl}/api/orders/${orderId}/cancel`, {}).pipe(
      map(dto => OrderMapper.toOrder(dto)),
      tap(() => {
        this.cache.invalidate(`order:${orderId}`);
        this.cache.invalidate(ORDER_HISTORY_KEY);
      }),
    );
  }
}
