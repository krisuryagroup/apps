import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestaurantSwitchingUtil, Restaurant } from './restaurant-switching.util';

// Mock the constants module
vi.mock('./app.constants', () => ({
  RESTAURANTS: [
    {
      id: 'rest1',
      name: 'Pizza Palace',
      location: 'Downtown',
      title: 'Best Pizza',
      type: 'Italian',
      rating: 4.5,
      deliveryTime: '30-40 min',
      openTime: '10:00',
      closeTime: '22:00',
      pincode: '12345'
    },
    {
      id: 'rest2',
      name: 'Burger Hub',
      location: 'Uptown',
      title: 'Burger Paradise',
      type: 'American',
      rating: 4.2,
      deliveryTime: '25-35 min',
      openTime: '11:00',
      closeTime: '23:00',
      pincode: '54321'
    }
  ],
  FIREBASE_CONFIG: { apiKey: 'test-key' },
  UI_TEXT: { UNKNOWN_RESTAURANT: 'Unknown Restaurant' }
}));

describe('RestaurantSwitchingUtil', () => {

  describe('getRestaurantById', () => {
    it.each([
      ['rest1', 'Pizza Palace', 'valid restaurant ID'],
      ['nonexistent', undefined, 'invalid restaurant ID']
    ])('should return %s for %s', (id, expectedName, _description) => {
      const restaurant = RestaurantSwitchingUtil.getRestaurantById(id);

      if (expectedName === undefined) {
        expect(restaurant).toBeUndefined();
      } else {
        expect(restaurant).toBeDefined();
        expect(restaurant?.name).toBe(expectedName);
      }
    });
  });

  describe('getRestaurantName', () => {
    it.each([
      ['rest1', 'Pizza Palace', 'existing restaurant'],
      ['nonexistent', 'Unknown Restaurant', 'invalid ID']
    ])('should return "%s" for %s', (id, expected, _description) => {
      expect(RestaurantSwitchingUtil.getRestaurantName(id)).toBe(expected);
    });
  });

  describe('isValidRestaurantId', () => {
    it.each([
      // Valid IDs
      ['rest1', true, 'first restaurant'],
      ['rest2', true, 'second restaurant'],
      // Invalid IDs
      ['invalid', false, 'non-existent ID'],
      ['', false, 'empty string']
    ])('should return %s for %s', (id, expected, _description) => {
      expect(RestaurantSwitchingUtil.isValidRestaurantId(id)).toBe(expected);
    });
  });

  describe('getFirebaseConfig', () => {
    it('should return Firebase config', () => {
      const config = RestaurantSwitchingUtil.getFirebaseConfig('rest1');

      expect(config).toEqual({ apiKey: 'test-key' });
    });
  });

  describe('clearRestaurantSpecificData', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it.each([
      [{ token: 'test-token', currentUserPhone: '1234567890' }, ['token', 'currentUserPhone'], 'auth data'],
      [{ products_cache: 'cached-data', user_favorites: 'favorites' }, ['products_cache', 'user_favorites'], 'cache data']
    ])('should clear %s from localStorage', (data, keys, _description) => {
      Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value));

      RestaurantSwitchingUtil.clearRestaurantSpecificData();

      keys.forEach(key => expect(localStorage.getItem(key)).toBeNull());
    });

    it('should clear sessionStorage', () => {
      sessionStorage.setItem('test-key', 'test-value');

      RestaurantSwitchingUtil.clearRestaurantSpecificData();

      expect(sessionStorage.length).toBe(0);
    });
  });

  describe('getSwitchConfirmationMessage', () => {
    it('should include both restaurant names and sign out warning', () => {
      const message = RestaurantSwitchingUtil.getSwitchConfirmationMessage('Pizza Palace', 'Burger Hub');

      expect(message).toContain('Pizza Palace');
      expect(message).toContain('Burger Hub');
      expect(message).toContain('sign you out');
    });
  });

  describe('getSwitchSuccessMessage', () => {
    it('should include restaurant name and success indicator', () => {
      const message = RestaurantSwitchingUtil.getSwitchSuccessMessage('Pizza Palace');

      expect(message).toContain('Pizza Palace');
      expect(message).toContain('Successfully switched');
    });
  });

  describe('getRestaurantTimingInfo', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2024-01-01T12:00:00'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ['rest1', '2024-01-01T12:00:00', '10:00', '22:00', true, 'open during business hours'],
      ['rest1', '2024-01-01T09:00:00', '10:00', '22:00', false, 'before opening'],
      ['invalid', '2024-01-01T12:00:00', '10:00', '21:00', false, 'invalid ID with defaults']
    ])('should return timing info for %s', (id, mockTime, expectedOpen, expectedClose, expectedIsOpen, _description) => {
      vi.setSystemTime(new Date(mockTime));
      const info = RestaurantSwitchingUtil.getRestaurantTimingInfo(id);

      expect(info.openTime).toBe(expectedOpen);
      expect(info.closeTime).toBe(expectedClose);
      expect(info.isOpen).toBe(expectedIsOpen);
    });
  });

  describe('formatRestaurantForDisplay', () => {
    it('should format restaurant with all display fields', () => {
      const restaurant = RestaurantSwitchingUtil.getRestaurantById('rest1');
      const formatted = RestaurantSwitchingUtil.formatRestaurantForDisplay(restaurant!);

      expect(formatted.id).toBe('rest1');
      expect(formatted.name).toBe('Pizza Palace');
      expect(formatted.displayText).toBe('Pizza Palace • Downtown');
      expect(formatted.subtitle).toContain('Italian');
      expect(formatted.subtitle).toContain('4.5');
    });
  });

  describe('getAllRestaurantsForDisplay', () => {
    it('should return all restaurants formatted', () => {
      const restaurants = RestaurantSwitchingUtil.getAllRestaurantsForDisplay();

      expect(restaurants).toHaveLength(2);
      expect(restaurants[0].name).toBe('Pizza Palace');
      expect(restaurants[1].name).toBe('Burger Hub');
    });
  });

  describe('dispatchRestaurantSwitchedEvent', () => {
    it('should dispatch custom event with restaurant ID', () => {
      const eventSpy = vi.fn();
      window.addEventListener('restaurantSwitched', eventSpy);

      RestaurantSwitchingUtil.dispatchRestaurantSwitchedEvent('rest1');

      expect(eventSpy).toHaveBeenCalled();
      window.removeEventListener('restaurantSwitched', eventSpy);
    });
  });

  describe('addRestaurantSwitchListener', () => {
    it('should add event listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = RestaurantSwitchingUtil.addRestaurantSwitchListener(callback);

      RestaurantSwitchingUtil.dispatchRestaurantSwitchedEvent('rest1');

      expect(callback).toHaveBeenCalledWith('rest1');

      cleanup();
      RestaurantSwitchingUtil.dispatchRestaurantSwitchedEvent('rest2');

      // Should not be called after cleanup
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
