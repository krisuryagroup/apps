import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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

  select = output<Address>();
  edit = output<Address>();
  delete = output<string>();
}
