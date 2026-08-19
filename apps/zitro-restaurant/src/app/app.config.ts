import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideZitroServices } from '@zitro/services';
import { provideI18n } from '@zitro/i18n';
import { provideTheme } from '@zitro/theme';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions()),
    provideZitroServices({
      apiBaseUrl: environment.apiUrl,
      authMode: 'business',
      publicEndpoints: [
        '/api/business-auth/login',
        '/api/business-applications',
        '/api/business-invite',
      ],
    }),
    provideI18n(),
    provideTheme(),
  ],
};
