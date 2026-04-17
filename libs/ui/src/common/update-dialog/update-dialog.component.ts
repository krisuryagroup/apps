import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface UpdateDialogConfig {
  mandatory: boolean;
}
export const UPDATE_DIALOG_DEFAULT_CONFIG: UpdateDialogConfig = { mandatory: false };

@Component({
  selector: 'lib-update-dialog',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './update-dialog.component.html',
  styleUrl: './update-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvolvedUpdateDialogComponent {
  config = input<UpdateDialogConfig>(UPDATE_DIALOG_DEFAULT_CONFIG);
  message = input<string>('');
  isVisible = input<boolean>(false);

  update = output<void>();
  later = output<void>();

  onLater(): void {
    if (!this.config().mandatory) this.later.emit();
  }
}
