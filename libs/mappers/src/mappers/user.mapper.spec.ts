import { describe, it, expect } from 'vitest';
import { UserMapper } from './user.mapper';
import type { UserDto } from '../dtos/user.dto';

const baseUserDto: UserDto = {
  id: 'u1',
  phone: '9876543210',
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  photoUrl: 'https://cdn.example.com/ravi.jpg',
  addresses: [
    {
      id: 'addr-1',
      name: 'Home',
      phone: '9876543210',
      houseAndStreet: '12 MG Road',
      landmark: 'Near Park',
      pincode: '209722',
      town: 'Etawah',
      state: 'UP',
      type: 'Home',
      isDefault: true,
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

describe('UserMapper.toUser', () => {
  it('maps all scalar fields', () => {
    const user = UserMapper.toUser(baseUserDto);
    expect(user.id).toBe('u1');
    expect(user.phone).toBe('9876543210');
    expect(user.name).toBe('Ravi Kumar');
    expect(user.email).toBe('ravi@example.com');
    expect(user.photoUrl).toBe('https://cdn.example.com/ravi.jpg');
  });

  it('handles null name and email', () => {
    const user = UserMapper.toUser({ ...baseUserDto, name: null, email: null });
    expect(user.name).toBeNull();
    expect(user.email).toBeNull();
  });

  it('maps nested addresses', () => {
    const user = UserMapper.toUser(baseUserDto);
    expect(user.addresses).toHaveLength(1);
    expect(user.addresses?.[0].id).toBe('addr-1');
  });

  it('maps empty addresses array', () => {
    const user = UserMapper.toUser({ ...baseUserDto, addresses: [] });
    expect(user.addresses).toHaveLength(0);
  });
});

describe('UserMapper.toAddress', () => {
  it('maps all address fields', () => {
    const addr = UserMapper.toAddress(baseUserDto.addresses[0]);
    expect(addr.id).toBe('addr-1');
    expect(addr.houseAndStreet).toBe('12 MG Road');
    expect(addr.town).toBe('Etawah');
    expect(addr.type).toBe('Home');
    expect(addr.isDefault).toBe(true);
  });
});

describe('UserMapper.fromAddress', () => {
  it('produces a CreateAddressRequest without id', () => {
    const mapped = UserMapper.toAddress(baseUserDto.addresses[0]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...addressWithoutId } = mapped;
    const req = UserMapper.fromAddress(addressWithoutId);
    expect(req.houseAndStreet).toBe('12 MG Road');
    expect(req.town).toBe('Etawah');
    expect('id' in req).toBe(false);
  });
});
