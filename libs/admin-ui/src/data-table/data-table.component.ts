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

/**
 * Generic sortable/paginated table for admin CRUD screens (AD-006…AD-018 etc.).
 * Row actions are passed as a template via `#rowActions` and projected per row —
 * see the README example in this lib for the row-actions content-projection pattern.
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

  columns = input.required<DataTableColumn<T>[]>();
  rows = input.required<T[]>();
  loading = input(false);
  /** Set when the load request failed — rendered distinctly from a genuinely empty result. */
  error = input(false);
  emptyMessageKey = input('dataTable.empty');
  pagination = input<DataTablePagination | null>(null);
  sort = input<DataTableSort | null>(null);

  rowClick = output<T>();
  pageChange = output<number>();
  sortChange = output<DataTableSort>();

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
}
