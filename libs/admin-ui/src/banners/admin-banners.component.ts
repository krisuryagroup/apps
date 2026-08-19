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
  BannerAdminDto,
  BusinessSummaryDto,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
} from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

type TargetType = 'none' | 'business' | 'url';

@Component({
  selector: 'lib-admin-banners',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DataTableComponent,
    ConfirmationDialogComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.banners' | i18n }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">
        + {{ 'banners.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      [columns]="columns"
      [rows]="banners()"
      [loading]="loading()"
      [error]="error()"
    >
      <ng-template #rowActions let-row>
        <button class="btn btn-sm btn-danger" (click)="requestRemove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
    <lib-confirmation-dialog
      [isVisible]="!!pendingDelete()"
      [config]="deleteDialogConfig()"
      (confirmed)="confirmRemove()"
      (cancelled)="pendingDelete.set(null)"
    />
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'banners.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="banner-title" class="form-label">{{
              'banners.title' | i18n
            }}</label>
            <input id="banner-title" class="input" [(ngModel)]="f.title" />

            <div class="form-label">{{ 'banners.image' | i18n }}</div>
            <div class="banner-image-field">
              @if (f.imageUrl) {
                <img
                  [src]="f.imageUrl"
                  alt=""
                  class="banner-image-preview"
                  data-testid="banner-image-preview"
                />
              }
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                data-testid="banner-image-upload"
                [disabled]="uploading()"
                (change)="onFileSelected($event)"
              />
              @if (uploading()) {
                <p class="loading">{{ 'common.loading' | i18n }}</p>
              }
              @if (uploadError()) {
                <p class="error-text">{{ uploadError() }}</p>
              }
            </div>

            <label for="banner-order" class="form-label">{{
              'banners.order' | i18n
            }}</label>
            <input
              id="banner-order"
              class="input"
              type="number"
              [(ngModel)]="f.displayOrder"
            />
            <label class="form-label checkbox-label" for="banner-active">
              <input
                id="banner-active"
                type="checkbox"
                [(ngModel)]="f.isActive"
              />
              {{ 'banners.active' | i18n }}
            </label>

            <div class="form-label">{{ 'banners.target' | i18n }}</div>
            <div class="banner-target-field">
              <label class="checkbox-label">
                <input
                  type="radio"
                  name="targetType"
                  value="none"
                  [(ngModel)]="targetType"
                />
                {{ 'banners.targetNone' | i18n }}
              </label>
              <label class="checkbox-label">
                <input
                  type="radio"
                  name="targetType"
                  value="business"
                  [(ngModel)]="targetType"
                />
                {{ 'banners.targetBusiness' | i18n }}
              </label>
              <label class="checkbox-label">
                <input
                  type="radio"
                  name="targetType"
                  value="url"
                  [(ngModel)]="targetType"
                />
                {{ 'banners.targetUrl' | i18n }}
              </label>
              @if (targetType() === 'business') {
                <select
                  class="select"
                  data-testid="banner-target-business-select"
                  [(ngModel)]="targetBusinessId"
                >
                  <option value="">
                    {{ 'banners.selectBusiness' | i18n }}
                  </option>
                  @for (b of businesses(); track b.id) {
                    <option [value]="b.id">{{ b.name }}</option>
                  }
                </select>
              }
              @if (targetType() === 'url') {
                <input
                  class="input"
                  data-testid="banner-target-url-input"
                  [(ngModel)]="targetUrlValue"
                  placeholder="https://..."
                />
              }
            </div>
          </div>
          @if (saveError()) {
            <p class="error-text">{{ 'common.error' | i18n }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.title || !f.imageUrl || saving() || uploading()"
              (click)="save()"
            >
              {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
            </button>
            <button class="btn btn-outline" (click)="showForm.set(false)">
              {{ 'common.cancel' | i18n }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-xs);
      }

      .banner-image-field,
      .banner-target-field {
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-sm);
      }

      .banner-image-preview {
        max-width: 200px;
        max-height: 120px;
        object-fit: cover;
        border-radius: var(--zitro-radius-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBannersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly i18n = inject(I18nService);
  protected banners = signal<BannerAdminDto[]>([]);
  protected businesses = signal<BusinessSummaryDto[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected saveError = signal(false);
  protected uploading = signal(false);
  protected uploadError = signal<string | null>(null);

  protected targetType = signal<TargetType>('none');
  protected targetBusinessId = '';
  protected targetUrlValue = '';

  protected f = {
    title: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true,
    bannerType: 'image',
  };

  protected pendingDelete = signal<BannerAdminDto | null>(null);
  protected deleteDialogConfig = computed<ConfirmationDialogConfig>(() => ({
    title: this.i18n.translate('common.confirmDeleteTitle'),
    message: this.i18n.translate('common.confirmDeleteMessage', {
      name: this.pendingDelete()?.title ?? '',
    }),
    confirmLabel: this.i18n.translate('common.delete'),
    cancelLabel: this.i18n.translate('common.cancel'),
    destructive: true,
    closeOnBackdropClick: true,
  }));

  protected readonly columns: DataTableColumn<BannerAdminDto>[] = [
    { key: 'title', labelKey: 'banners.title' },
    { key: 'bannerType', labelKey: 'banners.type' },
    { key: 'displayOrder', labelKey: 'banners.order' },
    {
      key: 'isActive',
      labelKey: 'banners.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
    { key: 'impressionCount', labelKey: 'banners.impressions' },
    { key: 'clickCount', labelKey: 'banners.clicks' },
  ];

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listBanners().subscribe({
      next: (b) => {
        this.banners.set(b);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
    this.api.listBusinesses({ pageSize: '200' }).subscribe({
      next: (r) => this.businesses.set(r.items),
      error: () => undefined,
    });
  }

  protected openCreate(): void {
    this.f = {
      title: '',
      imageUrl: '',
      displayOrder: 0,
      isActive: true,
      bannerType: 'image',
    };
    this.targetType.set('none');
    this.targetBusinessId = '';
    this.targetUrlValue = '';
    this.uploadError.set(null);
    this.saveError.set(false);
    this.showForm.set(true);
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.uploadError.set(null);
    this.api.uploadBannerMedia(file).subscribe({
      next: (res) => {
        this.f.imageUrl = res.url;
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Failed to upload image.');
      },
    });
  }

  private resolveTargetUrl(): string | undefined {
    switch (this.targetType()) {
      case 'business': {
        const business = this.businesses().find(
          (b) => b.id === this.targetBusinessId,
        );
        return business?.slug;
      }
      case 'url':
        return this.targetUrlValue || undefined;
      default:
        return undefined;
    }
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(false);
    const req: Record<string, unknown> = {
      ...this.f,
      targetUrl: this.resolveTargetUrl(),
    };
    this.api.createBanner(req).subscribe({
      next: (b) => {
        this.banners.update((bs) => [...bs, b]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }

  protected requestRemove(b: BannerAdminDto): void {
    this.pendingDelete.set(b);
  }

  protected confirmRemove(): void {
    const b = this.pendingDelete();
    if (!b) return;
    this.pendingDelete.set(null);
    this.api.deleteBanner(b.id).subscribe({
      next: () => this.banners.update((bs) => bs.filter((x) => x.id !== b.id)),
    });
  }
}
