import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Product } from '@zitro/models';
import { UserManagementService } from './user-management.service';
import { DialogService } from './dialog.service';
import { CacheService } from './cache.service';
import {
  FIREBASE_COLLECTIONS,
  FIREBASE_SUBCOLLECTIONS,
  PHONE_CONSTANTS,
  AUTH_KEYS,
  CACHE_KEYS,
} from '@zitro/utils';

export interface FavoriteItem {
  id: string;
  productId: string;
  productData: Product;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  phoneNumber: string;
}

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private firestore = inject(Firestore);
  private dialogService = inject(DialogService);
  private cacheService = inject(CacheService);
  private userManagementService = inject(UserManagementService);

  private readonly GUEST_FAVORITES_KEY = 'guest_favorites';
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds
  private currentUserPhone: string | null = null;
  private cachedFavorites: FavoriteItem[] = [];
  isLoggedIn = false;

  constructor() {
    // Subscribe to centralized user state
    this.userManagementService.currentUserPhone$.subscribe((phone) => {
      const prevPhone = this.currentUserPhone;
      this.currentUserPhone = phone;
      this.userManagementService.isLoggedIn().then((isLoggedIn) => {
        this.isLoggedIn = isLoggedIn;
        if (!isLoggedIn) {
          this.loadGuestFavorites();
        } else {
          this.loadCachedFavorites();
        }
        // If user changed from guest to logged in, offer migration
        if (prevPhone === null && phone && isLoggedIn) {
          this.checkAndOfferFavoritesMigration();
        }
      });
    });
  }

  // Removed initializeAuth; user state is now managed via UserManagementService subscription

  /**
   * Set the current user's phone number for favorites management
   */
  setCurrentUser(phoneNumber: string): void {
    this.currentUserPhone = phoneNumber;
    this.loadCachedFavorites();
  }

  /**
   * Get current user's phone number
   */
  getCurrentUserPhone(): string | null {
    return this.currentUserPhone;
  }

  /**
   * Force refresh current user phone (useful after login)
   */
  refreshCurrentUser(): void {
    this.loadCurrentUserPhone();
    console.log('Refreshed current user:', this.currentUserPhone);
  }

  /**
   * Load current user phone from storage or authentication service
   */
  private loadCurrentUserPhone(): void {
    if (!this.isLoggedIn) {
      console.log('User is in guest mode, loading guest favorites');
      this.currentUserPhone = null;
      this.loadGuestFavorites();
      return;
    }

    // Try to get from localStorage first
    const storedPhone = localStorage.getItem(AUTH_KEYS.CURRENT_USER_PHONE);
    const storedToken = localStorage.getItem(AUTH_KEYS.TOKEN);

    if (storedPhone && storedToken) {
      this.currentUserPhone = storedPhone;
      this.loadCachedFavorites();
      console.log(
        'Loaded current user phone from storage:',
        this.currentUserPhone,
      );
      return;
    }

    // If no stored phone but we have a token, try to construct phone from token
    if (storedToken && this.isLoggedIn) {
      // For development mode tokens like 'dev_user_1234567890'
      if (storedToken.startsWith('dev_user_')) {
        const phoneNumber = storedToken.replace('dev_user_', '');
        this.currentUserPhone = `${PHONE_CONSTANTS.INDIA_CODE}${phoneNumber}`;
        localStorage.setItem(
          AUTH_KEYS.CURRENT_USER_PHONE,
          this.currentUserPhone,
        );
        this.loadCachedFavorites();
        console.log(
          'Constructed current user phone from token:',
          this.currentUserPhone,
        );
        return;
      }

      // For other tokens, use the token as identifier
      this.currentUserPhone = storedToken;
      localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, this.currentUserPhone);
      this.loadCachedFavorites();
      console.log(
        'Using token as current user identifier:',
        this.currentUserPhone,
      );
    }
  }

  /**
   * Get all favorite items for the current user (supports both guest and authenticated users)
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    // Handle guest users
    if (!this.isLoggedIn) {
      return this.getGuestFavorites();
    }

    // If currentUserPhone is null but we're not in guest mode, try to load it
    if (!this.currentUserPhone) {
      this.loadCurrentUserPhone();
    }

    if (!this.currentUserPhone) {
      console.warn('No current user phone number set for favorites');
      return [];
    }

    // Check cache first
    const cachedData = this.getCachedFavorites();
    if (cachedData && cachedData.length > 0) {
      return cachedData;
    }

    try {
      // Fetch from Firebase
      const favoritesRef = collection(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        this.currentUserPhone,
        FIREBASE_SUBCOLLECTIONS.USER_FAVORITES,
      );
      const snapshot = await getDocs(favoritesRef);

      const favorites: FavoriteItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        favorites.push({
          id: doc.id,
          productId: data['productId'] || '',
          productData: data['productData'] || {},
          createdAt: data['createdAt'] || new Date().toISOString(),
          updatedAt: data['updatedAt'] || new Date().toISOString(),
        } as FavoriteItem);
      });

      // Cache the data
      this.setCachedFavorites(favorites);
      this.cachedFavorites = favorites;

      return favorites;
    } catch (error) {
      console.error('Error fetching favorites from Firebase:', error);
      return [];
    }
  }

  /**
   * Add a product to favorites (supports both guest and authenticated users)
   */
  async addToFavorites(product: Product): Promise<boolean> {
    // Handle guest users
    if (!this.isLoggedIn) {
      return this.addToGuestFavorites(product);
    }

    // If currentUserPhone is null but we're not in guest mode, try to load it
    if (!this.currentUserPhone) {
      this.loadCurrentUserPhone();
    }

    if (!this.currentUserPhone) {
      console.warn('No current user phone number set for favorites');
      return false;
    }

    try {
      // Remove undefined fields from product
      const cleanProduct = Object.fromEntries(
        Object.entries(product).filter(([_, v]) => v !== undefined),
      );
      const productCast: Product = cleanProduct as Product;
      const favoriteItem: FavoriteItem = {
        id: productCast.id,
        productId: productCast.id,
        productData: productCast,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firebase
      const favoriteRef = doc(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        this.currentUserPhone,
        FIREBASE_SUBCOLLECTIONS.USER_FAVORITES,
        productCast.id,
      );
      await setDoc(favoriteRef, {
        productId: productCast.id,
        productData: productCast,
        createdAt: favoriteItem.createdAt,
        updatedAt: favoriteItem.updatedAt,
      });

      // Update cache
      await this.refreshCachedFavorites();

      console.log('Added product to favorites:', cleanProduct['name']);
      return true;
    } catch (error) {
      console.error('Error adding product to favorites:', error);
      return false;
    }
  }

  /**
   * Remove a product from favorites (supports both guest and authenticated users)
   */
  async removeFromFavorites(productId: string): Promise<boolean> {
    // Handle guest users
    if (!this.isLoggedIn) {
      return this.removeFromGuestFavorites(productId);
    }

    // If currentUserPhone is null but we're not in guest mode, try to load it
    if (!this.currentUserPhone) {
      this.loadCurrentUserPhone();
    }

    if (!this.currentUserPhone) {
      console.warn('No current user phone number set for favorites');
      return false;
    }

    try {
      // Remove from Firebase
      const favoriteRef = doc(
        this.firestore,
        FIREBASE_COLLECTIONS.ONLINE_USERS,
        this.currentUserPhone,
        FIREBASE_SUBCOLLECTIONS.USER_FAVORITES,
        productId,
      );
      await deleteDoc(favoriteRef);

      // Update cache
      await this.refreshCachedFavorites();

      console.log('Removed product from favorites:', productId);
      return true;
    } catch (error) {
      console.error('Error removing product from favorites:', error);
      return false;
    }
  }

  /**
   * Toggle favorite status of a product
   */
  async toggleFavorite(product: Product): Promise<boolean> {
    const isFav = await this.isFavorite(product.id);

    if (isFav) {
      return await this.removeFromFavorites(product.id);
    } else {
      return await this.addToFavorites(product);
    }
  }

  /**
   * Check if a product is in favorites
   */
  async isFavorite(productId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some((fav) => fav.productId === productId);
  }

  /**
   * Check if a product is in favorites (synchronous using cache)
   */
  isFavoriteSync(productId: string): boolean {
    return this.cachedFavorites.some((fav) => fav.productId === productId);
  }

  /**
   * Get favorite products only (returns Product array)
   */
  async getFavoriteProducts(): Promise<Product[]> {
    const favorites = await this.getFavorites();
    return favorites.map((fav) => fav.productData);
  }

  /**
   * Filter an array of products to return only favorites
   */
  async getFavoriteProductsFromList(products: Product[]): Promise<Product[]> {
    const favorites = await this.getFavorites();
    const favoriteIds = new Set(favorites.map((fav) => fav.productId));

    console.log('getFavoriteProductsFromList debug:', {
      inputProductsCount: products.length,
      favoritesCount: favorites.length,
      favoriteIds: Array.from(favoriteIds),
      currentUser: this.currentUserPhone,
    });

    const filteredProducts = products.filter((product) =>
      favoriteIds.has(product.id),
    );
    console.log('Filtered favorite products count:', filteredProducts.length);

    return filteredProducts;
  }

  /**
   * Get cached favorites
   */
  private getCachedFavorites(): FavoriteItem[] | null {
    if (!this.currentUserPhone) return null;

    try {
      const cacheKey = `${CACHE_KEYS.USER_FAVORITES}_${this.currentUserPhone}`;
      const timestampKey = `${cacheKey}_timestamp`;

      // Check cache expiration using CacheService
      if (this.cacheService.isCacheExpired(timestampKey, this.CACHE_DURATION)) {
        this.cacheService.removeItem(cacheKey);
        this.cacheService.removeItem(timestampKey);
        return null;
      }

      const cached = this.cacheService.getCachedData<FavoriteItem[]>(cacheKey);
      if (cached) {
        console.log(
          '🚀 FavoritesService: Using cached favorites for restaurant:',
          this.cacheService.getCurrentRestaurantId(),
          'User:',
          this.currentUserPhone,
        );
      }

      return cached;
    } catch (error) {
      console.error('Error reading cached favorites:', error);
      if (this.currentUserPhone) {
        const cacheKey = `${CACHE_KEYS.USER_FAVORITES}_${this.currentUserPhone}`;
        const timestampKey = `${cacheKey}_timestamp`;
        this.cacheService.removeItem(cacheKey);
        this.cacheService.removeItem(timestampKey);
      }
      return null;
    }
  }

  /**
   * Set cached favorites
   */
  private setCachedFavorites(favorites: FavoriteItem[]): void {
    if (!this.currentUserPhone) return;

    try {
      const cacheKey = `${CACHE_KEYS.USER_FAVORITES}_${this.currentUserPhone}`;
      const timestampKey = `${cacheKey}_timestamp`;

      // Use CacheService for restaurant-specific caching
      this.cacheService.setCachedData(cacheKey, favorites);
      this.cacheService.setCacheTimestamp(timestampKey);

      console.log(
        '💾 FavoritesService: Favorites cached for restaurant:',
        this.cacheService.getCurrentRestaurantId(),
        'User:',
        this.currentUserPhone,
      );
    } catch (error) {
      console.error('Error caching favorites:', error);
    }
  }

  /**
   * Load cached favorites into memory
   */
  private loadCachedFavorites(): void {
    const cached = this.getCachedFavorites();
    this.cachedFavorites = cached || [];
  }

  /**
   * Refresh cached favorites from Firebase
   */
  private async refreshCachedFavorites(): Promise<void> {
    if (!this.currentUserPhone) return;

    try {
      const cacheKey = `${CACHE_KEYS.USER_FAVORITES}_${this.currentUserPhone}`;
      this.cacheService.removeItem(cacheKey);

      const freshFavorites = await this.getFavorites();
      this.cachedFavorites = freshFavorites;
    } catch (error) {
      console.error('Error refreshing cached favorites:', error);
    }
  }

  /**
   * Clear all cached favorites (useful for logout)
   */
  clearCache(): void {
    if (this.currentUserPhone) {
      const cacheKey = `${CACHE_KEYS.USER_FAVORITES}_${this.currentUserPhone}`;
      this.cacheService.removeItem(cacheKey);
    }
    this.cachedFavorites = [];
    this.currentUserPhone = null;
    localStorage.removeItem(AUTH_KEYS.CURRENT_USER_PHONE);
  }

  /**
   * Get favorites count
   */
  async getFavoritesCount(): Promise<number> {
    const favorites = await this.getFavorites();
    return favorites.length;
  }

  /**
   * Get favorites count (synchronous using cache)
   */
  getFavoritesCountSync(): number {
    return this.cachedFavorites.length;
  }

  /**
   * Debug method to check current user and favorites status
   */
  debugStatus(): {
    userPhone: string | null;
    favoritesCount: number;
    cachedCount: number;
  } {
    return {
      userPhone: this.currentUserPhone,
      favoritesCount: this.cachedFavorites.length,
      cachedCount: this.cachedFavorites.length,
    };
  }

  /**
   * Load guest favorites from localStorage (restaurant-specific)
   */
  private loadGuestFavorites(): void {
    const guestFavorites = this.cacheService.getCachedData<FavoriteItem[]>(
      this.GUEST_FAVORITES_KEY,
    );
    if (guestFavorites) {
      this.cachedFavorites = guestFavorites;
      console.log(
        '🚀 FavoritesService: Loaded guest favorites for restaurant:',
        this.cacheService.getCurrentRestaurantId(),
        'Count:',
        this.cachedFavorites.length,
      );
    } else {
      this.cachedFavorites = [];
    }
  }

  /**
   * Save guest favorites to localStorage (restaurant-specific)
   */
  private saveGuestFavorites(): void {
    // Use CacheService for restaurant-specific guest favorites
    this.cacheService.setCachedData(
      this.GUEST_FAVORITES_KEY,
      this.cachedFavorites,
    );
    console.log(
      '💾 FavoritesService: Saved guest favorites for restaurant:',
      this.cacheService.getCurrentRestaurantId(),
      'Count:',
      this.cachedFavorites.length,
    );
  }

  /**
   * Get guest favorites from localStorage (restaurant-specific)
   */
  private getGuestFavorites(): FavoriteItem[] {
    const guestFavorites = this.cacheService.getCachedData<FavoriteItem[]>(
      this.GUEST_FAVORITES_KEY,
    );
    if (guestFavorites) {
      console.log(
        '🚀 FavoritesService: Using cached guest favorites for restaurant:',
        this.cacheService.getCurrentRestaurantId(),
        'Count:',
        guestFavorites.length,
      );
      return guestFavorites;
    }
    return [];
  }

  /**
   * Check if user has guest favorites and offer to migrate them
   */
  public async checkAndOfferFavoritesMigration(): Promise<void> {
    const guestFavorites = this.getGuestFavorites();

    if (guestFavorites.length > 0) {
      // Show confirmation dialog
      const shouldMigrate = await this.showMigrationConfirmation(
        guestFavorites.length,
      );

      if (shouldMigrate) {
        await this.migrateGuestFavorites(guestFavorites);
      } else {
        // Clear guest favorites if user doesn't want to migrate
        this.cacheService.removeItem(this.GUEST_FAVORITES_KEY);
      }
    }
  }

  /**
   * Show migration confirmation dialog
   */
  private async showMigrationConfirmation(count: number): Promise<boolean> {
    return await this.dialogService.showConfirmation({
      title: 'Import Favorites',
      message: `You have ${count} favorite${count > 1 ? 's' : ''} saved from browsing as a guest. Would you like to add them to your account?`,
      confirmText: 'Yes, Add Them',
      cancelText: 'No, Thanks',
    });
  }

  /**
   * Migrate guest favorites to user account
   */
  private async migrateGuestFavorites(
    guestFavorites: FavoriteItem[],
  ): Promise<void> {
    if (!this.currentUserPhone) {
      console.error('Cannot migrate favorites: no current user');
      return;
    }

    try {
      console.log(
        'Migrating',
        guestFavorites.length,
        'guest favorites to user account',
      );

      for (const favorite of guestFavorites) {
        await this.addFavoriteToFirebase(favorite.productData);
      }

      // Clear guest favorites after successful migration
      this.cacheService.removeItem(this.GUEST_FAVORITES_KEY);

      // Refresh user favorites
      await this.refreshCachedFavorites();

      console.log('Successfully migrated guest favorites');
      await this.dialogService.showInfo(
        `Successfully added ${guestFavorites.length} favorite${guestFavorites.length > 1 ? 's' : ''} to your account!`,
        'Favorites Added',
      );
    } catch (error) {
      console.error('Error migrating guest favorites:', error);
      await this.dialogService.showInfo(
        'There was an error adding your favorites to your account. Please try again.',
        'Error',
      );
    }
  }

  /**
   * Add favorite to Firebase (internal method for migration)
   */
  private async addFavoriteToFirebase(product: Product): Promise<void> {
    if (!this.currentUserPhone) {
      throw new Error('No current user');
    }

    const favoriteItem: FavoriteItem = {
      id: product.id,
      productId: product.id,
      productData: product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const favoritesRef = collection(
      this.firestore,
      FIREBASE_COLLECTIONS.ONLINE_USERS,
      this.currentUserPhone,
      FIREBASE_SUBCOLLECTIONS.USER_FAVORITES,
    );
    const favoriteDocRef = doc(favoritesRef, product.id);

    await setDoc(favoriteDocRef, favoriteItem);
  }

  /**
   * Add a product to guest favorites (localStorage)
   */
  private addToGuestFavorites(product: Product): boolean {
    try {
      const guestFavorites = this.getGuestFavorites();

      // Check if already exists
      if (guestFavorites.some((fav) => fav.productId === product.id)) {
        console.log('Product already in guest favorites:', product.name);
        return true;
      }

      const favoriteItem: FavoriteItem = {
        id: product.id,
        productId: product.id,
        productData: product,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      guestFavorites.push(favoriteItem);
      this.cachedFavorites = guestFavorites;
      this.saveGuestFavorites();

      console.log('Added product to guest favorites:', product.name);
      return true;
    } catch (error) {
      console.error('Error adding product to guest favorites:', error);
      return false;
    }
  }

  /**
   * Remove a product from guest favorites (localStorage)
   */
  private removeFromGuestFavorites(productId: string): boolean {
    try {
      const guestFavorites = this.getGuestFavorites();
      const filteredFavorites = guestFavorites.filter(
        (fav) => fav.productId !== productId,
      );

      if (guestFavorites.length === filteredFavorites.length) {
        console.log('Product not found in guest favorites:', productId);
        return true;
      }

      this.cachedFavorites = filteredFavorites;
      this.cacheService.setCachedData(
        this.GUEST_FAVORITES_KEY,
        filteredFavorites,
      );

      console.log('Removed product from guest favorites:', productId);
      return true;
    } catch (error) {
      console.error('Error removing product from guest favorites:', error);
      return false;
    }
  }
}
