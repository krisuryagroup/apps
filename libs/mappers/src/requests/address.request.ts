// Outbound shape for POST /api/users/addresses
export interface CreateAddressRequest {
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
}

// Outbound shape for PUT /api/users/addresses/{id}
export interface UpdateAddressRequest extends CreateAddressRequest {
  id: string;
}
