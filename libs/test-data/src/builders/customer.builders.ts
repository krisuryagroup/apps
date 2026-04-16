import type { User } from '@zitro/models';
import { AddressBuilders } from './address.builders';

export const UserBuilders = {
  aaravSharma: (): User => ({
    id: 'usr-001',
    phone: '9876543210',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    photoUrl: null,
    addresses: [AddressBuilders.homeEtawah(), AddressBuilders.officeEtawah()],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-03-20T14:22:00Z',
  }),

  priyaSingh: (): User => ({
    id: 'usr-002',
    phone: '8765432109',
    name: 'Priya Singh',
    email: 'priya.singh@gmail.com',
    photoUrl: null,
    addresses: [AddressBuilders.homeAuraiya()],
    createdAt: '2024-02-10T08:15:00Z',
    updatedAt: '2024-04-01T09:45:00Z',
  }),

  rahulGupta: (): User => ({
    id: 'usr-003',
    phone: '7654321098',
    name: 'Rahul Gupta',
    email: null,
    photoUrl: null,
    addresses: [],
    createdAt: '2024-03-05T16:00:00Z',
    updatedAt: '2024-03-05T16:00:00Z',
  }),

  guestUser: (): User => ({
    id: 'guest-001',
    phone: '0000000000',
    name: null,
    email: null,
    photoUrl: null,
    addresses: [],
  }),
};
