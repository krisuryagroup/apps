import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface LoaderConfig {
  size: 'sm' | 'md' | 'lg';
  color: 'primary' | 'white';
  overlay: boolean;
}

export const LOADER_DEFAULT_CONFIG: LoaderConfig = {
  size: 'md',
  color: 'primary',
  overlay: false,
};

@Component({
  selector: 'lib-loader',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoaderComponent {
  config = input<LoaderConfig>(LOADER_DEFAULT_CONFIG);
  label = input<string>('');

  spinnerSize = computed(() => {
    const map: Record<LoaderConfig['size'], number> = { sm: 24, md: 40, lg: 56 };
    return map[this.config().size];
  });
}
