export interface OrderTypeConfig {
  enabled: boolean;
  displayName: string;
  icon: string;
  description?: string;
}

export interface DineInConfig {
  enabled: boolean;
  showDetails: boolean; // Show/hide table number and guests
  tables: TableConfig[];
  defaultGuests: number;
  minGuests: number;
  maxGuests: number;
}

export interface TableConfig {
  id: string;
  number: string;
  displayName: string;
  capacity?: number;
  isAvailable: boolean;
}

export interface TakeoutConfig {
  enabled: boolean;
  showScheduledPickup: boolean; // Currently false, for future use
  defaultPickupTime?: number; // In minutes
  pickupMessage: string; // Message shown to customers about pickup time
}

export interface DeliveryConfig {
  enabled: boolean;
  showAddressSelection: boolean;
}

export interface OrderTypeMessages {
  dineIn: {
    success: string;
    error: string;
    tableRequired: string;
    guestsRequired: string;
    tableUnavailable: string;
  };
  takeout: {
    success: string;
    error: string;
    pickupTimeRequired: string;
    pickupMessage: string;
  };
  delivery: {
    success: string;
    error: string;
    addressRequired: string;
    outOfRange: string;
  };
  general: {
    orderTypeRequired: string;
    orderPlaced: string;
    orderFailed: string;
    orderCancelled: string;
    orderConfirmed: string;
  };
}

export interface OrderConfiguration {
  restaurantId: string;
  orderTypes: {
    dineIn: OrderTypeConfig;
    takeout: OrderTypeConfig;
    delivery: OrderTypeConfig;
  };
  dineInConfig: DineInConfig;
  takeoutConfig: TakeoutConfig;
  deliveryConfig: DeliveryConfig;
  messages: OrderTypeMessages;
  defaultOrderType?: 'dine-in' | 'takeout' | 'delivery'; // Fallback if all disabled
  updatedAt: Date;
}
