import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface CategoryBarConfig {
  showAllOption: boolean;
}
export const CATEGORY_BAR_DEFAULT_CONFIG: CategoryBarConfig = {
  showAllOption: true,
};

export interface CategoryBarItem {
  id: string;
  name: string;
  imageURL?: string;
}

@Component({
  selector: 'lib-category-bar',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './category-bar.component.html',
  styleUrl: './category-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryBarComponent {
  config = input<CategoryBarConfig>(CATEGORY_BAR_DEFAULT_CONFIG);
  items = input<CategoryBarItem[]>([]);
  activeId = input<string>('');

  categorySelected = output<string>();
}
