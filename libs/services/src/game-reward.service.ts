import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
  serverTimestamp 
} from '@angular/fire/firestore';
import { DeviceTokenService } from './device-token.service';

export interface GameDocument {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  deviceToken: string;
  highestTile: number;
  score: number;
  couponType: string;
  couponCode: string;
  rewardGeneratedAt: any; // Timestamp
  nextEligibleAt: any; // Timestamp
  createdAt: any; // serverTimestamp
  updatedAt: any; // serverTimestamp
  // Track both reward types separately
  burgerRewardAt?: any; // Timestamp when 2048 reward was given
  pizzaRewardAt?: any; // Timestamp when 32768 reward was given
}

export interface EligibilityStatus {
  isEligible: boolean; // Can earn rewards (not both rewards given in last week)
  nextEligibleDate: Date | null;
  existingCoupon: string | null;
  couponType: string | null;
  bothRewardsGivenInLastWeek?: boolean; // Track if both 2048 and 32768 were given
}

export interface CouponReward {
  couponCode: string;
  couponType: string;
  nextEligibleAt: Date;
}

/**
 * Service to handle game rewards and coupon generation with weekly device restrictions
 */
@Injectable({
  providedIn: 'root'
})
export class GameRewardService {
  private readonly COLLECTION_NAME = 'game';
  private readonly WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private firestore: Firestore,
    private deviceTokenService: DeviceTokenService
  ) {}

  /**
   * Check if user is eligible to play and win a coupon
   * @param uid - User ID
   * @returns EligibilityStatus
   */
  async checkEligibility(uid: string): Promise<EligibilityStatus> {
    try {
      const deviceToken = await this.deviceTokenService.getDeviceToken();
      
      // Query by device token to enforce device-based restriction
      const gamesRef = collection(this.firestore, this.COLLECTION_NAME);
      const q = query(gamesRef, where('deviceToken', '==', deviceToken));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No previous record for this device
        return {
          isEligible: true,
          nextEligibleDate: null,
          existingCoupon: null,
          couponType: null,
          bothRewardsGivenInLastWeek: false
        };
      }

      // Get the most recent record (there should be only one per device)
      const docData = querySnapshot.docs[0].data() as GameDocument;
      
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - this.WEEK_IN_MS);
      
      // Check if both rewards were given in the last week
      let bothRewardsGiven = false;
      if (docData.burgerRewardAt && docData.pizzaRewardAt) {
        const burgerDate = docData.burgerRewardAt.toDate();
        const pizzaDate = docData.pizzaRewardAt.toDate();
        
        // Both rewards given in last week
        if (burgerDate >= oneWeekAgo && pizzaDate >= oneWeekAgo) {
          bothRewardsGiven = true;
          
          // Next eligible is 7 days from the most recent reward
          const mostRecentReward = burgerDate > pizzaDate ? burgerDate : pizzaDate;
          const nextEligible = new Date(mostRecentReward.getTime() + this.WEEK_IN_MS);
          
          if (now < nextEligible) {
            return {
              isEligible: false,
              nextEligibleDate: nextEligible,
              existingCoupon: docData.couponCode,
              couponType: docData.couponType,
              bothRewardsGivenInLastWeek: true
            };
          }
        }
      }
      
      // If we have nextEligibleAt, check it (legacy check)
      if (docData.nextEligibleAt) {
        const nextEligible = docData.nextEligibleAt.toDate();
        
        if (now < nextEligible) {
          // Still locked
          return {
            isEligible: false,
            nextEligibleDate: nextEligible,
            existingCoupon: docData.couponCode,
            couponType: docData.couponType,
            bothRewardsGivenInLastWeek: bothRewardsGiven
          };
        }
      }

      // Eligible to play and earn rewards
      return {
        isEligible: true,
        nextEligibleDate: null,
        existingCoupon: null,
        couponType: null,
        bothRewardsGivenInLastWeek: false
      };

    } catch (error) {
      console.error('Error checking eligibility:', error);
      throw error;
    }
  }

  /**
   * Generate a unique coupon code
   * Format: ZISTRO-<8 RANDOM UPPERCASE ALPHANUMERIC>
   */
  private generateCouponCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `ZISTRO-${code}`;
  }

  /**
   * Check if coupon code is unique
   */
  private async isCouponUnique(couponCode: string): Promise<boolean> {
    const gamesRef = collection(this.firestore, this.COLLECTION_NAME);
    const q = query(gamesRef, where('couponCode', '==', couponCode));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  }

  /**
   * Generate a unique coupon code with collision prevention
   */
  private async generateUniqueCouponCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateCouponCode();
      const isUnique = await this.isCouponUnique(code);
      
      if (isUnique) {
        return code;
      }
      
      attempts++;
    }

    // Fallback with timestamp to ensure uniqueness
    return `ZISTRO-${Date.now().toString(36).toUpperCase().slice(-8)}`;
  }

  /**
   * Award coupon to user when they achieve reward tier
   * Uses Firestore transaction to prevent race conditions
   * @param uid - User ID
   * @param displayName - User display name
   * @param email - User email
   * @param phoneNumber - User phone number
   * @param highestTile - Highest tile achieved
   * @param score - Current game score
   * @param couponType - Type of coupon (couponTypeBurger or couponTypePizza)
   * @returns CouponReward
   */
  async awardCoupon(
    uid: string,
    displayName: string,
    email: string,
    phoneNumber: string,
    highestTile: number,
    score: number,
    couponType: 'couponTypeBurger' | 'couponTypePizza'
  ): Promise<CouponReward> {
    try {
      const deviceToken = await this.deviceTokenService.getDeviceToken();

      // Generate unique coupon code before transaction
      const couponCode = await this.generateUniqueCouponCode();

      // Use transaction to ensure atomic operation
      const result = await runTransaction(this.firestore, async (transaction) => {
        // Query for existing document with this device token
        const gamesRef = collection(this.firestore, this.COLLECTION_NAME);
        const q = query(gamesRef, where('deviceToken', '==', deviceToken));
        const querySnapshot = await getDocs(q);

        let docRef;
        let existingData: GameDocument | null = null;

        if (!querySnapshot.empty) {
          // Use existing document
          docRef = querySnapshot.docs[0].ref;
          existingData = querySnapshot.docs[0].data() as GameDocument;

          // Double-check eligibility within transaction
          if (existingData.nextEligibleAt) {
            const nextEligible = existingData.nextEligibleAt.toDate();
            const now = new Date();
            
            if (now < nextEligible) {
              throw new Error('Not eligible: Still within weekly lock period');
            }
          }
        } else {
          // Create new document with device token as ID for easy lookup
          docRef = doc(gamesRef, deviceToken);
        }

        // Calculate next eligible date (7 days from now)
        const now = Timestamp.now();
        const nextEligibleDate = new Date(Date.now() + this.WEEK_IN_MS);
        const nextEligibleTimestamp = Timestamp.fromDate(nextEligibleDate);

        const gameData: Partial<GameDocument> = {
          uid,
          displayName,
          email,
          phoneNumber,
          deviceToken,
          highestTile,
          score,
          couponType,
          couponCode,
          rewardGeneratedAt: now,
          nextEligibleAt: nextEligibleTimestamp,
          updatedAt: serverTimestamp()
        };
        
        // Track specific reward types with timestamps
        if (couponType === 'couponTypeBurger') {
          gameData.burgerRewardAt = now;
        } else if (couponType === 'couponTypePizza') {
          gameData.pizzaRewardAt = now;
        }

        if (!existingData) {
          // New document
          transaction.set(docRef, {
            ...gameData,
            createdAt: serverTimestamp()
          });
        } else {
          // Update existing document
          transaction.update(docRef, {
            ...gameData,
            // Only update highestTile if new one is higher
            highestTile: Math.max(existingData.highestTile || 0, highestTile)
          });
        }

        return {
          couponCode,
          couponType,
          nextEligibleAt: nextEligibleDate
        };
      });

      console.log('✅ Coupon awarded successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Error awarding coupon:', error);
      throw error;
    }
  }

  /**
   * Update game progress without awarding coupon
   * @param uid - User ID
   * @param highestTile - Highest tile achieved
   * @param score - Current game score
   */
  async updateGameProgress(
    uid: string,
    highestTile: number,
    score: number
  ): Promise<void> {
    try {
      const deviceToken = await this.deviceTokenService.getDeviceToken();

      // Query for existing document
      const gamesRef = collection(this.firestore, this.COLLECTION_NAME);
      const q = query(gamesRef, where('deviceToken', '==', deviceToken));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // No existing record, skip update
        return;
      }

      const docRef = querySnapshot.docs[0].ref;
      const existingData = querySnapshot.docs[0].data() as GameDocument;

      // Only update if new highestTile is higher
      if (highestTile > (existingData.highestTile || 0)) {
        await updateDoc(docRef, {
          highestTile,
          score: Math.max(score, existingData.score || 0),
          updatedAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error('Error updating game progress:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Get user's game history
   * @param uid - User ID
   */
  async getUserGameHistory(uid: string): Promise<GameDocument | null> {
    try {
      const deviceToken = await this.deviceTokenService.getDeviceToken();
      
      const gamesRef = collection(this.firestore, this.COLLECTION_NAME);
      const q = query(gamesRef, where('deviceToken', '==', deviceToken));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return querySnapshot.docs[0].data() as GameDocument;

    } catch (error) {
      console.error('Error fetching game history:', error);
      return null;
    }
  }
}
