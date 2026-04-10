import { Component, OnInit, OnChanges, AfterViewInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CachedImageDirective } from '../../directives/cached-image.directive';
import { ProductsService } from '@zitro/services';
import { Product } from '@zitro/models';
import { CartService } from '@zitro/services';
import { FavoritesService } from '@zitro/services';
import { ViewAllCardComponent } from '../view-all-card/view-all-card.component';
import { LoaderComponent } from '../loader/loader.component';
import { APP_CONSTANTS } from '@zitro/utils';

@Component({
  selector: 'app-item-slider',
  standalone: true,
  imports: [CommonModule, CachedImageDirective, ViewAllCardComponent, LoaderComponent],
  templateUrl: './item-slider.component.html',
  styleUrls: ['./item-slider.component.scss']
})
export class ItemSliderComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  
  @Input() products: Product[] = []; // Accept products as input
  @Input() maxItems: number = 0; // 0 means show all
  @Input() title: string = 'Items';
  @Input() showViewAll: boolean = true;
  
  @Output() productClick = new EventEmitter<Product>();
  @Output() viewAllClick = new EventEmitter<void>();
  @Output() cartUpdated = new EventEmitter<void>();

  displayProducts: Product[] = [];
  isAtScrollStart = true;
  isAtScrollEnd = false;
  imageLoading: { [key: string]: boolean } = {};

  constructor(
    private router: Router,
    private productsService: ProductsService,
    private cartService: CartService,
    private favoritesService: FavoritesService
  ) {}

  ngOnInit() {
    this.updateDisplayProducts();
  }

  ngOnChanges() {
    this.updateDisplayProducts();
    // Initialize image loading states for all display products
    this.displayProducts.forEach(product => {
      this.imageLoading[product.id] = true;
    });
  }

  ngAfterViewInit() {
    if (this.scrollContainer) {
      const container = this.scrollContainer.nativeElement;
      container.addEventListener('scroll', () => {
        this.updateScrollState();
      });
      
      // Initial scroll state check
      setTimeout(() => {
        this.updateScrollState();
      }, 100);
      
      // Additional check after content fully renders
      setTimeout(() => {
        this.updateScrollState();
      }, 500);
    }
  }

  updateScrollState() {
    if (!this.scrollContainer) return;
    
    const container = this.scrollContainer.nativeElement;
    const scrollLeft = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    
    // Update scroll position states
    this.isAtScrollStart = scrollLeft <= 1; // Changed from 5 to 1 for more precision
    this.isAtScrollEnd = scrollLeft >= maxScroll - 1; // Changed from 5 to 1 for more precision
  }

  scrollLeft() {
    if (!this.scrollContainer) return;
    
    const container = this.scrollContainer.nativeElement;
    const scrollAmount = 300;
    
    container.scrollBy({
      left: -scrollAmount,
      behavior: 'smooth'
    });
    
    // Update state after scroll animation
    setTimeout(() => {
      this.updateScrollState();
    }, 350);
  }

  scrollRight() {
    if (!this.scrollContainer) return;
    
    const container = this.scrollContainer.nativeElement;
    const scrollAmount = 300;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
    
    // Update state after scroll animation
    setTimeout(() => {
      this.updateScrollState();
    }, 350);
  }

  updateDisplayProducts() {
    // Apply maxItems limit if specified
    this.displayProducts = this.maxItems > 0 
      ? this.products.slice(0, this.maxItems)
      : this.products;
  }

  get shouldShowViewAll(): boolean {
    return this.showViewAll && this.maxItems > 0 && this.products.length > this.maxItems;
  }

  onProductClick(product: Product) {
    this.productClick.emit(product);
  }

  onViewAllClick() {
    this.viewAllClick.emit();
  }

  // Cart management methods
  incrementQuantity(product: Product) {
    // If product has variations, open dialog instead by emitting product click
    if (product.hasVariations && product.variations && product.variations.length > 0) {
      this.onProductClick(product);
      return;
    }
    this.cartService.addToCart(product);
    this.cartUpdated.emit();
  }

  decrementQuantity(product: Product) {
    this.cartService.removeFromCart(product);
    this.cartUpdated.emit();
  }

  getItemQuantity(product: Product): number {
    // For products with variations, show total quantity across all variations
    if (product.hasVariations && product.variations) {
      const cart = this.cartService.getCart();
      return cart
        .filter(cartItem => cartItem.name === product.name)
        .reduce((total, cartItem) => total + (cartItem.qty || 0), 0);
    }
    return this.cartService.getItemQuantity(product);
  }

  // Favorites management
  async toggleFavorite(product: Product, event: Event) {
    event.stopPropagation();
    await this.favoritesService.toggleFavorite(product);
  }

  // Use synchronous favorite check to avoid repeated async calls
  isFavorite(product: Product): boolean {
    return this.favoritesService.isFavoriteSync(product.id);
  }

  // Utility methods
  formatPrice(price: number): string {
    return this.productsService.formatPrice(price);
  }

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }

  onImageLoad(productId: string): void {
    setTimeout(() => {
      this.imageLoading[productId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError(productId: string): void {
    setTimeout(() => {
      this.imageLoading[productId] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }
}
