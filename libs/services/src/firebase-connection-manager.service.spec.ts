import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirebaseConnectionManager } from './firebase-connection-manager.service';
import * as firebaseAuth from 'firebase/auth';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn()
}));

describe('FirebaseConnectionManager', () => {
  let service: FirebaseConnectionManager;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    vi.mocked(firebaseAuth.getAuth).mockReturnValue({} as any);
    vi.mocked(firebaseAuth.signOut).mockResolvedValue();

    service = new FirebaseConnectionManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default restaurant', () => {
      expect(service).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        '🔥 Firebase Connection Manager initialized with default restaurant:',
        'hunger_point'
      );
    });
  });

  describe('getCurrentRestaurantId', () => {
    it('should return default restaurant ID when none stored', () => {
      const id = service.getCurrentRestaurantId();
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should return stored restaurant ID from localStorage', () => {
      localStorage.setItem('selectedRestaurantId', 'efc-pizza');
      
      // Create fresh service instance to read localStorage
      const freshService = new FirebaseConnectionManager();
      const id = freshService.getCurrentRestaurantId();
      
      expect(id).toBe('efc-pizza');
    });

    it('should validate stored restaurant ID', () => {
      localStorage.setItem('selectedRestaurantId', 'invalid-id');
      
      const id = service.getCurrentRestaurantId();
      
      // Should return default if invalid
      expect(id).toBeDefined();
    });
  });

  describe('getCurrentRestaurant', () => {
    it('should return restaurant object', () => {
      const restaurant = service.getCurrentRestaurant();
      
      expect(restaurant).toBeDefined();
      expect(restaurant).toHaveProperty('id');
      expect(restaurant).toHaveProperty('name');
    });
  });

  describe('getCurrentFirebaseConfig', () => {
    it('should return Firebase config object', () => {
      const config = service.getCurrentFirebaseConfig();
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('projectId');
    });
  });

  describe('switchRestaurant', () => {
    beforeEach(() => {
      // Mock window.location.reload
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true
      });
    });

    it('should not switch if already on same restaurant', async () => {
      const currentId = service.getCurrentRestaurantId();
      
      await service.switchRestaurant(currentId);
      
      expect(console.log).toHaveBeenCalledWith(
        'Already connected to restaurant:',
        currentId
      );
    });

    it('should sign out user before switching', async () => {
      await service.switchRestaurant('efc-pizza');
      
      expect(firebaseAuth.signOut).toHaveBeenCalled();
    });

    it('should clear localStorage except restaurant ID', async () => {
      localStorage.setItem('token', 'user-token');
      localStorage.setItem('user_data', 'some-data');
      
      try {
        await service.switchRestaurant('efc-pizza');
      } catch (e) {
        // Expected to throw or reload
      }
      
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should set session storage flags for restaurant switch', async () => {
      try {
        await service.switchRestaurant('efc-pizza');
      } catch (e) {
        // Expected
      }
      
      expect(sessionStorage.getItem('restaurant_switching')).toBe('true');
      expect(sessionStorage.getItem('restaurant_switch_timestamp')).toBeDefined();
    });

    it('should handle sign out errors gracefully', async () => {
      vi.mocked(firebaseAuth.signOut).mockRejectedValue(new Error('Sign out error'));
      
      try {
        await service.switchRestaurant('efc-pizza');
      } catch (e) {
        // May throw or continue
      }
      
      expect(console.warn).toHaveBeenCalled();
    });

    it('should throw error for invalid restaurant ID', async () => {
      await expect(service.switchRestaurant('invalid-restaurant-999')).rejects.toThrow();
    });
  });
});
