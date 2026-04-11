import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { I18nService } from './i18n.service';
import { EN_DEFAULTS } from './defaults/en';
import { I18N_CACHE_KEY } from './i18n.model';

function setupTestBed() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      I18nService,
    ],
  });
  const service = TestBed.inject(I18nService);
  const httpTesting = TestBed.inject(HttpTestingController);
  return { service, httpTesting };
}

describe('I18nService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    expect(service).toBeTruthy();
    httpTesting.verify();
  });

  it('should return EN_DEFAULTS values when API returns empty object', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    expect(service.translate('common.loading')).toBe(EN_DEFAULTS.common.loading);
    expect(service.translate('cart.checkout')).toBe(EN_DEFAULTS.cart.checkout);
    expect(service.translate('auth.sendOtpButton')).toBe(
      EN_DEFAULTS.auth.sendOtpButton
    );
    httpTesting.verify();
  });

  it('should return EN_DEFAULTS values when API errors', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting
      .expectOne('/api/config/translations?lang=en')
      .error(new ErrorEvent('Network error'));
    expect(service.translate('common.loading')).toBe(EN_DEFAULTS.common.loading);
    httpTesting.verify();
  });

  it('should override with API translations when request succeeds', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting
      .expectOne('/api/config/translations?lang=en')
      .flush({ common: { loading: 'Cargando...' } });
    expect(service.translate('common.loading')).toBe('Cargando...');
    // Other keys should still fall back to EN_DEFAULTS since we merge
    expect(service.translate('cart.checkout')).toBe(EN_DEFAULTS.cart.checkout);
    httpTesting.verify();
  });

  it('should return the key itself for a missing translation and log a warning', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = service.translate('nonexistent.key');
    expect(result).toBe('nonexistent.key');
    expect(warnSpy).toHaveBeenCalledWith(
      '[I18nService] Missing translation key: "nonexistent.key"'
    );
    warnSpy.mockRestore();
    httpTesting.verify();
  });

  it('should interpolate {variable} placeholders', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    const result = service.translate('cart.freeDeliveryProgress', {
      amount: '50',
    });
    expect(result).toBe('Add ₹50 more for free delivery');
    httpTesting.verify();
  });

  it('should leave unmatched placeholders intact', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    service.setTranslations({ 'test.key': 'Hello {name}, you have {count} items' });
    const result = service.translate('test.key', { name: 'Alice' });
    expect(result).toBe('Hello Alice, you have {count} items');
    httpTesting.verify();
  });

  it('should cache API translations in localStorage', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting
      .expectOne('/api/config/translations?lang=en')
      .flush({ common: { loading: 'API loading' } });

    const raw = localStorage.getItem(I18N_CACHE_KEY);
    expect(raw).not.toBeNull();
    const entry = JSON.parse(raw!);
    expect(entry.lang).toBe('en');
    expect(entry.translations['common.loading']).toBe('API loading');
    expect(entry.cachedAt).toBeGreaterThan(0);
    httpTesting.verify();
  });

  it('should load from localStorage cache when valid and skip HTTP', () => {
    // Pre-populate cache
    const cacheEntry = {
      lang: 'en',
      translations: { 'common.loading': 'Cached loading' },
      cachedAt: Date.now(),
    };
    localStorage.setItem(I18N_CACHE_KEY, JSON.stringify(cacheEntry));

    // Create service — it should use cache and NOT make an HTTP call
    const { service, httpTesting } = setupTestBed();

    // No HTTP request should be made when cache is valid
    httpTesting.expectNone('/api/config/translations?lang=en');
    expect(service.translate('common.loading')).toBe('Cached loading');
    httpTesting.verify();
  });

  it('should default currentLang$ to "en"', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    expect(service.currentLang$()).toBe('en');
    httpTesting.verify();
  });

  it('should support setTranslations for direct override', () => {
    const { service, httpTesting } = setupTestBed();
    httpTesting.expectOne('/api/config/translations?lang=en').flush({});
    service.setTranslations({ 'custom.key': 'Custom value' });
    expect(service.translate('custom.key')).toBe('Custom value');
    httpTesting.verify();
  });
});
