import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirebaseConfigService } from './firebase-config.service';
import * as firebaseApp from 'firebase/app';
import * as firestore from 'firebase/firestore';
import * as storage from 'firebase/storage';
import * as auth from 'firebase/auth';

vi.mock('firebase/app', () => ({
  getApps: vi.fn(),
  getApp: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn()
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn()
}));

describe('FirebaseConfigService', () => {
  let service: FirebaseConfigService;
  let mockApp: any;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    
    mockApp = {
      name: 'mockApp',
      options: {
        apiKey: 'test-api-key',
        projectId: 'test-project',
        storageBucket: 'test-bucket'
      }
    };

    vi.mocked(firebaseApp.getApps).mockReturnValue([mockApp]);
    vi.mocked(firebaseApp.getApp).mockReturnValue(mockApp);
    vi.mocked(firestore.getFirestore).mockReturnValue({} as any);
    vi.mocked(storage.getStorage).mockReturnValue({} as any);
    vi.mocked(auth.getAuth).mockReturnValue({} as any);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new FirebaseConfigService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with centralized Firebase app', () => {
      expect(service).toBeDefined();
      expect(firebaseApp.getApps).toHaveBeenCalled();
    });

    it('should initialize Firestore, Storage, and Auth', () => {
      expect(firestore.getFirestore).toHaveBeenCalled();
      expect(storage.getStorage).toHaveBeenCalled();
      expect(auth.getAuth).toHaveBeenCalled();
    });

    it('should handle missing Firebase app gracefully', () => {
      vi.mocked(firebaseApp.getApps).mockReturnValue([]);
      
      new FirebaseConfigService();
      
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('switchRestaurant', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { reload: vi.fn() },
        writable: true
      });
    });

    it('should not switch if already on current restaurant', async () => {
      const currentId = (service as any).currentRestaurantId;
      
      await service.switchRestaurant(currentId);
      
      expect(console.log).toHaveBeenCalledWith('Already connected to this restaurant');
    });

    it('should update current restaurant ID', async () => {
      const initialId = (service as any).currentRestaurantId;
      
      await service.switchRestaurant('different-restaurant');
      
      expect((service as any).currentRestaurantId).not.toBe(initialId);
    });

    it('should clear local storage on switch', async () => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user_data', 'data');
      
      await service.switchRestaurant('different-restaurant');
      
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should notify restaurant switch', async () => {
      const spy = vi.spyOn(service as any, 'notifyRestaurantSwitch');
      
      await service.switchRestaurant('different-restaurant');
      
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getCurrentRestaurantId', () => {
    it('should return current restaurant ID', () => {
      const id = service.getCurrentRestaurantId();
      
      expect(typeof id).toBe('string');
      expect(id).toBeDefined();
    });
  });

  describe('getCurrentRestaurantId', () => {
    it('should return current restaurant ID', () => {
      const restaurantId = service.getCurrentRestaurantId();
      
      expect(restaurantId).toBeDefined();
      expect(typeof restaurantId).toBe('string');
    });
  });

  describe('getCurrentConfig', () => {
    it('should return Firebase config', () => {
      const config = service.getCurrentConfig();
      
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('projectId');
      expect(config).toHaveProperty('storageBucket');
    });
  });
});
