import { Provider } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { I18nService } from '../i18n.service';
import { EN_DEFAULTS } from '../defaults/en';

/**
 * Returns Angular providers that configure I18nService to use EN_DEFAULTS
 * synchronously — no HTTP call is made in tests.
 *
 * @example
 * TestBed.configureTestingModule({
 *   providers: [...provideI18nForTests()],
 * });
 */
export function provideI18nForTests(): Provider[] {
  return [
    provideHttpClient(),
    {
      provide: I18nService,
      useValue: createI18nServiceWithDefaults(),
    },
  ];
}

function createI18nServiceWithDefaults(): Pick<I18nService, 'translate' | 'currentLang$' | 'setTranslations'> {
  const flat = flattenForTests(
    EN_DEFAULTS as unknown as Record<string, unknown>
  );
  let translations: Record<string, string> = { ...flat };

  return {
    currentLang$: (() => 'en') as unknown as I18nService['currentLang$'],
    setTranslations: (newTranslations: Record<string, string>): void => {
      translations = { ...newTranslations };
    },
    translate: (key: string, params?: Record<string, string>): string => {
      const value = translations[key];
      if (value === undefined) {
        console.warn(`[I18nService] Missing translation key: "${key}"`);
        return key;
      }
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_match: string, name: string) => {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          return params[name];
        }
        return `{${name}}`;
      });
    },
  };
}

function flattenForTests(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenForTests(value as Record<string, unknown>, fullKey)
      );
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}
