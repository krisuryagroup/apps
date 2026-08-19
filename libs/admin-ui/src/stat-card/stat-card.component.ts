import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18nPipe } from '@zitro/i18n';

export interface StatCardConfig {
  /** Optional emoji/icon glyph shown top-left of the card. */
  icon: string | null;
  /** Trend direction relative to a prior period — omit to hide the trend row. */
  trend: 'up' | 'down' | 'neutral' | null;
}

export const STAT_CARD_DEFAULT_CONFIG: StatCardConfig = {
  icon: null,
  trend: null,
};

/** Dashboard metric tile — used by AD-002, RS-004, SA-007. */
@Component({
  selector: 'lib-stat-card',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  config = input<StatCardConfig>(STAT_CARD_DEFAULT_CONFIG);

  /** i18n key for the label under the value — e.g. 'dashboard.todayOrders'. */
  labelKey = input.required<string>();
  value = input.required<string | number>();
  /** Trend value shown next to the arrow, e.g. "+12%" — caller formats it. */
  trendValue = input<string | null>(null);
}
