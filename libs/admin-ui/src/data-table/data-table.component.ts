import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  TemplateRef,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  labelKey: string;
  sortable?: boolean;
  /** Custom cell formatter — falls back to row[key] (via String()) when omitted. */
  format?: (row: T) => string;
}

export interface DataTablePagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableSort {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableFilterOption {
  value: string;
  labelKey: string;
}

/**
 * One filter control rendered in the table's filter bar.
 * - 'select': a dropdown, e.g. status — populate `options`.
 * - 'search': a free-text input, e.g. order ID / customer name.
 * - 'dateRange': two date inputs (from/to), stored as { from, to } (yyyy-MM-dd,
 *   empty string = unset).
 */
export interface DataTableFilterField {
  key: string;
  type: 'select' | 'search' | 'dateRange';
  labelKey: string;
  options?: DataTableFilterOption[];
  placeholderKey?: string;
}

export type DataTableFilterDateRange = { from: string; to: string };
export type DataTableFilterValue = Record<
  string,
  string | DataTableFilterDateRange
>;

const EMPTY_DATE_RANGE: DataTableFilterDateRange = { from: '', to: '' };
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Generic sortable/paginated table for admin CRUD screens (AD-006…AD-018 etc.).
 * Row actions are passed as a template via `#rowActions` and projected per row —
 * see the README example in this lib for the row-actions content-projection pattern.
 *
 * Filtering (status dropdown, date range, search) is opt-in via the `filters`
 * config input — pass `[]` (the default) to render no filter bar at all. The
 * caller owns filter state and re-fetching; this component only renders the
 * controls and emits `filterChange` with the merged value.
 */
@Component({
  selector: 'lib-data-table',
  standalone: true,
  imports: [I18nPipe, NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = Record<string, unknown>> {
  /** Optional per-row action buttons — project with <ng-template #rowActions let-row>. */
  @ContentChild('rowActions') rowActionsTemplate?: TemplateRef<{
    $implicit: T;
  }>;
  /**
   * Optional expanded-row content, rendered as a full-width row directly below a row
   * when `isRowExpanded(row)` returns true — project with
   * <ng-template #expandedRow let-row>. Toggling is the caller's responsibility (e.g.
   * a row-action button flipping a signal) — this component only renders the content.
   */
  @ContentChild('expandedRow') expandedRowTemplate?: TemplateRef<{
    $implicit: T;
  }>;

  columns = input.required<DataTableColumn<T>[]>();
  rows = input.required<T[]>();
  loading = input(false);
  /** Set when the load request failed — rendered distinctly from a genuinely empty result. */
  error = input(false);
  emptyMessageKey = input('dataTable.empty');
  pagination = input<DataTablePagination | null>(null);
  sort = input<DataTableSort | null>(null);
  isRowExpanded = input<(row: T) => boolean>(() => false);
  /** Optional per-row CSS class, e.g. to grey out a deactivated row. */
  rowClass = input<(row: T) => string>(() => '');

  /** Filter bar config — omit or pass [] for no filter bar. */
  filters = input<DataTableFilterField[]>([]);
  /** Current value per filter key, keyed by DataTableFilterField.key. */
  filterValues = input<DataTableFilterValue>({});

  rowClick = output<T>();
  pageChange = output<number>();
  sortChange = output<DataTableSort>();
  /** Emits the full merged filter value set whenever any filter control changes. */
  filterChange = output<DataTableFilterValue>();

  private searchDebounceTimer?: ReturnType<typeof setTimeout>;

  cellValue(row: T, column: DataTableColumn<T>): string {
    if (column.format) {
      return column.format(row);
    }
    const value = (row as Record<string, unknown>)[column.key];
    return value === null || value === undefined ? '' : String(value);
  }

  onHeaderClick(column: DataTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }
    const current = this.sort();
    const direction: DataTableSort['direction'] =
      current?.key === column.key && current.direction === 'asc'
        ? 'desc'
        : 'asc';
    this.sortChange.emit({ key: column.key, direction });
  }

  get totalPages(): number {
    const p = this.pagination();
    return p ? Math.max(1, Math.ceil(p.total / p.pageSize)) : 1;
  }

  get colspan(): number {
    return this.columns().length + (this.rowActionsTemplate ? 1 : 0);
  }

  get hasActiveFilters(): boolean {
    return Object.values(this.filterValues()).some((v) =>
      typeof v === 'string' ? v !== '' : v.from !== '' || v.to !== '',
    );
  }

  selectValue(key: string): string {
    const v = this.filterValues()[key];
    return typeof v === 'string' ? v : '';
  }

  dateRangeValue(key: string): DataTableFilterDateRange {
    const v = this.filterValues()[key];
    return typeof v === 'object' && v ? v : EMPTY_DATE_RANGE;
  }

  onSelectFilterChange(key: string, value: string): void {
    this.filterChange.emit({ ...this.filterValues(), [key]: value });
  }

  /** Debounced so a fast typist doesn't trigger a request per keystroke. */
  onSearchFilterChange(key: string, value: string): void {
    clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.filterChange.emit({ ...this.filterValues(), [key]: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  onDateRangeChange(
    key: string,
    part: keyof DataTableFilterDateRange,
    value: string,
  ): void {
    const range = this.dateRangeValue(key);
    this.filterChange.emit({
      ...this.filterValues(),
      [key]: { ...range, [part]: value },
    });
  }

  clearFilters(): void {
    clearTimeout(this.searchDebounceTimer);
    this.filterChange.emit({});
  }
}
