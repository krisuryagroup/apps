import { Injectable } from '@angular/core';
import { collection, getDocs, Firestore, getFirestore, query, where } from 'firebase/firestore';
import { FirebaseStorageUtil } from '@zitro/utils';
import { Product } from '@zitro/models'; // Import from model file
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';
import { CategoriesService } from './categories.service';
import { 
  FIREBASE_COLLECTIONS, 
  CACHE_KEYS, 
  CACHE_DURATIONS,
  CURRENCY,
  CacheType 
} from '@zitro/utils';

// Firebase Product interface for mapping data from Firestore
interface FirebaseProduct {
  name: string;
  category: string;
  price: number;
  imageURL: string;
  status: boolean;
  stock: number;
  created_at: string;
  updated_at: string;
  popularity?: number;
  isRecommended?: boolean;
  isEnabledForOnlineOrders?: boolean;
  popularityForOnlineOrders?: number;
  description?: string;
  weight?: string;
  isNew?: boolean;
  isSpicy?: boolean;
  dietaryPreferences?: string[];
  isOfferDisabled?: boolean;
  isMRPItem?: boolean;
  // New for variations
  hasVariations?: boolean;
  variations?: any[];
  selectedVariationId?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private db!: Firestore; // Using definite assignment assertion

  constructor(
    private cacheService: CacheService,
    private errorHandler: FirebaseErrorHandlerService,
    private cacheManager: CacheManagerService,
    private categoriesService: CategoriesService
  ) {
    this.initializeFirestore();
  }

  private initializeFirestore(): void {
    // Get Firestore instance from the current app
    try {
      this.db = getFirestore();
      console.log('✅ Firestore initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Firestore:', error);
      // Set a fallback - this will be handled in the getProducts method
      throw new Error('Unable to initialize Firestore. Please check Firebase configuration.');
    }
  }

  /**
   * Map category IDs to category names for products
   * @param products Array of products to map
   * @returns Promise with products containing categoryName
   */
  private async mapCategoryNames(products: Product[]): Promise<Product[]> {
    try {
      const categories = await this.categoriesService.getCategories();
      const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
      
      return products.map(product => ({
        ...product,
        categoryName: product.category ? categoryMap.get(product.category) : undefined
      }));
    } catch (error) {
      console.error('Error mapping category names:', error);
      // Return products without categoryName if mapping fails
      return products;
    }
  }

  /**
   * Get products by their IDs from Firebase
   * @param ids Array of product IDs to fetch
   * @returns Promise with array of products
   */
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    try {
      const productsCollection = collection(this.db, FIREBASE_COLLECTIONS.PRODUCTS);
      const products: Product[] = [];

      // Fetch each product individually by ID
      // Note: Firestore 'in' queries have a limit of 10 items, so we batch if needed
      const batchSize = 10;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batchIds = ids.slice(i, i + batchSize);
        const productsQuery = query(productsCollection, where('__name__', 'in', batchIds));
        const productsSnapshot = await getDocs(productsQuery);
        
        productsSnapshot.docs.forEach(doc => {
          const data = doc.data() as FirebaseProduct;
          products.push({
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            category: data.category,
            imageURL: data.imageURL ? FirebaseStorageUtil.convertStorageUrlToHttps(data.imageURL) : '',
            status: data.status,
            stock: data.stock,
            created_at: data.created_at,
            updated_at: data.updated_at,
            popularity: data.popularity,
            priority: typeof (data as any).priority === 'number' ? (data as any).priority : Number((data as any).priority) || 0,
            isRecommended: data.isRecommended,
            description: data.description,
            weight: data.weight,
            isNew: data.isNew,
            isSpicy: data.isSpicy,
            dietaryPreferences: data.dietaryPreferences,
            isOfferDisabled: data.isOfferDisabled,
            isMRPItem: data.isMRPItem,
            isEnabledForOnlineOrders: data.isEnabledForOnlineOrders ?? false,
            popularityForOnlineOrders: data.popularityForOnlineOrders,
            hasVariations: data.hasVariations ?? false,
            variations: data.variations ?? [],
            selectedVariationId: data.selectedVariationId ?? undefined,
          } as Product);
        });
        // Sort by priority descending (highest first)
        products.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      }

      console.log(`✅ Fetched ${products.length} products by IDs from Firebase`);
      
      // Map category names
      const productsWithCategoryNames = await this.mapCategoryNames(products);
      return productsWithCategoryNames;
    } catch (error) {
      console.error('❌ Error fetching products by IDs from Firebase:', error);
      await this.errorHandler.handleAndLogError(
        error,
        'ProductsService.getProductsByIds',
        { ids }
      );
      return [];
    }
  }

  async getProducts(): Promise<Product[]> {
    // Check if we have cached data with records
    // const cachedData = this.getCachedProducts();
    // if (cachedData && cachedData.length > 0) {
    //   console.log('Using cached products data');
    //   return cachedData;
    // }

    // Fetch from Firebase if no cache, cache expired, or cache is empty
    console.log('Fetching products from Firebase (only online enabled)');
    try {
      const productsCollection = collection(this.db, FIREBASE_COLLECTIONS.PRODUCTS);
      
      // Try to fetch all products first, then filter if needed
      let productsSnapshot;
      try {
        // First try with query filter
        const productsQuery = query(productsCollection, where('isEnabledForOnlineOrders', '==', true));
        productsSnapshot = await getDocs(productsQuery);
      } catch (queryError) {
        console.warn('Query with filter failed, trying to fetch all products:', queryError);
        // If query fails, try to fetch all products
        productsSnapshot = await getDocs(productsCollection);
      }
      
      const products: Product[] = productsSnapshot.docs.map(doc => {
        const data = doc.data() as FirebaseProduct;
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          category: data.category,
          imageURL: data.imageURL ? FirebaseStorageUtil.convertStorageUrlToHttps(data.imageURL) : '',
          status: data.status,
          stock: data.stock,
          created_at: data.created_at,
          updated_at: data.updated_at,
          popularity: data.popularity,
          priority: typeof (data as any).priority === 'number' ? (data as any).priority : Number((data as any).priority) || 0,
          isRecommended: data.isRecommended,
          description: data.description,
          weight: data.weight,
          isNew: data.isNew,
          isSpicy: data.isSpicy,
          dietaryPreferences: data.dietaryPreferences,
          isOfferDisabled: data.isOfferDisabled,
          isMRPItem: data.isMRPItem,
          // New online order fields with proper defaults
          isEnabledForOnlineOrders: data.isEnabledForOnlineOrders ?? false, // Default to disabled
          popularityForOnlineOrders: data.popularityForOnlineOrders,
          hasVariations: data.hasVariations ?? false,
          variations: data.variations ?? [],
          selectedVariationId: data.selectedVariationId ?? undefined,
        } as Product;
      }).filter(product => product.isEnabledForOnlineOrders); // Filter on client side if query failed

      // Sort by priority descending (highest first)
      products.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      // Map category names before caching
      const productsWithCategoryNames = await this.mapCategoryNames(products);

      // Cache the data
      this.cacheProducts(productsWithCategoryNames);
      
      console.log(`✅ Successfully loaded ${productsWithCategoryNames.length} products from Firebase with category names`);
      return productsWithCategoryNames;
    } catch (error) {
      console.error('❌ Error fetching products from Firebase:', error);
      
      // Use the error handler service
      const errorInfo = this.errorHandler.handleError(error);
      
      // Log specific guidance based on error type
      if (this.errorHandler.isPermissionError(error)) {
        console.log('🔒 PERMISSION DENIED - Please update Firebase Security Rules:');
        console.log('1. Go to Firebase Console > Firestore Database > Rules');
        console.log('2. Update rules to allow read access (see FIREBASE_RULES_FIX.md)');
        console.log('3. For development, use: allow read, write: if true;');
      }
      
      // Return empty array instead of throwing error
      console.log('📦 Returning empty products array due to Firebase error');
      return [];
    }
  }

  private getCachedProducts(): Product[] | null {
    try {
      // Use CacheManagerService to get cached products
      const cachedData = this.cacheManager.getCachedData<Product[]>(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP
      );
      
      if (cachedData) {
        console.log('✅ Products cache hit for restaurant:', this.cacheService.getCurrentRestaurantId(), '- found', cachedData.length, 'products');
      }else{
        console.log('❌ Products cache miss for restaurant:', this.cacheService.getCurrentRestaurantId());
      }
      
      return cachedData;
    } catch (error) {
      console.error('Error reading cached products:', error);
      return null;
    }
  }

  private cacheProducts(products: Product[]): void {
    try {
      // Only cache if we have records
      if (!products || products.length === 0) {
        console.log('⚠️ ProductsService: No products to cache, skipping cache save');
        return;
      }
      
      // Get dynamic cache duration from CacheManagerService
      const duration = this.cacheManager.getCacheDuration(CacheType.PRODUCTS);
      
      this.cacheManager.setCachedData(
        CacheType.PRODUCTS,
        CACHE_KEYS.PRODUCTS_CACHE,
        CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP,
        products
      );
      
      console.log('✅ Products cached successfully for restaurant:', this.cacheService.getCurrentRestaurantId(), '- cached', products.length, 'products', `(Duration: ${duration / (1000 * 60 * 60 * 24)} days)`);
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }

  /**
   * Clear cached products data (restaurant-specific)
   */
  clearCache(): void {
    this.cacheManager.clearCache(
      CacheType.PRODUCTS,
      CACHE_KEYS.PRODUCTS_CACHE,
      CACHE_KEYS.PRODUCTS_CACHE_TIMESTAMP
    );
    console.log('🗑️ Products cache cleared for restaurant:', this.cacheService.getCurrentRestaurantId());
  }

  // Helper method to format price in rupees
  formatPrice(price: number): string {
    return `${CURRENCY.SYMBOL}${price}`;
  }

  // Helper method to check if product is available (for general availability, not specific to online orders)
  isProductAvailable(product: Product): boolean {
    return (product.status ?? false) && (product.stock ?? 0) > 0;
  }

  // Method to force refresh data from Firebase
  async refreshProducts(): Promise<Product[]> {
    this.clearCache();
    return this.getProducts();
  }

  // Method to search products
  async searchProducts(searchTerm: string): Promise<Product[]> {
    const allProducts = await this.getProducts();
    const term = searchTerm.toLowerCase();
    
    return allProducts.filter(product =>
      product.name?.toLowerCase()?.includes(term) ||
      product.description?.toLowerCase()?.includes(term) ||
      product.category?.toLowerCase()?.includes(term)
    );
  }

  // Method to search only online-enabled products
  async searchOnlineProducts(searchTerm: string): Promise<Product[]> {
    const onlineProducts = await this.getOnlineEnabledProducts();
    const term = searchTerm.toLowerCase();
    
    return onlineProducts.filter(product =>
      product.name?.toLowerCase()?.includes(term) ||
      product.description?.toLowerCase()?.includes(term) ||
      product.category?.toLowerCase()?.includes(term)
    );
  }

  // Method to get only products enabled for online orders (now same as getProducts since we filter at source)
  async getOnlineProducts(): Promise<Product[]> {
    const allProducts = await this.getProducts();
    return allProducts; // TODO .filter(product => this.isProductAvailable(product))
  }

  // Method to get products where isEnabledForOnlineOrders is explicitly true (now same as getProducts since we filter at source)
  async getOnlineEnabledProducts(): Promise<Product[]> {
    const allProducts = await this.getProducts();
    return allProducts;
  }

  // Method to get recommended products for online orders
  async getRecommendedOnlineProducts(): Promise<Product[]> {
    const allProducts = await this.getProducts();
    return allProducts.filter(product => product.isRecommended === true);
  }

  // Method to get products sorted by online popularity
  async getPopularOnlineProducts(): Promise<Product[]> {
    const allProducts = await this.getOnlineProducts();
    return allProducts
      .filter(product => (product.popularity ?? 0) > 0) // Only products with popularity greater than zero
      .sort((a, b) => {
        // Use popularityForOnlineOrders if available, otherwise fall back to legacy popularity field
        const aPopularity = a.popularity ?? 0;
        const bPopularity = b.popularity ?? 0;
        return bPopularity - aPopularity;
      });
  }

  // Method to get products by category (already filtered for online orders at source)
  async getOnlineProductsByCategory(category: string): Promise<Product[]> {
    const onlineProducts = await this.getProducts();
    return onlineProducts.filter(product => 
      product.category?.toLowerCase() === category.toLowerCase()
    );
  }
}
