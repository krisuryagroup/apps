import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '@zitro/models';
import { CategoryConfig } from '@zitro/models';
import { CachedImageDirective } from '../../directives/cached-image.directive';
import { ViewAllCardComponent } from '../view-all-card/view-all-card.component';
import { CartService } from '@zitro/services';
import { FavoritesService } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { CategoriesService, Category } from '@zitro/services';
import { AppSettingsService } from '@zitro/services';

interface CategoryCard {
  category: Category;
  products: Product[];
  currentSlideIndex: number;
  currentProduct: Product;
  autoSlideInterval?: any;
  element?: HTMLElement;
  isVisible?: boolean;
  visibilityRatio?: number;
}

@Component({
  selector: 'app-category-cards',
  standalone: true,
  imports: [CommonModule, CachedImageDirective, ViewAllCardComponent],
  templateUrl: './category-cards.component.html',
  styleUrls: ['./category-cards.component.scss'],
})
export class CategoryCardsComponent implements OnInit, OnChanges, OnDestroy {
  private cartService = inject(CartService);
  private favoritesService = inject(FavoritesService);
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private appSettingsService = inject(AppSettingsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  @Input() products: Product[] = [];
  @Input() title = 'Categories';

  @Output() productClick = new EventEmitter<Product>();
  @Output() categoryClick = new EventEmitter<string>();
  @Output() cartUpdated = new EventEmitter<void>();

  categoryCards: CategoryCard[] = [];
  categories: Category[] = [];
  isLoadingCategories = false;
  categoryConfigs: CategoryConfig | null = null;
  private intersectionObserver?: IntersectionObserver;
  private currentlyVisibleCard?: CategoryCard;

  async ngOnInit() {
    await this.loadCategories();
    await this.loadCategoryConfigs();
    this.organizeProducts();
  }

  ngOnChanges() {
    this.organizeProducts();
  }

  ngOnDestroy() {
    // Clean up all auto-slide intervals
    this.categoryCards.forEach((card) => {
      if (card.autoSlideInterval) {
        clearInterval(card.autoSlideInterval);
      }
    });

    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  async loadCategories() {
    try {
      this.isLoadingCategories = true;
      this.categories = await this.categoriesService.getCategories();
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      this.isLoadingCategories = false;
    }
  }

  async loadCategoryConfigs() {
    try {
      this.categoryConfigs =
        await this.appSettingsService.getCategoryConfigs('categoryConfigs');
    } catch (error) {
      console.error('Error loading category configs:', error);
      this.categoryConfigs = null;
    }
  }

  organizeProducts() {
    // Clear existing intervals
    this.categoryCards.forEach((card) => {
      if (card.autoSlideInterval) {
        clearInterval(card.autoSlideInterval);
      }
    });

    const grouped = new Map<string, Product[]>();

    this.products.forEach((product) => {
      // Use categoryId from product to group
      const categoryId = product.category || 'Other';
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(product);
    });

    // Convert to array and match with category details using categoryId
    let cards = Array.from(grouped.entries()).map(([categoryId, products]) => {
      // Find the category by ID to get the name and other details
      const category = (this.categories.find(
        (cat) => cat.id === categoryId,
      ) || {
        id: categoryId,
        name: categoryId, // Fallback to ID if category not found
        imageURL: '',
        status: true,
        isEnabledForOnlineOrders: true,
        created_at: '',
        updated_at: '',
      }) as Category;
      const card = {
        category,
        products: [...products], // Create a new array copy to avoid reference issues
        currentSlideIndex: 0,
        currentProduct: products[0],
      };
      return card;
    });

    // Apply dynamic sorting from config
    if (this.categoryConfigs) {
      const sortBy = this.categoryConfigs.sortBy || 'priority';
      const sortOrder = this.categoryConfigs.sortOrder || 'desc';

      cards = cards.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'priority':
            comparison =
              (b.category.priority ?? 0) - (a.category.priority ?? 0);
            break;
          case 'name':
            comparison = a.category.name.localeCompare(b.category.name);
            break;
          case 'itemCount':
            comparison = a.products.length - b.products.length;
            break;
          case 'popularity':
            comparison = 0;
            break;
        }
        return sortOrder === 'asc' ? -comparison : comparison;
      });

      // Apply max categories limit
      const maxCategories = this.categoryConfigs.maxCategoriesToShow || 0;
      if (maxCategories > 0 && cards.length > maxCategories) {
        cards = cards.slice(0, maxCategories);
      }
    } else {
      // Default sorting by priority (highest first)
      cards = cards.sort(
        (a, b) => (b.category.priority ?? 0) - (a.category.priority ?? 0),
      );
    }

    this.categoryCards = cards;

    // Set up visibility-based auto-slide after view is ready
    setTimeout(() => {
      this.setupVisibilityBasedAutoSlide();
    }, 100);
  }

  /**
   * Setup intersection observer to track card visibility
   * Only the topmost card that is at least 80% visible will auto-slide
   */
  private setupVisibilityBasedAutoSlide(): void {
    const autoSlideEnabled = this.categoryConfigs?.autoSlideEnabled ?? true;
    if (!autoSlideEnabled) return;

    // Disconnect existing observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    // Create intersection observer with 80% threshold
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.ngZone.run(() => {
          // Update visibility for all observed cards
          entries.forEach((entry) => {
            const cardElement = entry.target as HTMLElement;
            const card = this.categoryCards.find(
              (c) => c.element === cardElement,
            );
            if (card) {
              card.isVisible = entry.intersectionRatio >= 0.8;
              card.visibilityRatio = entry.intersectionRatio;
            }
          });

          // Find the topmost card that meets the 80% visibility threshold
          const visibleCards = this.categoryCards
            .filter((card) => card.isVisible && card.products.length > 1)
            .sort((a, b) => {
              // Sort by DOM position (top to bottom)
              if (a.element && b.element) {
                return (
                  a.element.getBoundingClientRect().top -
                  b.element.getBoundingClientRect().top
                );
              }
              return 0;
            });

          const topVisibleCard = visibleCards[0];

          // If the topmost visible card changed, update auto-slide
          if (topVisibleCard !== this.currentlyVisibleCard) {
            // Clear interval from previous card
            if (this.currentlyVisibleCard?.autoSlideInterval) {
              clearInterval(this.currentlyVisibleCard.autoSlideInterval);
              this.currentlyVisibleCard.autoSlideInterval = undefined;
            }

            // Start interval for new topmost visible card
            if (topVisibleCard) {
              this.currentlyVisibleCard = topVisibleCard;
              const slideInterval =
                this.categoryConfigs?.autoSlideInterval ?? 2000;

              // Trigger first slide immediately
              this.nextSlide(topVisibleCard);

              // Then continue with regular interval
              topVisibleCard.autoSlideInterval = setInterval(() => {
                this.nextSlide(topVisibleCard);
              }, slideInterval);
            } else {
              this.currentlyVisibleCard = undefined;
            }
          }
        });
      },
      {
        root: null, // viewport
        threshold: 0.8, // 80% visibility
      },
    );

    // Observe all category card elements
    const cardElements = document.querySelectorAll(
      '.category-card:not(.view-all-card-container)',
    );
    cardElements.forEach((element, index) => {
      if (index < this.categoryCards.length) {
        this.categoryCards[index].element = element as HTMLElement;
        this.intersectionObserver!.observe(element);
      }
    });
  }

  onProductClick(product: Product) {
    this.productClick.emit(product);
  }

  onCategoryClick(categoryName: string, event: Event) {
    event.stopPropagation();
    this.categoryClick.emit(categoryName);
  }

  // Carousel methods
  nextSlide(card: CategoryCard) {
    card.currentSlideIndex =
      (card.currentSlideIndex + 1) % card.products.length;
    card.currentProduct = card.products[card.currentSlideIndex];
    this.cdr.detectChanges();
  }

  prevSlide(card: CategoryCard, event: Event) {
    event.stopPropagation();
    card.currentSlideIndex =
      card.currentSlideIndex === 0
        ? card.products.length - 1
        : card.currentSlideIndex - 1;
    card.currentProduct = card.products[card.currentSlideIndex];
    this.cdr.detectChanges();
  }

  nextSlideManual(card: CategoryCard, event: Event) {
    event.stopPropagation();
    this.nextSlide(card);
    this.cdr.detectChanges();
  }

  goToSlide(card: CategoryCard, index: number, event: Event) {
    event.stopPropagation();
    card.currentSlideIndex = index;
    card.currentProduct = card.products[index];
    this.cdr.detectChanges();
  }

  getCurrentProduct(card: CategoryCard): Product {
    return card.products[card.currentSlideIndex];
  }

  getCategoryDescription(category: Category): string {
    // Generate description from category products
    const card = this.categoryCards.find(
      (c) => c.category.name === category.name,
    );
    if (!card) return '';

    const itemCount = card.products.length;
    return `${itemCount} item${itemCount !== 1 ? 's' : ''} available`;
  }

  // Favorites management
  async toggleFavorite(product: Product, event: Event) {
    event.stopPropagation();
    await this.favoritesService.toggleFavorite(product);
    // Trigger change detection after toggle
    this.cdr.detectChanges();
  }

  // Use synchronous favorite check to avoid repeated async calls on change detection
  isFavorite(product: Product): boolean {
    return this.favoritesService.isFavoriteSync(product.id);
  }

  // Utility methods
  formatPrice(price: number): string {
    return this.productsService.formatPrice(price);
  }

  trackByCategoryName(index: number, card: CategoryCard): string {
    return card.category.name;
  }

  onViewAllClick() {
    this.router.navigate(['/listing']);
  }
}
