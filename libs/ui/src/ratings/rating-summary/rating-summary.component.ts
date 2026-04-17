import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { I18nPipe } from '@zitro/i18n';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface RatingSummaryData {
  average: number;
  totalCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

@Component({
  selector: 'lib-rating-summary',
  standalone: true,
  imports: [I18nPipe, DecimalPipe, StarRatingComponent],
  templateUrl: './rating-summary.component.html',
  styleUrl: './rating-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingSummaryComponent {
  data = input.required<RatingSummaryData>();

  bars = computed(() =>
    ([5, 4, 3, 2, 1] as const).map(n => ({
      star: n,
      count: this.data().distribution[n] ?? 0,
      pct: this.data().totalCount > 0
        ? ((this.data().distribution[n] ?? 0) / this.data().totalCount) * 100
        : 0,
    }))
  );

  readonly readonlyConfig = { maxStars: 5, readonly: true, size: 'sm' as const };
}
