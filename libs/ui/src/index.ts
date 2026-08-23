// Common (T012)
export { LoaderComponent as EvolvedLoaderComponent } from './common/loader/loader.component';
export type { LoaderConfig } from './common/loader/loader.component';
export { LOADER_DEFAULT_CONFIG } from './common/loader/loader.component';
export * from './common/empty-state/empty-state.component';
export * from './common/coming-soon/coming-soon.component';
export * from './common/error-state/error-state.component';
export { NoInternetComponent as EvolvedNoInternetComponent } from './common/no-internet/no-internet.component';
export {
  SplashScreenComponent as EvolvedSplashScreenComponent,
  SPLASH_SCREEN_DEFAULT_CONFIG,
} from './common/splash-screen/splash-screen.component';
export type { SplashScreenConfig } from './common/splash-screen/splash-screen.component';

// Directives
export { CachedImageDirective } from './directives/cached-image.directive';

// Common (T013)
export * from './common/truncated-text/truncated-text.component';
export * from './common/zoomable-image/zoomable-image.component';
export * from './common/confirmation-dialog/confirmation-dialog.component';
export * from './common/excel-grid/excel-grid.component';
export * from './common/bottom-sheet/bottom-sheet.component';
export * from './common/map-picker/map-picker.component';
export * from './common/location-picker/location-picker.component';
export * from './common/polygon-map-picker/polygon-map-picker.component';

// Common (T014)
export * from './common/theme-picker/theme-picker.component';

// Auth (T014)
export * from './auth/phone-input/phone-input.component';
export * from './auth/otp-input/otp-input.component';

// Catalog (T015)
export * from './catalog/category-bar/category-bar.component';
export * from './catalog/search-bar/search-bar.component';
export * from './catalog/product-card/product-card.component';
export * from './catalog/product-grid/product-grid.component';
export * from './catalog/item-detail-sheet/item-detail-sheet.component';

// Cart (T017)
export * from './cart/cart-item-row/cart-item-row.component';
export * from './cart/cart-summary-bar/cart-summary-bar.component';
export * from './cart/pricing-summary/pricing-summary.component';
export * from './cart/floating-cart-preview/floating-cart-preview.component';

// Address (T016)
export * from './address/address-card/address-card.component';
export * from './address/add-address-form/add-address-form.component';
export * from './address/address-list/address-list.component';

// Order (T018)
export * from './order/order-status-badge/order-status-badge.component';
export * from './order/order-card/order-card.component';
export * from './order/order-timeline/order-timeline.component';

// Ratings (T018)
export * from './ratings/star-rating/star-rating.component';
export * from './ratings/rating-summary/rating-summary.component';

// Banners (T018)
export * from './banners/banner-carousel/banner-carousel.component';

// Common update-dialog (T018 — evolved, selector lib-update-dialog)
export * from './common/update-dialog/update-dialog.component';

// Components (legacy migrated — evolved versions are in common/)
export * from './components/banner/banner.component';
export * from './components/business-card/business-card.component';
export * from './components/bottom-nav/bottom-nav.component';
export * from './components/call-restaurant-button/call-restaurant-button.component';
export * from './components/cancel-order-dialog/cancel-order-dialog.component';
export * from './components/cart-summary/cart-summary.component';
// confirmation-dialog evolved → common/confirmation-dialog
export * from './components/coupon-selector-cart/coupon-selector-cart.component';
export * from './components/coupon-selector/coupon-selector.component';
export * from './components/delivery-range-dialog.component';
export * from './components/description-dialog/description-dialog.component';
export * from './components/footer/footer.component';
export * from './components/loader/loader.component';
export * from './components/location-bottom-sheet/location-bottom-sheet.component';
export * from './components/no-internet/no-internet.component';
export * from './components/order-loading-modal/order-loading-modal.component';
export * from './components/pricing-summary/pricing-summary.component';
export * from './components/sidebar/sidebar.component';
export * from './components/splash-screen/splash-screen.component';
// truncated-text evolved → common/truncated-text
export * from './components/update-dialog/update-dialog.component';
export * from './components/view-all-card/view-all-card.component';
export * from './components/whatsapp-button/whatsapp-button.component';
// zoomable-image evolved → common/zoomable-image

// Directives
export * from './directives/cached-image.directive';
export * from './directives/swipe-back.directive';
