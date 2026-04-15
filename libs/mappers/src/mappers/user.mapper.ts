import type { User, Address } from '@zitro/models';
import type { UserDto, AddressDto } from '../dtos/user.dto';
import type { CreateAddressRequest, UpdateAddressRequest } from '../requests/address.request';

export const UserMapper = {
  toUser(dto: UserDto): User {
    return {
      id: dto.id,
      phone: dto.phone,
      name: dto.name,
      email: dto.email,
      photoUrl: dto.photoUrl,
      addresses: dto.addresses.map(UserMapper.toAddress),
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
    };
  },

  /** Model → Request: used when creating a new address. */
  fromAddress(address: Omit<Address, 'id'>): CreateAddressRequest {
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
    };
  },

  fromAddressWithId(address: Address): UpdateAddressRequest {
    return {
      id: address.id,
      ...UserMapper.fromAddress(address),
    };
  },
};
