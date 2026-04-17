import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface ConfirmationDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  closeOnBackdropClick: boolean;
}

export const CONFIRMATION_DIALOG_DEFAULT_CONFIG: ConfirmationDialogConfig = {
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
  closeOnBackdropClick: true,
};

@Component({
  selector: 'lib-confirmation-dialog',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  config = input<ConfirmationDialogConfig>(CONFIRMATION_DIALOG_DEFAULT_CONFIG);
  isVisible = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    if (this.config().closeOnBackdropClick) {
      this.cancelled.emit();
    }
  }
}
