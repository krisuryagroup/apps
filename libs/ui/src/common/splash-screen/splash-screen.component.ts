import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { LoaderComponent, LOADER_DEFAULT_CONFIG, LoaderConfig } from '../loader/loader.component';

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
}
