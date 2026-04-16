import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Order, CartItem } from '@zitro/models';
import { OrderMapper } from '@zitro/mappers';
import type { OrderDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const CACHE_TTL_5MIN = 5 * 60 * 1000;
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
      tap(() => {
        // Invalidate order history cache after a new order
        this.cache.removeItem(`${ORDER_HISTORY_KEY}_ts`);
      }),
    );
  }

  getOrder(orderId: string): Observable<Order> {
    const cacheKey = `order:${orderId}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_5MIN)) {
      const cached = this.cache.getCachedData<Order>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<OrderDto>(`${this.baseUrl}/api/orders/${orderId}`).pipe(
      map(dto => OrderMapper.toOrder(dto)),
      tap(order => {
        this.cache.setCachedData(cacheKey, order);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  getOrderHistory(page = 1, status?: string): Observable<Order[]> {
    const cacheKey = ORDER_HISTORY_KEY;
    if (!status && !this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_5MIN)) {
      const cached = this.cache.getCachedData<Order[]>(cacheKey);
      if (cached) return of(cached);
    }
    const params: Record<string, string> = { page: String(page), pageSize: '20' };
    if (status) params['status'] = status;
    return this.http.get<OrderDto[]>(`${this.baseUrl}/api/orders`, { params }).pipe(
      map(dtos => OrderMapper.toOrderList(dtos)),
      tap(orders => {
        if (!status) {
          this.cache.setCachedData(cacheKey, orders);
          this.cache.setCacheTimestamp(`${cacheKey}_ts`);
        }
      }),
    );
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.put<OrderDto>(`${this.baseUrl}/api/orders/${orderId}/cancel`, {}).pipe(
      map(dto => OrderMapper.toOrder(dto)),
      tap(() => {
        // Invalidate both specific order and history cache
        this.cache.removeItem(`order:${orderId}_ts`);
        this.cache.removeItem(`${ORDER_HISTORY_KEY}_ts`);
      }),
    );
  }
}
