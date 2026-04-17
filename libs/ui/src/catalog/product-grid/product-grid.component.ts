import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { Product, ProductVariation } from '@zitro/models';
import { CatalogProductCardComponent, ProductCardConfig as CatalogProductCardConfig, PRODUCT_CARD_DEFAULT_CONFIG as CATALOG_PRODUCT_CARD_DEFAULT_CONFIG } from '../product-card/product-card.component';

export interface CatalogProductGridConfig {
  cardConfig: CatalogProductCardConfig;
  columns: 1 | 2 | 3;
  emptyMessageKey: string;
}
export const CATALOG_PRODUCT_GRID_DEFAULT_CONFIG: CatalogProductGridConfig = {
  cardConfig: CATALOG_PRODUCT_CARD_DEFAULT_CONFIG,
  columns: 2,
  emptyMessageKey: 'listing.noResults',
};

@Component({
  selector: 'lib-product-grid',
  standalone: true,
  imports: [I18nPipe, CatalogProductCardComponent],
  templateUrl: './product-grid.component.html',
  styleUrl: './product-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogProductGridComponent {
  config = input<CatalogProductGridConfig>(CATALOG_PRODUCT_GRID_DEFAULT_CONFIG);
  products = input<Product[]>([]);
  quantities = input<Record<string, number>>({});

  addToCart = output<{ product: Product; variation: ProductVariation | null }>();
  viewDetails = output<Product>();
  increment = output<Product>();
  decrement = output<Product>();

  getQuantity(productId: string): number {
    return this.quantities()[productId] ?? 0;
  }
}
