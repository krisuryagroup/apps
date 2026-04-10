import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  // Define hierarchical route mapping (child -> parent)
  private routeHierarchy: { [key: string]: string } = {
    '/track-order': '/orders',
    '/track-order/:orderId': '/orders',
    '/order-confirmation': '/orders',
    '/order-confirmation/:orderId': '/orders',
    '/orders': '/home',
    '/addresses': '/home',
    '/cart': '/home',
    '/category-listing': '/home',
    '/listing': '/home', // Alternative route format
    '/search': '/home', // Alternative route format
    '/contact-us': '/features/account',
    '/contact': '/home'
  };

  constructor(
    private router: Router,
    private location: Location
  ) {}

  canGoBack(): boolean {
    const currentRoute = this.router.url;
    return this.getParentRoute(currentRoute) !== null;
  }

  getParentRoute(route: string): string | null {
    // First check exact match
    if (this.routeHierarchy[route]) {
      return this.routeHierarchy[route];
    }

    // Check for dynamic routes (with parameters)
    for (const [childPattern, parent] of Object.entries(this.routeHierarchy)) {
      if (this.matchesPattern(route, childPattern)) {
        return parent;
      }
    }

    return null;
  }

  private matchesPattern(route: string, pattern: string): boolean {
    // Handle dynamic segments (e.g., /features/listing/:id matches /features/listing/123)
    const routeParts = route.split('/');
    const patternParts = pattern.split('/');
    
    if (routeParts.length !== patternParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        // Dynamic segment, skip validation
        continue;
      }
      if (routeParts[i] !== patternParts[i]) {
        return false;
      }
    }
    
    return true;
  }

  goBack(): void {
    const currentRoute = this.router.url;
    
    // Special handling for routes with query parameters (like search)
    const baseRoute = currentRoute.split('?')[0]; // Remove query parameters
    const parentRoute = this.getParentRoute(baseRoute);
    
    if (parentRoute) {
      // For listing with search, always go back to home without search parameters
      if (baseRoute.includes('/listing') || baseRoute.includes('/search')) {
        this.router.navigate([parentRoute]); // Navigate without query params
      } else {
        this.router.navigate([parentRoute]);
      }
    } else {
      // No logical parent, go to home
      this.router.navigate(['/features/home']);
    }
  }

  navigateToHome(): void {
    this.router.navigate(['/features/home']);
  }

  navigateToOrderHistory(): void {
    this.router.navigate(['/features/order-history']);
  }

  getCurrentRoute(): string {
    return this.router.url;
  }

  isMainRoute(route: string): boolean {
    const mainRoutes = [
      '/',
      '/home',
      '/features/home',
      '/features/categories',
      '/features/search',
      '/features/account'
    ];
    return mainRoutes.includes(route);
  }
}
