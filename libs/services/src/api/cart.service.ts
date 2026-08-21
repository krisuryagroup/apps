import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ApiCart, CheckoutSummary } from '@zitro/models';
import { CartMapper } from '@zitro/mappers';
import type { CartDto, CheckoutSummaryDto } from '@zitro/mappers';
import { ZITRO_API_BASE_URL, CART_BUSINESS_SLUG } from '../tokens';

const ACTIVE_SLUGS_KEY = 'zitro_active_cart_businesses';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ZITRO_API_BASE_URL);

  private readonly _carts = signal<Map<string, ApiCart>>(new Map());

  readonly carts = this._carts.asReadonly();

  /** All business carts that have at least one item — drives the floating slider. */
  readonly cartList = computed(() =>
    [...this._carts().values()].filter((c) => c.items.length > 0),
  );

  readonly hasActiveCarts = computed(() => this.cartList().length > 0);

  readonly totalCount = computed(() =>
    this.cartList().reduce(
      (n, c) => n + c.items.reduce((s, i) => s + i.quantity, 0),
      0,
    ),
  );

  getCartForBusiness(slug: string): ApiCart | undefined {
    return this._carts().get(slug);
  }

  /** Returns total qty of a product (optionally scoped to a variation) in a business cart. */
  getItemQtyInCart(
    businessSlug: string,
    productId: string,
    variationId?: string,
  ): number {
    const cart = this._carts().get(businessSlug);
    if (!cart) return 0;
    return cart.items
      .filter(
        (i) =>
          i.productId === productId &&
          (!variationId || i.variationId === variationId),
      )
      .reduce((sum, i) => sum + i.quantity, 0);
  }

  /**
   * Called on app init (if logged in) — fetches all previously active business carts.
   *
   * A failed fetch (network error, transient 5xx, server restart, etc.) is left as-is
   * — the slug stays tracked so the next load attempt retries it. GET /api/cart always
   * gets-or-creates a cart and returns 200, so a *successful* response with zero items
   * is the only legitimate "this cart is genuinely empty" signal — loadCart() already
   * untracks the slug on that path. Untracking on failure here used to make a business
   * with a real, non-empty server-side cart look permanently empty to the user after
   * any transient blip, surviving even a hard reload, since nothing else ever retried it.
   */
  async loadAllCarts(): Promise<void> {
    const slugs = this.readSlugsFromStorage();
    await Promise.all(
      slugs.map((slug) => this.loadCart(slug).catch(() => undefined)),
    );
  }

  async loadCart(slug: string): Promise<void> {
    const dto = await firstValueFrom(
      this.http.get<CartDto>(`${this.baseUrl}/api/cart`, this.ctxFor(slug)),
    );
    const cart = CartMapper.toCart(dto);
    this.setCart(slug, cart);
    if (cart.items.length === 0) this.removeSlugFromStorage(slug);
  }

  async addToCart(
    slug: string,
    productId: string,
    variationId?: string,
    qty = 1,
  ): Promise<void> {
    const dto = await firstValueFrom(
      this.http.post<CartDto>(
        `${this.baseUrl}/api/cart/items`,
        { productId, variationId: variationId ?? null, quantity: qty },
        this.ctxFor(slug, this.idempotencyHeaders()),
      ),
    );
    this.setCart(slug, CartMapper.toCart(dto));
    this.addSlugToStorage(slug);
  }

  /** qty = 0 removes the item entirely (maps to PUT /api/cart/items/{id} with quantity:0). */
  async updateQty(
    slug: string,
    cartItemId: string,
    qty: number,
  ): Promise<void> {
    const dto = await firstValueFrom(
      this.http.put<CartDto>(
        `${this.baseUrl}/api/cart/items/${cartItemId}`,
        { quantity: qty },
        this.ctxFor(slug, this.idempotencyHeaders()),
      ),
    );
    const cart = CartMapper.toCart(dto);
    this.setCart(slug, cart);
    if (cart.items.length === 0) this.removeSlugFromStorage(slug);
  }

  async clearCart(slug: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<CartDto>(`${this.baseUrl}/api/cart`, this.ctxFor(slug)),
    );
    this.deleteCart(slug);
    this.removeSlugFromStorage(slug);
  }

  async applyCoupon(
    slug: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const dto = await firstValueFrom(
        this.http.post<CartDto>(
          `${this.baseUrl}/api/cart/coupon`,
          { couponCode: code },
          this.ctxFor(slug),
        ),
      );
      this.setCart(slug, CartMapper.toCart(dto));
      return { success: true };
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        'Coupon could not be applied.';
      return { success: false, error: message };
    }
  }

  async removeCoupon(slug: string): Promise<void> {
    const dto = await firstValueFrom(
      this.http.post<CartDto>(
        `${this.baseUrl}/api/cart/coupon`,
        { couponCode: null },
        this.ctxFor(slug),
      ),
    );
    this.setCart(slug, CartMapper.toCart(dto));
  }

  async getCheckoutSummary(slug: string): Promise<CheckoutSummary> {
    const dto = await firstValueFrom(
      this.http.post<CheckoutSummaryDto>(
        `${this.baseUrl}/api/cart/checkout`,
        {},
        this.ctxFor(slug),
      ),
    );
    return CartMapper.toCheckoutSummary(dto);
  }

  // ── State helpers ────────────────────────────────────────────────────────

  private setCart(slug: string, cart: ApiCart): void {
    this._carts.update((m) => new Map(m).set(slug, cart));
  }

  private deleteCart(slug: string): void {
    this._carts.update((m) => {
      const next = new Map(m);
      next.delete(slug);
      return next;
    });
  }

  // ── HttpContext helper ───────────────────────────────────────────────────

  private ctxFor(
    slug: string,
    headers?: HttpHeaders,
  ): { context: HttpContext; headers?: HttpHeaders } {
    return {
      context: new HttpContext().set(CART_BUSINESS_SLUG, slug),
      headers,
    };
  }

  /**
   * A fresh key per logical call, generated once before the request enters the
   * HTTP pipeline — retryInterceptor's retry() resubscribes to the same piped
   * request, so a network-retry reuses this same key and the server replays
   * its cached response instead of re-applying the mutation (e.g. AddItem's
   * increment-by-delta would otherwise double the quantity on a retry).
   */
  private idempotencyHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Idempotency-Key': crypto.randomUUID() });
  }

  // ── localStorage slug tracking ───────────────────────────────────────────

  private readSlugsFromStorage(): string[] {
    try {
      const raw = localStorage.getItem(ACTIVE_SLUGS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  private addSlugToStorage(slug: string): void {
    const slugs = new Set(this.readSlugsFromStorage());
    slugs.add(slug);
    localStorage.setItem(ACTIVE_SLUGS_KEY, JSON.stringify([...slugs]));
  }

  private removeSlugFromStorage(slug: string): void {
    const slugs = this.readSlugsFromStorage().filter((s) => s !== slug);
    localStorage.setItem(ACTIVE_SLUGS_KEY, JSON.stringify(slugs));
  }
}
