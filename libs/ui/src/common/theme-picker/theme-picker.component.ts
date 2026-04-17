import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { ThemeService, ThemeName } from '@zitro/theme';

export interface ThemePickerConfig {
  layout: 'grid' | 'list';
  showLabels: boolean;
}

export const THEME_PICKER_DEFAULT_CONFIG: ThemePickerConfig = {
  layout: 'grid',
  showLabels: true,
};

interface ThemeOption {
  name: ThemeName;
  labelKey: string;
  previewColors: string[];
}

const THEME_OPTIONS: ThemeOption[] = [
  { name: 'default', labelKey: 'theme.default', previewColors: ['#009688', '#ff6b35', '#ffffff'] },
  { name: 'dark', labelKey: 'theme.dark', previewColors: ['#1e1e2e', '#cba6f7', '#313244'] },
  { name: 'nature', labelKey: 'theme.nature', previewColors: ['#2d6a4f', '#95d5b2', '#f0f7f4'] },
  { name: 'ocean', labelKey: 'theme.ocean', previewColors: ['#0077b6', '#00b4d8', '#caf0f8'] },
];

@Component({
  selector: 'lib-theme-picker',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemePickerComponent {
  config = input<ThemePickerConfig>(THEME_PICKER_DEFAULT_CONFIG);

  private themeService = inject(ThemeService);

  readonly themes = THEME_OPTIONS;
  readonly currentTheme = computed(() => this.themeService.currentTheme());

  select(theme: ThemeName): void {
    this.themeService.setTheme(theme);
  }
}
