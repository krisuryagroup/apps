import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '@zitro/services';
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

/**
 * SA-006 — Per-App UI Config Management
 * Reads the JSONB config blob via GET /api/app-config and writes via PUT /api/admin/ui-config/{app}.
 * The config shape is deliberately open-ended — a JSON editor lets admins manage it without
 * a frontend redeploy when fields are added.
 */
@Component({
  selector: 'app-ui-config',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './ui-config.component.html',
  styleUrl: './ui-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiConfigComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);

  protected readonly apps = APPS;
  protected selectedApp = signal<AppName>('customer');

  protected configJson = signal('{}');
  protected loading = signal(false);
  protected loadError = signal<string | null>(null);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected saveSuccess = signal(false);
  protected jsonError = signal<string | null>(null);

  protected editValue = '{}';

  ngOnInit(): void {
    this.load();
  }

  protected onAppChange(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.saveSuccess.set(false);
    this.adminApi.getAppConfig(this.selectedApp()).subscribe({
      next: (config) => {
        const json = JSON.stringify(config.ui ?? {}, null, 2);
        this.configJson.set(json);
        this.editValue = json;
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('uiConfig.loadError');
        this.loading.set(false);
      },
    });
  }

  protected onEditChange(value: string): void {
    this.editValue = value;
    this.jsonError.set(null);
    try {
      JSON.parse(value);
    } catch {
      this.jsonError.set('uiConfig.invalidJson');
    }
  }

  protected save(): void {
    try {
      JSON.parse(this.editValue);
    } catch {
      this.jsonError.set('uiConfig.invalidJson');
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.adminApi.updateUiConfig(this.selectedApp(), this.editValue).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
      },
      error: () => {
        this.saveError.set('uiConfig.saveError');
        this.saving.set(false);
      },
    });
  }

  protected formatJson(): void {
    try {
      this.editValue = JSON.stringify(JSON.parse(this.editValue), null, 2);
      this.jsonError.set(null);
    } catch {
      this.jsonError.set('uiConfig.invalidJson');
    }
  }
}
