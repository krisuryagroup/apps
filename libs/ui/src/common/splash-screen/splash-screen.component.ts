import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import {
  LoaderComponent,
  LOADER_DEFAULT_CONFIG,
  LoaderConfig,
} from '../loader/loader.component';

export interface SplashScreenConfig {
  logoUrl: string;
  appName: string;
  tagline: string;
}

export const SPLASH_SCREEN_DEFAULT_CONFIG: SplashScreenConfig = {
  logoUrl: 'assets/logo.png',
  appName: 'Zitro',
  tagline: '',
};

@Component({
  selector: 'lib-splash-screen',
  standalone: true,
  imports: [I18nPipe, LoaderComponent],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreenComponent {
  config = input<SplashScreenConfig>(SPLASH_SCREEN_DEFAULT_CONFIG);
  splashComplete = output<void>();

  readonly loaderConfig: LoaderConfig = {
    ...LOADER_DEFAULT_CONFIG,
    size: 'sm',
    color: 'white',
  };

  /** No `logo.png` asset actually ships in the app today (config().logoUrl
   * 404s) — hide the broken image instead of leaving a failed request/broken
   * image icon on every cold load. Safe no-op once a real logo is added. */
  onLogoError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
