import type { ApiCart, ApiCartItem, CheckoutSummary } from '@zitro/models';
import type { CartDto, CartItemDto, CheckoutSummaryDto } from '../dtos/cart.dto';

export const CartMapper = {
  toCart(dto: CartDto): ApiCart {
    return {
      id: dto.id,
      userId: dto.userId,
      businessId: dto.businessId,
      businessSlug: dto.businessSlug,
      businessName: dto.businessName,
      status: dto.status as ApiCart['status'],
      couponCode: dto.couponCode,
      couponDiscountPreview: dto.couponDiscountPreview,
      estimatedTotal: dto.estimatedTotal,
      items: dto.items.map(CartMapper.toCartItem),
    };
  },

  toCartItem(dto: CartItemDto): ApiCartItem {
    return {
      id: dto.id,
      productId: dto.productId,
      productName: dto.productName,
      imageUrl: dto.imageUrl,
      variationId: dto.variationId,
      variationLabel: dto.variationLabel,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      currentPrice: dto.currentPrice,
      priceChanged: dto.priceChanged,
      lineTotal: dto.lineTotal,
    };
  },

  toCheckoutSummary(dto: CheckoutSummaryDto): CheckoutSummary {
    return {
      cartId: dto.cartId,
      items: dto.items.map(CartMapper.toCartItem),
      unavailableItems: dto.unavailableItems.map(u => ({
        productId: u.productId,
        productName: u.productName,
        reason: u.reason,
      })),
      subtotal: dto.subtotal,
      canProceed: dto.canProceed,
    };
  },
};
