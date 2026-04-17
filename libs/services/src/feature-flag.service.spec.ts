import { describe, it, expect, beforeEach } from 'vitest';
import { FeatureFlagService } from './feature-flag.service';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  describe('isEnabled', () => {
    it('returns false for all flags before loadFlags is called', () => {
      expect(service.isEnabled('wallet_payments')).toBe(false);
      expect(service.isEnabled('game_tab')).toBe(false);
    });

    it('returns true for flags loaded as enabled', () => {
      service.loadFlags({ wallet_payments: true, game_tab: true });
      expect(service.isEnabled('wallet_payments')).toBe(true);
      expect(service.isEnabled('game_tab')).toBe(true);
    });

    it('returns false for flags loaded as disabled', () => {
      service.loadFlags({ wallet_payments: false });
      expect(service.isEnabled('wallet_payments')).toBe(false);
    });

    it('returns false for flags absent from the payload', () => {
      service.loadFlags({ wallet_payments: true });
      expect(service.isEnabled('delivery_tracking')).toBe(false);
    });
  });

  describe('loadFlags', () => {
    it('replaces previous flags on each call', () => {
      service.loadFlags({ wallet_payments: true });
      service.loadFlags({ game_tab: true });
      expect(service.isEnabled('wallet_payments')).toBe(false);
      expect(service.isEnabled('game_tab')).toBe(true);
    });

    it('ignores non-flag config keys for isEnabled', () => {
      service.loadFlags({ wallet_payments: true, maxCartItems: 20 });
      expect(service.isEnabled('wallet_payments')).toBe(true);
    });
  });

  describe('getConfig', () => {
    it('returns null before loadFlags is called', () => {
      expect(service.getConfig<number>('maxCartItems')).toBeNull();
    });

    it('returns config values for non-flag keys', () => {
      service.loadFlags({ maxCartItems: 20, appTheme: 'dark' });
      expect(service.getConfig<number>('maxCartItems')).toBe(20);
      expect(service.getConfig<string>('appTheme')).toBe('dark');
    });

    it('returns null for unknown config keys', () => {
      service.loadFlags({ maxCartItems: 20 });
      expect(service.getConfig('unknown')).toBeNull();
    });

    it('does not return feature flag keys as config', () => {
      service.loadFlags({ wallet_payments: true });
      // wallet_payments is treated as a flag, not a config value
      expect(service.getConfig('wallet_payments')).toBeNull();
    });
  });

  describe('isMaintenanceMode / setMaintenanceMode', () => {
    it('starts as false', () => {
      expect(service.isMaintenanceMode()).toBe(false);
    });

    it('returns true after setMaintenanceMode(true)', () => {
      service.setMaintenanceMode(true);
      expect(service.isMaintenanceMode()).toBe(true);
    });

    it('can be toggled back to false', () => {
      service.setMaintenanceMode(true);
      service.setMaintenanceMode(false);
      expect(service.isMaintenanceMode()).toBe(false);
    });

    it('does not affect feature flags', () => {
      service.loadFlags({ wallet_payments: true });
      service.setMaintenanceMode(true);
      expect(service.isEnabled('wallet_payments')).toBe(true);
    });
  });

  describe('isEnabled$', () => {
    it('emits false for a disabled flag', async () => {
      const result = await new Promise<boolean>(resolve =>
        service.isEnabled$('wallet_payments').subscribe(resolve)
      );
      expect(result).toBe(false);
    });

    it('emits true for an enabled flag', async () => {
      service.loadFlags({ dine_in: true });
      const result = await new Promise<boolean>(resolve =>
        service.isEnabled$('dine_in').subscribe(resolve)
      );
      expect(result).toBe(true);
    });
  });
});
