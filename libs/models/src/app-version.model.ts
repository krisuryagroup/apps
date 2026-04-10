/**
 * App Version Configuration Model
 * Stored in Firebase: appSettings/restaurantDetails/onlineorders/appSettings
 */
export interface AppVersionConfig {
  enableVersionCheck: boolean;    // Master switch to enable/disable version checking
  currentVersion: string;         // Latest version available in stores
  minimumVersion: string;         // Minimum required version to use the app
  isUpdateMandatory: boolean;     // Force update for versions below minimum
  forceUpdateBelow?: string;      // Optional: force update for any version below this
  updateMessage: string;          // Message shown for optional updates
  mandatoryUpdateMessage: string; // Message shown for mandatory updates
  playStoreUrl: string;          // Android Play Store link
  appStoreUrl?: string;          // iOS App Store link (future use)
  updateButtonText: string;      // Text for update button
  laterButtonText: string;       // Text for later button (optional updates only)
  lastUpdated: string;           // Timestamp of last config update
}

/**
 * Result of version check operation
 */
export interface VersionCheckResult {
  needsUpdate: boolean;   // Whether an update is available
  isMandatory: boolean;   // Whether the update is mandatory
  message: string;        // Message to display to user
  storeUrl: string;       // URL to open for update
}

/**
 * App info from Capacitor
 */
export interface AppInfo {
  name: string;
  id: string;
  build: string;
  version: string;
}
