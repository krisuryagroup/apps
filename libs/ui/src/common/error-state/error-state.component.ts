import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface ErrorStateConfig {
  titleKey: string;
  messageKey: string;
  retryLabelKey: string;
  showRetry: boolean;
}

export const ERROR_STATE_DEFAULT_CONFIG: ErrorStateConfig = {
  titleKey: 'errorState.title',
  messageKey: 'common.error',
  retryLabelKey: 'common.retry',
  showRetry: true,
};

@Component({
  selector: 'lib-error-state',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  config = input<ErrorStateConfig>(ERROR_STATE_DEFAULT_CONFIG);
  retryClicked = output<void>();
}
