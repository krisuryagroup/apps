import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface OtpInputConfig {
  length: number;
  autoFocus: boolean;
  autoSubmit: boolean;
}

export const OTP_INPUT_DEFAULT_CONFIG: OtpInputConfig = {
  length: 6,
  autoFocus: true,
  autoSubmit: true,
};

@Component({
  selector: 'lib-otp-input',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './otp-input.component.html',
  styleUrl: './otp-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpInputComponent implements AfterViewInit {
  config = input<OtpInputConfig>(OTP_INPUT_DEFAULT_CONFIG);

  otpComplete = output<string>();
  submitted = output<string>();

  readonly digits = signal<string[]>(new Array(OTP_INPUT_DEFAULT_CONFIG.length).fill(''));

  readonly boxes = computed(() => Array.from({ length: this.config().length }, (_, i) => i));

  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  constructor() {
    effect(() => {
      const len = this.config().length;
      const current = this.digits();
      if (current.length !== len) {
        this.digits.set(new Array(len).fill(''));
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.config().autoFocus) {
      this.otpBoxes.first?.nativeElement.focus();
    }
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    const next = [...this.digits()];
    next[index] = digit;
    this.digits.set(next);

    if (digit && index < this.config().length - 1) {
      this.otpBoxes.get(index + 1)?.nativeElement.focus();
    }

    this.checkComplete(next);
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.otpBoxes.get(index - 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '') ?? '';
    const len = this.config().length;
    const next = new Array(len).fill('');

    for (let i = 0; i < Math.min(pasted.length, len); i++) {
      next[i] = pasted[i];
    }
    this.digits.set(next);

    const lastFilled = Math.min(pasted.length - 1, len - 1);
    this.otpBoxes.get(lastFilled)?.nativeElement.focus();
    event.preventDefault();

    this.checkComplete(next);
  }

  private checkComplete(digits: string[]): void {
    const otp = digits.join('');
    if (otp.length === this.config().length && !digits.includes('')) {
      this.otpComplete.emit(otp);
      if (this.config().autoSubmit) {
        this.submitted.emit(otp);
      }
    }
  }
}
