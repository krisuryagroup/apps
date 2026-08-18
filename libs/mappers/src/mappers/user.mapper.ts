import type { User, Address, AddressFormData } from '@zitro/models';
import type { UserDto, AddressDto } from '../dtos/user.dto';
import type {
  CreateAddressRequest,
  UpdateAddressRequest,
} from '../requests/address.request';

export const UserMapper = {
  toUser(dto: UserDto): User {
    return {
      id: dto.id,
      phone: dto.phone,
      name: dto.name,
      email: dto.email,
      photoUrl: dto.photoUrl,
      addresses: (dto.addresses ?? []).map(UserMapper.toAddress),
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  },

  toAddress(dto: AddressDto): Address {
    return {
      id: dto.id,
      name: dto.name,
      phone: dto.phone,
      houseAndStreet: dto.houseAndStreet,
      landmark: dto.landmark,
      pincode: dto.pincode,
      town: dto.town,
      state: dto.state,
      type: dto.type,
      isDefault: dto.isDefault,
      lat: dto.coordinatesLat ?? null,
      lng: dto.coordinatesLng ?? null,
      addressMode: dto.addressMode ?? 'manual',
      societyId: dto.societyId ?? null,
      societyName: dto.societyName ?? null,
      towerId: dto.towerId ?? null,
      towerName: dto.towerName ?? null,
      flatNumber: dto.flatNumber ?? null,
    };
  },

  /**
   * Model → Request: used when creating/updating an address.
   * `towerNameOther` only exists on AddressFormData (form-only, outbound), never on
   * Address (API response) — accepted here as an optional extra so callers passing
   * either shape both work.
   */
  fromAddress(
    address: Omit<Address, 'id'> &
      Partial<Pick<AddressFormData, 'towerNameOther'>>,
  ): CreateAddressRequest {
    return {
      name: address.name,
      phone: address.phone,
      houseAndStreet: address.houseAndStreet,
      landmark: address.landmark,
      pincode: address.pincode,
      town: address.town,
      state: address.state,
      type: address.type,
      isDefault: address.isDefault,
      coordinatesLat: address.lat ?? null,
      coordinatesLng: address.lng ?? null,
      addressMode: address.addressMode ?? 'manual',
      societyId: address.societyId ?? null,
      towerId: address.towerId ?? null,
      towerNameOther: address.towerNameOther ?? null,
      flatNumber: address.flatNumber ?? null,
    };
  },

  fromAddressWithId(address: Address): UpdateAddressRequest {
    return {
      id: address.id,
      ...UserMapper.fromAddress(address),
    };
  },
};
