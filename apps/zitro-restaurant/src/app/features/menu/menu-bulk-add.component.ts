import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BusinessApiService, MenuCategoryDto } from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  BackButtonComponent,
  ExcelGridColumn,
  ExcelGridComponent,
  ExcelGridRowStatus,
  ExcelGridSelectOption,
} from '@zitro/ui';

interface BulkMenuRow {
  [key: string]: unknown;
  name: string;
  basePrice: number;
  categoryId: string;
  foodType: string;
  isAvailable: boolean;
  imageUrl: string | null;
}

function blankRow(): BulkMenuRow {
  return {
    name: '',
    basePrice: 0,
    categoryId: '',
    foodType: 'veg',
    isAvailable: true,
    imageUrl: null,
  };
}

const INITIAL_ROW_COUNT = 5;

@Component({
  selector: 'app-restaurant-menu-bulk-add',
  standalone: true,
  imports: [FormsModule, BackButtonComponent, I18nPipe, ExcelGridComponent],
  templateUrl: './menu-bulk-add.component.html',
  styleUrl: './menu-bulk-add.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantMenuBulkAddComponent implements OnInit {
  private readonly api = inject(BusinessApiService);
  protected readonly i18n = inject(I18nService);

  protected categories = signal<MenuCategoryDto[]>([]);
  protected rows = signal<BulkMenuRow[]>(
    Array.from({ length: INITIAL_ROW_COUNT }, blankRow),
  );
  protected statuses = signal<(ExcelGridRowStatus | null)[]>([]);
  protected uploadingRows = signal<Set<number>>(new Set());
  protected saving = signal(false);
  protected lastResult = signal<{ saved: number; failed: number } | null>(null);
  protected resultMessage = computed(() => {
    const result = this.lastResult();
    if (!result) return '';
    return result.failed === 0
      ? this.i18n.translate('restaurant.bulkAddAllSaved')
      : this.i18n.translate('restaurant.bulkAddResult', {
          saved: String(result.saved),
          failed: String(result.failed),
        });
  });
  protected nothingToSaveError = signal(false);
  protected imageUploadError = signal<string | null>(null);

  protected readonly newRow = blankRow;

  private readonly categoryOptions = computed<ExcelGridSelectOption[]>(() =>
    this.categories().map((c) => ({ value: c.id, label: c.name })),
  );

  protected readonly columns: ExcelGridColumn<BulkMenuRow>[] = [
    { key: 'name', label: 'Name', type: 'text', width: '22%' },
    { key: 'basePrice', label: 'Price', type: 'number', width: '10%' },
    {
      key: 'categoryId',
      label: 'Category',
      type: 'select',
      options: this.categoryOptions,
      width: '18%',
    },
    {
      key: 'foodType',
      label: 'Food type',
      type: 'select',
      options: signal<ExcelGridSelectOption[]>([
        { value: 'veg', label: 'Veg' },
        { value: 'non-veg', label: 'Non-Veg' },
      ]),
      width: '12%',
    },
    { key: 'isAvailable', label: 'Available', type: 'checkbox', width: '8%' },
    { key: 'imageUrl', label: 'Image', type: 'image', width: '20%' },
  ];

  // ── Add Category (inline, without leaving this page/grid) ────────────────
  protected showCatForm = signal(false);
  protected catFormName = '';
  protected catSaving = signal(false);

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    const id = this.api.businessId()!;
    this.api
      .listCategories(id)
      .subscribe({ next: (c) => this.categories.set(c) });
  }

  protected openAddCategory(): void {
    this.catFormName = '';
    this.showCatForm.set(true);
  }

  protected saveCategory(): void {
    if (!this.catFormName) return;
    this.catSaving.set(true);
    const id = this.api.businessId()!;
    this.api.createCategory(id, { name: this.catFormName }).subscribe({
      next: () => {
        this.catSaving.set(false);
        this.showCatForm.set(false);
        // Re-fetch so categories() picks up the new row — every open dropdown in the
        // grid reads categoryOptions(), which is derived from this same signal, so they
        // all update immediately without touching the grid's own row state.
        this.loadCategories();
      },
      error: () => this.catSaving.set(false),
    });
  }

  // ── Grid row management ───────────────────────────────────────────────────

  protected onAddRow(): void {
    this.rows.update((rows) => [...rows, blankRow()]);
  }

  protected onDeleteRow(index: number): void {
    this.rows.update((rows) => rows.filter((_, i) => i !== index));
    this.statuses.update((statuses) => statuses.filter((_, i) => i !== index));
  }

  protected onImageUpload(event: {
    index: number;
    column: string;
    file: File;
  }): void {
    this.imageUploadError.set(null);
    this.uploadingRows.update((set) => new Set(set).add(event.index));
    const id = this.api.businessId()!;
    this.api.uploadProductMedia(id, event.file).subscribe({
      next: (res) => {
        this.rows.update((rows) =>
          rows.map((row, i) =>
            i === event.index ? { ...row, imageUrl: res.url } : row,
          ),
        );
        this.uploadingRows.update((set) => {
          const next = new Set(set);
          next.delete(event.index);
          return next;
        });
      },
      error: () => {
        this.uploadingRows.update((set) => {
          const next = new Set(set);
          next.delete(event.index);
          return next;
        });
        this.imageUploadError.set('restaurant.bulkAddImageError');
      },
    });
  }

  // ── Save all ───────────────────────────────────────────────────────────────

  protected saveAll(): void {
    this.lastResult.set(null);
    this.nothingToSaveError.set(false);

    const rows = this.rows();
    const indexesToSave = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.name.trim().length > 0);

    if (indexesToSave.length === 0) {
      this.nothingToSaveError.set(true);
      return;
    }

    this.saving.set(true);
    this.statuses.update((statuses) => {
      const next = [...statuses];
      for (const { index } of indexesToSave) next[index] = { state: 'saving' };
      return next;
    });

    const id = this.api.businessId()!;
    const items = indexesToSave.map(({ row }) => ({
      name: row.name,
      basePrice: row.basePrice,
      categoryId: row.categoryId || null,
      foodType: row.foodType,
      isAvailable: row.isAvailable,
      imageUrl: row.imageUrl,
    }));

    this.api.createProductsBulk(id, items).subscribe({
      next: (res) => {
        this.saving.set(false);
        let savedCount = 0;
        let failedCount = 0;
        this.statuses.update((statuses) => {
          const next = [...statuses];
          for (const result of res.items) {
            const { index } = indexesToSave[result.index];
            if (result.success) {
              next[index] = { state: 'saved' };
              savedCount++;
            } else {
              next[index] = { state: 'error', error: result.error };
              failedCount++;
            }
          }
          return next;
        });
        this.lastResult.set({ saved: savedCount, failed: failedCount });
        // Drop successfully-saved rows, keep failed ones editable for correction.
        const failedIndexes = new Set(
          res.items
            .filter((r) => !r.success)
            .map((r) => indexesToSave[r.index].index),
        );
        this.rows.update((rows) =>
          rows.filter(
            (_, i) =>
              failedIndexes.has(i) || !indexesToSave.some((s) => s.index === i),
          ),
        );
        this.statuses.update((statuses) =>
          statuses.filter(
            (_, i) =>
              failedIndexes.has(i) || !indexesToSave.some((s) => s.index === i),
          ),
        );
        if (this.rows().length === 0) this.rows.set([blankRow()]);
      },
      error: () => {
        this.saving.set(false);
        this.statuses.update((statuses) => {
          const next = [...statuses];
          for (const { index } of indexesToSave)
            next[index] = { state: 'error', error: 'Request failed' };
          return next;
        });
      },
    });
  }
}
