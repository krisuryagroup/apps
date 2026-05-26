import { Injectable, inject, Injector } from '@angular/core';
import { CartItem, Product } from '@zitro/models';
import { Subject } from 'rxjs';
import { CacheService } from './cache.service';
import { ProductsService } from './products.service';
import { DialogService } from './dialog.service';
import { Router } from '@angular/router';
import { COMMON_CONSTANTS } from '@zitro/utils';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cacheService = inject(CacheService);
  private productsService = inject(ProductsService);
  private dialogService = inject(DialogService);
  private router = inject(Router);

  private items: CartItem[] = [];
  private readonly CART_STORAGE_KEY = 'foodapp_cart';
  private cartChangedSubject = new Subject<void>();

  // Observable for cart changes
  cartChanged = this.cartChangedSubject.asObservable();

  constructor() {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage() {
    try {
      const storedCart = this.cacheService.getCachedData<CartItem[]>(
        this.CART_STORAGE_KEY,
      );
      if (storedCart) {
        this.items = storedCart;
        console.log(
          '🛒 CartService: Loaded cart for restaurant:',
          this.cacheService.getCurrentRestaurantId(),
          'Items:',
          this.items.length,
        );
      } else {
        this.items = [];
      }
    } catch (error) {
      console.error('Error loading cart from storage:', error);
      this.items = [];
    }
  }

  private saveCartToStorage() {
    try {
      this.cacheService.setCachedData(this.CART_STORAGE_KEY, this.items);
      this.cartChangedSubject.next(); // Notify subscribers of cart change
      console.log(
        '💾 CartService: Saved cart for restaurant:',
        this.cacheService.getCurrentRestaurantId(),
        'Items:',
        this.items.length,
      );
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  getCart(): CartItem[] {
    return this.items;
  }

  /**
   * Get unique cart item key considering both name and variation
   */
  private getCartItemKey(item: Product): string {
    const variationId = item.selectedVariationId || '';
    return `${item.name}|||${variationId}`;
  }

  /**
   * Get the effective price for an item (variation price if selected, otherwise base price)
   */
  private getEffectivePrice(item: Product): number {
    if (item.hasVariations && item.selectedVariationId && item.variations) {
      const selectedVariation = item.variations.find(
        (v) => v.id === item.selectedVariationId,
      );
      if (selectedVariation) {
        return selectedVariation.price;
      }
    }
    return item.price;
  }

  addToCart(item: Product) {
    const itemKey = this.getCartItemKey(item);
    const found = this.items.find((i) => this.getCartItemKey(i) === itemKey);

    if (found) {
      found.qty = (found.qty || 0) + 1;
    } else {
      // Create cart item with effective price
      const effectivePrice = this.getEffectivePrice(item);
      const cartItem: CartItem = {
        ...item,
        qty: 1,
        price: effectivePrice, // Use variation price if available
      };
      this.items.push(cartItem);
    }
    this.saveCartToStorage();
  }

  async removeFromCart(
    item: Product,
    isRequestFromCartPage = false,
  ): Promise<boolean> {
    // Check if item has variations and no specific variation is selected
    // This means user is trying to decrement from a view where variation isn't specified
    if (!isRequestFromCartPage && item.hasVariations && item.variations) {
      // Check if there are any cart items with this product name and a variation
      const cartItemsWithVariations = this.items.filter(
        (ci) => ci.name === item.name && ci.selectedVariationId,
      );

      if (cartItemsWithVariations.length > 0) {
        // Show confirmation dialog
        const confirmed = await this.dialogService.showConfirmation({
          title: 'Manage Cart Items',
          message: COMMON_CONSTANTS.VARIATION_ITEM_REMOVAL_CONFIRMATION,
          confirmText: 'Go to Cart',
          cancelText: 'Cancel',
        });

        if (confirmed) {
          // Redirect to cart page
          this.router.navigate(['/cart']);
        }
        return false; // Indicate that item was not removed
      }
    }

    // Normal removal logic
    const itemKey = this.getCartItemKey(item);
    const idx = this.items.findIndex((i) => this.getCartItemKey(i) === itemKey);

    if (idx > -1) {
      if (this.items[idx].qty > 1) {
        this.items[idx].qty--;
      } else {
        this.items.splice(idx, 1);
      }
    }
    this.saveCartToStorage();
    return true; // Indicate successful removal
  }

  // Get the quantity of a specific item in cart
  getItemQuantity(item: Product): number {
    const itemKey = this.getCartItemKey(item);
    const found = this.items.find((i) => this.getCartItemKey(i) === itemKey);
    return found ? found.qty : 0;
  }

  clearCart() {
    this.items = [];
    this.saveCartToStorage();
  }

  /**
   * Refresh cart items from Firebase to get latest prices, isOfferDisabled status, etc.
   * This method fetches fresh data from Firebase and updates the cart items while preserving quantities
   */
  async refreshCartItemsFromFirebase(): Promise<void> {
    if (this.items.length === 0) {
      return;
    }

    try {
      // Extract product IDs from cart items
      const productIds = this.items
        .filter((item) => item.id)
        .map((item) => item.id);

      if (productIds.length === 0) {
        console.warn(
          '⚠️ Cart items do not have IDs, cannot refresh from Firebase',
        );
        return;
      }

      // Fetch fresh product data from Firebase
      const freshProducts =
        await this.productsService.getProductsByIds(productIds);

      if (freshProducts.length === 0) {
        console.warn('⚠️ No products fetched from Firebase');
        return;
      }

      // Update cart items with fresh data while preserving quantities
      let itemsUpdated = false;
      this.items = this.items.map((cartItem) => {
        const freshProduct = freshProducts.find((p) => p.id === cartItem.id);
        if (freshProduct) {
          // Check if any important field has changed
          const priceChanged = cartItem.price !== freshProduct.price;
          const offerStatusChanged =
            cartItem.isOfferDisabled !== freshProduct.isOfferDisabled;

          if (priceChanged || offerStatusChanged) {
            itemsUpdated = true;
            console.log(`🔄 Updated cart item: ${cartItem.name}`, {
              oldPrice: cartItem.price,
              newPrice: freshProduct.price,
              oldOfferDisabled: cartItem.isOfferDisabled,
              newOfferDisabled: freshProduct.isOfferDisabled,
            });
          }

          // Return updated cart item with fresh data but preserve quantity
          return {
            ...freshProduct,
            qty: cartItem.qty,
          } as CartItem;
        }
        // If product not found in Firebase, keep the old item
        return cartItem;
      });

      if (itemsUpdated) {
        // Save updated cart and notify subscribers
        this.saveCartToStorage();
        console.log('✅ Cart items refreshed from Firebase');
      } else {
        console.log('✅ Cart items are up to date');
      }
    } catch (error) {
      console.error('❌ Error refreshing cart items from Firebase:', error);
      // Don't throw error, just log it - we don't want to break the cart if refresh fails
    }
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => {
      // Price should always be a number in our model
      const price = item.price || 0;
      return sum + price * (item.qty || 1);
    }, 0);
  }

  getTotalFormatted(): string {
    return `₹${this.getTotal()}`;
  }

  getCount(): number {
    return this.items.reduce((sum, item) => sum + (item.qty || 1), 0);
  }
}
