import { Injectable } from '@angular/core';
import { environment } from './environment';

declare const google: any;

/**
 * Loads the Google Maps JavaScript SDK (`google.maps.*`) exactly once per page,
 * regardless of how many components request it. Extracted from what used to be a
 * private, page-local implementation in zitro-customer's AddAddressPage so
 * MapPickerComponent (and any other app — admin, superadmin) can use the same map
 * canvas without re-implementing script loading.
 */
@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (typeof google !== 'undefined' && (google as any).maps) {
      return Promise.resolve();
    }
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.google.mapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
