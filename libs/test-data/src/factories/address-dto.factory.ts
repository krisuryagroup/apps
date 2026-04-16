import type { AddressDto } from '@zitro/mappers';

const BASE: AddressDto = {
  id: 'addr-001',
  name: 'Aarav Sharma',
  phone: '9876543210',
  houseAndStreet: '12, Civil Lines, Near Collector Office',
  landmark: 'Behind SBI Bank',
  pincode: '206244',
  town: 'Etawah',
  state: 'Uttar Pradesh',
  type: 'Home',
  isDefault: true,
};

export const AddressDtoFactory = {
  build: (overrides: Partial<AddressDto> = {}): AddressDto => ({
    ...BASE,
    ...overrides,
  }),

  buildOffice: (overrides: Partial<AddressDto> = {}): AddressDto =>
    AddressDtoFactory.build({
      id: 'addr-002',
      houseAndStreet: 'Plot 45, Industrial Area, Kanpur Road',
      landmark: 'Near NTPC Gate',
      type: 'Office',
      isDefault: false,
      ...overrides,
    }),
};
