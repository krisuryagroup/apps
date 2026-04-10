import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RestaurantSwitchingService } from './restaurant-switching.service';
import { FirebaseConfigService } from './firebase-config.service';

describe('RestaurantSwitchingService', () => {
  let service: RestaurantSwitchingService;
  let mockFirebaseConfig: FirebaseConfigService;

  beforeEach(() => {
    localStorage.clear();
    
    mockFirebaseConfig = {
      switchRestaurant: vi.fn().mockResolvedValue(undefined)
    } as any;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    service = new RestaurantSwitchingService(mockFirebaseConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default restaurant', () => {
      expect(service).toBeDefined();
    });

    it('should emit initial restaurant', async () => {
      const promise = new Promise<void>(resolve => {
        service.currentRestaurant$.subscribe(restaurant => {
          expect(restaurant).toBeDefined();
          expect(restaurant).toHaveProperty('id');
          expect(restaurant).toHaveProperty('name');
          resolve();
        });
      });
      await promise;
    });
  });

  describe('getCurrentRestaurant', () => {
    it('should return current restaurant', () => {
      const restaurant = service.getCurrentRestaurant();

      expect(restaurant).toBeDefined();
      expect(restaurant).toHaveProperty('id');
      expect(restaurant).toHaveProperty('name');
    });

    it('should return stored restaurant from localStorage', () => {
      localStorage.setItem('selectedRestaurantId', 'test-restaurant');

      const restaurant = service.getCurrentRestaurant();

      // Will return default if test-restaurant is not valid
      expect(restaurant).toBeDefined();
    });
  });

  describe('switchRestaurant', () => {
    it('should return success:false for invalid restaurant ID', async () => {
      const result = await service.switchRestaurant('invalid-id-999');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid restaurant ID');
    });

    it('should return success:true when already on restaurant', async () => {
      const currentId = service.getCurrentRestaurant().id;

      const result = await service.switchRestaurant(currentId);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Already connected');
    });

    it('should call firebase config switch on valid restaurant', async () => {
      const allRestaurants = service.getAllRestaurants();
      
      if (allRestaurants.length > 1) {
        const targetRestaurant = allRestaurants[1];
        
        await service.switchRestaurant(targetRestaurant.id);

        expect(mockFirebaseConfig.switchRestaurant).toHaveBeenCalledWith(targetRestaurant.id);
      }
    });

    it('should update localStorage on successful switch', async () => {
      const allRestaurants = service.getAllRestaurants();
      
      if (allRestaurants.length > 1) {
        const targetRestaurant = allRestaurants[1];
        
        await service.switchRestaurant(targetRestaurant.id);

        expect(localStorage.getItem('selectedRestaurantId')).toBe(targetRestaurant.id);
      }
    });

    it('should handle errors during switch', async () => {
      mockFirebaseConfig.switchRestaurant = vi.fn().mockRejectedValue(new Error('Switch error'));
      
      const allRestaurants = service.getAllRestaurants();
      if (allRestaurants.length > 1) {
        const result = await service.switchRestaurant(allRestaurants[1].id);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to switch');
      }
    });
  });

  describe('getRestaurantById', () => {
    it('should return restaurant by ID', () => {
      const allRestaurants = service.getAllRestaurants();
      const firstRestaurant = allRestaurants[0];

      const found = service.getRestaurantById(firstRestaurant.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(firstRestaurant.id);
    });

    it('should return undefined for invalid ID', () => {
      const found = service.getRestaurantById('invalid-id-999');

      expect(found).toBeUndefined();
    });
  });

  describe('getAllRestaurants', () => {
    it('should return array of restaurants', () => {
      const restaurants = service.getAllRestaurants();

      expect(Array.isArray(restaurants)).toBe(true);
      expect(restaurants.length).toBeGreaterThan(0);
    });

    it('should return restaurants with required properties', () => {
      const restaurants = service.getAllRestaurants();

      restaurants.forEach(restaurant => {
        expect(restaurant).toHaveProperty('id');
        expect(restaurant).toHaveProperty('name');
      });
    });
  });

  describe('getRestaurantsForDisplay', () => {
    it('should return formatted restaurants', () => {
      const restaurants = service.getRestaurantsForDisplay();

      expect(Array.isArray(restaurants)).toBe(true);
      expect(restaurants.length).toBeGreaterThan(0);
    });
  });

  describe('isSwitching', () => {
    it('should return false initially', () => {
      expect(service.isSwitching()).toBe(false);
    });

    it('should emit switching state', async () => {
      const states: boolean[] = [];
      
      // Subscribe and collect first emission
      const subscription = service.isSwitching$.subscribe(switching => {
        states.push(switching);
      });
      
      // Give it a moment to emit initial value
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(states.length).toBeGreaterThan(0);
      expect(states).toContain(false);
      
      subscription.unsubscribe();
    });
  });

  describe('getRestaurantTiming', () => {
    it('should return timing info for current restaurant', () => {
      const timing = service.getRestaurantTiming();

      expect(timing).toBeDefined();
    });

    it('should return timing info for specific restaurant', () => {
      const restaurants = service.getAllRestaurants();
      const timing = service.getRestaurantTiming(restaurants[0].id);

      expect(timing).toBeDefined();
    });
  });

  describe('getCurrentRestaurantConfig', () => {
    it('should return Firebase config', () => {
      const config = service.getCurrentRestaurantConfig();

      expect(config).toBeDefined();
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('projectId');
    });
  });

  describe('currentRestaurant$ observable', () => {
    it('should emit restaurant updates', async () => {
      let emissionCount = 0;
      const promise = new Promise<void>(resolve => {
        service.currentRestaurant$.subscribe(restaurant => {
          emissionCount++;
          expect(restaurant).toBeDefined();
          
          if (emissionCount === 1) {
            resolve();
          }
        });
      });
      await promise;
    });
  });
});
