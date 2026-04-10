import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManagementComponent } from './cache-management.component';

describe('CacheManagementComponent', () => {
  let component: CacheManagementComponent;
  let mockAppSettingsService: any;

  beforeEach(() => {
    mockAppSettingsService = {
      manualCacheClear: vi.fn().mockResolvedValue(undefined),
      manualLogout: vi.fn().mockResolvedValue(undefined)
    };

    component = new CacheManagementComponent(mockAppSettingsService);

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isProcessing).toBe(false);
    });

    it('should have appSettingsService injected', () => {
      expect(mockAppSettingsService).toBeDefined();
    });
  });

  describe('Clear Cache', () => {
    it('should call manualCacheClear', async () => {
      await component.clearCache();

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalled();
    });

    it('should set processing state during cache clear', async () => {
      let processingDuringCall = false;
      mockAppSettingsService.manualCacheClear.mockImplementation(async () => {
        processingDuringCall = component.isProcessing;
      });

      await component.clearCache();

      expect(processingDuringCall).toBe(true);
      expect(component.isProcessing).toBe(false);
    });

    it('should reset processing state after successful clear', async () => {
      await component.clearCache();

      expect(component.isProcessing).toBe(false);
    });

    it('should handle cache clear error', async () => {
      mockAppSettingsService.manualCacheClear.mockRejectedValue(new Error('Clear failed'));

      await component.clearCache();

      expect(component.isProcessing).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error clearing cache:', expect.any(Error));
    });

    it('should prevent multiple simultaneous cache clears', async () => {
      mockAppSettingsService.manualCacheClear.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const promise1 = component.clearCache();
      const promise2 = component.clearCache();

      await Promise.all([promise1, promise2]);

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(1);
    });

    it('should allow cache clear after previous completes', async () => {
      await component.clearCache();
      await component.clearCache();

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(2);
    });
  });

  describe('Force Logout', () => {
    it('should call manualLogout', async () => {
      await component.forceLogout();

      expect(mockAppSettingsService.manualLogout).toHaveBeenCalled();
    });

    it('should set processing state during logout', async () => {
      let processingDuringCall = false;
      mockAppSettingsService.manualLogout.mockImplementation(async () => {
        processingDuringCall = component.isProcessing;
      });

      await component.forceLogout();

      expect(processingDuringCall).toBe(true);
      expect(component.isProcessing).toBe(false);
    });

    it('should reset processing state after successful logout', async () => {
      await component.forceLogout();

      expect(component.isProcessing).toBe(false);
    });

    it('should handle logout error', async () => {
      mockAppSettingsService.manualLogout.mockRejectedValue(new Error('Logout failed'));

      await component.forceLogout();

      expect(component.isProcessing).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error during logout:', expect.any(Error));
    });

    it('should prevent multiple simultaneous logouts', async () => {
      mockAppSettingsService.manualLogout.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const promise1 = component.forceLogout();
      const promise2 = component.forceLogout();

      await Promise.all([promise1, promise2]);

      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(1);
    });

    it('should allow logout after previous completes', async () => {
      await component.forceLogout();
      await component.forceLogout();

      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Processing State Management', () => {
    it('should prevent cache clear when processing', async () => {
      component.isProcessing = true;

      await component.clearCache();

      expect(mockAppSettingsService.manualCacheClear).not.toHaveBeenCalled();
    });

    it('should prevent logout when processing', async () => {
      component.isProcessing = true;

      await component.forceLogout();

      expect(mockAppSettingsService.manualLogout).not.toHaveBeenCalled();
    });

    it('should handle rapid successive calls', async () => {
      const promise1 = component.clearCache();
      const promise2 = component.clearCache();
      const promise3 = component.clearCache();

      await Promise.all([promise1, promise2, promise3]);

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should log cache clear errors', async () => {
      const error = new Error('Cache service unavailable');
      mockAppSettingsService.manualCacheClear.mockRejectedValue(error);

      await component.clearCache();

      expect(console.error).toHaveBeenCalledWith('Error clearing cache:', error);
    });

    it('should log logout errors', async () => {
      const error = new Error('Logout service unavailable');
      mockAppSettingsService.manualLogout.mockRejectedValue(error);

      await component.forceLogout();

      expect(console.error).toHaveBeenCalledWith('Error during logout:', error);
    });

    it.each([
      { operation: 'clearCache', method: 'manualCacheClear', errorMsg: 'Network error' },
      { operation: 'forceLogout', method: 'manualLogout', errorMsg: 'Auth error' }
    ])('should handle $errorMsg in $operation', async ({ operation, method, errorMsg }) => {
      mockAppSettingsService[method].mockRejectedValue(new Error(errorMsg));

      await (component as any)[operation]();

      expect(component.isProcessing).toBe(false);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle cache clear while logout is processing', async () => {
      let isLogoutProcessing = false;
      mockAppSettingsService.manualLogout.mockImplementation(async () => {
        isLogoutProcessing = true;
        await new Promise(resolve => setTimeout(resolve, 100));
        isLogoutProcessing = false;
      });

      const logoutPromise = component.forceLogout();
      // Cache clear is prevented because isProcessing is true during logout
      await component.clearCache();
      await logoutPromise;

      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(1);
      // clearCache is prevented by isProcessing guard
      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(0);
    });

    it('should handle logout while cache clear is processing', async () => {
      let isCacheClearProcessing = false;
      mockAppSettingsService.manualCacheClear.mockImplementation(async () => {
        isCacheClearProcessing = true;
        await new Promise(resolve => setTimeout(resolve, 100));
        isCacheClearProcessing = false;
      });

      const clearPromise = component.clearCache();
      // Logout is prevented because isProcessing is true during cache clear
      await component.forceLogout();
      await clearPromise;

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(1);
      // forceLogout is prevented by isProcessing guard
      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(0);
    });
  });

  describe('Service Integration', () => {
    it('should call service methods exactly once per operation', async () => {
      await component.clearCache();
      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(1);

      await component.forceLogout();
      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(1);
    });

    it('should work with slow service responses', async () => {
      mockAppSettingsService.manualCacheClear.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 500))
      );

      const startTime = Date.now();
      await component.clearCache();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state through multiple operations', async () => {
      await component.clearCache();
      expect(component.isProcessing).toBe(false);

      await component.forceLogout();
      expect(component.isProcessing).toBe(false);

      await component.clearCache();
      expect(component.isProcessing).toBe(false);
    });

    it('should reset state even after errors', async () => {
      mockAppSettingsService.manualCacheClear.mockRejectedValue(new Error('Failed'));

      await component.clearCache();
      expect(component.isProcessing).toBe(false);

      mockAppSettingsService.manualCacheClear.mockResolvedValue(undefined);
      await component.clearCache();
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined service responses', async () => {
      mockAppSettingsService.manualCacheClear.mockResolvedValue(undefined);

      await component.clearCache();

      expect(component.isProcessing).toBe(false);
    });

    it('should handle null service responses', async () => {
      mockAppSettingsService.manualLogout.mockResolvedValue(null);

      await component.forceLogout();

      expect(component.isProcessing).toBe(false);
    });

    it('should handle rapid alternating operations', async () => {
      await component.clearCache();
      await component.forceLogout();
      await component.clearCache();
      await component.forceLogout();

      expect(mockAppSettingsService.manualCacheClear).toHaveBeenCalledTimes(2);
      expect(mockAppSettingsService.manualLogout).toHaveBeenCalledTimes(2);
    });
  });
});
