import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
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
  DocumentViewerComponent,
  LocationPickerComponent,
} from '@zitro/ui';
import { FormFieldComponent } from '../form-field/form-field.component';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';

/**
 * The actual "edit a business" form — extracted out of AdminBusinessEditComponent
 * (the standalone /businesses/:id/edit page) so the exact same form can also be
 * embedded directly in the business-detail page's Profile tab, instead of that tab
 * re-implementing an equivalent form or just showing plain read-only text. Both
 * call sites pass the already-fetched BusinessDetailDto in — this component never
 * fetches the business itself, only its own brands list (needed for the Brand
 * picker regardless of which page renders this form).
 */
@Component({
  selector: 'lib-admin-business-edit-form',
  standalone: true,
  imports: [
    FormsModule,
    I18nPipe,
    DecimalPipe,
    FormFieldComponent,
    ConfirmationDialogComponent,
    DocumentViewerComponent,
    LocationPickerComponent,
    ToggleSwitchComponent,
  ],
  template: `
    <div class="edit-card">
      <form class="form-grid" (ngSubmit)="save()">
        <lib-form-field
          class="full-row"
          labelKey="businesses.name"
          [error]="null"
          ><input
            class="input"
            id="edit-name"
            [(ngModel)]="form.name"
            name="name"
            data-testid="business-edit-name"
        /></lib-form-field>
        <lib-form-field
          class="full-row"
          labelKey="businesses.description"
          [error]="null"
          ><input
            class="input"
            id="edit-desc"
            [(ngModel)]="form.description"
            name="description"
        /></lib-form-field>
        <lib-form-field
          labelKey="businesses.slug"
          hintKey="businesses.cannotBeChanged"
          [error]="null"
        >
          <input class="input" [value]="business().slug" readonly disabled />
        </lib-form-field>
        <lib-form-field
          labelKey="businesses.type"
          hintKey="businesses.cannotBeChanged"
          [error]="null"
        >
          <input
            class="input"
            [value]="business().businessType"
            readonly
            disabled
          />
        </lib-form-field>
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
        <lib-form-field labelKey="businesses.fssai" [error]="null"
          ><input
            class="input"
            id="edit-fssai"
            [(ngModel)]="form.fssaiLicenseNumber"
            name="fssaiLicenseNumber"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.gst" [error]="null"
          ><input
            class="input"
            id="edit-gst"
            [(ngModel)]="form.gstNumber"
            name="gstNumber"
        /></lib-form-field>
        <lib-form-field labelKey="businesses.pan" [error]="null"
          ><input
            class="input"
            id="edit-pan"
            [(ngModel)]="form.panNumber"
            name="panNumber"
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
          @if (business().commissionAcceptedAt) {
            <span class="doc-badge doc-badge--verified">{{
              'businesses.commissionAccepted' | i18n
            }}</span>
          } @else {
            <span class="doc-badge doc-badge--missing">{{
              'businesses.commissionNotAccepted' | i18n
            }}</span>
          }
        </lib-form-field>
        <lib-form-field labelKey="businesses.payoutAccountId" [error]="null">
          <input
            class="input"
            id="edit-payout-account"
            [(ngModel)]="form.payoutAccountId"
            name="payoutAccountId"
            placeholder="{{ 'businesses.payoutAccountIdHint' | i18n }}"
            data-testid="business-edit-payout-account"
          />
          <div class="bank-proof-viewer">
            <lib-document-viewer
              [url]="bankProofUrl()"
              [label]="i18n.translate('businesses.viewBankProof')"
            />
          </div>
        </lib-form-field>
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
        @if (business().coverImageUrl; as url) {
          <lib-form-field
            class="full-row"
            labelKey="businesses.coverPhoto"
            [error]="null"
          >
            <img class="cover-preview" [src]="url" alt="Cover photo" />
          </lib-form-field>
        }
        <div class="toggle-row full-row">
          <lib-toggle-switch
            data-testid="business-edit-featured-toggle"
            [checked]="form.isFeatured"
            (toggled)="form.isFeatured = !form.isFeatured"
          />
          <span
            >{{ 'businesses.featured' | i18n }}
            <span class="toggle-hint">{{
              'businesses.featuredHint' | i18n
            }}</span></span
          >
        </div>
        <div class="map-picker-section full-row">
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
        </div>
        <div class="form-footer full-row">
          @if (saveError()) {
            <p class="error-text">{{ saveError() }}</p>
          }
          @if (saveSuccess()) {
            <p class="success-text">{{ 'common.saved' | i18n }}</p>
          }
          <div class="panel-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving()">
              {{ saving() ? ('common.saving' | i18n) : ('common.save' | i18n) }}
            </button>
          </div>
        </div>
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
    </div>
    <lib-confirmation-dialog
      [isVisible]="confirmingPromote()"
      [config]="promoteDialogConfig()"
      (confirmed)="confirmPromote()"
      (cancelled)="confirmingPromote.set(false)"
    />
  `,
  styles: [
    `
      @use '../_admin-shared' as *;

      .edit-card {
        max-width: 720px;
        background: var(--zitro-surface);
        border-radius: var(--zitro-radius-lg);
        box-shadow: var(--zitro-shadow-card);
        padding: var(--zitro-spacing-xl);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--zitro-spacing-lg);
        align-items: start;

        @media (max-width: 640px) {
          grid-template-columns: 1fr;
        }
      }

      .full-row {
        grid-column: 1 / -1;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        gap: var(--zitro-spacing-sm);
        font-size: var(--zitro-font-size-sm);
      }

      .toggle-hint {
        color: var(--zitro-on-surface-variant);
        font-weight: 400;
      }

      .map-picker-section {
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-sm);
        padding: var(--zitro-spacing-md);
        background: var(--zitro-surface-variant);
        border-radius: var(--zitro-radius-md);
      }

      .map-hint {
        margin: 0;
        font-size: var(--zitro-font-size-sm);
        color: var(--zitro-on-surface-variant);
      }

      .bank-proof-viewer {
        margin-top: var(--zitro-spacing-xs);
      }

      .doc-badge {
        display: inline-block;
        margin-top: var(--zitro-spacing-xs);
        font-size: var(--zitro-font-size-sm);
        padding: 2px 8px;
        border-radius: var(--zitro-radius-sm);
        text-transform: capitalize;
      }

      .doc-badge--verified {
        background: #d4edda;
        color: #155724;
      }

      .doc-badge--missing {
        background: var(--zitro-surface-variant);
        color: var(--zitro-on-surface-variant);
      }

      .cover-preview {
        max-width: 240px;
        max-height: 135px;
        border-radius: var(--zitro-radius-sm);
        object-fit: cover;
      }

      .form-footer {
        display: flex;
        flex-direction: column;
        gap: var(--zitro-spacing-sm);
        padding-top: var(--zitro-spacing-md);
        border-top: 1px solid var(--zitro-divider);
      }

      .panel-actions {
        display: flex;
        justify-content: flex-end;
      }

      .promote-panel {
        margin-top: var(--zitro-spacing-lg);
        padding-top: var(--zitro-spacing-lg);
        border-top: 1px solid var(--zitro-divider);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessEditFormComponent implements OnInit, OnChanges {
  private readonly api = inject(AdminApiService);
  protected readonly i18n = inject(I18nService);
  private readonly geocoding = inject(GoogleGeocodingService);

  business = input.required<BusinessDetailDto>();
  /** Emits the fresh dto returned by the save — callers update their own copy with
   * it instead of re-fetching. */
  saved = output<BusinessDetailDto>();

  protected brands = signal<BrandDto[]>([]);
  protected saving = signal(false);
  protected saveError = signal<string | null>(null);
  protected saveSuccess = signal(false);
  // Placeholder shape only — ngOnInit's resetFormFromInput() overwrites this with
  // the real business data before the template ever reads it (the input is
  // guaranteed set by Angular before ngOnInit runs, but not before this field
  // initializer, so `business()` can't be called here).
  protected form = {
    name: '',
    description: '',
    phone: '',
    town: '',
    fssaiLicenseNumber: '',
    gstNumber: '',
    panNumber: '',
    commissionPercentage: 0,
    payoutAccountId: '',
    isFeatured: false,
    brandId: '',
    menuMode: 'independent' as 'independent' | 'shared',
    coordinatesLat: null as number | null,
    coordinatesLng: null as number | null,
  };

  // ── Map picker (optional lat/lng capture) ──────────────────────────────────
  protected resolvingLocation = signal(false);

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

  protected bankProofUrl = computed(
    () =>
      this.business().verificationDocs?.find((d) => d.type === 'bank-proof')
        ?.url,
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
    this.resetFormFromInput();
    this.api.listBrands().subscribe({
      next: (page) => this.brands.set(page.items),
      error: () => this.brands.set([]),
    });
  }

  // `business` is an input, not fetched by this component — if the caller swaps in
  // a different business (or a freshly re-fetched copy of the same one) after this
  // form has already rendered once, the in-progress `form` object needs resetting
  // too, otherwise it'd keep showing stale values from the previous input.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['business'] && !changes['business'].firstChange) {
      this.resetFormFromInput();
    }
  }

  private resetFormFromInput(): void {
    const b = this.business();
    this.form = {
      name: b.name,
      description: b.description ?? '',
      phone: b.phone ?? '',
      town: b.town ?? '',
      fssaiLicenseNumber: b.fssaiLicenseNumber ?? '',
      gstNumber: b.gstNumber ?? '',
      panNumber: b.panNumber ?? '',
      commissionPercentage: b.commissionPercentage ?? 0,
      payoutAccountId: b.payoutAccountId ?? '',
      isFeatured: false,
      brandId: b.brandId ?? '',
      menuMode: b.menuMode ?? 'independent',
      coordinatesLat: b.coordinatesLat ?? null,
      coordinatesLng: b.coordinatesLng ?? null,
    };
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
    this.saveSuccess.set(false);
    const req: Record<string, unknown> = { ...this.form };
    // Only send brandId/menuMode when actually set — an empty string would fail
    // the backend's Guid? binding, and menuMode should stay untouched otherwise.
    if (!this.form.brandId) delete req['brandId'];
    if (this.form.coordinatesLat == null) delete req['coordinatesLat'];
    if (this.form.coordinatesLng == null) delete req['coordinatesLng'];
    this.api.updateBusiness(this.business().id, req).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        this.saved.emit(updated);
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
    this.api.promoteBranchToBrandMaster(this.business().id).subscribe({
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
