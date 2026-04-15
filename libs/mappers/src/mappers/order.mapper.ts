import type { Order, OrderCharges, OrderItem, OrderStatusTimeline, CartItem } from '@zitro/models';
import type { OrderDto, OrderChargesDto, OrderItemDto, OrderStatusEventDto, AddressDto } from '../dtos/order.dto';
import type { CreateOrderRequest, CreateOrderItemRequest } from '../requests/order.request';

export const OrderMapper = {
  toOrder(dto: OrderDto): Order {
    return {
      id: dto.id,
      orderId: dto.displayId,
      userId: dto.userId,
      userPhone: '',        // not returned by API — populated by auth context if needed
      restaurantId: dto.businessId,
      orderType: dto.orderType,
      status: dto.status as Order['status'],
      items: dto.items.map(OrderMapper.toOrderItem),
      subtotal: dto.charges.subtotal,
      deliveryCharge: dto.charges.deliveryCharge,
      couponDiscount: dto.charges.couponDiscount || undefined,
      couponCode: dto.appliedCouponCode ?? undefined,
      total: dto.charges.total,
      paymentMethod: dto.paymentMethod,
      tableNumber: dto.tableNumber ?? undefined,
      numberOfGuests: dto.numberOfGuests ?? undefined,
      customerNotes: dto.customerNotes ?? undefined,
      deliveryAddress: dto.deliveryAddress
        ? OrderMapper.toDeliveryAddress(dto.deliveryAddress)
        : undefined,
      statusTimeline: dto.statusTimeline.map(OrderMapper.toStatusTimeline),
      estimatedDeliveryTime: dto.estimatedDeliveryMinutes
        ? new Date(Date.now() + dto.estimatedDeliveryMinutes * 60 * 1000)
        : undefined,
      charges: OrderMapper.toCharges(dto.charges),
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  },

  toOrderItem(dto: OrderItemDto): OrderItem {
    return {
      id: dto.productId,
      name: dto.productName,
      price: dto.effectivePrice,
      qty: dto.quantity,
      imageUrl: dto.imageUrl ?? undefined,
      selectedVariationId: dto.variationId ?? undefined,
      selectedVariationLabel: dto.variationName ?? undefined,
      selectedVariationPrice: dto.priceModifier !== 0 ? dto.priceModifier : undefined,
    };
  },

  toCharges(dto: OrderChargesDto): OrderCharges {
    return {
      packagingCharge: dto.packagingCharge,
      platformFee: dto.platformFee,
      gst: dto.gst,
      deliveryCharge: dto.deliveryCharge || undefined,
      couponDiscount: dto.couponDiscount || undefined,
    };
  },

  toStatusTimeline(dto: OrderStatusEventDto): OrderStatusTimeline {
    return {
      status: dto.status as OrderStatusTimeline['status'],
      timestamp: new Date(dto.timestamp),
      note: dto.note ?? undefined,
    };
  },

  toDeliveryAddress(dto: AddressDto): Order['deliveryAddress'] {
    return {
      name: dto.name,
      phone: dto.phone,
      street: dto.houseAndStreet,
      city: dto.town,
      state: dto.state,
      pincode: dto.pincode,
      landmark: dto.landmark || undefined,
      type: dto.type,
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
    }
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
};
