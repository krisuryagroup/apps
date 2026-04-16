import type { Address } from '@zitro/models';

export const AddressBuilders = {
  homeEtawah: (): Address => ({
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
  }),

  officeEtawah: (): Address => ({
    id: 'addr-002',
    name: 'Aarav Sharma',
    phone: '9876543210',
    houseAndStreet: 'Plot 45, Industrial Area, Kanpur Road',
    landmark: 'Near NTPC Gate',
    pincode: '206244',
    town: 'Etawah',
    state: 'Uttar Pradesh',
    type: 'Office',
    isDefault: false,
  }),

  homeAuraiya: (): Address => ({
    id: 'addr-003',
    name: 'Priya Singh',
    phone: '8765432109',
    houseAndStreet: '8/2, Gandhi Nagar, Main Road',
    landmark: 'Opposite Vishal Mega Mart',
    pincode: '209722',
    town: 'Auraiya',
    state: 'Uttar Pradesh',
    type: 'Home',
    isDefault: true,
  }),

  otherKanpur: (): Address => ({
    id: 'addr-004',
    name: 'Rahul Gupta',
    phone: '7654321098',
    houseAndStreet: '34, Arya Nagar, Sector 2',
    landmark: 'Near Central Mall',
    pincode: '208001',
    town: 'Kanpur',
    state: 'Uttar Pradesh',
    type: 'Other',
    isDefault: false,
  }),
};
