import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
// import { FcmService } from './core/services/fcm.service';
import { FirebaseAuthService } from '@zitro/services';
import { AnalyticsService } from '@zitro/services';
import { GlobalImageErrorService } from '@zitro/services';
import { ConfigApiService, DeviceTokenService } from '@zitro/services';
import { SplashScreenComponent } from '@zitro/ui';
import { NoInternetComponent } from '@zitro/ui';
import { LocationBottomSheetComponent } from '@zitro/ui';
import { getAppVersion } from '@zitro/utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SplashScreenComponent,
    NoInternetComponent,
    LocationBottomSheetComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(FirebaseAuthService);
  private analyticsService = inject(AnalyticsService);
  private globalImageError = inject(GlobalImageErrorService);
  private configApi = inject(ConfigApiService);
  private deviceTokenService = inject(DeviceTokenService);

  title = 'client';
  showSplash = true;
  showNoInternet = false;
  isOnline = true;
  private backHandler = this.handleAndroidBack.bind(this);

  ngOnInit() {
    // Activate global image error fallback handler
    this.globalImageError.init();

    // Check initial connectivity
    this.checkConnectivity();

    // Setup connectivity listeners
    this.setupConnectivityListeners();

    // Initialize Firebase Analytics
    this.initializeAnalytics();

    // Setup app lifecycle listeners
    this.setupAppLifecycleListeners();

    // Listen for native event
    window.addEventListener('androidBack', this.backHandler);

    // // Subscribe to notifications
    // this.subscribeToNotifications();
  }

  ngOnDestroy() {
    window.removeEventListener('androidBack', this.backHandler);
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Setup connectivity listeners for online/offline events
   */
  private setupConnectivityListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Check current connectivity status
   */
  private checkConnectivity(): void {
    this.isOnline = navigator.onLine;
    if (!this.isOnline) {
      // Show no internet screen after splash
      this.showNoInternet = true;
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('✅ Internet connection restored');
    this.isOnline = true;
    this.showNoInternet = false;
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('❌ Internet connection lost');
    this.isOnline = false;
    // Only show no internet screen if splash is not visible
    if (!this.showSplash) {
      this.showNoInternet = true;
    }
  }

  /**
   * Handle splash screen completion
   */
  onSplashComplete(): void {
    this.showSplash = false;
    // Check connectivity after splash
    if (!this.isOnline) {
      this.showNoInternet = true;
    }
  }

  /**
   * Handle retry button click from no internet screen
   */
  onRetryConnection(): void {
    console.log('🔄 Retrying connection...');
    this.checkConnectivity();

    if (this.isOnline) {
      this.showNoInternet = false;
      console.log('✅ Connection successful');
    } else {
      console.log('❌ Still offline');
    }
  }

  private handleAndroidBack() {
    console.log('Android back/swipe event received in Angular');

    if (this.router.url !== '/home') {
      // If not on home → navigate back in Angular
      window.history.back();
    } else {
      // Already on home → maybe show a toast or custom confirm
      alert('Press back again to exit');
    }
  }

  /**
   * Initialize Firebase Analytics
   */
  private async initializeAnalytics(): Promise<void> {
    try {
      await this.analyticsService.initialize();
      await this.analyticsService.logAppOpen();

      await this.recordAppVersionUsage();

      // Check if this is first time app install
      this.checkFirstTimeInstall();

      console.log('✅ Firebase Analytics initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase Analytics:', error);
    }
  }

  /** Records one app-version-use row per device per day via the backend (replaces the old Firestore appVersionUses write). */
  private async recordAppVersionUsage(): Promise<void> {
    try {
      const appVersion = await getAppVersion();
      const platform = Capacitor.isNativePlatform()
        ? Capacitor.getPlatform()
        : 'web';
      const deviceId = await this.deviceTokenService.getDeviceToken();
      await firstValueFrom(
        this.configApi.postAppVersion(platform, appVersion, null, deviceId),
      );
      console.log(`📱 App version logged: ${appVersion}`);
    } catch (error) {
      console.warn('Failed to log app version usage:', error);
    }
  }

  /**
   * Check if this is the first time the app is installed
   */
  private checkFirstTimeInstall(): void {
    try {
      const hasBeenInstalledBefore = localStorage.getItem('app_installed');

      if (!hasBeenInstalledBefore) {
        // First time install
        this.analyticsService
          .logAppInstalled()
          .catch((err) => console.warn('Failed to log app install:', err));
        localStorage.setItem('app_installed', 'true');
        localStorage.setItem('app_install_date', new Date().toISOString());
        console.log('📱 First time app install detected');
      }
    } catch (error) {
      console.warn('Error checking first time install:', error);
      // App continues to work even if first-time tracking fails
    }
  }

  /**
   * Setup app lifecycle listeners (resume, background, etc.)
   */
  private setupAppLifecycleListeners(): void {
    try {
      // Listen for app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        try {
          console.log('App state changed. Is active?', isActive);

          if (isActive) {
            // App came to foreground (resume)
            this.analyticsService
              .logAppResume()
              .catch((err) => console.warn('Failed to log app resume:', err));
            console.log('📱 App resumed');
          } else {
            // App went to background
            console.log('📱 App went to background');
          }
        } catch (error) {
          console.warn('Error handling app state change:', error);
        }
      });

      // Listen for app URL open (deep linking)
      App.addListener('appUrlOpen', (data) => {
        try {
          console.log('App opened with URL:', data);
        } catch (error) {
          console.warn('Error handling app URL open:', error);
        }
      });

      // Listen for back button
      App.addListener('backButton', ({ canGoBack }) => {
        try {
          if (!canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        } catch (error) {
          console.warn('Error handling back button:', error);
        }
      });
    } catch (error) {
      console.warn('Error setting up app lifecycle listeners:', error);
      // App continues to work even if lifecycle tracking fails
    }
  }

  // /**
  //  * Initialize Firebase Cloud Messaging
  //  */

  // // Call this from a user gesture (e.g., button click) to request FCM permission
  // public async initializeFCM(): Promise<void> {
  //   try {
  //     if (!this.authService.isGuestMode()) {
  //       const token = await this.fcmService.requestPermissionAndGetToken();
  //       if (token) {
  //         console.log('✅ App: FCM initialized successfully');
  //       } else {
  //         console.log('⚠️ App: FCM token not available');
  //       }
  //     } else {
  //       console.log('ℹ️ App: Skipping FCM initialization for guest user');
  //     }
  //   } catch (error) {
  //     // Log error but do not affect auth state
  //     console.error('❌ App: Error initializing FCM:', error);
  //     // Optionally show a user-friendly message
  //     // this.dialogService?.showInfo?.('Push notifications are unavailable. You can still use the app.', 'Notification Error');
  //   }
  // }

  // /**
  //  * Subscribe to incoming notifications
  //  */
  // private subscribeToNotifications(): void {
  //   this.fcmService.notification$.subscribe(notification => {
  //     if (notification) {
  //       console.log('📬 App: New notification received:', notification);

  //       // Handle notification based on type
  //       this.handleNotification(notification);
  //     }
  //   });
  // }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: any): void {
    // You can customize notification handling based on notification type
    const notificationType = notification.data?.type;

    switch (notificationType) {
      case 'order_status':
        // Navigate to order details
        if (notification.data?.orderId) {
          console.log(
            '📦 Order status notification:',
            notification.data.orderId,
          );
          // Optionally navigate: this.router.navigate(['/orders', notification.data.orderId]);
        }
        break;

      case 'promotion':
        // Handle promotional notification
        console.log('🎉 Promotion notification:', notification.body);
        break;

      case 'new_offer':
        // Handle new offer notification
        console.log('💰 New offer notification:', notification.body);
        break;

      default:
        console.log('📬 General notification:', notification.body);
    }
  }
}
