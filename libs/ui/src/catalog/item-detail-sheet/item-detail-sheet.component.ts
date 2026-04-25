import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';
import { Product, ProductVariation } from '@zitro/models';
import { BottomSheetComponent, BottomSheetConfig } from '../../common/bottom-sheet/bottom-sheet.component';
import { CachedImageDirective } from '../../directives/cached-image.directive';

export interface ItemDetailSheetConfig {
  showDescription: boolean;
}
export const ITEM_DETAIL_SHEET_DEFAULT_CONFIG: ItemDetailSheetConfig = {
  showDescription: true,
};

@Component({
  selector: 'lib-item-detail-sheet',
  standalone: true,
  imports: [I18nPipe, BottomSheetComponent, CachedImageDirective],
  templateUrl: './item-detail-sheet.component.html',
  styleUrl: './item-detail-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemDetailSheetComponent {
  config = input<ItemDetailSheetConfig>(ITEM_DETAIL_SHEET_DEFAULT_CONFIG);
  product = input<Product | null>(null);
  isOpen = input<boolean>(false);
  quantity = input<number>(0);
  editMode = input<boolean>(false);
  actionLabelKey = input<string>('listing.addToCart');

  closed = output<void>();
  addToCart = output<{ product: Product; variation: ProductVariation | null }>();
  increment = output<Product>();
  decrement = output<Product>();

  selectedVariationId = signal<string>('');

  sheetConfig = computed<BottomSheetConfig>(() => ({
    title: this.product()?.name ?? '',
    showHandle: true,
    closeOnBackdropClick: true,
  }));

  selectedVariation = computed<ProductVariation | null>(() => {
    const p = this.product();
    const id = this.selectedVariationId();
    if (!p?.hasVariations || !p.variations || !id) return null;
    return p.variations.find(v => v.id === id) ?? null;
  });

  effectivePrice = computed<number>(() => {
    const v = this.selectedVariation();
    return v ? v.price : (this.product()?.price ?? 0);
  });

  constructor() {
    effect(() => {
      const product = this.product();
      if (!product?.hasVariations || !product.variations?.length) {
        this.selectedVariationId.set('');
        return;
      }

      const selectedId = product.selectedVariationId;
      const nextId =
        product.variations.find(v => v.id === selectedId)?.id ??
        product.variations.find(v => v.isDefault && v.isEnabled !== false)?.id ??
        product.variations.find(v => v.isEnabled !== false)?.id ??
        '';

      this.selectedVariationId.set(nextId);
    });
  }

  onVariationSelect(id: string): void {
    this.selectedVariationId.set(id);
  }

  onAdd(): void {
    const p = this.product();
    if (!p) return;
    this.addToCart.emit({ product: p, variation: this.selectedVariation() });
  }
}
