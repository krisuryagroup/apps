import { APP_INITIALIZER } from '@angular/core';
import { AppVersionService } from '@zitro/services';
import { ComponentRef, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { UpdateDialogComponent } from '@zitro/ui';

/**
 * App version check initializer - ONLY for Android app
 * Completely skipped for web/browser version
 * 
 * This runs before the app fully initializes and:
 * 1. Checks if running on Android native app
 * 2. Fetches version config from Firebase
 * 3. Compares current version with minimum required
 * 4. Blocks app if mandatory update is needed
 * 5. Shows optional update dialog if newer version available
 */
function initializeVersionCheck(
  appVersionService: AppVersionService,
  appRef: ApplicationRef,
  injector: EnvironmentInjector
): () => Promise<void> {
  return async () => {
    // CRITICAL: Skip version check if not Android app
    if (!appVersionService.isAndroidApp()) {
      console.log('🌐 Version Check Initializer: Skipped (running in browser/web)');
      return Promise.resolve();
    }

    console.log('📱 Version Check Initializer: Running (Android app detected)');

    try {
      const updateResult = await appVersionService.checkForUpdate();

      if (!updateResult || !updateResult.needsUpdate) {
        console.log('✅ Version Check Initializer: App is up to date');
        return Promise.resolve();
      }

      console.log(`⚠️ Version Check Initializer: Update ${updateResult.isMandatory ? 'REQUIRED' : 'available'}`);

      // Show update dialog and block until user takes action
      return new Promise<void>((resolve) => {
        const componentRef = createComponent(UpdateDialogComponent, {
          environmentInjector: injector
        });

        // Set component inputs
        componentRef.instance.message = updateResult.message;
        componentRef.instance.isMandatory = updateResult.isMandatory;

        // Handle update button click
        componentRef.instance.update.subscribe(() => {
          console.log('🔗 User clicked update button');
          appVersionService.openPlayStore(updateResult.storeUrl);
          
          // For mandatory updates, don't resolve - keep blocking the app
          if (!updateResult.isMandatory) {
            console.log('ℹ️ Optional update - allowing user to continue');
            appRef.detachView(componentRef.hostView);
            componentRef.destroy();
            resolve();
          } else {
            console.log('🚫 Mandatory update - keeping app blocked');
            // Don't resolve, keep the promise pending to block app initialization
          }
        });

        // Handle later button click (only available for optional updates)
        componentRef.instance.later.subscribe(() => {
          console.log('ℹ️ User clicked later button');
          appRef.detachView(componentRef.hostView);
          componentRef.destroy();
          resolve();
        });

        // Attach component to the application
        appRef.attachView(componentRef.hostView);
        const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
        document.body.appendChild(domElem);

        // If mandatory update, the promise never resolves - app stays blocked
        if (updateResult.isMandatory) {
          console.log('🚫 Mandatory update required - app initialization blocked');
          // Promise intentionally not resolved to block app
        }
      });
    } catch (error) {
      console.error('❌ Version Check Initializer Error:', error);
      // Don't block app on error - fail gracefully
      return Promise.resolve();
    }
  };
}

/**
 * Provider configuration for app version checking
 * Add this to app.config.ts providers array
 */
export const APP_VERSION_INITIALIZER = {
  provide: APP_INITIALIZER,
  useFactory: initializeVersionCheck,
  deps: [AppVersionService, ApplicationRef, EnvironmentInjector],
  multi: true
};
