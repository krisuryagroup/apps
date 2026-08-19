import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AppThemeDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

type EditMode = 'none' | 'create' | 'edit';

const APPS = [
  'customer',
  'restaurant',
  'pos',
  'admin',
  'superadmin',
  'delivery',
] as const;

interface TokenEntry {
  name: string;
  value: string;
}

/**
 * SA-005 — Theme Management
 * List all themes (GET /api/admin/themes), create/edit custom themes (POST/PUT).
 * Built-in themes are read-only. Live preview via inline CSS variables.
 * App-scoping (formApps) restricts a custom theme to specific apps — an empty list means
 * available everywhere, matching the backend's `Apps.Count == 0` "no restriction" semantics.
 */
@Component({
  selector: 'app-themes',
  standalone: true,
  imports: [NgStyle, FormsModule, I18nPipe],
  templateUrl: './themes.component.html',
  styleUrl: './themes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemesComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  protected readonly apps = APPS;
  protected themes = signal<AppThemeDto[]>([]);
  protected loading = signal(false);
  protected loadError = signal<string | null>(null);

  protected editMode = signal<EditMode>('none');
  protected editingTheme = signal<AppThemeDto | null>(null);

  // Form fields
  protected formName = '';
  protected formPreviewColor = '';
  protected formTokens = signal<TokenEntry[]>([{ name: '', value: '' }]);
  protected formApps: string[] = [];
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);

  // Preview: map of CSS var → value to apply on sample element
  protected previewStyle = computed(() => {
    const tokens = this.formTokens().filter((t) => t.name && t.value);
    if (!tokens.length) return {};
    return Object.fromEntries(tokens.map((t) => [t.name, t.value]));
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminApi.getAdminThemes().subscribe({
      next: (themes) => {
        this.themes.set(themes);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('themes.loadError');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.formName = '';
    this.formPreviewColor = '';
    this.formTokens.set([{ name: '', value: '' }]);
    this.formApps = [];
    this.editingTheme.set(null);
    this.saveError.set(null);
    this.editMode.set('create');
  }

  protected openEdit(theme: AppThemeDto): void {
    if (theme.isBuiltIn) return;
    this.formName = theme.name;
    this.formPreviewColor = theme.previewColor ?? '';
    const tokens: TokenEntry[] = theme.tokens
      ? Object.entries(theme.tokens).map(([name, value]) => ({ name, value }))
      : [];
    if (!tokens.length) tokens.push({ name: '', value: '' });
    this.formTokens.set(tokens);
    this.formApps = [...theme.apps];
    this.editingTheme.set(theme);
    this.saveError.set(null);
    this.editMode.set('edit');
  }

  protected closeForm(): void {
    this.editMode.set('none');
  }

  protected addTokenRow(): void {
    this.formTokens.update((t) => [...t, { name: '', value: '' }]);
  }

  protected removeTokenRow(index: number): void {
    this.formTokens.update((t) => t.filter((_, i) => i !== index));
  }

  protected updateTokenName(index: number, value: string): void {
    this.formTokens.update((t) =>
      t.map((entry, i) => (i === index ? { ...entry, name: value } : entry)),
    );
  }

  protected updateTokenValue(index: number, value: string): void {
    this.formTokens.update((t) =>
      t.map((entry, i) => (i === index ? { ...entry, value } : entry)),
    );
  }

  protected isAppSelected(app: string): boolean {
    return this.formApps.includes(app);
  }

  protected toggleApp(app: string, checked: boolean): void {
    this.formApps = checked
      ? [...this.formApps, app]
      : this.formApps.filter((a) => a !== app);
  }

  protected save(): void {
    if (!this.formName.trim()) return;
    this.saving.set(true);
    this.saveError.set(null);

    const tokens = Object.fromEntries(
      this.formTokens()
        .filter((t) => t.name && t.value)
        .map((t) => [t.name, t.value]),
    );
    const tokensJson = JSON.stringify(tokens);
    const req = {
      name: this.formName.trim(),
      previewColor: this.formPreviewColor || undefined,
      tokensJson,
      apps: this.formApps.length ? this.formApps : undefined,
    };

    const existing = this.editingTheme();
    const call$ = existing
      ? this.adminApi.updateTheme(existing.id, req)
      : this.adminApi.createTheme(req);

    call$.subscribe({
      next: (saved) => {
        if (existing) {
          this.themes.update((t) =>
            t.map((x) => (x.id === saved.id ? saved : x)),
          );
        } else {
          this.themes.update((t) => [...t, saved]);
        }
        this.saving.set(false);
        this.editMode.set('none');
      },
      error: () => {
        this.saveError.set('themes.saveError');
        this.saving.set(false);
      },
    });
  }

  protected trackById(_: number, t: AppThemeDto): string {
    return t.id;
  }
}
