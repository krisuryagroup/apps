import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, combineLatest, of, take, timer } from 'rxjs';
import { EvolvedSplashScreenComponent, SplashScreenConfig, ConfirmationDialogComponent, ConfirmationDialogConfig } from '@zitro/ui';
import { ConfigApiService } from '@zitro/services';

const SPLASH_DURATION_MS = 2000;

@Component({
  selector: 'app-splash-page',
  standalone: true,
  imports: [EvolvedSplashScreenComponent, ConfirmationDialogComponent],
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
    this.router.navigate(['/home'], { replaceUrl: true });
  }
}
