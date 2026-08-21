import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GoogleMapsLoaderService } from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';

declare const google: any;

export interface MapPickerConfig {
  /** Center before a pin is placed — defaults to Lucknow, matching this app's other
   * map fallbacks (see AddAddressPage). Callers with a better default (e.g. the
   * business's town, or the admin's own location) should pass it. */
  defaultCenter: { lat: number; lng: number };
  zoom: number;
  heightPx: number;
}

export const MAP_PICKER_DEFAULT_CONFIG: MapPickerConfig = {
  defaultCenter: { lat: 26.8467, lng: 80.9462 },
  zoom: 15,
  heightPx: 320,
};

/**
 * A draggable-pin Google Map, shared across apps. Wraps the map-canvas/marker/
 * click-to-drop wiring that used to live only inside zitro-customer's AddAddressPage —
 * this component is deliberately "dumb": it only ever emits raw {lat, lng}, and never
 * calls a geocoding API itself. Reverse-geocoding a dropped pin into an address (town,
 * state, pincode) is the caller's job, via GoogleGeocodingService — keeping that
 * concern out of this component is what makes it reusable for both a customer address
 * picker and an admin business-location picker, which want different fields filled
 * from the same {lat, lng}.
 */
@Component({
  selector: 'lib-map-picker',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './map-picker.component.html',
  styleUrl: './map-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly ngZone = inject(NgZone);

  config = input<MapPickerConfig>(MAP_PICKER_DEFAULT_CONFIG);
  /** Preset pin position — e.g. a business's already-saved coordinates when editing. */
  initialCoordinates = input<{ lat: number; lng: number } | null>(null);

  locationPicked = output<{ lat: number; lng: number }>();
  loadError = output<void>();

  // Signals, not plain fields — this component is OnPush, and the async
  // ngAfterViewInit below sets these outside any template-bound event handler,
  // so a plain field mutation would never trigger a re-render (confirmed live:
  // the "Loading…" state froze forever despite the map actually finishing init).
  protected isLoading = signal(true);
  protected hasError = signal(false);

  private map: unknown = null;
  private marker: unknown = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.mapsLoader.load();
      const center = this.initialCoordinates() ?? this.config().defaultCenter;

      this.map = new (google as any).maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom: this.config().zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      this.marker = new (google as any).maps.Marker({
        position: center,
        map: this.map,
        draggable: true,
        animation: (google as any).maps.Animation.DROP,
      });
      (this.marker as any).addListener('dragend', () => {
        const pos = (this.marker as any).getPosition();
        this.ngZone.run(() => this.emitPicked(pos.lat(), pos.lng()));
      });
      (this.map as any).addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        (this.marker as any).setPosition(event.latLng);
        this.ngZone.run(() => this.emitPicked(lat, lng));
      });

      this.isLoading.set(false);
      if (this.initialCoordinates()) {
        this.emitPicked(center.lat, center.lng);
      }
    } catch {
      this.isLoading.set(false);
      this.hasError.set(true);
      this.loadError.emit();
    }
  }

  /** Recenters on an externally-known point — e.g. after the caller runs its own
   * "use current location" or search-suggestion flow. */
  panTo(lat: number, lng: number): void {
    const pos = { lat, lng };
    (this.map as any)?.panTo(pos);
    (this.marker as any)?.setPosition(pos);
    this.emitPicked(lat, lng);
  }

  private emitPicked(lat: number, lng: number): void {
    this.locationPicked.emit({ lat, lng });
  }

  ngOnDestroy(): void {
    // google.maps has no explicit teardown API for Map/Marker instances — clearing
    // our references is all that's needed; GC handles the rest once the container
    // element itself is removed from the DOM.
    this.marker = null;
    this.map = null;
  }
}
