import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { ValidatorsUtil } from '@zitro/utils';

export interface PhoneInputConfig {
  countryCode: string;
  maxLength: number;
  showFlag: boolean;
}

export const PHONE_INPUT_DEFAULT_CONFIG: PhoneInputConfig = {
  countryCode: '+91',
  maxLength: 10,
  showFlag: true,
};

@Component({
  selector: 'lib-phone-input',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './phone-input.component.html',
  styleUrl: './phone-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneInputComponent {
  config = input<PhoneInputConfig>(PHONE_INPUT_DEFAULT_CONFIG);

  valueChange = output<string>();

  readonly value = signal('');

  readonly isValid = computed(() => ValidatorsUtil.isIndianPhone(this.value()));

  readonly hasError = computed(
    () => this.value().length > 0 && !this.isValid()
  );

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const digits = raw.replace(/\D/g, '').slice(0, this.config().maxLength);
    this.value.set(digits);

    if (this.isValid()) {
      this.valueChange.emit(digits);
    }
  }
}
