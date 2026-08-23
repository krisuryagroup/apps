import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '@zitro/i18n';

export type ExcelGridColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'image';

export interface ExcelGridSelectOption {
  value: string;
  label: string;
}

export interface ExcelGridColumn<T> {
  key: Extract<keyof T, string>;
  label: string;
  type: ExcelGridColumnType;
  /**
   * Required for type 'select'. A signal (not a static array) so the caller can feed it
   * straight from a live data source — e.g. a categories() signal — and every open row's
   * dropdown updates the instant a new option is added, with zero special-case logic in
   * this component.
   */
  options?: Signal<ExcelGridSelectOption[]>;
  /** CSS width for the column, e.g. '160px' or '1fr'. Defaults to a fair share. */
  width?: string;
}

export type ExcelGridRowState = 'saving' | 'saved' | 'error';

export interface ExcelGridRowStatus {
  state: ExcelGridRowState;
  error?: string;
}

/**
 * Generic Excel-sheet-style editable grid — not tied to any one domain. A caller supplies
 * `columns` (declaring per-column type/options) and owns the `rows` data via a two-way
 * `model()` binding; this component only knows how to render/edit cells and manage
 * add/delete-row structure through outputs (so the caller can keep a parallel `statuses`
 * array in sync by index without this component reaching into that bookkeeping itself).
 *
 * Image columns don't touch a backend directly — picking a file emits `imageUpload` and
 * the caller resolves the upload, then writes the resulting URL back into that row's
 * field (via the `rows` model), keeping this component free of any storage/API knowledge
 * so it stays reusable outside the menu-items use case it was built for.
 */
@Component({
  selector: 'lib-excel-grid',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './excel-grid.component.html',
  styleUrl: './excel-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExcelGridComponent<T extends Record<string, unknown>> {
  columns = input.required<ExcelGridColumn<T>[]>();
  rows = model.required<T[]>();
  /** Builds a fresh blank row — this component has no idea how to construct a T itself. */
  newRow = input.required<() => T>();
  /** Aligned by index with `rows()`. A row with no entry is untouched/idle. */
  statuses = input<(ExcelGridRowStatus | null)[]>([]);
  /** Row indexes currently mid-upload on an image column — shows a per-row spinner. */
  uploadingRows = input<Set<number>>(new Set());

  addRow = output<void>();
  deleteRow = output<number>();
  imageUpload = output<{ index: number; column: string; file: File }>();

  protected updateCell(index: number, key: string, value: unknown): void {
    this.rows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  protected onEnterInLastRow(index: number, event: Event): void {
    event.preventDefault();
    if (index !== this.rows().length - 1) return;
    this.addRow.emit();
  }

  protected onFileSelected(index: number, key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageUpload.emit({ index, column: key, file });
    input.value = '';
  }

  protected requestDeleteRow(index: number): void {
    this.deleteRow.emit(index);
  }

  protected statusFor(index: number): ExcelGridRowStatus | null {
    return this.statuses()[index] ?? null;
  }
}
