import { APP_INITIALIZER, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Call inside app.config.ts to eagerly instantiate I18nService before first render.
 *
 * I18nService is providedIn: 'root' and self-initializes in its constructor
 * (loads from localStorage cache, then fetches from API in the background).
 * This APP_INITIALIZER forces Angular to instantiate it before the root component
 * mounts, so the first render already has translations available from cache.
 */
export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const i18n = inject(I18nService);
        // Service initializes itself in constructor; this factory just ensures
        // eager instantiation before the root component renders.
        return () => { void i18n; };
      },
      multi: true,
    },
  ]);
}
