import { APP_INITIALIZER } from '@angular/core';
import { CartApiService, UserManagementService } from '@zitro/services';

function initializeCart(
  cartApi: CartApiService,
  userMgmt: UserManagementService
): () => Promise<void> {
  return async () => {
    try {
      const phone = await userMgmt.getCurrentUserPhone();
      if (phone) {
        await cartApi.loadAllCarts();
      }
    } catch {
      // Cart restoration is non-critical — don't block app startup
    }
  };
}

export const CART_INITIALIZER = {
  provide: APP_INITIALIZER,
  useFactory: initializeCart,
  deps: [CartApiService, UserManagementService],
  multi: true,
};
