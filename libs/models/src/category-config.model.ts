export interface CategoryConfig {
  // Display Settings
  heading1?: string;
  heading2?: string;
  heading3?: string;
  sliderMessage?: string;

  // Carousel Settings
  autoSlideEnabled?: boolean;
  autoSlideInterval?: number;
  slideStaggerDelay?: number;

  // UI Settings
  showPriceOnImage?: boolean;
  pricePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showFavoriteButton?: boolean;
  showNavigationArrows?: boolean;
  showCarouselIndicators?: boolean;

  // Card Layout
  cardHeight?: number;
  showCategoryMeta?: boolean;
  showOfferBadge?: boolean;

  // Sorting & Display
  sortBy?: 'name' | 'popularity' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
  maxCategoriesToShow?: number;

  // View All Settings
  showViewAllCard?: boolean;
  viewAllLabel?: string;
  viewAllDescription?: string;

  // Icon Settings
  metaIcons?: {
    time?: string;
    location?: string;
    delivery?: string;
  };
}
