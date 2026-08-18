import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nPipe } from '@zitro/i18n';
import {
  Address,
  AddressFormData,
  AddressMode,
  NearbySociety,
  SocietyTower,
} from '@zitro/models';

export interface AddAddressFormConfig {
  mode: 'add' | 'edit';
}
export const ADD_ADDRESS_FORM_DEFAULT_CONFIG: AddAddressFormConfig = {
  mode: 'add',
};

export interface AddressLocationPatch {
  pincode: string;
  town: string;
  state: string;
  landmark?: string;
  lat?: number | null;
  lng?: number | null;
}

@Component({
  selector: 'lib-add-address-form',
  standalone: true,
  imports: [FormsModule, I18nPipe],
  templateUrl: './add-address-form.component.html',
  styleUrl: './add-address-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAddressFormComponent {
  config = input<AddAddressFormConfig>(ADD_ADDRESS_FORM_DEFAULT_CONFIG);
  initialData = input<Partial<Address> | null>(null);
  locationPatch = input<AddressLocationPatch | null>(null);
  pincodeRestricted = input<boolean>(false);
  /** Societies near the currently selected map location — fetched by the parent page. */
  nearbySocieties = input<NearbySociety[]>([]);
  /** Towers for the currently selected society — fetched by the parent page. */
  societyTowers = input<SocietyTower[]>([]);

  submitted = output<AddressFormData>();
  cancelled = output<void>();
  /** Emits the chosen society id (or null on clear) so the parent can fetch its towers. */
  societySelected = output<string | null>();

  name = signal('');
  phone = signal('');
  houseAndStreet = signal('');
  landmark = signal('');
  pincode = signal('');
  town = signal('');
  state = signal('');
  type = signal<'Home' | 'Office' | 'Other'>('Home');
  isDefault = signal(false);
  lat = signal<number | null>(null);
  lng = signal<number | null>(null);

  // ── Apartment/society mode ──────────────────────────────────────────────
  // AddressMode is fixed at creation and never changes via edit (phase 1) —
  // see docs/features/apartment-society-addresses.md in zitro-api. The backend
  // enforces this too (ADDRESS_MODE_LOCKED); this UI just avoids offering the
  // switch in the first place once an address already exists.
  addressMode = signal<AddressMode>('manual');
  showApartmentSection = signal(false);
  apartmentQuery = signal('');
  selectedSocietyId = signal<string | null>(null);
  selectedSocietyName = signal<string | null>(null);
  selectedTowerId = signal<string | null>(null);
  towerNameOther = signal('');
  flatNumber = signal('');

  pincodeError = computed(
    () => this.pincode().length > 0 && !/^\d{6}$/.test(this.pincode()),
  );

  isEditMode = computed(() => this.config().mode === 'edit');
  isSocietyMode = computed(() => this.addressMode() === 'society');
  hasNearbySocieties = computed(() => this.nearbySocieties().length > 0);

  /** Whether the "select your apartment" toggle is offered at all — add-mode only. */
  canOfferApartmentPicker = computed(
    () => !this.isEditMode() && this.hasNearbySocieties(),
  );
  /** Whether the society itself can be re-picked from a list — never during edit. */
  canChangeSociety = computed(() => !this.isEditMode());

  filteredSocieties = computed(() => {
    const q = this.apartmentQuery().trim().toLowerCase();
    const list = this.nearbySocieties();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  });

  /**
   * Towers for the currently selected society. Prefers the towers already
   * bundled into the picked NearbySociety (add mode — zero extra requests).
   * Falls back to the societyTowers input, which the parent still fetches
   * separately for edit mode, where there's no nearby-list context to bundle from.
   */
  effectiveTowers = computed(() => {
    const fromList = this.nearbySocieties().find(
      (s) => s.id === this.selectedSocietyId(),
    )?.towers;
    return fromList ?? this.societyTowers();
  });

  selectedTowerName = computed(
    () =>
      this.effectiveTowers().find((t) => t.id === this.selectedTowerId())
        ?.name ?? null,
  );

  /** Mirrors the backend's server-side compose logic — a live preview only. */
  composedHouseAndStreet = computed(() => {
    const society = this.selectedSocietyName();
    const flat = this.flatNumber().trim();
    if (!society || !flat) return '';
    const tower =
      this.selectedTowerName() ?? (this.towerNameOther().trim() || null);
    return tower
      ? `Flat ${flat}, Tower ${tower}, ${society}`
      : `Flat ${flat}, ${society}`;
  });

  isValid = computed(() => {
    if (this.pincodeRestricted()) return false;
    if (
      !this.name().trim() ||
      !this.phone().trim() ||
      !/^\d{6}$/.test(this.pincode()) ||
      !this.town().trim() ||
      !this.state().trim()
    ) {
      return false;
    }
    return this.isSocietyMode()
      ? !!this.selectedSocietyId() && this.flatNumber().trim().length > 0
      : this.houseAndStreet().trim().length > 0;
  });

  readonly addressTypes: Array<'Home' | 'Office' | 'Other'> = [
    'Home',
    'Office',
    'Other',
  ];

  constructor() {
    effect(
      () => {
        const data = this.initialData();
        if (!data) return;

        this.name.set(data.name ?? '');
        this.phone.set(data.phone ?? '');
        this.houseAndStreet.set(data.houseAndStreet ?? '');
        this.landmark.set(data.landmark ?? '');
        this.pincode.set(data.pincode ?? '');
        this.town.set(data.town ?? '');
        this.state.set(data.state ?? '');
        this.type.set(data.type ?? 'Home');
        this.isDefault.set(data.isDefault ?? false);

        const mode = data.addressMode ?? 'manual';
        this.addressMode.set(mode);
        if (mode === 'society') {
          this.showApartmentSection.set(true);
          this.selectedSocietyId.set(data.societyId ?? null);
          this.selectedSocietyName.set(data.societyName ?? null);
          this.selectedTowerId.set(data.towerId ?? null);
          this.flatNumber.set(data.flatNumber ?? '');
          if (data.societyId) this.societySelected.emit(data.societyId);
        }
      },
      { allowSignalWrites: true },
    );

    // Only updates geo fields — preserves name, phone, houseAndStreet typed by user.
    // Only applies non-empty values so we never overwrite a good initial value with an empty string.
    effect(
      () => {
        const patch = this.locationPatch();
        if (!patch) return;
        if (patch.pincode) this.pincode.set(patch.pincode);
        if (patch.town) this.town.set(patch.town);
        if (patch.state) this.state.set(patch.state);
        if (patch.landmark) this.landmark.set(patch.landmark);
        if (patch.lat != null) this.lat.set(patch.lat);
        if (patch.lng != null) this.lng.set(patch.lng);
      },
      { allowSignalWrites: true },
    );
  }

  toggleApartmentSection(): void {
    this.showApartmentSection.set(!this.showApartmentSection());
  }

  onApartmentQueryInput(value: string): void {
    this.apartmentQuery.set(value);
  }

  selectSociety(society: NearbySociety): void {
    this.addressMode.set('society');
    this.selectedSocietyId.set(society.id);
    this.selectedSocietyName.set(society.name);
    this.selectedTowerId.set(null);
    this.towerNameOther.set('');
    this.apartmentQuery.set('');
    // The society is the authoritative source for these once chosen — overrides
    // whatever the map-pin geocode guessed. Backend re-derives them the same way,
    // so this is purely for an immediate, correct-looking preview.
    this.pincode.set(society.pincode);
    this.town.set(society.town);
    this.state.set(society.state);
    // No societySelected emit here — towers are already bundled into `society`
    // (see effectiveTowers), so there's nothing for the parent to fetch. The
    // emit still happens for edit mode (see the initialData effect above),
    // where there's no nearby-list context to pull bundled towers from.
  }

  clearSociety(): void {
    this.addressMode.set('manual');
    this.selectedSocietyId.set(null);
    this.selectedSocietyName.set(null);
    this.selectedTowerId.set(null);
    this.towerNameOther.set('');
    this.flatNumber.set('');
    // Restore whatever the map-pin geocode had before the society overrode it.
    const patch = this.locationPatch();
    this.pincode.set(patch?.pincode ?? '');
    this.town.set(patch?.town ?? '');
    this.state.set(patch?.state ?? '');
    this.societySelected.emit(null);
  }

  onTowerSelectChange(towerId: string): void {
    this.selectedTowerId.set(towerId || null);
    if (towerId) this.towerNameOther.set('');
  }

  onSubmit(): void {
    if (!this.isValid()) return;

    const isSociety = this.isSocietyMode();
    this.submitted.emit({
      name: this.name().trim(),
      phone: this.phone().trim(),
      houseAndStreet: isSociety
        ? this.composedHouseAndStreet()
        : this.houseAndStreet().trim(),
      landmark: this.landmark().trim(),
      pincode: this.pincode().trim(),
      town: this.town().trim(),
      state: this.state().trim(),
      type: this.type(),
      isDefault: this.isDefault(),
      lat: this.lat(),
      lng: this.lng(),
      addressMode: this.addressMode(),
      societyId: isSociety ? this.selectedSocietyId() : null,
      towerId: isSociety ? this.selectedTowerId() : null,
      towerNameOther:
        isSociety && !this.selectedTowerId()
          ? this.towerNameOther().trim() || null
          : null,
      flatNumber: isSociety ? this.flatNumber().trim() : null,
    });
  }
}
