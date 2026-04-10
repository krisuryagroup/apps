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
  isActive: boolean;
  displayOrder: number;
  targetUrl?: string;
  versionCondition?: 'lt' | 'gt' | 'eq'; // less than, greater than, equal to
  versionTarget?: string; // e.g. '1.2.3'
  startDate?: Date;
  endDate?: Date;
  created_at: Date;
  updated_at: Date;
  /** Per-banner header appearance overrides */
  configs?: BannerConfigs;
}
