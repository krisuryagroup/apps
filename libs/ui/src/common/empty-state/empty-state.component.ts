import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface EmptyStateConfig {
  titleKey: string;
  messageKey: string;
  actionLabelKey: string;
  showAction: boolean;
}

export const EMPTY_STATE_DEFAULT_CONFIG: EmptyStateConfig = {
  titleKey: 'emptyState.title',
  messageKey: 'emptyState.message',
  actionLabelKey: 'emptyState.action',
  showAction: false,
};

@Component({
  selector: 'lib-empty-state',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  config = input<EmptyStateConfig>(EMPTY_STATE_DEFAULT_CONFIG);
  actionClicked = output<void>();
}
