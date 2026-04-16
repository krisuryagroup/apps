import type { UserDto } from '@zitro/mappers';
import { AddressDtoFactory } from './address-dto.factory';

const BASE: UserDto = {
  id: 'usr-001',
  phone: '9876543210',
  name: 'Aarav Sharma',
  email: 'aarav.sharma@gmail.com',
  photoUrl: null,
  addresses: [AddressDtoFactory.build()],
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-03-20T14:22:00Z',
};

export const UserDtoFactory = {
  build: (overrides: Partial<UserDto> = {}): UserDto => ({
    ...BASE,
    ...overrides,
  }),

  buildWithNoAddresses: (overrides: Partial<UserDto> = {}): UserDto =>
    UserDtoFactory.build({ addresses: [], ...overrides }),

  buildGuest: (overrides: Partial<UserDto> = {}): UserDto =>
    UserDtoFactory.build({
      id: 'guest-001',
      phone: '0000000000',
      name: null,
      email: null,
      addresses: [],
      ...overrides,
    }),
};
