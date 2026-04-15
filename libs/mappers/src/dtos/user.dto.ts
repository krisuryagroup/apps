import type { AddressDto } from './order.dto';

export type { AddressDto };

export interface UserDto {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  addresses: AddressDto[];
  createdAt: string;
  updatedAt: string;
}
