import { Injectable } from '@angular/core';
import { Firestore, getFirestore, collection, getDocs } from 'firebase/firestore';
import { BehaviorSubject } from 'rxjs';
import { Banner, BannerConfigs } from '@zitro/models';
import { RequestThrottleService } from './request-throttle.service';
import { FIREBASE_PATHS } from '@zitro/utils';

interface FirebaseBanner {
  id: string;
  title: string;
  description: string;
  imageURL: string;
  isActive: boolean;
  displayOrder: number;
  targetUrl?: string;
  versionCondition?: 'lt' | 'gt' | 'eq';
  versionTarget?: string;
  startDate?: any;
  endDate?: any;
  created_at: any;
  updated_at: any;
  configs?: {
    headerTextColor?: string;
    disableRestaurantStatus?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private db: Firestore;
  private readonly BANNERS_COLLECTION_PATH = FIREBASE_PATHS.BANNERS;
  private bannersCache: Banner[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private fetchPromise: Promise<Banner[]> | null = null;
  private isCurrentlyFetching: boolean = false;

  /** Emits the configs of the banner currently shown in the carousel.
   *  null = no banner active or no config on the current banner. */
  private _activeBannerConfigs$ = new BehaviorSubject<BannerConfigs | null>(null);
  readonly activeBannerConfigs$ = this._activeBannerConfigs$.asObservable();

  setActiveBannerConfigs(configs: BannerConfigs | null | undefined): void {
    this._activeBannerConfigs$.next(configs ?? null);
  }

  constructor(private requestThrottle: RequestThrottleService) {
    this.db = getFirestore();
  }

  async getBanners(): Promise<Banner[]> {
    const throttleKey = 'banners-fetch';
    
    try {
      // Prevent multiple simultaneous requests
      if (this.isCurrentlyFetching && this.fetchPromise) {
        console.log('Already fetching banners, returning existing promise');
        return await this.fetchPromise;
      }

      // Check cache first
      const now = Date.now();
      if (this.bannersCache && (now - this.lastFetchTime < this.CACHE_DURATION)) {
        console.log('Returning cached banners');
        return this.bannersCache;
      }

      // Use throttling service to prevent excessive requests
      const result = await this.requestThrottle.throttledRequest(
        throttleKey,
        async () => {
          // Set fetching flag and create promise
          this.isCurrentlyFetching = true;
          this.fetchPromise = this.fetchBannersFromFirebase();
          
          const banners = await this.fetchPromise;
          
          // Cache the result
          this.bannersCache = banners;
          this.lastFetchTime = now;
          
          return banners;
        },
        this.bannersCache || [] // Fallback to cached data if throttled
      );
      
      return result || [];
      
    } catch (error) {
      console.error('Error in getBanners:', error);
      return this.bannersCache || [];
    } finally {
      this.isCurrentlyFetching = false;
      this.fetchPromise = null;
    }
  }

  private async fetchBannersFromFirebase(): Promise<Banner[]> {
    try {
      console.log('Fetching banners from Firebase collection:', this.BANNERS_COLLECTION_PATH);
      
      // Get the banners collection
      const bannersCollection = collection(this.db, this.BANNERS_COLLECTION_PATH);
      
      // Await the Firebase query properly
      const bannersSnapshot = await getDocs(bannersCollection);
      
      if (bannersSnapshot.empty) {
        console.log('No banners found in collection');
        return [];
      }
      
      console.log(`Found ${bannersSnapshot.size} documents in banners collection`);
      
      // Convert Firebase documents to Banner objects
      const allBanners: Banner[] = [];
      bannersSnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseBanner;
        const banner: Banner = {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          imageURL: data.imageURL || '',
          isActive: data.isActive || false,
          displayOrder: data.displayOrder || 0,
          targetUrl: data.targetUrl,
          versionCondition: typeof data.versionCondition === 'object' ? data.versionCondition["id"] : data.versionCondition,
          versionTarget: data.versionTarget,
          startDate: this.convertFirebaseDate(data.startDate),
          endDate: this.convertFirebaseDate(data.endDate),
          created_at: this.convertFirebaseDate(data.created_at) || new Date(),
          updated_at: this.convertFirebaseDate(data.updated_at) || new Date(),
          configs: data.configs ? {
            headerTextColor:        data.configs.headerTextColor,
            disableRestaurantStatus: data.configs.disableRestaurantStatus,
          } : undefined,
        };
        allBanners.push(banner);
      });
      
      // Filter active banners and check date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Today at 00:00:00
      
      const validBanners = allBanners.filter(banner => {
        // Must be active
        if (!banner.isActive) {
          console.log(`Filtering out inactive banner: ${banner.title}`);
          return false;
        }
        
        // Check start date - banner should have started (compare dates only)
        if (banner.startDate) {
          const startDate = new Date(banner.startDate);
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
          if (startDateOnly > today) {
            console.log(`Filtering out future banner: ${banner.title} (starts ${startDate.toLocaleDateString()})`);
            return false;
          }
        }
        
        // Check end date - banner should not have expired (compare dates only)
        if (banner.endDate) {
          const endDate = new Date(banner.endDate);
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
          if (endDateOnly < today) {
            console.log(`Filtering out expired banner: ${banner.title} (ended ${endDate.toLocaleDateString()})`);
            return false;
          }
        }
        
        console.log(`Banner passes all filters: ${banner.title}`);
        return true;
      });
      
      // Sort by displayOrder (low to high)
      const sortedBanners = validBanners.sort((a, b) => a.displayOrder - b.displayOrder);
      
      console.log(`Processed ${sortedBanners.length} active banners from ${allBanners.length} total`);
      return sortedBanners;
      
    } catch (error) {
      console.error('Error fetching banners from Firebase:', error);
      throw error;
    }
  }

  private convertFirebaseDate(firebaseDate: any): Date | undefined {
    if (!firebaseDate) return undefined;
    
    // If it's already a Date object, return it
    if (firebaseDate instanceof Date) {
      return firebaseDate;
    }
    
    // Firebase Timestamp object with toDate method
    if (firebaseDate.toDate && typeof firebaseDate.toDate === 'function') {
      return firebaseDate.toDate();
    }
    
    // String or number (ISO string or Unix timestamp)
    if (typeof firebaseDate === 'string' || typeof firebaseDate === 'number') {
      return new Date(firebaseDate);
    }
    
    return undefined;
  }

  async getActiveBanners(): Promise<Banner[]> {
    return this.getBanners();
  }

  // Method to clear cache if needed
  clearCache(): void {
    this.bannersCache = null;
    this.lastFetchTime = 0;
  }
}
