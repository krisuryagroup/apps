import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BottomNavComponent } from '@zitro/ui';
import { CartService } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { Product } from '@zitro/models';
import { CartSummaryComponent } from '@zitro/ui';
import { CachedImageDirective } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
import { APP_CONSTANTS } from '../../core/constants/app.constants';

@Component({
  selector: 'app-category-listing',
  standalone: true,
  imports: [CommonModule, BottomNavComponent, CartSummaryComponent, CachedImageDirective, LoaderComponent],
  templateUrl: './category-listing.component.html',
  styleUrls: ['./category-listing.component.scss']
})
export class CategoryListingComponent implements OnInit {
  category: string = '';
  search: string = '';
  filteredItems: Product[] = [];
  allItems: Product[] = [];
  isLoading = true;
  imageLoading: { [key: number]: boolean } = {};

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private cartService: CartService,
    private productsService: ProductsService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.category = (params['name'] || '').toLowerCase();
      this.search = (params['search'] || '').toLowerCase();
      this.loadProducts();
    });
  }

  async loadProducts() {
    try {
      this.isLoading = true;
      // Load only products that are enabled for online orders
      this.allItems = await this.productsService.getOnlineEnabledProducts();
      this.filterItems();
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      this.isLoading = false;
    }
  }

  filterItems() {
    this.filteredItems = this.allItems.filter(item => {
      const matchesCategory = this.category ? item.category === this.category : true;
      const matchesSearch = this.search ? item.name.toLowerCase().includes(this.search) : true;
      return matchesCategory && matchesSearch && this.productsService.isProductAvailable(item);
    });
    
    // Initialize image loading states for all filtered items
    this.filteredItems.forEach((item, index) => {
      this.imageLoading[index] = true;
    });
  }

  formatPrice(price: number): string {
    return this.productsService.formatPrice(price);
  }

  incrementQuantity(item: Product) {
    this.cartService.addToCart(item);
  }

  decrementQuantity(item: Product) {
    this.cartService.removeFromCart(item);
  }

  getItemQuantity(item: Product): number {
    return this.cartService.getItemQuantity(item);
  }

  // Handle image error by setting default image
  onImageError(event: any): void {
    event.target.src = 'assets/foodCategories/default.png';
  }

  onImageLoad(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }

  onImageError2(index: number): void {
    setTimeout(() => {
      this.imageLoading[index] = false;
    }, APP_CONSTANTS.MINIMUM_IMAGE_LOAD_TIME_MS);
  }
}
