import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Translates a dot-notation i18n key.
 *
 * @example
 * {{ 'cart.checkout' | i18n }}
 * {{ 'cart.freeDeliveryProgress' | i18n: { amount: '50' } }}
 */
@Pipe({
  name: 'i18n',
  standalone: true,
  pure: true,
})
export class I18nPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string>): string {
    return this.i18n.translate(key, params);
  }
}
