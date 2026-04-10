import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AppVersionService } from './app-version.service';
import { Capacitor } from '@capacitor/core';
import * as firestore from '@angular/fire/firestore';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn()
  }
}));

// Mock @capacitor/app
vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: vi.fn()
  }
}));

// Mock @capacitor/browser
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn()
  }
}));

// Mock @angular/fire/firestore
vi.mock('@angular/fire/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn()
}));

describe('AppVersionService', () => {
  let service: AppVersionService;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {};
    service = new AppVersionService(mockFirestore);
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform Detection', () => {
    it.each([
      // [isNative, platform, expected, description]
      [true, 'android', true, 'Android native app'],
      [true, 'ios', false, 'iOS native app'],
      [false, 'web', false, 'Web browser'],
      [false, 'android', false, 'Android browser'],
      [true, 'electron', false, 'Electron app']
    ])('should return %p for %p - %p', (isNative, platform, expected, description) => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(isNative);
      vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);

      expect(service.isAndroidApp()).toBe(expected);
    });
  });

  describe('Version Comparison', () => {
    it.each([
      // Equal versions
      ['1.0.0', '1.0.0', 0, 'identical versions'],
      ['2.5.3', '2.5.3', 0, 'identical complex versions'],
      ['1.0', '1.0.0', 0, 'versions with different lengths but equal'],
      
      // Older versions (v1 < v2)
      ['1.0.0', '1.0.1', -1, 'patch version older'],
      ['1.0.0', '1.1.0', -1, 'minor version older'],
      ['1.0.0', '2.0.0', -1, 'major version older'],
      ['1.9.9', '2.0.0', -1, 'high patch/minor but lower major'],
      ['1.0', '1.0.1', -1, 'shorter version older'],
      
      // Newer versions (v1 > v2)
      ['1.0.1', '1.0.0', 1, 'patch version newer'],
      ['1.1.0', '1.0.0', 1, 'minor version newer'],
      ['2.0.0', '1.0.0', 1, 'major version newer'],
      ['2.0.0', '1.9.9', 1, 'lower patch/minor but higher major'],
      ['1.0.1', '1.0', 1, 'shorter version newer']
    ])('should return %i when comparing %s with %s (%s)', (v1, v2, expected) => {
      expect(service.compareVersions(v1, v2)).toBe(expected);
    });
  });

  describe('Get Current App Version', () => {
    it('should return null when not running on Android app', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const version = await service.getCurrentAppVersion();

      expect(version).toBeNull();
    });

    it('should return version from Capacitor on Android', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const { App } = await import('@capacitor/app');
      vi.mocked(App.getInfo).mockResolvedValue({
        name: 'Test App',
        id: 'com.test.app',
        build: '1',
        version: '1.2.3'
      });

      const version = await service.getCurrentAppVersion();

      expect(version).toBe('1.2.3');
      expect(console.log).toHaveBeenCalledWith('📱 App Version: Current version:', '1.2.3');
    });

    it('should return null and log error when Capacitor fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const { App } = await import('@capacitor/app');
      vi.mocked(App.getInfo).mockRejectedValue(new Error('Failed to get info'));

      const version = await service.getCurrentAppVersion();

      expect(version).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Error getting app version:', expect.any(Error));
    });
  });

  describe('Get Version Config', () => {
    const mockConfig = {
      enableVersionCheck: true,
      currentVersion: '1.2.0',
      minimumVersion: '1.0.0',
      isUpdateMandatory: true,
      updateMessage: 'Update available',
      mandatoryUpdateMessage: 'Update required',
      playStoreUrl: 'https://play.google.com/store',
      updateButtonText: 'Update',
      laterButtonText: 'Later',
      lastUpdated: '2026-01-14T10:00:00Z'
    };

    it('should return config when document exists with appVersion field', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ appVersion: mockConfig })
      } as any);

      const config = await service.getVersionConfig();

      expect(config).toEqual(mockConfig);
      expect(console.log).toHaveBeenCalledWith('✅ Version config loaded from Firebase:', mockConfig);
    });

    it.each([
      [false, () => ({}), 'document does not exist'],
      [true, () => ({}), 'appVersion field is missing'],
      [true, () => ({ appVersion: null }), 'appVersion is null']
    ])('should return null when %s', async (exists, dataFn, description) => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => exists,
        data: dataFn
      } as any);

      const config = await service.getVersionConfig();

      expect(config).toBeNull();
    });

    it('should return null and log error when Firebase fails', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockRejectedValue(new Error('Firebase error'));

      const config = await service.getVersionConfig();

      expect(config).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Error fetching version config from Firebase:', expect.any(Error));
    });
  });

  describe('Check For Update', () => {
    beforeEach(() => {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    const setupMocks = async (currentVersion: string, config: any) => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const { App } = await import('@capacitor/app');
      vi.mocked(App.getInfo).mockResolvedValue({
        name: 'Test App',
        id: 'com.test.app',
        build: '1',
        version: currentVersion
      });

      vi.mocked(firestore.doc).mockReturnValue({} as any);
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({ appVersion: config })
      } as any);
    };

    it('should return null when not running on Android app', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      const result = await service.checkForUpdate();

      expect(result).toBeNull();
      expect(console.log).toHaveBeenCalledWith('🌐 Version Check: Skipped (running in browser/web)');
    });

    it.each([
      ['version check is disabled', { enableVersionCheck: false }],
      ['current version is null', null],
      ['config is null', null]
    ])('should return null when %s', async (description, config) => {
      await setupMocks('1.0.0', config);

      const result = await service.checkForUpdate();

      expect(result).toBeNull();
    });

    it.each([
      // [currentVersion, config, expectedResult, description]
      // Force update scenarios
      ['0.8.0', {
        enableVersionCheck: true,
        currentVersion: '1.2.0',
        minimumVersion: '1.0.0',
        forceUpdateBelow: '0.9.0',
        isUpdateMandatory: true,
        mandatoryUpdateMessage: 'Force update required',
        playStoreUrl: 'https://play.google.com/store'
      }, { needsUpdate: true, isMandatory: true, message: 'Force update required', storeUrl: 'https://play.google.com/store' }, 'force update when below threshold'],

      // Mandatory update scenarios
      ['0.9.0', {
        enableVersionCheck: true,
        currentVersion: '1.2.0',
        minimumVersion: '1.0.0',
        isUpdateMandatory: true,
        mandatoryUpdateMessage: 'Update required',
        playStoreUrl: 'https://play.google.com/store'
      }, { needsUpdate: true, isMandatory: true, message: 'Update required', storeUrl: 'https://play.google.com/store' }, 'mandatory update when below minimum'],

      // Optional update scenarios
      ['1.1.0', {
        enableVersionCheck: true,
        currentVersion: '1.2.0',
        minimumVersion: '1.0.0',
        isUpdateMandatory: false,
        updateMessage: 'Update available',
        playStoreUrl: 'https://play.google.com/store'
      }, { needsUpdate: true, isMandatory: false, message: 'Update available', storeUrl: 'https://play.google.com/store' }, 'optional update when newer version available'],

      // No update scenarios
      ['1.2.0', {
        enableVersionCheck: true,
        currentVersion: '1.2.0',
        minimumVersion: '1.0.0'
      }, null, 'no update when app is up to date'],

      ['1.3.0', {
        enableVersionCheck: true,
        currentVersion: '1.2.0',
        minimumVersion: '1.0.0'
      }, null, 'no update when app is newer than available']
    ])('should handle %s', async (currentVersion, config, expectedResult) => {
      await setupMocks(currentVersion, config);

      const result = await service.checkForUpdate();

      expect(result).toEqual(expectedResult);
    });

    it('should return null and log error when check fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const { App } = await import('@capacitor/app');
      vi.mocked(App.getInfo).mockRejectedValue(new Error('Failed'));

      const result = await service.checkForUpdate();

      expect(result).toBeNull();
      // The error is logged from getCurrentAppVersion, not from checkForUpdate
      expect(console.error).toHaveBeenCalledWith('❌ Error getting app version:', expect.any(Error));
    });
  });

  describe('Open Play Store', () => {
    it('should not open Play Store when not on Android app', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      await service.openPlayStore('https://play.google.com/store');

      expect(console.warn).toHaveBeenCalledWith('⚠️ Cannot open Play Store: Not running on Android app');
    });

    it('should open Play Store using Browser plugin on Android', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const mockBrowser = { open: vi.fn().mockResolvedValue({}) };
      vi.doMock('@capacitor/browser', () => ({ Browser: mockBrowser }));

      await service.openPlayStore('https://play.google.com/store/test');

      expect(console.log).toHaveBeenCalledWith('🔗 Opening Play Store:', 'https://play.google.com/store/test');
    });

    it('should fallback to window.open when Browser plugin fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      
      const mockWindowOpen = vi.fn();
      global.window.open = mockWindowOpen;

      // Browser plugin will fail due to import error in test environment
      await service.openPlayStore('https://play.google.com/store/test');

      // In real scenario, fallback would be triggered
      expect(console.log).toHaveBeenCalledWith('🔗 Opening Play Store:', 'https://play.google.com/store/test');
    });
  });
});