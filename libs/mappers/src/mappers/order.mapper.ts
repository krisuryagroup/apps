import type {
  Order,
  OrderItem,
  OrderStatusTimeline,
  OrderCharges,
  CartItem,
} from '@zitro/models';
import type {
  OrderDto,
  OrderItemDto,
  OrderTimelineDto,
  OrderListSummaryDto,
} from '../dtos/order.dto';
import type {
  CreateOrderRequest,
  CreateOrderItemRequest,
} from '../requests/order.request';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCharges(chargesJson: string | null): OrderCharges | undefined {
  if (!chargesJson) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = JSON.parse(chargesJson);
    const packagingCharge: number = raw.packagingCharges?.applied ?? 0;
    const platformFee: number = raw.platformFee?.applied ?? 0;
    const gst: number = raw.gst?.applied ?? 0;
    const deliveryCharge: number = raw.deliveryCharge?.applied ?? 0;
    const deliveryChargeCalculated: number =
      raw.deliveryCharge?.calculated ?? deliveryCharge;
    const couponDiscount: number = raw.couponDiscount?.amount ?? 0;
    const packagingWaived: number = raw.packagingCharges?.waived ?? 0;
    const platformWaived: number = raw.platformFee?.waived ?? 0;
    const deliveryWaived: number = raw.deliveryCharge?.waived ?? 0;
    const totalSavings =
      packagingWaived + platformWaived + deliveryWaived + couponDiscount;
    return {
      packagingCharge,
      platformFee,
      gst,
      deliveryCharge: deliveryCharge > 0 ? deliveryCharge : undefined,
      deliveryChargeCalculated:
        deliveryChargeCalculated > 0 ? deliveryChargeCalculated : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      totalSavings: totalSavings > 0 ? totalSavings : undefined,
    };
  } catch {
    return undefined;
  }
}

export const OrderMapper = {
  toOrder(dto: OrderDto): Order {
    const hasDeliveryAddress = !!dto.deliveryAddressHouseAndStreet;
    return {
      id: dto.id,
      orderId: dto.orderId,
      userId: dto.userId,
      userPhone: '',
      restaurantId: dto.businessId,
      businessSlug: dto.businessSlug ?? undefined,
      businessName: dto.businessName ?? undefined,
      businessAddress: dto.businessAddress ?? undefined,
      businessPhone: dto.businessPhone ?? undefined,
      businessAlternatePhone: dto.businessAlternatePhone ?? undefined,
      businessFssaiLicenseNumber: dto.businessFssaiLicenseNumber ?? undefined,
      orderType: dto.orderType,
      status: dto.status as Order['status'],
      items: dto.items.map(OrderMapper.toOrderItem),
      subtotal: dto.subtotal,
      deliveryCharge: dto.deliveryCharge,
      couponDiscount: dto.couponDiscount ?? undefined,
      couponCode: dto.couponCode ?? undefined,
      total: dto.total,
      paymentMethod: dto.paymentMethod,
      tableNumber: dto.tableNumber ?? undefined,
      numberOfGuests: dto.numberOfGuests ?? undefined,
      customerNotes: dto.customerNotes ?? undefined,
      tax: dto.tax ?? undefined,
      deliveryAddress: hasDeliveryAddress
        ? {
            name: dto.deliveryAddressName ?? '',
            phone: dto.deliveryAddressPhone ?? '',
            street: dto.deliveryAddressHouseAndStreet ?? '',
            city: dto.deliveryAddressTown ?? '',
            state: dto.deliveryAddressState ?? '',
            pincode: dto.deliveryAddressPincode ?? '',
            landmark: dto.deliveryAddressLandmark ?? undefined,
            type: 'Home',
          }
        : undefined,
      charges: parseCharges(dto.charges),
      statusTimeline:
        dto.statusTimeline?.map(OrderMapper.toStatusTimeline) ?? [],
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  },

  toOrderItem(dto: OrderItemDto): OrderItem {
    return {
      id: dto.productId ?? dto.id,
      name: dto.name,
      price: dto.price,
      qty: dto.qty,
      imageUrl: dto.imageUrl ?? undefined,
      isOfferDisabled: dto.isOfferDisabled ?? undefined,
      selectedVariationId: dto.selectedVariationId ?? undefined,
      selectedVariationPrice: dto.selectedVariationPrice ?? undefined,
    };
  },

  toStatusTimeline(dto: OrderTimelineDto): OrderStatusTimeline {
    return {
      status: dto.status as OrderStatusTimeline['status'],
      timestamp: new Date(dto.timestamp),
      note: dto.note ?? undefined,
    };
  },

  /** Model → Request: builds CreateOrderRequest from cart state. */
  fromCart(
    cart: { items: CartItem[]; businessId: string },
    options: {
      orderType: Order['orderType'];
      paymentMethod: Order['paymentMethod'];
      deliveryAddressId: string | null;
      tableNumber: string | null;
      numberOfGuests: number | null;
      couponCode: string | null;
      customerNotes: string | null;
    },
  ): CreateOrderRequest {
    return {
      businessId: cart.businessId,
      orderType: options.orderType,
      paymentMethod: options.paymentMethod,
      deliveryAddressId: options.deliveryAddressId,
      tableNumber: options.tableNumber,
      numberOfGuests: options.numberOfGuests,
      couponCode: options.couponCode,
      customerNotes: options.customerNotes,
      items: cart.items.map(OrderMapper.fromCartItem),
    };
  },

  fromCartItem(item: CartItem): CreateOrderItemRequest {
    return {
      productId: item.id,
      variationId: item.selectedVariationId ?? null,
      quantity: item.qty,
      specialInstructions: null,
    };
  },

  toOrderList(dtos: OrderDto[]): Order[] {
    return dtos.map(OrderMapper.toOrder);
  },

  toOrderFromSummary(dto: OrderListSummaryDto): Order {
    return {
      id: dto.id,
      orderId: dto.orderId,
      restaurantId: dto.businessId,
      businessSlug: dto.businessSlug,
      businessName: dto.businessName,
      businessAddress: dto.businessAddress,
      userId: '',
      userPhone: '',
      orderType: dto.orderType,
      status: dto.status as Order['status'],
      items: [],
      subtotal: 0,
      deliveryCharge: 0,
      couponDiscount: dto.couponDiscount || undefined,
      couponCode: dto.couponCode ?? undefined,
      total: dto.total,
      paymentMethod: 'cash',
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.createdAt),
    };
  },

  toOrderListFromSummary(dtos: OrderListSummaryDto[]): Order[] {
    return dtos.map(OrderMapper.toOrderFromSummary);
  },
};
