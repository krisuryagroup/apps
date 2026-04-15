import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

@Component({
  selector: 'lib-no-internet',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './no-internet.component.html',
  styleUrl: './no-internet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoInternetComponent {
  retryClicked = output<void>();
}
