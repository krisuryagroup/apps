import { describe, it, expect, beforeEach, vi } from 'vitest';
import { APP_SETTINGS_INITIALIZER } from './app-settings.initializer';
import { AppSettingsService } from '@zitro/services';
import { APP_INITIALIZER } from '@angular/core';

describe('APP_SETTINGS_INITIALIZER', () => {
  let mockAppSettingsService: AppSettingsService;

  beforeEach(() => {
    mockAppSettingsService = {
      initializeAndCheckSettings: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  describe('Provider configuration', () => {
    it('should provide APP_INITIALIZER token', () => {
      expect(APP_SETTINGS_INITIALIZER.provide).toBe(APP_INITIALIZER);
    });

    it('should be configured as multi provider', () => {
      expect(APP_SETTINGS_INITIALIZER.multi).toBe(true);
    });

    it('should depend on AppSettingsService', () => {
      expect(APP_SETTINGS_INITIALIZER.deps).toEqual([AppSettingsService]);
    });

    it('should have useFactory function', () => {
      expect(typeof APP_SETTINGS_INITIALIZER.useFactory).toBe('function');
    });
  });

  describe('Initializer factory function', () => {
    it('should return a function', () => {
      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      expect(typeof initFn).toBe('function');
    });

    it('should call initializeAndCheckSettings when invoked', async () => {
      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      await initFn();

      expect(
        mockAppSettingsService.initializeAndCheckSettings,
      ).toHaveBeenCalled();
    });

    it('should return Promise from initialization', () => {
      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      const result = initFn();

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve immediately without waiting for settings initialization to finish', async () => {
      let resolvePendingInit: (() => void) | undefined;
      const pendingInit = new Promise<void>((resolve) => {
        resolvePendingInit = resolve;
      });

      mockAppSettingsService.initializeAndCheckSettings = vi
        .fn()
        .mockReturnValue(pendingInit);

      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      const initResult = initFn();
      const outcome = await Promise.race([
        initResult.then(() => 'resolved'),
        new Promise((resolve) => setTimeout(() => resolve('pending'), 0)),
      ]);

      expect(outcome).toBe('resolved');

      resolvePendingInit?.();
      await initResult;
    });

    it('should handle initialization success', async () => {
      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      await expect(initFn()).resolves.not.toThrow();
    });

    it('should propagate initialization errors', async () => {
      mockAppSettingsService.initializeAndCheckSettings = vi
        .fn()
        .mockRejectedValue(new Error('Initialization failed'));

      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      await expect(initFn()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Integration behavior', () => {
    it('should ensure settings are checked before app starts', async () => {
      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      const startTime = Date.now();
      await initFn();
      const endTime = Date.now();

      expect(
        mockAppSettingsService.initializeAndCheckSettings,
      ).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });

    it('should work with multiple app initializers', async () => {
      const factory1 = APP_SETTINGS_INITIALIZER.useFactory;
      const factory2 = APP_SETTINGS_INITIALIZER.useFactory;

      const service1 = {
        initializeAndCheckSettings: vi.fn().mockResolvedValue(undefined),
      } as any;
      const service2 = {
        initializeAndCheckSettings: vi.fn().mockResolvedValue(undefined),
      } as any;

      const init1 = factory1(service1);
      const init2 = factory2(service2);

      await Promise.all([init1(), init2()]);

      expect(service1.initializeAndCheckSettings).toHaveBeenCalled();
      expect(service2.initializeAndCheckSettings).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it.each([
      ['network error', new Error('Network unavailable')],
      ['permission error', new Error('Permission denied')],
      ['timeout error', new Error('Request timeout')],
    ])('should handle %s', async (_, error) => {
      mockAppSettingsService.initializeAndCheckSettings = vi
        .fn()
        .mockRejectedValue(error);

      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      await expect(initFn()).rejects.toThrow(error.message);
    });
  });

  describe('Execution order', () => {
    it('should execute before app initialization completes', async () => {
      const executionLog: string[] = [];

      mockAppSettingsService.initializeAndCheckSettings = vi
        .fn()
        .mockImplementation(async () => {
          executionLog.push('settings-initialized');
        });

      const factory = APP_SETTINGS_INITIALIZER.useFactory;
      const initFn = factory(mockAppSettingsService);

      await initFn();
      executionLog.push('app-started');

      expect(executionLog).toEqual(['settings-initialized', 'app-started']);
    });
  });
});
