/**
 * "manual" = free-text houseAndStreet (the original flow).
 * "society" = built from a prefilled apartment/society + tower + flat number.
 * Fixed at creation — never changes via edit (see AddAddressFormComponent).
 */
export type AddressMode = 'manual' | 'society';

export interface Address {
  id: string;
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  lat?: number | null;
  lng?: number | null;
  created_at?: string;
  updated_at?: string;
  addressMode?: AddressMode;
  societyId?: string | null;
  societyName?: string | null;
  towerId?: string | null;
  towerName?: string | null;
  flatNumber?: string | null;
}

export interface AddressFormData {
  name: string;
  phone: string;
  houseAndStreet: string;
  landmark: string;
  pincode: string;
  town: string;
  state: string;
  type: 'Home' | 'Office' | 'Other';
  isDefault: boolean;
  lat?: number | null;
  lng?: number | null;
  addressMode?: AddressMode;
  societyId?: string | null;
  societyName?: string | null;
  towerId?: string | null;
  towerNameOther?: string | null;
  flatNumber?: string | null;
}
