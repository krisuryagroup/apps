import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, BannerAdminDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-banners',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
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
        <button class="btn btn-sm btn-danger" (click)="remove(row)">
          {{ 'common.delete' | i18n }}
        </button>
      </ng-template>
    </lib-data-table>
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'banners.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="banner-title" class="form-label">{{
              'banners.title' | i18n
            }}</label>
            <input id="banner-title" class="input" [(ngModel)]="f.title" />
            <label for="banner-img" class="form-label">{{
              'banners.imageUrl' | i18n
            }}</label>
            <input
              id="banner-img"
              class="input"
              [(ngModel)]="f.imageUrl"
              placeholder="https://..."
            />
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
          </div>
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.title || saving()"
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBannersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected banners = signal<BannerAdminDto[]>([]);
  protected loading = signal(true);
  protected error = signal(false);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected f = {
    title: '',
    imageUrl: '',
    displayOrder: 0,
    isActive: true,
    bannerType: 'image',
  };

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
  }
  protected openCreate(): void {
    this.f = {
      title: '',
      imageUrl: '',
      displayOrder: 0,
      isActive: true,
      bannerType: 'image',
    };
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.api.createBanner(this.f as Record<string, unknown>).subscribe({
      next: (b) => {
        this.banners.update((bs) => [...bs, b]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  protected remove(b: BannerAdminDto): void {
    if (!confirm(`Delete "${b.title}"?`)) return;
    this.api.deleteBanner(b.id).subscribe({
      next: () => this.banners.update((bs) => bs.filter((x) => x.id !== b.id)),
    });
  }
}
