import type { CartItem } from '@zitro/models';
import { CatalogBuilders } from './catalog.builders';

export interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

function toCartItem(product: ReturnType<typeof CatalogBuilders.paneerButterMasala>, qty = 1): CartItem {
  return { ...product, qty };
}

export const CartBuilders = {
  emptyCart: (): CartState => ({
    items: [],
    totalItems: 0,
    totalPrice: 0,
  }),

  singleItemCart: (): CartState => {
    const item = toCartItem(CatalogBuilders.paneerButterMasala(), 1);
    return {
      items: [item],
      totalItems: 1,
      totalPrice: item.price,
    };
  },

  multiItemCart: (): CartState => {
    const paneer = toCartItem(CatalogBuilders.paneerButterMasala(), 2);
    const dal = toCartItem(CatalogBuilders.dalMakhani(), 1);
    return {
      items: [paneer, dal],
      totalItems: 3,
      totalPrice: paneer.price * 2 + dal.price,
    };
  },

  pizzaCart: (): CartState => {
    const pizza = toCartItem(CatalogBuilders.margheritaPizza(), 1);
    const burger = toCartItem(CatalogBuilders.efcBurger(), 2);
    return {
      items: [pizza, burger],
      totalItems: 3,
      totalPrice: pizza.price + burger.price * 2,
    };
  },
};
