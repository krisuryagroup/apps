import { Injectable, computed, signal } from '@angular/core';
import type { CartItem, Product } from '@zitro/models';

const STORAGE_KEY = 'zitro_cart';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly _items = signal<CartItem[]>(this.loadFromStorage());
  private readonly _businessId = signal<string>('');

  readonly items = this._items.asReadonly();
  readonly businessId = this._businessId.asReadonly();

  readonly cartCount = computed(() =>
    this._items().reduce((sum, item) => sum + item.qty, 0)
  );

  readonly cartSubtotal = computed(() =>
    this._items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  readonly isEmpty = computed(() => this._items().length === 0);

  setBusinessId(slug: string): void {
    if (this._businessId() !== slug && this._items().length > 0) {
      this.clear();
    }
    this._businessId.set(slug);
  }

  add(product: Product, variationId?: string, qty = 1): void {
    const itemId = variationId ? `${product.id}__${variationId}` : product.id;
    const current = this._items();
    const existing = current.find(i => i.id === itemId);

    if (existing) {
      this._items.set(
        current.map(i => (i.id === itemId ? { ...i, qty: i.qty + qty } : i))
      );
    } else {
      const price = variationId
        ? (product.variations?.find(v => v.id === variationId)?.price ?? product.price)
        : product.price;

      const cartItem: CartItem = {
        ...product,
        id: itemId,
        qty,
        price,
        selectedVariationId: variationId,
      };
      this._items.set([...current, cartItem]);
    }
    this.persist();
  }

  remove(itemId: string): void {
    const current = this._items();
    const existing = current.find(i => i.id === itemId);
    if (!existing) return;

    if (existing.qty > 1) {
      this._items.set(
        current.map(i => (i.id === itemId ? { ...i, qty: i.qty - 1 } : i))
      );
    } else {
      this._items.set(current.filter(i => i.id !== itemId));
    }
    this.persist();
  }

  updateQty(itemId: string, qty: number): void {
    if (qty <= 0) {
      this._items.set(this._items().filter(i => i.id !== itemId));
    } else {
      this._items.set(
        this._items().map(i => (i.id === itemId ? { ...i, qty } : i))
      );
    }
    this.persist();
  }

  clear(): void {
    this._items.set([]);
    this.persist();
  }

  getItemQty(itemId: string): number {
    return this._items().find(i => i.id === itemId)?.qty ?? 0;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
    } catch {
      // Storage quota exceeded or private mode — ignore
    }
  }

  private loadFromStorage(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as CartItem[];
    } catch {
      return [];
    }
  }
}
