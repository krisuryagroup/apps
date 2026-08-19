import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  SupportedLanguage,
  TranslationDto,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { EN_DEFAULTS } from '@zitro/i18n';

/** Recursively flatten a nested object into dot-notation keys. */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? flattenKeys(v as Record<string, unknown>, full)
      : [full];
  });
}

const ALL_EN_KEYS = new Set(
  flattenKeys(EN_DEFAULTS as unknown as Record<string, unknown>),
);
const APPS = [
  '',
  'customer',
  'restaurant',
  'pos',
  'admin',
  'superadmin',
  'delivery',
] as const;

interface TranslationRow {
  key: string;
  app: string;
  value: string;
  editing: boolean;
  editValue: string;
  saving: boolean;
}

/**
 * SA-004 — Translations Management
 * Language selector, key-value editor, search/filter, bulk CSV import, missing-key report.
 */
@Component({
  selector: 'app-translations',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './translations.component.html',
  styleUrl: './translations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslationsComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  protected readonly appOptions = APPS;
  protected languages = signal<SupportedLanguage[]>([]);
  protected selectedLang = signal('hi');
  protected selectedApp = signal('');

  protected rows = signal<TranslationRow[]>([]);
  protected searchQuery = signal('');
  protected loading = signal(false);
  protected loadError = signal<string | null>(null);

  // New row form
  protected newKey = '';
  protected newValue = '';
  protected newApp = '';
  protected adding = signal(false);
  protected addError = signal<string | null>(null);

  // CSV import
  protected csvFile: File | null = null;
  protected csvPreview = signal<Array<{ key: string; value: string }>>([]);
  protected csvError = signal<string | null>(null);
  protected importing = signal(false);

  protected filteredRows = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter(
      (r) =>
        r.key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q),
    );
  });

  protected missingKeys = computed(() => {
    const presentKeys = new Set(this.rows().map((r) => r.key));
    return [...ALL_EN_KEYS].filter((k) => !presentKeys.has(k));
  });

  protected showMissingReport = signal(false);

  ngOnInit(): void {
    this.loadLanguages();
    this.loadTranslations();
  }

  protected onLangChange(): void {
    this.loadTranslations();
  }

  protected onAppChange(): void {
    this.loadTranslations();
  }

  private loadLanguages(): void {
    this.adminApi.getSupportedLanguages().subscribe({
      next: (langs) => this.languages.set(langs),
    });
  }

  private loadTranslations(): void {
    const lang = this.selectedLang();
    const app = this.selectedApp();
    if (lang === 'en') {
      this.rows.set([]);
      return;
    }
    this.loading.set(true);
    this.loadError.set(null);
    this.adminApi.getTranslations(lang, app || 'customer').subscribe({
      next: (res) => {
        this.rows.set(
          Object.entries(res.keys).map(([key, value]) => ({
            key,
            app,
            value,
            editing: false,
            editValue: value,
            saving: false,
          })),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('translations.loadError');
        this.loading.set(false);
      },
    });
  }

  protected startEdit(row: TranslationRow): void {
    row.editing = true;
    row.editValue = row.value;
    this.rows.update((r) => [...r]);
  }

  protected cancelEdit(row: TranslationRow): void {
    row.editing = false;
    this.rows.update((r) => [...r]);
  }

  protected saveEdit(row: TranslationRow): void {
    if (!row.editValue.trim()) return;
    row.saving = true;
    this.adminApi
      .upsertTranslation({
        lang: this.selectedLang(),
        key: row.key,
        app: row.app || null,
        value: row.editValue,
      })
      .subscribe({
        next: (updated) => {
          row.value = updated.value;
          row.editValue = updated.value;
          row.editing = false;
          row.saving = false;
          this.rows.update((r) => [...r]);
        },
        error: () => {
          row.saving = false;
          this.rows.update((r) => [...r]);
        },
      });
  }

  protected deleteRow(row: TranslationRow): void {
    if (!confirm(`Delete "${row.key}"?`)) return;
    this.adminApi
      .deleteTranslation(row.key, this.selectedLang(), row.app)
      .subscribe({
        next: () => this.rows.update((r) => r.filter((x) => x !== row)),
      });
  }

  protected addRow(): void {
    if (!this.newKey.trim() || !this.newValue.trim()) return;
    this.adding.set(true);
    this.addError.set(null);
    this.adminApi
      .upsertTranslation({
        lang: this.selectedLang(),
        key: this.newKey.trim(),
        app: this.newApp || null,
        value: this.newValue.trim(),
      })
      .subscribe({
        next: (created) => {
          this.rows.update((r) => [
            ...r,
            {
              key: created.key,
              app: created.app,
              value: created.value,
              editing: false,
              editValue: created.value,
              saving: false,
            },
          ]);
          this.newKey = '';
          this.newValue = '';
          this.adding.set(false);
        },
        error: () => {
          this.addError.set('translations.saveError');
          this.adding.set(false);
        },
      });
  }

  protected onCsvFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.csvFile = input.files?.[0] ?? null;
    this.csvPreview.set([]);
    this.csvError.set(null);
    if (!this.csvFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        const preview: Array<{ key: string; value: string }> = [];
        for (const line of lines) {
          const comma = line.indexOf(',');
          if (comma < 1) continue;
          const key = line.slice(0, comma).trim();
          const value = line
            .slice(comma + 1)
            .trim()
            .replace(/^"|"$/g, '');
          if (key && value) preview.push({ key, value });
        }
        this.csvPreview.set(preview);
      } catch {
        this.csvError.set('translations.csvParseError');
      }
    };
    reader.readAsText(this.csvFile);
  }

  protected commitCsv(): void {
    const rows = this.csvPreview();
    if (!rows.length) return;
    this.importing.set(true);

    let completed = 0;
    for (const { key, value } of rows) {
      this.adminApi
        .upsertTranslation({
          lang: this.selectedLang(),
          key,
          app: this.selectedApp() || null,
          value,
        })
        .subscribe({
          next: () => {
            completed++;
            if (completed === rows.length) {
              this.csvPreview.set([]);
              this.importing.set(false);
              this.loadTranslations();
            }
          },
          error: () => {
            completed++;
            if (completed === rows.length) {
              this.importing.set(false);
              this.loadTranslations();
            }
          },
        });
    }
  }

  protected trackByKey(_: number, row: TranslationRow): string {
    return `${row.key}:${row.app}`;
  }
}
