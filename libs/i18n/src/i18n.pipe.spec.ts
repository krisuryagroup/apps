import { TestBed } from '@angular/core/testing';
import { I18nPipe } from './i18n.pipe';
import { EN_DEFAULTS } from './defaults/en';
import { provideI18nForTests } from './testing/provide-i18n-for-tests';

describe('I18nPipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideI18nForTests()],
    });
  });

  it('should create the pipe inside injection context', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      expect(p).toBeTruthy();
    });
  });

  it('should translate a known key: cart.checkout', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      expect(p.transform('cart.checkout')).toBe(EN_DEFAULTS.cart.checkout);
    });
  });

  it('should translate common.loading', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      expect(p.transform('common.loading')).toBe(EN_DEFAULTS.common.loading);
    });
  });

  it('should translate auth.sendOtpButton', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      expect(p.transform('auth.sendOtpButton')).toBe(
        EN_DEFAULTS.auth.sendOtpButton
      );
    });
  });

  it('should return the key for a missing translation and log a warning', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      const result = p.transform('missing.key.that.does.not.exist');
      expect(result).toBe('missing.key.that.does.not.exist');
      expect(warnSpy).toHaveBeenCalledWith(
        '[I18nService] Missing translation key: "missing.key.that.does.not.exist"'
      );
    });
    warnSpy.mockRestore();
  });

  it('should support interpolation params', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      const result = p.transform('cart.freeDeliveryProgress', { amount: '100' });
      expect(result).toBe('Add ₹100 more for free delivery');
    });
  });

  it('should translate order.placed', () => {
    TestBed.runInInjectionContext(() => {
      const p = new I18nPipe();
      expect(p.transform('order.placed')).toBe(EN_DEFAULTS.order.placed);
    });
  });
});
