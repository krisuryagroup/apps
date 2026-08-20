import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { Address } from '@zitro/models';

export interface AddressCardConfig {
  showSelectButton: boolean;
  showEditButton: boolean;
  showDeleteButton: boolean;
}
export const ADDRESS_CARD_DEFAULT_CONFIG: AddressCardConfig = {
  showSelectButton: true,
  showEditButton: true,
  showDeleteButton: true,
};

@Component({
  selector: 'lib-address-card',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './address-card.component.html',
  styleUrl: './address-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressCardComponent {
  config = input<AddressCardConfig>(ADDRESS_CARD_DEFAULT_CONFIG);
  address = input.required<Address>();

  addressSelect = output<Address>();
  edit = output<Address>();
  delete = output<string>();

  /** Skips empty segments (landmark is optional) instead of always joining
   * every field with a comma — an empty landmark used to leave a stray
   * ", ," in the rendered address ("Shop 1, , Dibiyapur, UP — 206244"). */
  readonly formattedDetails = computed(() => {
    const a = this.address();
    return [a.houseAndStreet, a.landmark, a.town, a.state]
      .filter((part) => !!part?.trim())
      .join(', ')
      .concat(` — ${a.pincode}`);
  });
}
