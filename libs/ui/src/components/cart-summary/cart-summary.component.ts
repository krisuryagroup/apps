import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '@zitro/services';
import { CartItem } from '@zitro/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  totalQuantity: number = 0;
  totalAmount: number = 0;
  isVisible: boolean = false;
  
  private cartSubscription?: Subscription;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.updateCartSummary();
    
    // Listen for cart changes
    this.cartSubscription = this.cartService.cartChanged?.subscribe(() => {
      this.updateCartSummary();
    });
  }

  ngOnDestroy() {
    this.cartSubscription?.unsubscribe();
  }

  private updateCartSummary() {
    this.cartItems = this.cartService.getCart();
    this.totalQuantity = this.cartService.getCount();
    this.totalAmount = this.cartService.getTotal();
    this.isVisible = this.totalQuantity > 0;
  }

  onCartClick() {
    this.router.navigate(['/cart']);
  }

  formatPrice(price: number): string {
    return `₹${price}`;
  }
}
