import type { TranslationMap } from './defaults/en';

export type { TranslationMap };

export type Language = 'en';

/**
 * A flat dot-notation key path into the TranslationMap.
 * e.g. 'cart.checkout', 'common.loading'
 */
export type TranslationKey = string;

/**
 * The shape of the translation object stored in localStorage or returned by the API.
 * Keys are dot-separated paths, values are translation strings.
 */
export type FlatTranslations = Record<string, string>;

export interface I18nCacheEntry {
  lang: Language;
  translations: FlatTranslations;
  cachedAt: number;
}

export const I18N_CACHE_KEY = 'zitro_i18n_cache';
export const I18N_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
