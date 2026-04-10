import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { 
  FIREBASE_COLLECTIONS, 
  FIREBASE_STORAGE_PATHS, 
  AUTH_KEYS, 
  CACHE_KEYS, 
  CACHE_DURATIONS,
  CacheType 
} from '@zitro/utils';
import { CacheService } from './cache.service';
import { CacheManagerService } from './cache-manager.service';
import { Router } from '@angular/router';

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

export interface CouponUsage {
  couponCode: string;
  usedAt: string; // ISO string timestamp
  orderId: string;
}

export interface OnlineUser {
  uid: string;
  name: string | null;
  email: string | null;
  phoneNumber: string;
  photoURL: string | null;
  emailVerified: boolean;
  addresses: UserAddress[];
  totalOrders: number; // Track total number of orders placed
  couponUsageHistory: CouponUsage[]; // Track each coupon usage
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  // Observable for current user phone
  private currentUserPhoneSubject = new BehaviorSubject<string | null>(null);
  public currentUserPhone$ = this.currentUserPhoneSubject.asObservable();

  // BehaviorSubject to track user profile changes
  private userProfileSubject = new BehaviorSubject<OnlineUser | null>(null);
  public userProfile$ = this.userProfileSubject.asObservable();

  // Cache keys for user profile (using constants)
  private readonly USER_PROFILE_CACHE_KEY = CACHE_KEYS.USER_PROFILE_CACHE;
  private readonly USER_PROFILE_CACHE_TIMESTAMP_KEY = CACHE_KEYS.USER_PROFILE_CACHE_TIMESTAMP;

  constructor(
    private router: Router,
    private firestore: Firestore,
    private storage: Storage,
    private cacheService: CacheService,
    private cacheManager: CacheManagerService
  ) {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      let phone: string | null = null;
      if (user && user.phoneNumber) {
        phone = user.phoneNumber;
        localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, phone);
      } else if (user) {
        // Try to get phone from Firestore by UID
        const userData = await this.getUserDataByUID(user.uid);
        if (userData && userData.phoneNumber) {
          phone = userData.phoneNumber;
          localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, phone);
        }
      } else {
        // User signed out
        // TODO undo this storage cleanup if 
        // localStorage.removeItem(AUTH_KEYS.CURRENT_USER_PHONE);
        // this.router.navigate(['/signin']);
      }
      this.currentUserPhoneSubject.next(phone);
    });
  }

  /**
   * Load and emit current user profile
   */
  async loadCurrentUserProfile(): Promise<void> {
    try {
      const currentUserPhone = await this.getCurrentUserPhone();
      if (currentUserPhone) {
        const userData = await this.getUserData(currentUserPhone);
        if (userData) {
          this.userProfileSubject.next(userData);
        }
      }
    } catch (error) {
      console.error('Error loading current user profile:', error);
    }
  }

  /**
   * Clear user profile when user signs out
   */
  clearUserProfile(): void {
    this.userProfileSubject.next(null);
    // Clear all cached user profiles
    this.clearCachedUserProfile();
  }

  /**
   * Normalize phone number by removing spaces, dashes, and other characters
   * @param phone Phone number to normalize
   * @returns Normalized phone number
   */
  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }



  /**
   * Find user document by phone number (expects +91XXXXXXXXXX format only)
   * @param phoneNumber Phone number to search for
   * @returns Promise<{docId: string, userData: OnlineUser} | null>
   */
  async findUserByPhoneNumber(phoneNumber: string): Promise<{docId: string, userData: OnlineUser} | null> {
    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      // Only allow +91 and 10 digits
      if (!/^\+91\d{10}$/.test(normalized)) {
        console.error('Bad request: phoneNumber must be in +91XXXXXXXXXX format. Provided:', phoneNumber);
        return null;
      }
      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, normalized);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('Found user document with ID:', normalized);
        return {
          docId: normalized,
          userData: userDoc.data() as OnlineUser
        };
      }
      console.log('No user found with phone number:', normalized);
      return null;
    } catch (error) {
      console.error('Error finding user by phone number:', error);
      return null;
    }
  }

  /**
   * Create or update user entry in onlineUsers collection
   * @param user Firebase Auth User object
   * @returns Promise<boolean> - Success status
   */
  async createOrUpdateUserEntry(user: User): Promise<boolean> {
    try {
      const phoneNumber = user.phoneNumber || user.uid || 'anonymous';
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      console.log('Creating/updating user entry for:', phoneNumber, 'normalized:', normalizedPhone);
      
      // Check if user already exists with any phone number variation
      const existingUser = await this.findUserByPhoneNumber(phoneNumber);

      const now = new Date().toISOString();

      if (!existingUser) {
        // Create new user entry with normalized phone number as document ID
        const newUser: OnlineUser = {
          uid: user.uid,
          name: user.displayName || null,
          email: user.email || null,
          phoneNumber: normalizedPhone,
          photoURL: user.photoURL || null,
          emailVerified: user.emailVerified || false,
          addresses: [], // Empty array initially
          totalOrders: 0, // Initialize order count to 0 for new customers
          couponUsageHistory: [], // Initialize empty coupon usage history
          created_at: now,
          updated_at: now
        };

        const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, normalizedPhone);
        await setDoc(userDocRef, newUser);
        console.log('New user entry created in onlineUsers:', normalizedPhone);
        
        // Store current user info in localStorage for favorites service
        localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, normalizedPhone);
        
        return true;
      } else {
        // Update existing user entry with latest auth info
        const updateData = {
          uid: user.uid,
          updated_at: now
        };

        const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, existingUser.docId);
        await updateDoc(userDocRef, updateData);
        console.log('Existing user entry updated in onlineUsers:', existingUser.docId);
        
        // Store current user info in localStorage for favorites service (use existing docId format)
        // localStorage.setItem(AUTH_KEYS.CURRENT_USER_PHONE, existingUser.docId);
        
        return true;
      }
    } catch (error) {
      console.error('Error creating/updating user entry:', error);
      return false;
    }
  }

  /**
   * Get user data from onlineUsers collection
   * @param phoneNumber User's phone number (document ID)
   * @param hardRefresh Force refresh from Firestore, bypassing cache (default: false)
   * @returns Promise<OnlineUser | null>
   */
  async getUserData(phoneNumber: string, hardRefresh: boolean = false): Promise<OnlineUser | null> {
    try {
      console.log('Getting user data for phone:', phoneNumber, hardRefresh ? '(HARD REFRESH)' : '');
      
      // Check cache first (unless hard refresh is requested)
      if (!hardRefresh) {
        const cachedProfile = this.getCachedUserProfile(phoneNumber);
        if (cachedProfile) {
          console.log('📦 Using cached user profile for:', phoneNumber);
          return cachedProfile;
        }
      } else {
        console.log('🔄 Hard refresh requested, bypassing cache for:', phoneNumber);
      }
      
      console.log('⬇️ Fetching user profile from Firestore for:', phoneNumber);
      
      // First, try to find by phone number variations
      const result = await this.findUserByPhoneNumber(phoneNumber);
      if (result) {
        // Cache the result
        this.setCachedUserProfile(phoneNumber, result.userData);
        return result.userData;
      }
      
      // If not found and the phoneNumber looks like a UID, try to find by UID
      if (phoneNumber && phoneNumber.length > 20 && phoneNumber.includes('DnJIFywiBdSKucVF4G0m')) {
        console.log('Phone number looks like UID, searching by UID:', phoneNumber);
        const userDataByUID = await this.getUserDataByUID(phoneNumber);
        if (userDataByUID) {
          // Cache the result
          this.setCachedUserProfile(phoneNumber, userDataByUID.user);
          return userDataByUID.user;
        }
      }
      
      console.log('No user found for phone:', phoneNumber);
      return null;
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Find user data by UID and return with phone number from document data
   * @param uid User's Firebase UID
   * @returns Promise<{user: OnlineUser, phoneNumber: string} | null>
   */
  async getUserDataByUID(uid: string): Promise<{user: OnlineUser, phoneNumber: string} | null> {
    try {
      const usersRef = collection(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS);
      const q = query(usersRef, where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as OnlineUser;
        return {
          user: userData,
          phoneNumber: userData.phoneNumber || userDoc.id // Use phone number from data, fallback to document ID
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user data by UID:', error);
      return null;
    }
  }

  /**
   * Add address to user's addresses array
   * @param phoneNumber User's phone number
   * @param address New address to add
   * @returns Promise<boolean>
   */
  async addUserAddress(phoneNumber: string, address: Omit<UserAddress, 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      // Find the correct document ID by searching phone number variations
      const result = await this.findUserByPhoneNumber(phoneNumber);
      
      if (!result) {
        console.error('User not found:', phoneNumber);
        return false;
      }

      const userData = result.userData;
      const now = new Date().toISOString();
      
      // If this is the first address, make it default
      const isFirstAddress = userData.addresses.length === 0;
      
      // If setting as default or it's the first address, unset all other defaults
      if (address.isDefault || isFirstAddress) {
        userData.addresses.forEach(addr => {
          addr.isDefault = false;
        });
      }
      
      const newAddress: UserAddress = {
        ...address,
        isDefault: address.isDefault || isFirstAddress,
        created_at: now,
        updated_at: now
      };

      const updatedAddresses = [...userData.addresses, newAddress];

      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, result.docId);
      await updateDoc(userDocRef, {
        addresses: updatedAddresses,
        updated_at: now
      });

      console.log('Address added successfully for user:', result.docId);
      return true;
    } catch (error) {
      console.error('Error adding user address:', error);
      return false;
    }
  }

  /**
   * Update user's addresses array
   * @param phoneNumber User's phone number
   * @param addresses Updated addresses array
   * @returns Promise<boolean>
   */
  async updateUserAddresses(phoneNumber: string, addresses: UserAddress[]): Promise<boolean> {
    try {
      // Find the correct document ID by searching phone number variations
      const result = await this.findUserByPhoneNumber(phoneNumber);
      
      if (!result) {
        console.error('User not found:', phoneNumber);
        return false;
      }

      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, result.docId);
      const now = new Date().toISOString();

      await updateDoc(userDocRef, {
        addresses: addresses,
        updated_at: now
      });

      console.log('Addresses updated successfully for user:', result.docId);
      return true;
    } catch (error) {
      console.error('Error updating user addresses:', error);
      return false;
    }
  }

  /**
   * Get user's default address
   * @param phoneNumber User's phone number
   * @returns Promise<UserAddress | null>
   */
  async getUserDefaultAddress(phoneNumber: string): Promise<UserAddress | null> {
    try {
      const userData = await this.getUserData(phoneNumber);
      if (userData?.addresses) {
        return userData.addresses.find(addr => addr.isDefault) || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting user default address:', error);
      return null;
    }
  }

  /**
   * Set a specific address as default (unsets all other defaults)
   * @param phoneNumber User's phone number
   * @param addressIndex Index of the address to set as default
   * @returns Promise<boolean>
   */
  async setDefaultAddress(phoneNumber: string, addressIndex: number): Promise<boolean> {
    try {
      const userData = await this.getUserData(phoneNumber);
      if (!userData?.addresses || addressIndex < 0 || addressIndex >= userData.addresses.length) {
        console.error('Invalid address index or user data');
        return false;
      }

      // Update addresses: set all to false, then set selected to true
      const updatedAddresses = userData.addresses.map((addr, index) => ({
        ...addr,
        isDefault: index === addressIndex
      }));

      return await this.updateUserAddresses(phoneNumber, updatedAddresses);
    } catch (error) {
      console.error('Error setting default address:', error);
      return false;
    }
  }

  /**
   * Returns true if a user is currently logged in (has a valid phone number)
   */
  async isLoggedIn(): Promise<boolean> {
    const phone = await this.getCurrentUserPhone();
    return !!phone;
  }

  /**
   * Get current authenticated user's phone number
   * @returns Promise<string | null>
   */
  async getCurrentUserPhone(): Promise<string | null> {
    const loggedInDateTime = localStorage.getItem(AUTH_KEYS.LOGGED_IN_DATE_TIME);
    if (loggedInDateTime) {
      const loggedInDate = new Date(loggedInDateTime);
      const now = new Date();
      const diffInMs = now.getTime() - loggedInDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      if (diffInDays > AUTH_KEYS.LOGIN_SESSION_IN_DAYS) {
        console.log('User logged in more than 30 days ago, auto logging out');
        localStorage.removeItem(AUTH_KEYS.TOKEN);
        localStorage.removeItem(AUTH_KEYS.IS_GUEST);
        localStorage.removeItem(AUTH_KEYS.GUEST_ID);
        localStorage.removeItem(AUTH_KEYS.CURRENT_USER_PHONE);
        localStorage.removeItem(AUTH_KEYS.LOGGED_IN_DATE_TIME);
    
        // Clear user profile from the subject
        this.clearUserProfile();
        const auth = getAuth();
        await auth.signOut();
        this.router.navigate(['/signin']);
      }
    }

    // Always use the observable or localStorage for current user phone
    const storedPhone = localStorage.getItem(AUTH_KEYS.CURRENT_USER_PHONE);
    if (storedPhone && storedPhone !== 'null') {
      return storedPhone;
    }
    // If not in localStorage, wait for the observable to emit
    return new Promise((resolve) => {
      const sub = this.currentUserPhone$.subscribe(phone => {
        if (phone) {
          resolve(phone);
          sub.unsubscribe();
        }
      });
      // Timeout fallback after 2 seconds
      setTimeout(() => {
        resolve(null);
        sub.unsubscribe();
      }, 500);
    });
  }

  /**
   * Update user profile (name, email, imageURL)
   * @param phoneNumber User's phone number
   * @param profileData Profile data to update
   * @returns Promise<boolean>
   */
  async updateUserProfile(
    phoneNumber: string, 
    profileData: { name?: string; email?: string; photoURL?: string }
  ): Promise<boolean> {
    try {
      console.log('Updating profile for phoneNumber:', phoneNumber);
      console.log('Profile data:', profileData);
      
      // Find the correct document ID by searching phone number variations
      const result = await this.findUserByPhoneNumber(phoneNumber);
      
      if (!result) {
        console.error('User document not found for phone:', phoneNumber);
        return false;
      }
      
      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, result.docId);
      const now = new Date().toISOString();

      const updateData: any = {
        updated_at: now
      };

      if (profileData.name !== undefined) {
        updateData.name = profileData.name;
      }
      if (profileData.email !== undefined) {
        updateData.email = profileData.email;
      }
      if (profileData.photoURL !== undefined) {
        updateData.photoURL = profileData.photoURL;
      }

      await updateDoc(userDocRef, updateData);
      console.log('Profile updated successfully for user:', result.docId);
      
      // Clear cache to force fresh data on next fetch
      this.clearCachedUserProfile(phoneNumber);
      
      // Get the updated user data (will fetch fresh from Firestore)
      const updatedUserData = await this.getUserData(phoneNumber);
      if (updatedUserData) {
        this.userProfileSubject.next(updatedUserData);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Upload profile photo to Firebase Storage
   * @param file Image file to upload
   * @param phoneNumber User's phone number
   * @returns Promise<string> - Download URL of uploaded image
   */
  async uploadProfilePhoto(file: File, phoneNumber: string): Promise<string> {
    try {
      // Clean phone number for file name (remove +, spaces, etc.)
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      const timestamp = Date.now();
      const fileName = `${cleanPhone}_${timestamp}`;
      
      // Create reference to Firebase Storage
      const storageRef = ref(this.storage, `${FIREBASE_STORAGE_PATHS.USER_PROFILE_PICS}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('Profile photo uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  }

  /**
   * Update user profile with new photo
   * @param phoneNumber User's phone number
   * @param photoFile Image file to upload
   * @param profileData Additional profile data to update
   * @returns Promise<boolean>
   */
  async updateProfileWithPhoto(
    phoneNumber: string,
    photoFile: File,
    profileData?: { name?: string; email?: string }
  ): Promise<boolean> {
    try {
      // Upload photo first
      const photoURL = await this.uploadProfilePhoto(photoFile, phoneNumber);
      
      // Update profile with new photo URL and other data
      const updateData: any = { photoURL };
      if (profileData?.name) updateData.name = profileData.name;
      if (profileData?.email) updateData.email = profileData.email;
      
      return await this.updateUserProfile(phoneNumber, updateData);
    } catch (error) {
      console.error('Error updating profile with photo:', error);
      return false;
    }
  }

  /**
   * Get cached user profile (session-based caching)
   * @param phoneNumber User's phone number
   * @returns OnlineUser | null
   */
  private getCachedUserProfile(phoneNumber: string): OnlineUser | null {
    try {
      // Generate cache key specific to this phone number
      const cacheKey = `${this.USER_PROFILE_CACHE_KEY}_${phoneNumber}`;
      const timestampKey = `${this.USER_PROFILE_CACHE_TIMESTAMP_KEY}_${phoneNumber}`;
      
      // Use CacheManagerService to get cached data
      const cachedProfile = this.cacheManager.getCachedData<OnlineUser>(
        CacheType.USER_PROFILES,
        cacheKey,
        timestampKey
      );
      
      return cachedProfile;
    } catch (error) {
      console.error('Error getting cached user profile:', error);
      return null;
    }
  }

  /**
   * Set cached user profile (session-based caching)
   * @param phoneNumber User's phone number
   * @param userData User data to cache
   */
  private setCachedUserProfile(phoneNumber: string, userData: OnlineUser): void {
    try {
      const cacheKey = `${this.USER_PROFILE_CACHE_KEY}_${phoneNumber}`;
      const timestampKey = `${this.USER_PROFILE_CACHE_TIMESTAMP_KEY}_${phoneNumber}`;
      
      // Get dynamic cache duration from CacheManagerService
      const duration = this.cacheManager.getCacheDuration(CacheType.USER_PROFILES);
      
      this.cacheManager.setCachedData(
        CacheType.USER_PROFILES,
        cacheKey,
        timestampKey,
        userData
      );
      
      console.log('💾 User profile cached for:', phoneNumber, `(Duration: ${duration / 60000} min)`);
    } catch (error) {
      console.error('Error caching user profile:', error);
    }
  }

  /**
   * Clear cached user profile
   * @param phoneNumber User's phone number (optional - if not provided, clears all user profile caches)
   */
  clearCachedUserProfile(phoneNumber?: string): void {
    try {
      if (phoneNumber) {
        const cacheKey = `${this.USER_PROFILE_CACHE_KEY}_${phoneNumber}`;
        const timestampKey = `${this.USER_PROFILE_CACHE_TIMESTAMP_KEY}_${phoneNumber}`;
        
        this.cacheManager.clearCache(CacheType.USER_PROFILES, cacheKey, timestampKey);
        
        console.log('🗑️ Cleared user profile cache for:', phoneNumber);
      } else {
        // Clear all user profile caches using cache prefix
        this.cacheService.clearCacheByPrefix(this.USER_PROFILE_CACHE_KEY);
        this.cacheService.clearCacheByPrefix(this.USER_PROFILE_CACHE_TIMESTAMP_KEY);
        
        console.log('🗑️ Cleared all user profile caches');
      }
    } catch (error) {
      console.error('Error clearing user profile cache:', error);
    }
  }

  /**
   * Refresh user profile cache (force reload from Firestore)
   * @param phoneNumber User's phone number
   * @returns Promise<OnlineUser | null>
   */
  async refreshUserProfile(phoneNumber: string): Promise<OnlineUser | null> {
    try {
      // Clear cache first
      this.clearCachedUserProfile(phoneNumber);
      
      // Fetch fresh data
      const userData = await this.getUserData(phoneNumber);
      
      // Update BehaviorSubject if this is current user
      const currentPhone = await this.getCurrentUserPhone();
      if (currentPhone === phoneNumber && userData) {
        this.userProfileSubject.next(userData);
      }
      
      return userData;
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      return null;
    }
  }

  /**
   * Update user order count and record coupon usage in a single operation
   * Combines both updates to reduce Firestore calls
   * @param phoneNumber User's phone number
   * @param couponCode Coupon code that was used (optional)
   * @param orderId Order ID where coupon was applied
   * @returns Promise<boolean> - Success status
   */
  async updateUserOrderAndCoupon(phoneNumber: string, orderId: string, couponCode?: string): Promise<boolean> {
    try {
      // Find the user document
      const result = await this.findUserByPhoneNumber(phoneNumber);
      
      if (!result) {
        console.error('User not found:', phoneNumber);
        return false;
      }

      const userData = result.userData;
      const now = new Date().toISOString();
      
      // Prepare update data
      const updateData: any = {
        totalOrders: (userData.totalOrders || 0) + 1,
        updated_at: now
      };

      // Add coupon usage if coupon was applied
      if (couponCode) {
        const newUsage: any = {
          couponCode: couponCode,
          usedAt: now,
          orderId: orderId
        };

        const existingHistory = userData.couponUsageHistory || [];
        updateData.couponUsageHistory = [...existingHistory, newUsage];
      }

      // Single update to Firestore
      const userDocRef = doc(this.firestore, FIREBASE_COLLECTIONS.ONLINE_USERS, result.docId);
      await updateDoc(userDocRef, updateData);

      const logMessage = couponCode 
        ? `✅ User order count incremented and coupon ${couponCode} recorded for order ${orderId}`
        : `✅ User order count incremented to ${updateData.totalOrders} for: ${phoneNumber}`;
      console.log(logMessage);
      
      // Clear cache to force fresh data on next read
      this.clearCachedUserProfile(phoneNumber);
      
      // Update BehaviorSubject if this is current user
      const currentPhone = await this.getCurrentUserPhone();
      if (currentPhone === phoneNumber) {
        const updatedUserData = await this.getUserData(phoneNumber);
        if (updatedUserData) {
          this.userProfileSubject.next(updatedUserData);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user order and coupon:', error);
      return false;
    }
  }
}
