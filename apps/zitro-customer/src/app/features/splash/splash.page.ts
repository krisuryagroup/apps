import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, combineLatest, of, take, timer } from 'rxjs';
import { SplashScreenComponent, SplashScreenConfig, ConfirmationDialogComponent, ConfirmationDialogConfig } from '@zitro/ui';
import { ConfigApiService } from '@zitro/services';
import { APP_SETTINGS_CACHE } from '../../core/constants/app.constants';

const SPLASH_DURATION_MS = 2000;

@Component({
  selector: 'app-splash-page',
  standalone: true,
  imports: [SplashScreenComponent, ConfirmationDialogComponent],
  templateUrl: './splash.page.html',
  styleUrl: './splash.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashPage implements OnInit {
  private router = inject(Router);
  private configApi = inject(ConfigApiService);

  readonly showForceUpdate = signal(false);

  readonly splashConfig: SplashScreenConfig = {
    logoUrl: 'assets/images/logo.png',
    appName: 'Zitro',
    tagline: 'Food at your doorstep',
  };

  readonly updateDialogConfig: ConfirmationDialogConfig = {
    title: 'Update Required',
    message: 'A new version of the app is available. Please update to continue.',
    confirmLabel: 'Update Now',
    cancelLabel: '',
    destructive: false,
    closeOnBackdropClick: false,
  };

  ngOnInit(): void {
    combineLatest([
      this.configApi.getAppVersion().pipe(catchError(() => of(null))),
      timer(SPLASH_DURATION_MS),
    ]).pipe(take(1)).subscribe(([versionInfo]) => {
      if (versionInfo?.forceUpdate) {
        this.showForceUpdate.set(true);
        return;
      }
      this.navigateNext();
    });
  }

  onUpdateConfirmed(): void {
    // Opens app store — no-op fallback for web
    window.open('https://play.google.com/store/apps/details?id=com.krisurya.zitro', '_blank');
  }

  private navigateNext(): void {
    const selected = localStorage.getItem(APP_SETTINGS_CACHE.SELECTED_RESTAURANT_ID);
    this.router.navigate([selected ? '/home' : '/business-selection'], { replaceUrl: true });
  }
}
