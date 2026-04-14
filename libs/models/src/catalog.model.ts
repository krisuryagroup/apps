// Re-exports Product and ProductVariation from product.model; adds Category.
export type { Product, ProductVariation, CartItem, CartItemDisplay } from './product.model';

export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive: boolean;
  productCount?: number;
}

export interface MenuCategory extends Category {
  products: import('./product.model').Product[];
}

export interface BusinessMenu {
  businessSlug: string;
  categories: MenuCategory[];
  fetchedAt: Date;
}
