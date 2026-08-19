import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideZitroServices } from '@zitro/services';
import { provideI18n } from '@zitro/i18n';
import { provideTheme } from '@zitro/theme';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideZitroServices({
      apiBaseUrl: environment.apiUrl,
      authMode: 'admin',
      publicEndpoints: ['/api/admin/auth/login'],
    }),
    provideI18n(),
    provideTheme(),
  ],
};
