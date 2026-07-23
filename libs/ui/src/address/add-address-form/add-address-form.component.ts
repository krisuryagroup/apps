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
import { Address, AddressFormData } from '@zitro/models';

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

  submitted = output<AddressFormData>();
  cancelled = output<void>();

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

  pincodeError = computed(
    () => this.pincode().length > 0 && !/^\d{6}$/.test(this.pincode()),
  );

  isValid = computed(
    () =>
      !this.pincodeRestricted() &&
      this.name().trim().length > 0 &&
      this.phone().trim().length > 0 &&
      this.houseAndStreet().trim().length > 0 &&
      /^\d{6}$/.test(this.pincode()) &&
      this.town().trim().length > 0 &&
      this.state().trim().length > 0,
  );

  readonly addressTypes: Array<'Home' | 'Office' | 'Other'> = [
    'Home',
    'Office',
    'Other',
  ];

  constructor() {
    effect(
      () => {
        const data = this.initialData();
        if (data) {
          this.name.set(data.name ?? '');
          this.phone.set(data.phone ?? '');
          this.houseAndStreet.set(data.houseAndStreet ?? '');
          this.landmark.set(data.landmark ?? '');
          this.pincode.set(data.pincode ?? '');
          this.town.set(data.town ?? '');
          this.state.set(data.state ?? '');
          this.type.set(data.type ?? 'Home');
          this.isDefault.set(data.isDefault ?? false);
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

  onSubmit(): void {
    if (!this.isValid()) return;
    this.submitted.emit({
      name: this.name().trim(),
      phone: this.phone().trim(),
      houseAndStreet: this.houseAndStreet().trim(),
      landmark: this.landmark().trim(),
      pincode: this.pincode().trim(),
      town: this.town().trim(),
      state: this.state().trim(),
      type: this.type(),
      isDefault: this.isDefault(),
      lat: this.lat(),
      lng: this.lng(),
    });
  }
}
