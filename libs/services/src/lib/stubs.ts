// MT007-stub: These are empty stubs to satisfy @zitro/ui type-checking during MT006.
// Real implementations will be added in MT007.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// ---- app-settings.service stubs ----
export interface AppSettings {}
export interface ContactInfo {}
export interface SmsConfigs {}
@Injectable({ providedIn: 'root' })
export class AppSettingsService { // MT007-stub
  manualCacheClear(): Promise<any> { return Promise.resolve(); }
  manualLogout(): Promise<any> { return Promise.resolve(); }
  triggerForceLogoutAllDevices(): Promise<any> { return Promise.resolve(); }
  getOrderCancellationTimeLimit(): number { return 0; }
  getOrderCancellationMessage(key?: string): Promise<string> { return Promise.resolve(''); }
  getRefundInfoMessages(timeLimit?: number): Promise<string[]> { return Promise.resolve([]); }
  getPolicyNoticeMessage(): string { return ''; }
  isOrderCancellationEnabled(): boolean { return false; }
  getCategoryConfigs(key?: string): Promise<any> { return Promise.resolve(null); }
  getWhatsAppLink(): string { return ''; }
  getSmsConfigs(): Promise<any> { return Promise.resolve(null); }
}

// ---- cache-manager.service stubs ----
@Injectable({ providedIn: 'root' })
export class CacheManagerService { // MT007-stub
  getCacheStats(): any { return {}; }
  refreshCache(cacheType?: any): Promise<any> { return Promise.resolve(); }
}

// ---- restaurant-switching.service stubs ----
@Injectable({ providedIn: 'root' })
export class RestaurantSwitchingService { // MT007-stub
  getCurrentRestaurant(): any { return null; }
  currentRestaurant$: Observable<any> = new Observable();
  isSwitching$: Observable<boolean> = new Observable();
}

// ---- cart.service stubs ----
@Injectable({ providedIn: 'root' })
export class CartService { // MT007-stub
  cartChanged: Subject<any> = new Subject();
  getCart(): any[] { return []; }
  getCount(): number { return 0; }
  getTotal(): number { return 0; }
  getItemQuantity(item: any): number { return 0; }
  addToCart(item: any): void {}
  removeFromCart(item: any): void {}
}

// ---- favorites.service stubs ----
export interface FavoriteItem {}
export interface UserProfile {}
@Injectable({ providedIn: 'root' })
export class FavoritesService { // MT007-stub
  isFavoriteSync(productId: string): boolean { return false; }
  toggleFavorite(product: any): Promise<any> { return Promise.resolve(); }
  addToFavorites(product: any): Promise<any> { return Promise.resolve(); }
  removeFromFavorites(productId: string): Promise<any> { return Promise.resolve(); }
}

// ---- products.service stubs ----
@Injectable({ providedIn: 'root' })
export class ProductsService { // MT007-stub
  formatPrice(price: number): string { return ''; }
  getOnlineEnabledProducts(): Promise<any[]> { return Promise.resolve([]); }
}

// ---- coupon.service stubs ----
@Injectable({ providedIn: 'root' })
export class CouponService { // MT007-stub
  getActiveCoupons(): Observable<any[]> { return new Observable(); }
  validateCoupon(code: string, cartTotal: number, cartItems?: any[]): Observable<any> { return new Observable(); }
  getCouponByCode(code: string): Observable<any> { return new Observable(); }
}

// ---- user-management.service stubs ----
export interface UserAddress {
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: string;
  isDefault: boolean;
  created_at: string;
  updated_at: string;
}
export interface CouponUsage {}
export interface OnlineUser {}
@Injectable({ providedIn: 'root' })
export class UserManagementService { // MT007-stub
  currentUserPhone$: Observable<string | null> = new Observable();
  userProfile$: Observable<any> = new Observable();
  isLoggedIn(): Promise<boolean> { return Promise.resolve(false); }
  getCurrentUserPhone(): Promise<string | null> { return Promise.resolve(null); }
  getUserData(phone: string, hardRefresh?: boolean): Promise<any> { return Promise.resolve(null); }
}

// ---- analytics.service stubs ----
@Injectable({ providedIn: 'root' })
export class AnalyticsService { // MT007-stub
  logAddToCart(item: any): Promise<void> { return Promise.resolve(); }
  logRemoveFromCart(item: any): Promise<void> { return Promise.resolve(); }
}

// ---- location-selection.service stubs ----
export interface SelectedLocation {
  label: string;
  address: string;
  type: 'gps' | 'saved' | 'nearby' | 'none';
  coordinates?: { lat: number; lng: number };
}
export interface NearbyPlace {
  name: string;
  address: string;
  distanceMeters: number;
  coordinates: { lat: number; lng: number };
}
export interface SearchSuggestion {
  name: string;
  fullAddress: string;
  coordinates: { lat: number; lng: number };
}
@Injectable({ providedIn: 'root' })
export class LocationSelectionService { // MT007-stub
  openTrigger$: Observable<void> = new Observable();
  sheetOpen$: Observable<boolean> = new Observable();
  selectedLocation$: Observable<SelectedLocation | null> = new Observable();
  close(): void {}
  setLocation(loc: SelectedLocation): void {}
  setSelectedSavedAddress(addr: UserAddress): void {}
  searchAddresses(query: string, coords?: { lat: number; lng: number }): Promise<SearchSuggestion[]> { return Promise.resolve([]); }
  reverseGeocode(lat: number, lng: number): Promise<string> { return Promise.resolve(''); }
  useCurrentGPS(): Promise<SelectedLocation> { return Promise.resolve({ label: '', address: '', type: 'gps' }); }
  getNearbyPlaces(coords: { lat: number; lng: number }): Promise<NearbyPlace[]> { return Promise.resolve([]); }
  getDistanceLabel(from: { lat: number; lng: number }, to: { lat: number; lng: number }): string { return ''; }
  getCachedLocation(): SelectedLocation { return { label: '', address: '', type: 'none' }; }
}

// ---- location.service stubs ----
@Injectable({ providedIn: 'root' })
export class LocationService { // MT007-stub
  getCachedLocation(): SelectedLocation { return { label: '', address: '', type: 'none' }; }
  getCurrentLocation(): Promise<{ lat: number; lng: number }> { return Promise.resolve({ lat: 0, lng: 0 }); }
}

// ---- firebase-auth.service stubs ----
@Injectable({ providedIn: 'root' })
export class FirebaseAuthService { // MT007-stub
  signOut(): Promise<any> { return Promise.resolve(); }
  getTestPhoneNumbers(): string[] { return []; }
  getSmsConfigs(): Promise<any> { return Promise.resolve(null); }
}

// ---- order-processing.service stubs ----
export interface OrderProcessingStage {
  stage: 'validating' | 'creating' | 'processing' | 'confirming' | 'completed' | 'error';
  message: string;
  progress: number;
  error?: string;
}
@Injectable({ providedIn: 'root' })
export class OrderProcessingService { // MT007-stub
  processing$: Observable<OrderProcessingStage> = new Observable();
  getCurrentStage(): OrderProcessingStage { return { stage: 'validating', message: '', progress: 0 }; }
  updateStage(stage: OrderProcessingStage['stage'], customMessage?: string, error?: string): void {}
  processStageWithDelay(stage: OrderProcessingStage['stage'], minDelay?: number): Promise<void> { return Promise.resolve(); }
  reset(): void {}
}

// ---- image-cache.service stubs ----
@Injectable({ providedIn: 'root' })
export class ImageCacheService { // MT007-stub
  getImage(url: string): Promise<string> { return Promise.resolve(url); }
}

// ---- banner.service stubs ----
@Injectable({ providedIn: 'root' })
export class BannerService { // MT007-stub
  setActiveBannerConfigs(configs: any): void {}
  getBanners(): Promise<any[]> { return Promise.resolve([]); }
}

// ---- categories.service stubs ----
export interface Category {
  id: string;
  name: string;
  imageURL: string;
  status: boolean;
  isEnabledForOnlineOrders: boolean;
  created_at: string;
  updated_at: string;
  priority?: number;
}
@Injectable({ providedIn: 'root' })
export class CategoriesService { // MT007-stub
  getCategories(): Promise<Category[]> { return Promise.resolve([]); }
}
