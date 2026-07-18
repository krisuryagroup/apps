import { APP_INITIALIZER } from '@angular/core';
import { CartApiService, UserManagementService } from '@zitro/services';

function initializeCart(
  cartApi: CartApiService,
  userMgmt: UserManagementService,
): () => Promise<void> {
  return async () => {
    const t0 = performance.now();
    console.log('[STARTUP] CART start');
    try {
      const phone = await userMgmt.getCurrentUserPhone();
      console.log(
        '[STARTUP] CART getUserPhone done in',
        (performance.now() - t0).toFixed(0),
        'ms — phone?',
        !!phone,
      );
      if (phone) {
        await cartApi.loadAllCarts();
        console.log(
          '[STARTUP] CART loadAllCarts done in',
          (performance.now() - t0).toFixed(0),
          'ms',
        );
      }
    } catch {
      // Cart restoration is non-critical — don't block app startup
    } finally {
      console.log(
        '[STARTUP] CART total',
        (performance.now() - t0).toFixed(0),
        'ms',
      );
    }
  };
}

export const CART_INITIALIZER = {
  provide: APP_INITIALIZER,
  useFactory: initializeCart,
  deps: [CartApiService, UserManagementService],
  multi: true,
};
