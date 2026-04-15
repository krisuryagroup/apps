import type { Address } from './address.model';

export interface User {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  addresses?: Address[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile extends User {
  defaultAddressId?: string;
}
