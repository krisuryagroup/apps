import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { Address } from '@zitro/models';
import { AddressCardComponent, AddressCardConfig, ADDRESS_CARD_DEFAULT_CONFIG } from '../address-card/address-card.component';

export interface AddressListConfig {
  cardConfig: AddressCardConfig;
  emptyMessageKey: string;
}
export const ADDRESS_LIST_DEFAULT_CONFIG: AddressListConfig = {
  cardConfig: ADDRESS_CARD_DEFAULT_CONFIG,
  emptyMessageKey: 'address.noAddresses',
};

@Component({
  selector: 'lib-address-list',
  standalone: true,
  imports: [I18nPipe, AddressCardComponent],
  templateUrl: './address-list.component.html',
  styleUrl: './address-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressListComponent {
  config = input<AddressListConfig>(ADDRESS_LIST_DEFAULT_CONFIG);
  addresses = input<Address[]>([]);

  select = output<Address>();
  edit = output<Address>();
  delete = output<string>();
}
