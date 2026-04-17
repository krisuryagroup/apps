import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface BottomSheetConfig {
  title: string;
  showHandle: boolean;
  closeOnBackdropClick: boolean;
}

export const BOTTOM_SHEET_DEFAULT_CONFIG: BottomSheetConfig = {
  title: '',
  showHandle: true,
  closeOnBackdropClick: true,
};

@Component({
  selector: 'lib-bottom-sheet',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomSheetComponent {
  config = input<BottomSheetConfig>(BOTTOM_SHEET_DEFAULT_CONFIG);
  isOpen = input<boolean>(false);

  cancelled = output<void>();

  onBackdropClick(): void {
    if (this.config().closeOnBackdropClick) {
      this.cancelled.emit();
    }
  }
}
