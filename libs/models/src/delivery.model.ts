export type DeliveryStatus =
  | 'assigned'
  | 'picked_up'
  | 'en_route'
  | 'delivered'
  | 'failed';

export interface DeliveryLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string | null;
}

export interface DeliveryTracking {
  orderId: string;
  status: DeliveryStatus;
  partner?: DeliveryPartner | null;
  currentLocation?: DeliveryLocation | null;
  estimatedArrivalMinutes?: number | null;
}
