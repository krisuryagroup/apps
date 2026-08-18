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
  coordinatesLat?: number | null;
  coordinatesLng?: number | null;
  // Defaults to "manual" server-side when omitted — see AddressMode in @zitro/models.
  addressMode?: 'manual' | 'society';
  societyId?: string | null;
  towerId?: string | null;
  towerNameOther?: string | null;
  flatNumber?: string | null;
}

// Outbound shape for PUT /api/users/addresses/{id}
export interface UpdateAddressRequest extends CreateAddressRequest {
  id: string;
}
