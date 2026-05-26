import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnChanges,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { Product } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';
import { VALIDATION_MESSAGES } from '@zitro/utils';
import { FormsModule } from '@angular/forms';
import {
  ZoomableImageComponent,
  ZoomableImageConfig,
} from '../zoomable-image/zoomable-image.component';
import { AnalyticsService } from '@zitro/services';

export interface ItemDetailsDialogData {
  id?: string;
  name?: string;
  imageURL: string;
  title: string;
  description?: string;
  price: number;
  weight?: string;
  offer?: string;
  [key: string]: any;
  hasVariations?: boolean;
  variations?: any[];
  selectedVariationId?: string;
}

@Component({
  selector: 'app-item-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CachedImageDirective,
    FormsModule,
    ZoomableImageComponent,
  ],
  templateUrl: './item-details-dialog.component.html',
  styleUrls: ['./item-details-dialog.component.scss'],
})
export class ItemDetailsDialogComponent
  implements OnChanges, OnInit, OnDestroy
{
  @Input() isOpen = false;
  @Input() item: ItemDetailsDialogData | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() cartUpdated = new EventEmitter<void>();

  imageLoading = true;
  validationError = '';
  private cartService = inject(CartService);
  private productsService = inject(ProductsService);
  private analyticsService = inject(AnalyticsService);

  // Image zoom configuration
  imageZoomConfig: ZoomableImageConfig = {
    width: '100%',
    height: '400px',
    minZoom: 1,
    maxZoom: 3,
    zoomStep: 0.3,
    showControls: true,
    enablePinchZoom: true,
    enableClickZoom: true,
    borderRadius: '12px',
    objectFit: 'contain',
  };

  // Related products
  relatedProducts: Product[] = [];
  isLoadingRelated = false;

  ngOnChanges() {
    // Auto-select default variation when dialog opens
    if (
      this.item &&
      this.item.hasVariations &&
      this.item.variations &&
      !this.item.selectedVariationId
    ) {
      const defaultVariation = this.item.variations.find(
        (v) => v.isDefault && v.isEnabled !== false,
      );
      const firstEnabledVariation = this.item.variations.find(
        (v) => v.isEnabled !== false,
      );
      const variationToSelect = defaultVariation || firstEnabledVariation;

      if (variationToSelect) {
        this.item.selectedVariationId = variationToSelect.id;
      }
    }
    this.validationError = '';

    // Load related products if dialog is open and item has category
    if (this.isOpen && this.item && (this.item as any).category) {
      this.loadRelatedProducts();
    }
  }

  ngOnInit() {
    // Listen for escape key
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  ngOnDestroy() {
    // Clean up event listener
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  private handleEscapeKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  close() {
    this.closeEvent.emit();
  }

  // Related products methods
  async loadRelatedProducts() {
    if (!this.item || !(this.item as any).category) {
      this.relatedProducts = [];
      return;
    }

    try {
      this.isLoadingRelated = true;
      const categoryId = (this.item as any).category;
      const currentItemId = this.item.id || '';

      // Get all online products
      const allProducts = await this.productsService.getOnlineEnabledProducts();

      // Filter by category and exclude current item
      this.relatedProducts = allProducts
        .filter((p) => p.category === categoryId && p.id !== currentItemId)
        .slice(0, 10); // Limit to 10 related items

      console.log('Loaded', this.relatedProducts.length, 'related products');
    } catch (error) {
      console.error('Error loading related products:', error);
      this.relatedProducts = [];
    } finally {
      this.isLoadingRelated = false;
    }
  }

  onRelatedProductClick(product: Product, event?: Event) {
    // If event exists, it means user clicked on the card (not the add to cart button)
    if (event) {
      // Update item directly to show new product in dialog
      this.item = {
        id: product.id,
        name: product.name,
        imageURL: product.imageUrl ?? 'assets/foodCategories/default.png',
        title: product.name,
        description: product.description,
        price: product.price,
        weight: product.weight,
        category: product.category,
        hasVariations: product.hasVariations,
        variations: product.variations,
        selectedVariationId: product.selectedVariationId,
        isEnabledForOnlineOrders: product.isEnabledForOnlineOrders,
        isOfferDisabled: product.isOfferDisabled,
        status: product.status,
      };

      // Trigger change detection and reload related products
      this.ngOnChanges();
    }
  }

  // Add related product to cart
  addRelatedProductToCart(product: Product, event: Event) {
    event.stopPropagation(); // Prevent triggering card click

    // If product has variations, open it in dialog instead
    if (
      product.hasVariations &&
      product.variations &&
      product.variations.length > 0
    ) {
      this.onRelatedProductClick(product);
      return;
    }

    this.cartService.addToCart(product);

    // Track add to cart event
    this.analyticsService.logAddToCart({
      id: product.id || '',
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: 1,
    });

    this.cartUpdated.emit();
  }

  // Decrement related product from cart
  decrementRelatedProduct(product: Product, event: Event) {
    event.stopPropagation(); // Prevent triggering card click
    this.cartService.removeFromCart(product);

    // Track remove from cart event
    this.analyticsService.logRemoveFromCart({
      id: product.id || '',
      name: product.name,
      price: product.price,
      quantity: 1,
    });

    this.cartUpdated.emit();
  }

  // Increment related product in cart
  incrementRelatedProduct(product: Product, event: Event) {
    event.stopPropagation(); // Prevent triggering card click
    this.cartService.addToCart(product);

    // Track add to cart event
    this.analyticsService.logAddToCart({
      id: product.id || '',
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: 1,
    });

    this.cartUpdated.emit();
  }

  // Get quantity of related product in cart
  getRelatedProductQuantity(product: Product): number {
    return this.cartService.getItemQuantity(product);
  }

  getOtherKeys(): string[] {
    return this.item ? Object.keys(this.item) : [];
  }

  // Handle image load completion
  onImageLoad(): void {
    this.imageLoading = false;
  }

  // Cart management methods
  incrementQuantity() {
    if (this.item) {
      // Validate variation selection
      if (this.item.hasVariations && !this.item.selectedVariationId) {
        this.validationError =
          'Please select a variation before adding to cart';
        return;
      }

      this.validationError = '';
      const product = this.convertToProduct(this.item);
      this.cartService.addToCart(product);

      // Track add to cart event
      this.analyticsService.logAddToCart({
        id: product.id || '',
        name: product.name,
        category: product.category,
        price: product.price,
        quantity: 1,
      });

      this.cartUpdated.emit();
    }
  }

  decrementQuantity() {
    if (this.item) {
      const product = this.convertToProduct(this.item);
      this.cartService.removeFromCart(product);

      // Track remove from cart event
      this.analyticsService.logRemoveFromCart({
        id: product.id || '',
        name: product.name,
        price: product.price,
        quantity: 1,
      });

      this.cartUpdated.emit();
    }
  }

  getItemQuantity(): number {
    if (!this.item) return 0;
    const product = this.convertToProduct(this.item);
    return this.cartService.getItemQuantity(product);
  }

  get selectedVariation() {
    const variations = this.item?.variations ?? [];
    const selectedId = this.item?.selectedVariationId ?? '';
    if (this.item?.hasVariations && Array.isArray(variations) && selectedId) {
      return variations.find((v) => v.id === selectedId) ?? null;
    }
    return null;
  }

  private convertToProduct(item: ItemDetailsDialogData): Product {
    // Get effective price (variation price if selected, otherwise base price)
    let effectivePrice = item.price;
    if (item.hasVariations && item.selectedVariationId && item.variations) {
      const selectedVar = item.variations.find(
        (v) => v.id === item.selectedVariationId,
      );
      if (selectedVar) {
        effectivePrice = selectedVar.price;
      }
    }

    return {
      id: item.id || '',
      name: item.name || item.title,
      imageUrl: item.imageURL,
      price: effectivePrice,
      description: item.description || '',
      weight: item.weight || '',
      category: (item as any).category || '',
      isEnabledForOnlineOrders: (item as any).isEnabledForOnlineOrders ?? true,
      isOfferDisabled: (item as any).isOfferDisabled ?? false,
      status: (item as any).status ?? true,
      // Include variation fields
      hasVariations: item.hasVariations,
      variations: item.variations,
      selectedVariationId: item.selectedVariationId,
    } as Product;
  }
}
