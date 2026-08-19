import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, DeliveryZoneDto } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  DataTableComponent,
  DataTableColumn,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-delivery-zones',
  standalone: true,
  imports: [FormsModule, I18nPipe, DataTableComponent],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'nav.deliveryZones' | i18n }}</h1>
      <button class="btn btn-primary" (click)="openCreate()">
        + {{ 'deliveryZones.add' | i18n }}
      </button>
    </div>
    <lib-data-table
      [columns]="columns"
      [rows]="zones()"
      [loading]="loading()"
    />
    @if (showForm()) {
      <div class="overlay">
        <div class="panel">
          <h2 class="panel-title">{{ 'deliveryZones.add' | i18n }}</h2>
          <div class="form-grid">
            <label for="dz-name" class="form-label">{{
              'deliveryZones.name' | i18n
            }}</label>
            <input id="dz-name" class="input" [(ngModel)]="formName" />
          </div>
          <div class="panel-actions">
            <button
              class="btn btn-primary"
              [disabled]="!formName || saving()"
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
  protected loading = signal(true);
  protected showForm = signal(false);
  protected formName = '';
  protected saving = signal(false);

  protected readonly columns: DataTableColumn<DeliveryZoneDto>[] = [
    { key: 'name', labelKey: 'deliveryZones.name' },
    {
      key: 'isActive',
      labelKey: 'deliveryZones.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.api.listDeliveryZones().subscribe({
      next: (z) => {
        this.zones.set(z);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  protected openCreate(): void {
    this.formName = '';
    this.showForm.set(true);
  }

  protected save(): void {
    this.saving.set(true);
    this.api.createDeliveryZone({ name: this.formName }).subscribe({
      next: (z) => {
        this.zones.update((zs) => [...zs, z]);
        this.saving.set(false);
        this.showForm.set(false);
      },
      error: () => this.saving.set(false),
    });
  }
}
