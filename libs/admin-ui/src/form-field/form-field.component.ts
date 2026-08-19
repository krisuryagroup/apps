import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

/**
 * Consistent label/hint/error wrapper for form inputs — every CRUD form in
 * zitro-admin/zitro-superadmin/zitro-restaurant wraps its inputs with this
 * instead of hand-rolling label+error markup per field.
 *
 * Usage: <lib-form-field labelKey="coupon.code" [error]="form.controls.code.errors ? 'validation.required' : null">
 *          <input formControlName="code" />
 *        </lib-form-field>
 */
@Component({
  selector: 'lib-form-field',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFieldComponent {
  labelKey = input.required<string>();
  hintKey = input<string | null>(null);
  /** i18n key for the error message — null/omitted means no error shown. */
  error = input<string | null>(null);
  required = input(false);
}
