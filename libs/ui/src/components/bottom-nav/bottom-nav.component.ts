import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { UI_TEXT } from '@zitro/utils';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  @Input() active: 'home' | 'search' | 'cart' | 'account' = 'home';

  private routerSubscription!: Subscription;

  navItems = [
    {
      label: UI_TEXT.HOME,
      icon: 'home',
      route: '/home',
      key: 'home',
      altRoutes: ['/'],
    },
    {
      label: 'Search',
      icon: 'search',
      route: '/listing',
      key: 'search',
      altRoutes: ['/search'],
    },
    {
      label: UI_TEXT.FAVORITES,
      icon: 'favorite',
      route: '/favorites',
      key: 'favorites',
      altRoutes: [],
    },
    {
      label: 'Account',
      icon: 'person',
      route: '/account',
      key: 'account',
      altRoutes: [],
    },
  ];

  ngOnInit() {
    // Set initial active state based on current route
    this.setActiveFromRoute(this.router.url);

    // Listen to route changes
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.setActiveFromRoute(event.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private setActiveFromRoute(url: string) {
    // Find which navigation item matches the current route
    for (const item of this.navItems) {
      if (
        url === item.route ||
        url.startsWith(item.route + '/') ||
        item.altRoutes?.some(
          (altRoute) => url === altRoute || url.startsWith(altRoute + '/'),
        )
      ) {
        this.active = item.key as 'home' | 'search' | 'cart' | 'account';
        return;
      }
    }

    // Special handling for cart route
    if (url.includes('/cart')) {
      this.active = 'cart';
      return;
    }

    // Default to home if no match found
    this.active = 'home';
  }

  navigate(item: any, event: MouseEvent) {
    event.preventDefault();
    this.router.navigate([item.route]);
  }
}
