import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { APP_VERSION_INITIALIZER } from './app-version.initializer';
import { AppVersionService } from '@zitro/services';
import { APP_INITIALIZER, ApplicationRef, EnvironmentInjector, createComponent } from '@angular/core';

// Mock @capacitor/browser to prevent import errors
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn()
  }
}));

// Mock createComponent to prevent component resolution errors in tests
vi.mock('@angular/core', async () => {
  const actual = await vi.importActual<typeof import('@angular/core')>('@angular/core');
  return {
    ...actual,
    createComponent: vi.fn(() => ({
      instance: {
        message: '',
        isMandatory: false,
        update: { subscribe: vi.fn() },
        later: { subscribe: vi.fn() }
      },
      destroy: vi.fn(),
      changeDetectorRef: { detectChanges: vi.fn() },
      hostView: {
        rootNodes: [document.createElement('div')]
      }
    }))
  };
});

describe('APP_VERSION_INITIALIZER', () => {
  let mockAppVersionService: any;
  let mockApplicationRef: any;
  let mockInjector: any;

  beforeEach(() => {
    mockAppVersionService = {
      isAndroidApp: vi.fn(),
      checkForUpdate: vi.fn(),
      openPlayStore: vi.fn()
    };

    mockApplicationRef = {
      attachView: vi.fn(),
      detachView: vi.fn()
    };

    mockInjector = {};

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should be configured as APP_INITIALIZER', () => {
      expect(APP_VERSION_INITIALIZER.provide).toBe(APP_INITIALIZER);
    });

    it('should be a multi provider', () => {
      expect(APP_VERSION_INITIALIZER.multi).toBe(true);
    });

    it('should depend on correct services', () => {
      expect(APP_VERSION_INITIALIZER.deps).toEqual([
        AppVersionService,
        ApplicationRef,
        EnvironmentInjector
      ]);
    });

    it('should have a factory function', () => {
      expect(typeof APP_VERSION_INITIALIZER.useFactory).toBe('function');
    });
  });

  describe('Initializer Factory', () => {
    it('should return a function that returns a Promise', () => {
      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      expect(typeof initFn).toBe('function');
      const result = initFn();
      expect(result).toBeDefined();
      expect(typeof result.then).toBe('function');
    });
  });

  describe('Platform Detection', () => {
    it('should skip version check when not on Android app', async () => {
      mockAppVersionService.isAndroidApp.mockReturnValue(false);

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await initFn();

      expect(mockAppVersionService.checkForUpdate).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🌐 Version Check Initializer: Skipped (running in browser/web)');
    });

    it('should run version check when on Android app', async () => {
      mockAppVersionService.isAndroidApp.mockReturnValue(true);
      mockAppVersionService.checkForUpdate.mockResolvedValue(null);

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await initFn();

      expect(mockAppVersionService.checkForUpdate).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('📱 Version Check Initializer: Running (Android app detected)');
    });
  });

  describe('Update Check Results', () => {
    beforeEach(() => {
      mockAppVersionService.isAndroidApp.mockReturnValue(true);
    });

    it.each([
      [null, '✅ Version Check Initializer: App is up to date'],
      [{ needsUpdate: false }, '✅ Version Check Initializer: App is up to date']
    ])('should continue normally when %s', async (updateResult, expectedLog) => {
      mockAppVersionService.checkForUpdate.mockResolvedValue(updateResult);

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await initFn();

      expect(console.log).toHaveBeenCalledWith(expectedLog);
    });

    it('should log appropriate message for optional update', async () => {
      mockAppVersionService.checkForUpdate.mockResolvedValue({
        needsUpdate: true,
        isMandatory: false,
        message: 'Update available',
        storeUrl: 'https://play.google.com/store'
      });

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      // Start initialization but don't await (it will wait for user action)
      const promise = initFn();

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(console.log).toHaveBeenCalledWith('⚠️ Version Check Initializer: Update available');
    });

    it('should log appropriate message for mandatory update', async () => {
      mockAppVersionService.checkForUpdate.mockResolvedValue({
        needsUpdate: true,
        isMandatory: true,
        message: 'Update required',
        storeUrl: 'https://play.google.com/store'
      });

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      // Start initialization but don't await (it will block)
      const promise = initFn();

      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(console.log).toHaveBeenCalledWith('⚠️ Version Check Initializer: Update REQUIRED');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAppVersionService.isAndroidApp.mockReturnValue(true);
    });

    it('should not block app when version check fails', async () => {
      mockAppVersionService.checkForUpdate.mockRejectedValue(new Error('Network error'));

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await expect(initFn()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalledWith('❌ Version Check Initializer Error:', expect.any(Error));
    });

    it.each([
      [new Error('Firebase error'), 'Firebase'],
      [new Error('Network timeout'), 'Network'],
      [new Error('Permission denied'), 'Permission']
    ])('should handle %s error gracefully', async (error) => {
      mockAppVersionService.checkForUpdate.mockRejectedValue(error);

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await initFn();

      expect(console.error).toHaveBeenCalledWith('❌ Version Check Initializer Error:', error);
    });
  });

  describe('Integration Behavior', () => {
    it('should execute before app initialization completes', async () => {
      mockAppVersionService.isAndroidApp.mockReturnValue(true);
      mockAppVersionService.checkForUpdate.mockResolvedValue(null);

      const executionLog: string[] = [];

      mockAppVersionService.checkForUpdate.mockImplementation(async () => {
        executionLog.push('version-checked');
        return null;
      });

      const factory = APP_VERSION_INITIALIZER.useFactory;
      const initFn = factory(mockAppVersionService, mockApplicationRef, mockInjector);

      await initFn();
      executionLog.push('app-started');

      expect(executionLog).toEqual(['version-checked', 'app-started']);
    });

    it('should work with multiple app initializers', async () => {
      mockAppVersionService.isAndroidApp.mockReturnValue(true);
      mockAppVersionService.checkForUpdate.mockResolvedValue(null);

      const factory1 = APP_VERSION_INITIALIZER.useFactory;
      const factory2 = APP_VERSION_INITIALIZER.useFactory;

      const init1 = factory1(mockAppVersionService, mockApplicationRef, mockInjector);
      const init2 = factory2(mockAppVersionService, mockApplicationRef, mockInjector);

      await Promise.all([init1(), init2()]);

      expect(mockAppVersionService.checkForUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
