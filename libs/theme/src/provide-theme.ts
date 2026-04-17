import { APP_INITIALIZER, EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { ThemeService } from './theme.service';

/**
 * Call inside app.config.ts to eagerly instantiate ThemeService before first render.
 *
 * ThemeService is providedIn: 'root' and restores the persisted theme in its
 * constructor, applying the `data-theme` attribute to `<html>` immediately.
 * This APP_INITIALIZER ensures that happens before the root component mounts
 * so there is no flash of unstyled (default) theme.
 */
export function provideTheme(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const theme = inject(ThemeService);
        // Service restores and applies the saved theme in its constructor.
        // This factory just forces eager instantiation.
        return () => { void theme; };
      },
      multi: true,
    },
  ]);
}
