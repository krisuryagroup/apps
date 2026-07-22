export interface BannerConfigs {
  /** Override color for all header text, icons, location label and open/close time.
   *  Accepts any CSS color string e.g. '#ffffff', 'white', 'rgba(0,0,0,0.8)'.
   *  When absent the header uses its default SCSS color (white on transparent). */
  headerTextColor?: string;

  /** When true the restaurant OPEN/CLOSED badge and hours are hidden.
   *  Defaults to true (hidden) when this field is absent. */
  disableRestaurantStatus?: boolean;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageURL: string;
  displayOrder: number;
  bannerType: string;
  targetUrl?: string;
  /** Version-based display filtering (lt/gt/eq) */
  versionCondition?: 'lt' | 'gt' | 'eq';
  versionTarget?: string;
  startDate?: Date;
  endDate?: Date;
  impressionCount: number;
  clickCount: number;
  scratchRewardType?: string;
  scratchRewardValue?: number;
  linkedCouponId?: string;
  /** Per-banner header appearance overrides — not returned by API, set locally if needed */
  configs?: BannerConfigs;
}
