import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BrandDto,
  BusinessDetailDto,
  GoogleGeocodingService,
} from '@zitro/services';
import { I18nPipe, I18nService } from '@zitro/i18n';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogConfig,
  LocationPickerComponent,
} from '@zitro/ui';
import { FormFieldComponent } from '../form-field/form-field.component';

@Component({
  selector: 'lib-admin-business-edit',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    I18nPipe,
    DecimalPipe,
    FormFieldComponent,
    ConfirmationDialogComponent,
    LocationPickerComponent,
  ],
  template: `
    <div class="page-header">
      <h1 class="page-title">{{ 'businesses.edit' | i18n }}</h1>
      <a class="btn btn-outline" [routerLink]="['/businesses', id()]"
        >← {{ 'common.back' | i18n }}</a
      >
    </div>
    @if (loading()) {
      <p class="loading">{{ 'common.loading' | i18n }}</p>
    } @else if (biz()) {
      <form class="form-grid" (ngSubmit)="save()">
        <lib-form-field labelKey="businesses.name" [error]="null"
          ><input
            class="input"
            id="edit-name"
            [(ngModel)]="form.name"
            name="name"
            data-testid="business-edit-name"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.description" [error]="null"
          ><input
            class="input"
            id="edit-desc"
            [(ngModel)]="form.description"
            name="description"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.phone" [error]="null"
          ><input
            class="input"
            id="edit-phone"
            [(ngModel)]="form.phone"
            name="phone"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.town" [error]="null"
          ><input
            class="input"
            id="edit-town"
            [(ngModel)]="form.town"
            name="town"
            data-testid="business-edit-town"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.commissionRate" [error]="null">
          <input
            class="input"
            id="edit-commission"
            type="number"
            [(ngModel)]="form.commissionPercentage"
            name="commissionPercentage"
            data-testid="business-edit-commission-rate"
          />
        </lib-form-field>
        <label class="checkbox-label" for="edit-featured">
          <input
            id="edit-featured"
            type="checkbox"
            [(ngModel)]="form.isFeatured"
            name="isFeatured"
            data-testid="business-edit-featured-toggle"
          />
          {{ 'businesses.featured' | i18n }}
        </label>
        <lib-form-field labelKey="businesses.brand" [error]="null">
          <select
            class="input"
            id="edit-brand"
            [(ngModel)]="form.brandId"
            name="brandId"
            data-testid="business-edit-brand"
          >
            <option [value]="''">{{ 'businesses.noBrand' | i18n }}</option>
            @for (brand of brands(); track brand.id) {
              <option [value]="brand.id">{{ brand.name }}</option>
            }
          </select>
        </lib-form-field>
        <lib-form-field labelKey="businesses.menuMode" [error]="null">
          <select
            class="input"
            id="edit-menu-mode"
            [(ngModel)]="form.menuMode"
            name="menuMode"
            [disabled]="!form.brandId"
            data-testid="business-edit-menu-mode"
          >
            <option value="independent">
              {{ 'businesses.menuModeIndependent' | i18n }}
            </option>
            <option value="shared">
              {{ 'businesses.menuModeShared' | i18n }}
            </option>
          </select>
        </lib-form-field>
        <div class="map-picker-section">
          <button
            class="btn btn-sm btn-outline"
            type="button"
            data-testid="business-edit-pick-location-btn"
            (click)="showMapPicker.set(!showMapPicker())"
          >
            {{
              showMapPicker()
                ? ('businesses.hideMap' | i18n)
                : ('businesses.pickOnMap' | i18n)
            }}
          </button>
          @if (showMapPicker()) {
            <p class="map-hint">{{ 'businesses.mapHint' | i18n }}</p>
            <lib-location-picker
              data-testid="business-edit-map-picker"
              [initialCoordinates]="initialMapCoordinates()"
              (locationPicked)="onLocationPicked($event)"
            />
            @if (resolvingLocation()) {
              <p class="map-hint">{{ 'common.loading' | i18n }}</p>
            } @else if (
              form.coordinatesLat !== null && form.coordinatesLng !== null
            ) {
              <p class="map-hint" data-testid="business-edit-coordinates">
                {{ form.coordinatesLat | number: '1.5-5' }},
                {{ form.coordinatesLng | number: '1.5-5' }}
              </p>
            }
          }
        </div>
        <div class="panel-actions">
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
          </button>
        </div>
        @if (saveError()) {
          <p class="error-text">{{ saveError() }}</p>
        }
        @if (saveSuccess()) {
          <p class="success-text">{{ 'common.saved' | i18n }}</p>
        }
      </form>
      @if (canPromote()) {
        <div class="promote-panel">
          <button
            class="btn btn-outline"
            type="button"
            data-testid="business-promote-to-brand-master"
            (click)="requestPromote()"
          >
            {{ 'businesses.promoteToBrandMaster' | i18n }}
          </button>
          @if (promoteResult()) {
            <p class="success-text">{{ promoteResult() }}</p>
          }
          @if (promoteError()) {
            <p class="error-text">{{ promoteError() }}</p>
          }
        </div>
      }
      <lib-confirmation-dialog
        [isVisible]="confirmingPromote()"
        [config]="promoteDialogConfig()"
        (confirmed)="confirmPromote()"
        (cancelled)="confirmingPromote.set(false)"
      />
    }
  `,
  styles: [
    `
      @use '../_admin-shared' as *;
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-xs);
        font-size: var(--zitro-font-size-sm);
      }
      .form-grid {
        max-width: 520px;
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-md);
      }
      .promote-panel {
        max-width: 520px;
        margin-top: var(--zitro-spacing-lg);
        padding-top: var(--zitro-spacing-lg);
        border-top: 1px solid var(--zitro-color-border);
      }
      .map-picker-section {
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-xs);
      }
      .map-hint {
        margin: 0;
        font-size: var(--zitro-font-size-sm);
        color: var(--zitro-on-surface-variant);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessEditComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(I18nService);
  private readonly geocoding = inject(GoogleGeocodingService);

  protected id = signal('');
  protected biz = signal<BusinessDetailDto | null>(null);
  protected brands = signal<BrandDto[]>([]);
  protected loading = signal(true);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected saveSuccess = signal(false);
  protected form = {
    name: '',
    description: '',
    phone: '',
    town: '',
    commissionPercentage: 0,
    isFeatured: false,
    brandId: '',
    menuMode: 'independent' as 'independent' | 'shared',
    coordinatesLat: null as number | null,
    coordinatesLng: null as number | null,
  };

  // ── Map picker (optional lat/lng capture) ──────────────────────────────────
  protected showMapPicker = signal(false);
  protected resolvingLocation = signal(false);

  // Plain method, not computed() — `form` is a plain object reassigned wholesale in
  // ngOnInit, not a signal, so a computed() here would never see it change after its
  // first (pre-load) evaluation. Template bindings re-invoke this on every change
  // detection pass regardless, which is all it needs since MapPickerComponent only
  // reads the value once, when it's first created (i.e. when showMapPicker flips true).
  protected initialMapCoordinates(): { lat: number; lng: number } | null {
    return this.form.coordinatesLat != null && this.form.coordinatesLng != null
      ? { lat: this.form.coordinatesLat, lng: this.form.coordinatesLng }
      : null;
  }

  // Only a currently-independent branch that already has a brand picked can be
  // promoted — a shared-mode branch already has a master catalog (its own or
  // inherited), and promotion needs a brand to reparent products/categories onto.
  protected canPromote = computed(
    () => !!this.form.brandId && this.form.menuMode === 'independent',
  );

  protected confirmingPromote = signal(false);
  protected promoting = signal(false);
  protected promoteResult = signal<string | null>(null);
  protected promoteError = signal<string | null>(null);
  protected promoteDialogConfig = computed<ConfirmationDialogConfig>(() => ({
    title: this.i18n.translate('businesses.promoteConfirmTitle'),
    message: this.i18n.translate('businesses.promoteConfirmMessage'),
    confirmLabel: this.i18n.translate('businesses.promoteToBrandMaster'),
    cancelLabel: this.i18n.translate('common.cancel'),
    destructive: true,
    closeOnBackdropClick: true,
  }));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.id.set(id);
    this.api.getBusinessById(id).subscribe({
      next: (b) => {
        this.biz.set(b);
        this.form = {
          name: b.name,
          description: b.description ?? '',
          phone: b.phone ?? '',
          town: b.town ?? '',
          commissionPercentage: b.commissionPercentage ?? 0,
          isFeatured: false,
          brandId: b.brandId ?? '',
          menuMode: b.menuMode ?? 'independent',
          coordinatesLat: b.coordinatesLat ?? null,
          coordinatesLng: b.coordinatesLng ?? null,
        };
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.listBrands().subscribe({
      next: (page) => this.brands.set(page.items),
      error: () => this.brands.set([]),
    });
  }

  protected onLocationPicked(coords: { lat: number; lng: number }): void {
    this.form.coordinatesLat = coords.lat;
    this.form.coordinatesLng = coords.lng;
    this.resolvingLocation.set(true);
    this.geocoding
      .getFullAddressComponents(coords.lat, coords.lng)
      .then((addr) => {
        if (addr.town) this.form.town = addr.town;
        this.resolvingLocation.set(false);
      })
      .catch(() => this.resolvingLocation.set(false));
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    const req: Record<string, unknown> = { ...this.form };
    // Only send brandId/menuMode when actually set — an empty string would fail
    // the backend's Guid? binding, and menuMode should stay untouched otherwise.
    if (!this.form.brandId) delete req['brandId'];
    if (this.form.coordinatesLat == null) delete req['coordinatesLat'];
    if (this.form.coordinatesLng == null) delete req['coordinatesLng'];
    this.api.updateBusiness(this.id(), req).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveSuccess.set(true);
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving.set(false);
        this.saveError.set(
          err.error?.message ?? this.i18n.translate('common.error'),
        );
      },
    });
  }

  protected requestPromote(): void {
    this.promoteResult.set(null);
    this.promoteError.set(null);
    this.confirmingPromote.set(true);
  }

  protected confirmPromote(): void {
    this.confirmingPromote.set(false);
    this.promoting.set(true);
    this.api.promoteBranchToBrandMaster(this.id()).subscribe({
      next: (result) => {
        this.promoting.set(false);
        this.form = { ...this.form, menuMode: 'shared' };
        this.promoteResult.set(
          `${this.i18n.translate('businesses.promoteSuccess')} (${result.productsPromoted} products, ${result.categoriesPromoted} categories)`,
        );
      },
      error: (err: { error?: { message?: string } }) => {
        this.promoting.set(false);
        this.promoteError.set(
          err.error?.message ?? this.i18n.translate('businesses.promoteError'),
        );
      },
    });
  }
}
