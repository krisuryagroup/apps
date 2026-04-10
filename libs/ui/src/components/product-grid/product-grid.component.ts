import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '@zitro/models';
import { ProductCardComponent } from '../product-card/product-card.component';
import { UI_TEXT } from '@zitro/utils';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-grid.component.html',
  styleUrls: ['./product-grid.component.scss']
})
export class ProductGridComponent {
  @Input() products: Product[] = [];
  @Input() title: string = '';
  @Input() displayStyle: 'horizontal' | 'vertical' = 'horizontal';
  @Input() maxItems: number = 0; // 0 means show all
  @Input() showViewAll: boolean = true;
  @Input() compactMode: boolean = false;
  @Input() columns: number = 2; // Number of columns for grid layout
  
  @Output() productClick = new EventEmitter<Product>();
  @Output() viewAllClick = new EventEmitter<void>();
  @Output() cartUpdated = new EventEmitter<void>();

  NO_PRODUCTS_AVAILABLE: string = UI_TEXT.NO_PRODUCTS_AVAILABLE;

  get displayProducts(): Product[] {
    if (this.maxItems > 0) {
      return this.products.slice(0, this.maxItems);
    }
    return this.products;
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

  onQuantityChange() {
    this.cartUpdated.emit();
  }

  trackByProductId(index: number, product: Product): string {
    return product.id;
  }
}
