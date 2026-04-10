import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriesService, Category } from '@zitro/services';
import { ProductsService } from '@zitro/services';
import { Product } from '@zitro/models';
import { ItemSliderComponent } from '@zitro/ui';
import { CategoryCardsComponent } from '@zitro/ui';
import { CartSummaryComponent } from '@zitro/ui';
import { BannerComponent } from '@zitro/ui';
import { ItemDetailsDialogComponent } from '@zitro/ui';
import { CategoriesComponent } from './categories/categories.component';
import { LoaderComponent } from '@zitro/ui';
import { COMMON_CONSTANTS } from '../../core/constants/app.constants';
import { AnalyticsService } from '@zitro/services';
import { ItemSliderConfig } from '@zitro/models';
import { AppSettingsService } from '@zitro/services';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ItemSliderComponent, CategoryCardsComponent, CartSummaryComponent, BannerComponent, ItemDetailsDialogComponent, CategoriesComponent, LoaderComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  categories: Category[] = [];
  isLoadingCategories = true;
  
  // Popular items
  popularProducts: Product[] = [];
  isLoadingProducts = true;
  maxPopularItems = 7; // Show 7 popular items initially

  // Recommended items
  recommendedProducts: Product[] = [];
  isLoadingRecommended = true;

  // All items for category display
  allProducts: Product[] = [];
  isLoadingAllProducts = true;

  // Search functionality
  searchQuery = '';
  isListening = false;

  // Pure veg filter toggle (default ON, no API yet)
  isPureVeg: boolean = true;

  togglePureVeg(): void {
    this.isPureVeg = !this.isPureVeg;
  }

  // Item details dialog
  showItemDialog: boolean = false;
  selectedItem: any = null;

  // Scroll tracking flags
  private hasScrolledToRecommended = false;
  private hasScrolledToPopular = false;
  private hasScrolledToCategories = false;
  itemSliderConfigs: ItemSliderConfig | null = null;
  recommendedItemSlideCount: number = 15;
  popularItemSlideCount: number = 15;

  constructor(
    private router: Router,
    private categoriesService: CategoriesService,
    private productsService: ProductsService,
    private analyticsService: AnalyticsService,
    private appSettingsService: AppSettingsService
  ) {}

  async ngOnInit() {
    // Track screen view
    await this.loadItemSliderConfigs();
    await this.analyticsService.logScreenView('Home', 'HomeComponent');
    
    await this.loadCategories();
    await this.loadPopularProducts();
    await this.loadRecommendedProducts();
    await this.loadAllProducts();
    
    // Setup scroll listener for analytics
    this.setupScrollTracking();
  }

  ngOnDestroy() {
    // Remove scroll listener
    window.removeEventListener('scroll', this.handleScroll);
  }

  /**
   * Setup scroll tracking for analytics
   */
  private setupScrollTracking() {
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  /**
   * Handle scroll event and track section visibility
   */
  private handleScroll() {
    try {
      const scrollPosition = window.scrollY + window.innerHeight;
      
      // Track Recommended section
      if (!this.hasScrolledToRecommended) {
        const recommendedElement = document.querySelector('app-item-slider:nth-of-type(1)');
        if (recommendedElement) {
          const rect = recommendedElement.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            this.hasScrolledToRecommended = true;
            this.analyticsService.logScrollToRecommended().catch(err => 
              console.warn('Failed to log scroll to recommended:', err)
            );
          }
        }
      }

      // Track Popular section
      if (!this.hasScrolledToPopular) {
        const popularElement = document.querySelector('app-item-slider:nth-of-type(2)');
        if (popularElement) {
          const rect = popularElement.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            this.hasScrolledToPopular = true;
            this.analyticsService.logScrollToPopular().catch(err => 
              console.warn('Failed to log scroll to popular:', err)
            );
          }
        }
      }

      // Track Categories section
      if (!this.hasScrolledToCategories) {
        const categoriesElement = document.querySelector('app-category-cards');
        if (categoriesElement) {
          const rect = categoriesElement.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            this.hasScrolledToCategories = true;
            this.analyticsService.logScrollToCategories().catch(err => 
              console.warn('Failed to log scroll to categories:', err)
            );
          }
        }
      }
    } catch (error) {
      // Silently catch any scroll tracking errors to prevent app crashes
      console.warn('Error in scroll tracking:', error);
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

  async loadPopularProducts() {
    try {
      this.isLoadingProducts = true;
      // Use the new method to get products sorted by online popularity
      this.popularProducts = await this.productsService.getPopularOnlineProducts();
      
      console.log('Loaded', this.popularProducts.length, 'popular online-enabled products');
      
    } catch (error) {
      console.error('Error loading popular products:', error);
      this.popularProducts = [];
    } finally {
      this.isLoadingProducts = false;
    }
  }

  async loadRecommendedProducts() {
    try {
      this.isLoadingRecommended = true;
      this.recommendedProducts = await this.productsService.getRecommendedOnlineProducts();
      console.log('Loaded', this.recommendedProducts.length, 'recommended products');
    } catch (error) {
      console.error('Error loading recommended products:', error);
      this.recommendedProducts = [];
    } finally {
      this.isLoadingRecommended = false;
    }
  }

  async loadItemSliderConfigs() {
    try {
      this.itemSliderConfigs = await this.appSettingsService.getCategoryConfigs('itemSlider');
      this.recommendedItemSlideCount = this.itemSliderConfigs?.recommended?.defaultItemCount || 1;
      this.popularItemSlideCount = this.itemSliderConfigs?.popular?.defaultItemCount || 2;
    } catch (error) {
      console.error('Error loading item slider configs:', error);
      this.itemSliderConfigs = null;
    }
  }

  async loadAllProducts() {
    try {
      this.isLoadingAllProducts = true;
      this.allProducts = await this.productsService.getOnlineProducts();
      console.log('Loaded', this.allProducts.length, 'products for category display');
    } catch (error) {
      console.error('Error loading all products:', error);
      this.allProducts = [];
    } finally {
      this.isLoadingAllProducts = false;
    }
  }

  navigateToCategory(categoryName: string = '') {
    if (!categoryName) {
      // "View all" clicked - navigate to category listing page
      this.router.navigate(['/categories']);
      return;
    }
    
    // Specific category clicked - navigate to listing page with category filter
    this.router.navigate(['/listing'], { 
      queryParams: { category: categoryName } 
    });
  }

  onProductClick(product: Product) {
    try {
      // Track product view
      this.analyticsService.logViewProduct({
        id: product.id || '',
        name: product.name,
        category: product.category,
        price: product.price
      }).catch(err => console.warn('Failed to log product view:', err));
      
      // Show item details dialog with complete product data including variations
      this.selectedItem = {
        id: product.id,
        name: product.name,
        imageURL: product.imageURL,
        title: product.name,
        description: product.description,
        weight: product.weight,
        offer: !product.isOfferDisabled ? COMMON_CONSTANTS.OFFER_APPLICABLE_TEXT : undefined,
        price: product.price,
        hasVariations: product.hasVariations ?? false,
        variations: product.variations ?? [],
        selectedVariationId: product.selectedVariationId ?? undefined,
        category: product.category,
        isEnabledForOnlineOrders: product.isEnabledForOnlineOrders,
        isOfferDisabled: product.isOfferDisabled,
        status: product.status
      };
      this.showItemDialog = true;
    } catch (error) {
      console.warn('Error in product click handler:', error);
      // Still show the dialog even if analytics fails
      this.selectedItem = {
        id: product.id,
        name: product.name,
        imageURL: product.imageURL,
        title: product.name,
        description: product.description,
        weight: product.weight,
        offer: !product.isOfferDisabled ? COMMON_CONSTANTS.OFFER_APPLICABLE_TEXT : undefined,
        price: product.price,
        hasVariations: product.hasVariations ?? false,
        variations: product.variations ?? [],
        selectedVariationId: product.selectedVariationId ?? undefined,
        category: product.category,
        isEnabledForOnlineOrders: product.isEnabledForOnlineOrders,
        isOfferDisabled: product.isOfferDisabled,
        status: product.status
      };
      this.showItemDialog = true;
    }
  }

  onCategoryCardClick(categoryName: string) {
    try {
      // Track category view
      this.analyticsService.logViewCategory(categoryName, categoryName)
        .catch(err => console.warn('Failed to log category view:', err));
      
      // Navigate to listing page with category filter
      this.router.navigate(['/listing'], { 
        queryParams: { category: categoryName } 
      });
    } catch (error) {
      console.warn('Error in category click handler:', error);
      // Still navigate even if analytics fails
      this.router.navigate(['/listing'], { 
        queryParams: { category: categoryName } 
      });
    }
  }

  onViewAllClick() {
    // Navigate to listing page to show all products
    this.router.navigate(['/listing']);
  }

  onRecommendedViewAllClick() {
    // Navigate to listing page to show all recommended products
    this.router.navigate(['/listing'], { 
      queryParams: { recommended: 'true' } 
    });
  }

  onCartUpdated() {
    // Handle cart updates if needed
    // This could trigger cart count updates or other UI refresh
  }

  // Search functionality methods
  onSearch() {
    if (this.searchQuery.trim()) {
      try {
        // Navigate to listing page with search query
        // Search analytics will be logged in listing page with results count
        this.router.navigate(['/listing'], {
          queryParams: { search: this.searchQuery.trim() }
        });
      } catch (error) {
        console.warn('Error in search handler:', error);
        // Still navigate even if error occurs
        this.router.navigate(['/listing'], {
          queryParams: { search: this.searchQuery.trim() }
        });
      }
    }
  }

  onSearchInput(event: any) {
    this.searchQuery = event.target.value;
  }

  clearSearch() {
    this.searchQuery = '';
  }

  startVoiceSearch() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }
    if (this.isListening) return; // prevent double-tap
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    this.isListening = true;
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      this.searchQuery = transcript;
      this.isListening = false;
      this.onSearch();
    };
    recognition.onerror = () => { this.isListening = false; };
    recognition.onend = () => { this.isListening = false; };
    recognition.start();
  }

  onCloseItemDialog(): void {
    this.showItemDialog = false;
    this.selectedItem = null;
  }
}
