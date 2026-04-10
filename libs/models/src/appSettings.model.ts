export interface Checkout {
    closeTime: string; // e.g. "23:59"
    deliveryFee: number; // e.g. 40
    openTime: string; // e.g. "00:01"
    orderCancellationTimeLimit: number; // e.g. 90 (seconds)
    packagingChargesPerItem: number;
    orderCancellationMessages?: OrderCancellationMessages;
    orderCancellationConfig?: OrderCancellationConfig;
}

export interface OrderCancellationMessages {
    canCancelWithin: string;
    noChargesMessage: string;
    confirmationPrompt: string;
    successMessage: string;
    timeExpiredMessage: string;
    refundInfo: string[];
    policyNotice?: string; // Full policy notice displayed during order placement
}

export interface OrderCancellationConfig {
    enabled: boolean;
    showCountdown: boolean;
    allowedStatuses: string[]; // ['pending', 'confirmed']
}

export const defaultCheckout: Checkout = {
  closeTime: "23:59",
  deliveryFee: 40,
  openTime: "00:01",
  orderCancellationTimeLimit: 90,
  packagingChargesPerItem: 0,
  orderCancellationMessages: {
    canCancelWithin: 'Order can be cancelled within {time}',
    noChargesMessage: 'No charges will be applied for cancellation within this time frame',
    confirmationPrompt: 'Are you sure you want to cancel this order?',
    successMessage: 'Your order has been cancelled successfully',
    timeExpiredMessage: 'The cancellation window has expired. Please contact restaurant for assistance.',
    refundInfo: [
      'Orders can only be cancelled within {time} of placing',
      'Your refund will be processed if payment was made online',
      'This action cannot be undone'
    ],
    policyNotice: 'Order can be cancelled within {time} of order placement without any charges. If you face any issue contact restaurant, check contact us page for contact details.'
  },
  orderCancellationConfig: {
    enabled: true,
    showCountdown: true,
    allowedStatuses: ['pending', 'confirmed']
  }
};
