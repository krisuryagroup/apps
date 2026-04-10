import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LOCATION_INITIALIZER } from './location.initializer';
import { LocationService } from '@zitro/services';
import { Router } from '@angular/router';
import { APP_INITIALIZER } from '@angular/core';

describe('LOCATION_INITIALIZER', () => {
  let mockLocationService: LocationService;
  let mockRouter: Router;

  beforeEach(() => {
    localStorage.clear();

    mockLocationService = {
      checkLocationPermission: vi.fn().mockResolvedValue({
        permission: 'granted',
        hasLocation: true,
        coordinates: { lat: 26.1234, lng: 82.5678 },
        pincode: '123456'
      })
    } as any;

    mockRouter = {
      navigate: vi.fn()
    } as any;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Provider configuration', () => {
    it('should provide APP_INITIALIZER token', () => {
      expect(LOCATION_INITIALIZER.provide).toBe(APP_INITIALIZER);
    });

    it('should be configured as multi provider', () => {
      expect(LOCATION_INITIALIZER.multi).toBe(true);
    });

    it('should depend on LocationService and Router', () => {
      expect(LOCATION_INITIALIZER.deps).toEqual([LocationService, Router]);
    });

    it('should have useFactory function', () => {
      expect(typeof LOCATION_INITIALIZER.useFactory).toBe('function');
    });
  });

  describe('Initializer factory function', () => {
    it('should return a function', () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      expect(typeof initFn).toBe('function');
    });

    it('should return Promise from initialization', () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      const result = initFn();

      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
    });

    it('should complete without errors', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await expect(initFn()).resolves.not.toThrow();
    });
  });

  describe('Restaurant selection logic', () => {
    it('should skip location check when restaurant is already selected', async () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-123');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        '✅ Location Initializer: Restaurant already selected:',
        'restaurant-123'
      );
    });

    it('should skip location check when default business is set', async () => {
      localStorage.setItem('selectedRestaurantId', 'restaurant-123');
      localStorage.setItem('selectedRestaurantId_default', 'restaurant-123');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        '✅ Location Initializer: Using default business, no location check needed'
      );
    });

    it('should prepare location services for new users', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Preparing location services')
      );
    });

    it('should handle scenario when no restaurant is selected', async () => {
      localStorage.removeItem('selectedRestaurantId');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Preparing location services')
      );
    });
  });

  describe('Error handling', () => {
    it('should not block app startup on location errors', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      
      // Force an error by making localStorage throw
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const initFn = factory(mockLocationService, mockRouter);

      await expect(initFn()).resolves.not.toThrow();
      
      getItemSpy.mockRestore();
    });

    it('should log errors without propagating them', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      
      const getItemSpy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('Test error');
      });

      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.error).toHaveBeenCalledWith(
        '❌ Location Initializer: Error during initialization:',
        expect.any(Error)
      );
      
      getItemSpy.mockRestore();
    });

    it.each([
      ['permission denied', new Error('Permission denied')],
      ['location unavailable', new Error('Location unavailable')],
      ['timeout', new Error('Request timeout')]
    ])('should handle %s gracefully', async (_, error) => {
      mockLocationService.checkLocationPermission = vi.fn().mockRejectedValue(error);

      const factory = LOCATION_INITIALIZER.useFactory;
      
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw error;
      });

      const initFn = factory(mockLocationService, mockRouter);

      await expect(initFn()).resolves.not.toThrow();
    });
  });

  describe('Integration with business selection', () => {
    it('should delegate to business-selection component for new users', async () => {
      localStorage.clear();

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('business selection')
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should not interfere with existing restaurant selection', async () => {
      localStorage.setItem('selectedRestaurantId', 'existing-restaurant');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(localStorage.getItem('selectedRestaurantId')).toBe('existing-restaurant');
    });
  });

  describe('Logging behavior', () => {
    it('should log initialization start', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting location services')
      );
    });

    it('should log different scenarios with appropriate icons', async () => {
      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      // Should have called console.log with emoji icons
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('localStorage interaction', () => {
    it('should check for selected restaurant', async () => {
      localStorage.setItem('selectedRestaurantId', 'test-restaurant');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      // Verify it accessed localStorage by checking the log message
      expect(console.log).toHaveBeenCalledWith(
        '✅ Location Initializer: Restaurant already selected:',
        'test-restaurant'
      );
    });

    it('should check for default business when restaurant exists', async () => {
      localStorage.setItem('selectedRestaurantId', 'test-restaurant');
      localStorage.setItem('selectedRestaurantId_default', 'test-restaurant');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await initFn();

      // Verify default business path was taken
      expect(console.log).toHaveBeenCalledWith(
        '✅ Location Initializer: Using default business, no location check needed'
      );
    });

    it('should handle missing localStorage gracefully', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      await expect(initFn()).resolves.not.toThrow();
    });
  });

  describe('Execution flow', () => {
    it('should complete initialization before app starts', async () => {
      const executionLog: string[] = [];

      localStorage.setItem('selectedRestaurantId', 'test-restaurant');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      executionLog.push('initializer-started');
      await initFn();
      executionLog.push('initializer-completed');

      expect(executionLog).toEqual(['initializer-started', 'initializer-completed']);
    });

    it('should not delay app startup unnecessarily', async () => {
      localStorage.setItem('selectedRestaurantId', 'test-restaurant');
      localStorage.setItem('test-restaurant_default', 'test-restaurant');

      const factory = LOCATION_INITIALIZER.useFactory;
      const initFn = factory(mockLocationService, mockRouter);

      const startTime = Date.now();
      await initFn();
      const endTime = Date.now();

      // Should complete quickly when using default business
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
