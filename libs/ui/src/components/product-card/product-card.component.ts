import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@zitro/models';
import { CartService } from '@zitro/services';
import { FavoritesService } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { TruncatedTextComponent } from '../truncated-text/truncated-text.component';
import { DescriptionDialogComponent } from '../description-dialog/description-dialog.component';
import { CachedImageDirective } from '../../directives/cached-image.directive';
import { LoaderComponent } from '../loader/loader.component';
import { APP_CONSTANTS } from '@zitro/utils';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, TruncatedTextComponent, DescriptionDialogComponent, CachedImageDirective, LoaderComponent],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})

// Not used in app
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;
  @Input() displayStyle: 'horizontal' | 'vertical' = 'horizontal'; // Layout style
  @Input() showFavorite: boolean = true; // Show favorite button
  @Input() showQuantityControls: boolean = true; // Show add/remove buttons
  @Input() showDescription: boolean = true; // Show product description
  @Input() compactMode: boolean = false; // Compact display for recommendations
  
  @Output() productClick = new EventEmitter<Product>();
  @Output() favoriteToggle = new EventEmitter<Product>();
  @Output() quantityChange = new EventEmitter<{product: Product, quantity: number}>();

  isFavorite: boolean = false;
  currentQuantity: number = 0;
  isImageLoading: boolean = true;
  
  // Dialog properties
  showDescriptionDialog: boolean = false;
  dialogDescription: string = '';
  dialogProductName: string = '';

  constructor(
    private cartService: CartService,
    private favoritesService: FavoritesService,
    private productsService: ProductsService
  ) {}

  async ngOnInit() {
    // Use sync method with cache instead of async to avoid performance issues
    this.updateFavoriteStatus();
    this.updateQuantity();
  }

  private updateFavoriteStatus() {
    if (this.showFavorite) {
      // Use isFavoriteSync for better performance
      this.isFavorite = this.favoritesService.isFavoriteSync(this.product.id);
    }
  }

  private updateQuantity() {
    if (this.showQuantityControls) {
      this.currentQuantity = this.getItemQuantity();
    }
  }

  getItemQuantity(): number {
    // For products with variations, show total quantity across all variations
    if (this.product.hasVariations && this.product.variations) {
      const cart = this.cartService.getCart();
      return cart
        .filter(cartItem => cartItem.name === this.product.name)
        .reduce((total, cartItem) => total + (cartItem.qty || 0), 0);
    }
    return this.cartService.getItemQuantity(this.product);
  }

  onProductClick() {
    this.productClick.emit(this.product);
  }

  async onFavoriteToggle(event: Event) {
    event.stopPropagation();
    
    if (this.isFavorite) {
      await this.favoritesService.removeFromFavorites(this.product.id);
    } else {
      await this.favoritesService.addToFavorites(this.product);
    }
    
    // Update status using sync method
    this.updateFavoriteStatus();
    this.favoriteToggle.emit(this.product);
  }

  onIncrement(event: Event) {
    event.stopPropagation();
    // If product has variations, emit click to open dialog instead
    if (this.product.hasVariations && this.product.variations && this.product.variations.length > 0) {
      this.onProductClick();
      return;
    }
    this.cartService.addToCart(this.product);
    this.currentQuantity = this.getItemQuantity();
    this.quantityChange.emit({product: this.product, quantity: this.currentQuantity});
  }

  onDecrement(event: Event) {
    event.stopPropagation();
    this.cartService.removeFromCart(this.product);
    this.currentQuantity = this.getItemQuantity();
    this.quantityChange.emit({product: this.product, quantity: this.currentQuantity});
  }

  formatPrice(price: number): string {
    return this.productsService.formatPrice(price);
  }

  getImageErrorHandler() {
    return (event: any) => {
      event.target.src = 'assets/foodCategories/default.png';
    };
  }

  // Dialog methods
  onShowDescriptionDialog(event: {text: string, productName?: string}): void {
    this.dialogDescription = event.text;
    this.dialogProductName = event.productName || this.product.name;
    this.showDescriptionDialog = true;
  }

  onCloseDescriptionDialog(): void {
    this.showDescriptionDialog = false;
    this.dialogDescription = '';
    this.dialogProductName = '';
  }

  onImageLoad(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError(): void {
    setTimeout(() => {
      this.isImageLoading = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }
}
