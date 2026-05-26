import { Capacitor } from '@capacitor/core';
import { environment } from './environment';
import { App } from '@capacitor/app';

export function formatOpenCloseTime(
  openTime: string,
  closeTime: string,
): string {
  function to12Hour(time: string): string {
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return minute === 0
      ? `${hour}${ampm}`
      : `${hour}:${minute.toString().padStart(2, '0')}${ampm}`;
  }
  return `${to12Hour(openTime)} - ${to12Hour(closeTime)}`;
}

export function isRestaurantOpen(openTime = '', closeTime = ''): boolean {
  if (!openTime || !closeTime) return false;
  const now = new Date();
  const [openHour, openMinute] = openTime.split(':').map(Number);
  const [closeHour, closeMinute] = closeTime.split(':').map(Number);

  const open = new Date(now);
  open.setHours(openHour, openMinute, 0, 0);

  const close = new Date(now);
  close.setHours(closeHour, closeMinute, 0, 0);

  return now >= open && now <= close;
}

/**
 * Convert Firebase timestamp or string to Date object
 */
export function convertFirebaseDate(firebaseDate: any): Date {
  if (!firebaseDate) {
    return new Date();
  }

  // If it's a Firestore Timestamp, convert to Date
  if (firebaseDate.toDate && typeof firebaseDate.toDate === 'function') {
    return firebaseDate.toDate();
  }

  // If it's already a Date object
  if (firebaseDate instanceof Date) {
    return firebaseDate;
  }

  // If it's a string or number, create Date from it
  return new Date(firebaseDate);
}

/**
 * Simple token-based matcher.
 * Returns true if every token in `search` appears in `itemName` (any order).
 */
export function matchesSearch(itemName: string, search: string): boolean {
  if (!itemName || !search) return false;

  const normalizeAndSplit = (s: string): string[] => {
    // 1) lower-case
    // 2) insert space between camelCase chunks (WhiteSausePasta -> White Sause Pasta)
    // 3) replace non-alphanumeric chars with space
    // 4) collapse multiple spaces and split into tokens
    const normalized = s
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2') // split camelCase (safe even if already lowercased)
      .replace(/[^a-z0-9]+/g, ' ') // non-alnum -> space
      .trim()
      .replace(/\s+/g, ' '); // collapse spaces

    return normalized.length ? normalized.split(' ') : [];
  };

  const itemTokens = normalizeAndSplit(itemName);
  const searchTokens = normalizeAndSplit(search);

  if (searchTokens.length === 0) return false;

  // every search token must appear as a full token or substring inside any item token
  return searchTokens.every((st) =>
    itemTokens.some((it) => it === st || it.includes(st) || st.includes(it)),
  );
}

export async function getAppVersion(): Promise<string> {
  let appVersion = environment.appVersion; // Fallback from environment

  // Only get app info on native platforms (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const appInfo = await App.getInfo();
      console.log('📱 Native App Info (full object):', appInfo);

      // Try to get version, then build, then fallback
      if (
        appInfo.version &&
        appInfo.version !== '' &&
        appInfo.version !== 'undefined'
      ) {
        appVersion = appInfo.version;
        console.log('✅ Using App.getInfo().version:', appVersion);
      } else if (
        appInfo.build &&
        appInfo.build !== '' &&
        appInfo.build !== 'undefined'
      ) {
        appVersion = appInfo.build;
        console.log('✅ Using App.getInfo().build:', appVersion);
      } else {
        console.warn(
          '⚠️ App.getInfo() returned no valid version or build, using environment fallback',
        );
      }
    } catch (versionError) {
      console.error('❌ Error calling App.getInfo():', versionError);
      console.warn('⚠️ Using environment fallback version:', appVersion);
    }
  } else {
    console.log(
      '🌐 Running in browser, using environment version:',
      appVersion,
    );
  }

  return appVersion;
}

export function compareApplicationVersions(v1: string, v2: string): number {
  const a = v1.split('.').map(Number);
  const b = v2.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
