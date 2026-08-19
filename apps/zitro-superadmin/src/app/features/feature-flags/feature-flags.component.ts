import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, AppFeatureFlagDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

const APPS = [
  'customer',
  'restaurant',
  'pos',
  'admin',
  'superadmin',
  'delivery',
] as const;
type AppName = (typeof APPS)[number];

const PLATFORMS = ['all', 'web', 'android'] as const;
type Platform = (typeof PLATFORMS)[number];

interface FlagRow {
  key: string;
  platform: Platform;
  isEnabled: boolean;
  description: string | null;
  saving: boolean;
  error: string | null;
}

/**
 * SA-003 — Feature Flags Management
 * Reads current flags via GET /api/admin/feature-flags/{app} (raw per-row, real platform per
 * row — NOT the public /api/app-config/bundle, which merges platform rows into a flat
 * key→bool map for runtime consumption and would lose per-row platform here), toggles via
 * PUT /api/admin/feature-flags/{app}.
 * Changes propagate within the Cache-Control max-age (1 hour) documented in the architecture.
 */
@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './feature-flags.component.html',
  styleUrl: './feature-flags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureFlagsComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  protected readonly apps = APPS;
  protected readonly platforms = PLATFORMS;

  protected selectedApp = signal<AppName>('customer');
  protected selectedPlatform = signal<Platform>('all');
  protected flags = signal<FlagRow[]>([]);
  protected loading = signal(false);
  protected loadError = signal<string | null>(null);

  // New flag form
  protected newKey = '';
  protected newEnabled = false;
  protected newDescription = '';
  protected adding = signal(false);
  protected addError = signal<string | null>(null);

  protected filteredFlags = computed(() =>
    this.flags().filter(
      (f) =>
        f.platform === this.selectedPlatform() ||
        this.selectedPlatform() === 'all',
    ),
  );

  ngOnInit(): void {
    this.load();
  }

  protected onAppChange(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.adminApi.listAppFeatureFlags(this.selectedApp()).subscribe({
      next: (dtos) => {
        const rows: FlagRow[] = dtos.map((dto) => ({
          key: dto.key,
          platform: dto.platform as Platform,
          isEnabled: dto.isEnabled,
          description: dto.description,
          saving: false,
          error: null,
        }));
        this.flags.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('featureFlags.loadError');
        this.loading.set(false);
      },
    });
  }

  protected toggle(flag: FlagRow): void {
    flag.saving = true;
    flag.error = null;
    const newValue = !flag.isEnabled;

    this.adminApi
      .updateAppFeatureFlag(this.selectedApp(), {
        key: flag.key,
        isEnabled: newValue,
        platform: flag.platform,
      })
      .subscribe({
        next: (updated) => {
          this.flags.update((rows) =>
            rows.map((r) =>
              r.key === flag.key && r.platform === flag.platform
                ? { ...r, isEnabled: updated.isEnabled, saving: false }
                : r,
            ),
          );
        },
        error: () => {
          flag.saving = false;
          flag.error = 'featureFlags.saveError';
          this.flags.update((rows) => [...rows]); // trigger change detection
        },
      });
  }

  protected addFlag(): void {
    if (!this.newKey.trim()) return;
    this.adding.set(true);
    this.addError.set(null);

    this.adminApi
      .updateAppFeatureFlag(this.selectedApp(), {
        key: this.newKey.trim(),
        isEnabled: this.newEnabled,
        platform: this.selectedPlatform(),
        description: this.newDescription || undefined,
      })
      .subscribe({
        next: (created) => {
          this.flags.update((rows) => [
            ...rows,
            {
              key: created.key,
              platform: created.platform as Platform,
              isEnabled: created.isEnabled,
              description: created.description,
              saving: false,
              error: null,
            },
          ]);
          this.newKey = '';
          this.newEnabled = false;
          this.newDescription = '';
          this.adding.set(false);
        },
        error: () => {
          this.addError.set('featureFlags.saveError');
          this.adding.set(false);
        },
      });
  }

  protected trackByKey(_: number, flag: FlagRow): string {
    return `${flag.key}:${flag.platform}`;
  }
}
