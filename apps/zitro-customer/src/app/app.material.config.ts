import { importProvidersFrom } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ApplicationConfig } from '@angular/core';
import { appConfig as baseAppConfig } from './app.config';

export const appConfig: ApplicationConfig = {
  ...baseAppConfig,
  providers: [
    ...baseAppConfig.providers,
    importProvidersFrom(MatDialogModule, BrowserAnimationsModule)
  ]
};
