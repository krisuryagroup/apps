import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  input,
  output,
  signal,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface SearchBarConfig {
  debounceMs: number;
  placeholderKey: string;
}
export const SEARCH_BAR_DEFAULT_CONFIG: SearchBarConfig = {
  debounceMs: 300,
  placeholderKey: 'listing.searchPlaceholder',
};

@Component({
  selector: 'lib-search-bar',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnChanges, OnDestroy {
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

  ngOnDestroy(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
  }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.localValue.set(val);
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    const debounceMs = this.config().debounceMs;
    if (debounceMs <= 0) {
      this.searchChange.emit(val);
      return;
    }

    this._debounceTimer = setTimeout(() => {
      this.searchChange.emit(val);
    }, debounceMs);
  }

  onClear(): void {
    this.localValue.set('');
    this.searchChange.emit('');
    this.cleared.emit();
  }
}
