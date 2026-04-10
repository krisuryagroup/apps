export interface SearchTermRecord {
  searchTerm: string;
  resultsCount: number;
  timestamp: string;
  date: string;
  deviceId?: string;
  deviceType?: string;
}

export interface AppVersionUsageDoc {
  userPhone: string;
  lastAppVersion: string;
  lastDeviceId: string;
  lastDeviceType: string;
  lastUsedDate: string;
  lastUpdated: string;
  createdAt?: string;
  totalDevices: number;
  history: Array<{
    appVersion: string;
    date: string;
    deviceId: string;
    deviceType: string;
    loggedAt: string;
    timestamp: string;
  }>;
  searchedTerms: SearchTermRecord[];
}
