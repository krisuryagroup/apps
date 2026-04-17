import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

export interface StarRatingConfig {
  maxStars: number;
  readonly: boolean;
  size: 'sm' | 'md' | 'lg';
}
export const STAR_RATING_DEFAULT_CONFIG: StarRatingConfig = {
  maxStars: 5,
  readonly: false,
  size: 'md',
};

@Component({
  selector: 'lib-star-rating',
  standalone: true,
  imports: [],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  config = input<StarRatingConfig>(STAR_RATING_DEFAULT_CONFIG);
  value = input<number>(0);

  ratingChange = output<number>();

  hovered = signal(0);

  stars = computed(() =>
    Array.from({ length: this.config().maxStars }, (_, i) => i + 1)
  );

  onSelect(star: number): void {
    if (!this.config().readonly) this.ratingChange.emit(star);
  }

  onHover(star: number): void {
    if (!this.config().readonly) this.hovered.set(star);
  }

  onLeave(): void {
    this.hovered.set(0);
  }

  isActive(star: number): boolean {
    return star <= (this.hovered() || this.value());
  }
}
