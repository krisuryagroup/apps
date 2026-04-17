import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface TruncatedTextConfig {
  maxLength: number;
  showInDialog: boolean;
}

export const TRUNCATED_TEXT_DEFAULT_CONFIG: TruncatedTextConfig = {
  maxLength: 100,
  showInDialog: true,
};

@Component({
  selector: 'lib-truncated-text',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './truncated-text.component.html',
  styleUrl: './truncated-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruncatedTextComponent {
  text = input<string>('');
  config = input<TruncatedTextConfig>(TRUNCATED_TEXT_DEFAULT_CONFIG);

  showDialogEvent = output<{ text: string }>();

  readonly showFullText = signal(false);

  readonly shouldTruncate = computed(() => this.text().length > this.config().maxLength);

  readonly displayText = computed(() => {
    if (!this.shouldTruncate() || this.showFullText()) {
      return this.text();
    }
    return this.text().substring(0, this.config().maxLength);
  });

  onReadMore(): void {
    if (this.config().showInDialog) {
      this.showDialogEvent.emit({ text: this.text() });
    } else {
      this.showFullText.set(true);
    }
  }

  showLess(): void {
    this.showFullText.set(false);
  }
}
