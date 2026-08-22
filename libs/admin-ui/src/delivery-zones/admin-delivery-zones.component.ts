import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BusinessSummaryDto,
  DeliveryZoneDto,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { PolygonMapPickerComponent } from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-delivery-zones',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DataTableComponent,
    PolygonMapPickerComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.deliveryZones' | i18n }}</h1>
      <button
        class="btn btn-primary"
        [disabled]="!businessId"
        (click)="openCreate()"
      >
        + {{ 'deliveryZones.add' | i18n }}
      </button>
    </div>
    <div class="filters">
      <select
        id="dz-business"
        class="select"
        data-testid="delivery-zone-business-filter"
        [(ngModel)]="businessId"
        (ngModelChange)="onBusinessChange()"
      >
        <option value="">{{ 'deliveryZones.selectBusiness' | i18n }}</option>
        @for (b of businesses(); track b.id) {
          <option [value]="b.id">{{ b.name }}</option>
        }
      </select>
    </div>
    @if (!businessId) {
      <p class="empty">{{ 'deliveryZones.selectBusinessHint' | i18n }}</p>
    } @else {
      <lib-data-table
        [columns]="columns"
        [rows]="zones()"
        [loading]="loading()"
        [error]="error()"
      />
    }
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'deliveryZones.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="dz-name" class="form-label">{{
              'deliveryZones.name' | i18n
            }}</label>
            <input id="dz-name" class="input" [(ngModel)]="f.name" />
            <label for="dz-basefee" class="form-label">{{
              'deliveryZones.baseFee' | i18n
            }}</label>
            <input
              id="dz-basefee"
              class="input"
              type="number"
              min="0"
              [(ngModel)]="f.baseFee"
            />
            <label for="dz-feeperkm" class="form-label">{{
              'deliveryZones.feePerKm' | i18n
            }}</label>
            <input
              id="dz-feeperkm"
              class="input"
              type="number"
              min="0"
              [(ngModel)]="f.feePerKm"
            />
          </div>

          <p class="form-label">{{ 'deliveryZones.polygonCoords' | i18n }}</p>
          <lib-polygon-map-picker
            data-testid="delivery-zone-polygon-map"
            (polygonChanged)="onPolygonChanged($event)"
          />

          @if (saveError()) {
            <p class="error-text">{{ 'common.error' | i18n }}</p>
          }
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!f.name || polygonPoints.length < 3 || saving()"
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDeliveryZonesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  protected zones = signal<DeliveryZoneDto[]>([]);
  protected loading = signal(false);
  protected error = signal(false);
  protected showForm = signal(false);
  protected saving = signal(false);
  protected saveError = signal(false);

  protected businessId = '';
  protected businesses = signal<BusinessSummaryDto[]>([]);

  protected f = this.emptyForm();
  protected polygonPoints: { lat: number; lng: number }[] = [];

  private emptyForm() {
    return { name: '', baseFee: 0, feePerKm: 0 };
  }

  protected readonly columns: DataTableColumn<DeliveryZoneDto>[] = [
    { key: 'name', labelKey: 'deliveryZones.name' },
    { key: 'baseFee', labelKey: 'deliveryZones.baseFee' },
    { key: 'feePerKm', labelKey: 'deliveryZones.feePerKm' },
    {
      key: 'isActive',
      labelKey: 'deliveryZones.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.api.listBusinesses({ pageSize: '200' }).subscribe({
      next: (r) => this.businesses.set(r.items),
      error: () => undefined,
    });
  }

  protected onBusinessChange(): void {
    if (!this.businessId) {
      this.zones.set([]);
      return;
    }
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.listDeliveryZones(this.businessId).subscribe({
      next: (z) => {
        this.zones.set(z);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected onPolygonChanged(points: { lat: number; lng: number }[]): void {
    this.polygonPoints = points;
  }

  protected openCreate(): void {
    this.f = this.emptyForm();
    this.polygonPoints = [];
    this.saveError.set(false);
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(false);
    this.api
      .createDeliveryZone({
        businessId: this.businessId,
        name: this.f.name,
        polygonCoords: JSON.stringify(this.polygonPoints),
        baseFee: this.f.baseFee,
        feePerKm: this.f.feePerKm,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set(true);
        },
      });
  }
}
