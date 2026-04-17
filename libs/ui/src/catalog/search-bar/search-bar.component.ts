import { ChangeDetectionStrategy, Component, input, output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface SearchBarConfig {
  debounceMs: number;
}
export const SEARCH_BAR_DEFAULT_CONFIG: SearchBarConfig = { debounceMs: 300 };

@Component({
  selector: 'lib-search-bar',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnChanges {
  config = input<SearchBarConfig>(SEARCH_BAR_DEFAULT_CONFIG);
  value = input<string>('');

  searchChange = output<string>();
  cleared = output<void>();

  localValue = signal('');

  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.localValue.set(this.value());
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.localValue.set(val);
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.searchChange.emit(val);
    }, this.config().debounceMs);
  }

  onClear(): void {
    this.localValue.set('');
    this.searchChange.emit('');
    this.cleared.emit();
  }
}
