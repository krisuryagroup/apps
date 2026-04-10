import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BusinessSelectionGuard } from './business-selection.guard';
import { APP_SETTINGS_CACHE } from '../constants/app.constants';

describe('BusinessSelectionGuard', () => {
  let guard: BusinessSelectionGuard;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn()
    };
    guard = new BusinessSelectionGuard(mockRouter);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Business Selection Required', () => {
    it('should allow access when restaurant is selected', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'restaurant-123');

      const result = guard.canActivate();

      expect(result).toBe(true);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it.each([
      { id: 'rest-1', description: 'first restaurant' },
      { id: 'store-abc', description: 'store id' },
      { id: '12345', description: 'numeric id' },
      { id: 'test-business-xyz', description: 'complex id' }
    ])('should allow access with $description', ({ id }) => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, id);

      const result = guard.canActivate();

      expect(result).toBe(true);
    });
  });

  describe('No Business Selected', () => {
    it('should redirect to business-selection when no restaurant selected', () => {
      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/business-selection']);
    });

    it('should block access when localStorage is empty', () => {
      const result = guard.canActivate();

      expect(result).toBe(false);
    });

    it('should redirect when restaurant ID is null', () => {
      localStorage.removeItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID);

      const result = guard.canActivate();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/business-selection']);
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should block access when restaurant ID is empty string', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, '');

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/business-selection']);
    });

    it('should allow access with single character ID', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'a');

      const result = guard.canActivate();

      expect(result).toBe(true);
    });
  });

  describe('Navigation Behavior', () => {
    it('should navigate exactly once on blocked access', () => {
      guard.canActivate();

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    });

    it('should never navigate on successful access', () => {
      localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, 'rest-123');

      guard.canActivate();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should use correct navigation path', () => {
      guard.canActivate();

      const [[path]] = mockRouter.navigate.mock.calls;
      expect(path).toEqual(['/business-selection']);
    });
  });

  describe('State Validation', () => {
    it.each([
      { id: null, expected: false },
      { id: '', expected: false },
      { id: 'valid-id', expected: true },
      { id: '123', expected: true }
    ])('should return $expected when id is $id', ({ id, expected }) => {
      if (id !== null) {
        localStorage.setItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID, id);
      }

      const result = guard.canActivate();

      expect(result).toBe(expected);
    });
  });
});
