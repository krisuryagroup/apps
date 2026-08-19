import { ChangeDetectionStrategy, Component } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

/** AD-013 / AD-017: Cashback Rules & Subscriptions — wallet/payments backend tasks (TASK-018, TASK-021) are pending. Functional placeholder. */
@Component({
  selector: 'lib-admin-cashback-rules',
  standalone: true,
  imports: [I18nPipe],
  template: `<h1 class="page-title">{{ 'nav.cashback' | i18n }}</h1>
    <p class="empty">{{ 'cashback.pending' | i18n }}</p>`,
  styles: [
    `
      @use '../_admin-shared' as *;
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashbackRulesComponent {}

@Component({
  selector: 'lib-admin-subscriptions',
  standalone: true,
  imports: [I18nPipe],
  template: `<h1 class="page-title">{{ 'nav.subscriptions' | i18n }}</h1>
    <p class="empty">{{ 'subscriptions.pending' | i18n }}</p>`,
  styles: [
    `
      @use '../_admin-shared' as *;
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSubscriptionsComponent {}
