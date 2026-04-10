import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LocationService } from './location.service';
import { Geolocation } from '@capacitor/geolocation';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn()
  }
}));

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    localStorage.clear();
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    service = new LocationService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });
  });

  describe('checkLocationPermission', () => {
    it('should return granted status when permission is granted', async () => {
      const mockPosition = {
        coords: { latitude: 26.1234, longitude: 82.5678 }
      };

      vi.mocked(Geolocation.checkPermissions).mockResolvedValue({
        location: 'granted'
      } as any);
      
      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(mockPosition as any);

      const result = await service.checkLocationPermission();

      expect(result.permission).toBe('granted');
      expect(result.hasLocation).toBe(true);
      expect(result.coordinates).toBeDefined();
    });

    it('should return denied status when permission is denied', async () => {
      vi.mocked(Geolocation.checkPermissions).mockResolvedValue({
        location: 'denied'
      } as any);

      const result = await service.checkLocationPermission();

      expect(result.permission).toBe('denied');
      expect(result.hasLocation).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should request permission when status is prompt', async () => {
      vi.mocked(Geolocation.checkPermissions).mockResolvedValue({
        location: 'prompt'
      } as any);

      vi.mocked(Geolocation.requestPermissions).mockResolvedValue({
        location: 'granted'
      } as any);

      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
        coords: { latitude: 26.1234, longitude: 82.5678 }
      } as any);

      const result = await service.checkLocationPermission();

      expect(Geolocation.requestPermissions).toHaveBeenCalled();
      expect(result.permission).toBe('granted');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(Geolocation.checkPermissions).mockRejectedValue(new Error('Geolocation error'));

      const result = await service.checkLocationPermission();

      expect(result.permission).toBe('denied');
      expect(result.hasLocation).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getPincodeFromCoordinates', () => {
    it('should return pincode for given coordinates', async () => {
      const coordinates = { lat: 26.1234, lng: 82.5678 };

      const pincode = await service.getPincodeFromCoordinates(coordinates);

      expect(typeof pincode).toBe('string');
      expect(pincode).toHaveLength(6);
    });

    it('should return fallback pincode on error', async () => {
      const invalidCoordinates = { lat: NaN, lng: NaN };

      const pincode = await service.getPincodeFromCoordinates(invalidCoordinates);

      expect(pincode).toBe('206244');
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two coordinates', () => {
      const coord1 = { lat: 26.1234, lng: 82.5678 };
      const coord2 = { lat: 27.2345, lng: 79.9876 };

      const distance = service.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
    });

    it('should return 0 for same coordinates', () => {
      const coord = { lat: 26.1234, lng: 82.5678 };

      const distance = service.calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it.each([
      ['close', { lat: 26.1, lng: 82.5 }, { lat: 26.2, lng: 82.6 }],
      ['medium', { lat: 26.0, lng: 82.0 }, { lat: 27.0, lng: 83.0 }],
      ['far', { lat: 20.0, lng: 75.0 }, { lat: 30.0, lng: 85.0 }]
    ])('should handle %s distances', (_, coord1, coord2) => {
      const distance = service.calculateDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(0);
      expect(Number.isFinite(distance)).toBe(true);
    });
  });

  describe('getCachedLocation', () => {
    it('should return null for empty cache', () => {
      const cached = service.getCachedLocation();

      expect(cached.coordinates).toBeNull();
      expect(cached.pincode).toBeNull();
    });

    it('should return cached location when available', async () => {
      vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as any);
      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
        coords: { latitude: 26.1234, longitude: 82.5678 }
      } as any);

      await service.checkLocationPermission();

      const cached = service.getCachedLocation();

      expect(cached.coordinates).not.toBeNull();
      expect(cached.pincode).not.toBeNull();
    });
  });

  describe('clearLocationCache', () => {
    it('should clear cached location data', async () => {
      vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as any);
      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
        coords: { latitude: 26.1234, longitude: 82.5678 }
      } as any);

      await service.checkLocationPermission();
      expect(service.getCachedLocation().coordinates).not.toBeNull();

      service.clearLocationCache();

      const cached = service.getCachedLocation();
      expect(cached.coordinates).toBeNull();
      expect(cached.pincode).toBeNull();
    });
  });

  describe('Location permission preferences', () => {
    it('should save location permission preference', () => {
      service.saveLocationPermissionPreference('granted');

      expect(localStorage.getItem('location_permission_preference')).toBe('granted');
    });

    it('should get saved permission preference', () => {
      localStorage.setItem('location_permission_preference', 'denied');

      const preference = service.getLocationPermissionPreference();

      expect(preference).toBe('denied');
    });

    it('should return null when no preference is saved', () => {
      const preference = service.getLocationPermissionPreference();

      expect(preference).toBeNull();
    });

    it.each([
      ['denied', true],
      ['granted', false],
      [null, false]
    ])('should skip prompt when preference is %s: %s', (preference, shouldSkip) => {
      if (preference) {
        localStorage.setItem('location_permission_preference', preference);
      }

      expect(service.shouldSkipLocationPrompt()).toBe(shouldSkip);
    });
  });

  describe('Manual pincode management', () => {
    it('should save user pincode manually', () => {
      service.saveUserPincode('123456');

      expect(localStorage.getItem('user_pincode_manual')).toBe('123456');
      expect(service.getCachedLocation().pincode).toBe('123456');
    });

    it('should get saved pincode', () => {
      localStorage.setItem('user_pincode_manual', '654321');

      const pincode = service.getSavedPincode();

      expect(pincode).toBe('654321');
    });

    it('should return null when no pincode is saved', () => {
      const pincode = service.getSavedPincode();

      expect(pincode).toBeNull();
    });
  });

  describe('getBusinessesByPincode', () => {
    it('should filter businesses by pincode', () => {
      const businesses: any[] = [
        { id: '1', name: 'Business 1', pincode: '123456' },
        { id: '2', name: 'Business 2', pincode: '654321' },
        { id: '3', name: 'Business 3', pincode: '123456' }
      ];

      const filtered = service.getBusinessesByPincode(businesses, '123456');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(b => b.pincode === '123456')).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const businesses: any[] = [
        { id: '1', name: 'Business 1', pincode: '123456' }
      ];

      const filtered = service.getBusinessesByPincode(businesses, '999999');

      expect(filtered).toEqual([]);
    });
  });

  describe('sortByProximity', () => {
    it('should sort restaurants by distance', () => {
      const userLocation = { lat: 26.0, lng: 82.0 };
      const restaurants: any[] = [
        { id: '1', name: 'Far', coordinates: { lat: 30.0, lng: 85.0 } },
        { id: '2', name: 'Close', coordinates: { lat: 26.1, lng: 82.1 } },
        { id: '3', name: 'Medium', coordinates: { lat: 27.0, lng: 83.0 } }
      ];

      const sorted = service.sortByProximity(restaurants, userLocation);

      expect(sorted[0].name).toBe('Close');
      expect(sorted[2].name).toBe('Far');
    });

    it('should handle restaurants without coordinates', () => {
      const userLocation = { lat: 26.0, lng: 82.0 };
      const restaurants: any[] = [
        { id: '1', name: 'No coords' },
        { id: '2', name: 'With coords', coordinates: { lat: 26.1, lng: 82.1 } }
      ];

      const sorted = service.sortByProximity(restaurants, userLocation);

      expect(sorted).toHaveLength(2);
    });
  });

  describe('sortByPincodeProximity', () => {
    it('should sort by pincode difference', () => {
      const restaurants: any[] = [
        { id: '1', pincode: '300000' },
        { id: '2', pincode: '200100' },
        { id: '3', pincode: '250000' }
      ];

      const sorted = service.sortByPincodeProximity(restaurants, '200000');

      expect(sorted[0].pincode).toBe('200100');
      expect(sorted[2].pincode).toBe('300000');
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location', async () => {
      vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
        coords: { latitude: 26.1234, longitude: 82.5678 }
      } as any);

      const location = await service.getCurrentLocation();

      expect(location).toEqual({ lat: 26.1234, lng: 82.5678 });
    });

    it('should return fallback location on error', async () => {
      vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('Location error'));

      const location = await service.getCurrentLocation();

      expect(location).toHaveProperty('lat');
      expect(location).toHaveProperty('lng');
    });
  });
});
