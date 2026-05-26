import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import type { ApiCart } from '@zitro/models';

const AUTO_SLIDE_INTERVAL_MS = 3000;

@Component({
  selector: 'lib-floating-cart-preview',
  standalone: true,
  imports: [DecimalPipe, I18nPipe],
  templateUrl: './floating-cart-preview.component.html',
  styleUrl: './floating-cart-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingCartPreviewComponent implements OnInit, OnDestroy {
  carts = input.required<ApiCart[]>();
  viewCart = output<string>(); // emits businessSlug

  readonly currentIndex = signal(0);
  readonly isVisible = computed(() => this.carts().length > 0);
  readonly hasMultiple = computed(() => this.carts().length > 1);

  private autoSlideTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  prev(): void {
    this.stopAutoSlide();
    this.currentIndex.update(i => (i === 0 ? this.carts().length - 1 : i - 1));
    this.startAutoSlide();
  }

  next(): void {
    this.stopAutoSlide();
    this.currentIndex.update(i => (i + 1) % this.carts().length);
    this.startAutoSlide();
  }

  goTo(index: number): void {
    this.stopAutoSlide();
    this.currentIndex.set(index);
    this.startAutoSlide();
  }

  onViewCart(slug: string): void {
    this.viewCart.emit(slug);
  }

  itemCount(cart: ApiCart): number {
    return cart.items.reduce((s, i) => s + i.quantity, 0);
  }

  private startAutoSlide(): void {
    if (!this.hasMultiple()) return;
    this.autoSlideTimer = setInterval(() => {
      this.currentIndex.update(i => (i + 1) % this.carts().length);
    }, AUTO_SLIDE_INTERVAL_MS);
  }

  private stopAutoSlide(): void {
    if (this.autoSlideTimer !== null) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }
}
