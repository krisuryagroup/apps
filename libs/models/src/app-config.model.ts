// Runtime configuration returned by the .NET API.
// Replaces Firebase-based appSettings fetch for version checking.

export interface AppConfig {
  currentVersion: string;
  minimumVersion: string;
  isUpdateMandatory: boolean;
  updateMessage: string;
  mandatoryUpdateMessage: string;
  playStoreUrl: string;
  appStoreUrl?: string;
}
