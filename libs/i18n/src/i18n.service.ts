import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EN_DEFAULTS } from './defaults/en';
import {
  FlatTranslations,
  I18nCacheEntry,
  I18N_CACHE_KEY,
  I18N_CACHE_TTL_MS,
  Language,
} from './i18n.model';

/**
 * Flattens a nested object into dot-notation keys.
 * e.g. { cart: { checkout: 'Proceed' } } → { 'cart.checkout': 'Proceed' }
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): FlatTranslations {
  const result: FlatTranslations = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey)
      );
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

const EN_FLAT = flattenObject(EN_DEFAULTS as unknown as Record<string, unknown>);

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly http = inject(HttpClient);

  readonly currentLang$ = signal<Language>('en');

  private translations: FlatTranslations = { ...EN_FLAT };

  constructor() {
    this.init();
  }

  /**
   * Initialise translations: check localStorage cache first, then try API,
   * fall back to EN_DEFAULTS if anything fails.
   */
  private init(): void {
    const lang = this.currentLang$();

    // 1. Try cache
    const cached = this.loadFromCache(lang);
    if (cached) {
      this.translations = cached;
      return;
    }

    // 2. Try API
    this.http
      .get<Record<string, unknown>>(
        `/api/config/translations?lang=${lang}`
      )
      .subscribe({
        next: (data) => {
          // Merge API result on top of EN_DEFAULTS so partial responses still work
          const flat: FlatTranslations = { ...EN_FLAT, ...flattenObject(data) };
          this.translations = flat;
          this.saveToCache(lang, flat);
        },
        error: () => {
          // Fall back to EN_DEFAULTS — already set in constructor
        },
      });
  }

  /**
   * Translate a dot-notation key, optionally interpolating {variable} placeholders.
   *
   * @example
   * translate('cart.checkout')                            // 'Proceed to Checkout'
   * translate('cart.freeDeliveryProgress', { amount: '50' }) // 'Add ₹50 more for free delivery'
   */
  translate(key: string, params?: Record<string, string>): string {
    const value = this.translations[key];

    if (value === undefined) {
      console.warn(`[I18nService] Missing translation key: "${key}"`);
      return key;
    }

    if (!params) {
      return value;
    }

    return value.replace(/\{(\w+)\}/g, (_match, name) => {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        return params[name];
      }
      return `{${name}}`;
    });
  }

  // ---------------------------------------------------------------------------
  // Cache helpers
  // ---------------------------------------------------------------------------

  private loadFromCache(lang: Language): FlatTranslations | null {
    try {
      const raw = localStorage.getItem(I18N_CACHE_KEY);
      if (!raw) return null;

      const entry: I18nCacheEntry = JSON.parse(raw);
      if (entry.lang !== lang) return null;
      if (Date.now() - entry.cachedAt > I18N_CACHE_TTL_MS) return null;

      return entry.translations;
    } catch {
      return null;
    }
  }

  private saveToCache(lang: Language, translations: FlatTranslations): void {
    try {
      const entry: I18nCacheEntry = {
        lang,
        translations,
        cachedAt: Date.now(),
      };
      localStorage.setItem(I18N_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // localStorage may be unavailable (private browsing, quota exceeded)
    }
  }

  /**
   * Override translations directly (used by tests / provideI18nForTests).
   */
  setTranslations(flat: FlatTranslations): void {
    this.translations = flat;
  }
}
