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

export interface PolygonMapPickerConfig {
  defaultCenter: { lat: number; lng: number };
  zoom: number;
  heightPx: number;
}

export const POLYGON_MAP_PICKER_DEFAULT_CONFIG: PolygonMapPickerConfig = {
  defaultCenter: { lat: 26.8467, lng: 80.9462 },
  zoom: 13,
  heightPx: 360,
};

/**
 * Lets a user draw a delivery-zone polygon on a real map, instead of hand-writing a
 * PolygonCoords JSON blob (the pre-existing gap — see RS-T-1305/RS-T-1903: restaurant
 * zone creation always 400'd because there was no UI to actually define the required
 * polygon anywhere in the app). Draws by hand (click to add each vertex, click the first
 * vertex again to close the shape) rather than via google.maps.drawing.DrawingManager —
 * that class was removed from the Maps JavaScript API as of v3.65, so no version of this
 * component could ever have used it. Once closed, vertices become draggable and a "Clear"
 * button lets the user redraw from scratch. Emits the full `{lat,lng}[]` path on every
 * change — each added vertex while drawing, or any drag/insert/remove once closed.
 */
@Component({
  selector: 'lib-polygon-map-picker',
  standalone: true,
  imports: [I18nPipe],
  templateUrl: './polygon-map-picker.component.html',
  styleUrl: './polygon-map-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PolygonMapPickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly ngZone = inject(NgZone);

  config = input<PolygonMapPickerConfig>(POLYGON_MAP_PICKER_DEFAULT_CONFIG);
  initialPolygon = input<{ lat: number; lng: number }[] | null>(null);

  polygonChanged = output<{ lat: number; lng: number }[]>();
  loadError = output<void>();

  protected isLoading = signal(true);
  protected hasError = signal(false);
  protected hasPolygon = signal(false);
  protected drawnPointCount = signal(0);
  protected isDrawing = signal(false);

  private map: unknown = null;
  private polygon: unknown = null;
  private mapClickListener: unknown = null;

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.mapsLoader.load();
      const center = this.initialPolygonCenter() ?? this.config().defaultCenter;
      this.map = new (google as any).maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom: this.config().zoom,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      const initial = this.initialPolygon();
      if (initial && initial.length >= 3) {
        this.renderEditablePolygon(initial);
      } else {
        this.startDrawing();
      }

      this.isLoading.set(false);
    } catch {
      this.isLoading.set(false);
      this.hasError.set(true);
      this.loadError.emit();
    }
  }

  private initialPolygonCenter(): { lat: number; lng: number } | null {
    const points = this.initialPolygon();
    if (!points || points.length === 0) return null;
    const lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
    return { lat, lng };
  }

  /** Click-to-add-vertex drawing (DrawingManager was removed from the Maps JS API). */
  private startDrawing(): void {
    this.isDrawing.set(true);
    this.drawnPointCount.set(0);
    // No `paths` option here — passing an empty array makes getPath() return
    // undefined instead of an empty MVCArray (confirmed live); omitting the
    // option entirely gives a proper empty MVCArray ready for path.push(...).
    this.polygon = new (google as any).maps.Polygon({
      editable: false,
      fillColor: '#c62828',
      fillOpacity: 0.2,
      strokeColor: '#c62828',
      strokeWeight: 2,
      map: this.map,
    });

    this.mapClickListener = (google as any).maps.event.addListener(
      this.map,
      'click',
      (event: any) => {
        this.ngZone.run(() => {
          const path = (this.polygon as any).getPath();
          const clicked = event.latLng;

          if (path.getLength() >= 3) {
            const first = path.getAt(0);
            // Roughly ~50m at mid-latitudes — a simple degree-delta threshold is
            // plenty precise for "click near your starting point to close the shape"
            // and avoids pulling in the separate geometry library for one comparison.
            const isCloseToFirst =
              Math.abs(clicked.lat() - first.lat()) < 0.0005 &&
              Math.abs(clicked.lng() - first.lng()) < 0.0005;
            if (isCloseToFirst) {
              this.finishDrawing();
              return;
            }
          }

          path.push(clicked);
          this.drawnPointCount.set(path.getLength());
        });
      },
    );
  }

  protected finishDrawing(): void {
    if (!this.isDrawing() || this.drawnPointCount() < 3) return;
    this.isDrawing.set(false);
    if (this.mapClickListener) {
      (google as any).maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    (this.polygon as any).setEditable(true);
    this.hasPolygon.set(true);
    this.attachPolygonListeners();
    this.emitPolygon();
  }

  private renderEditablePolygon(points: { lat: number; lng: number }[]): void {
    this.polygon = new (google as any).maps.Polygon({
      paths: points,
      editable: true,
      fillColor: '#c62828',
      fillOpacity: 0.2,
      strokeColor: '#c62828',
      strokeWeight: 2,
      map: this.map,
    });
    this.hasPolygon.set(true);
    this.attachPolygonListeners();

    const bounds = new (google as any).maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    (this.map as any).fitBounds(bounds);
  }

  private attachPolygonListeners(): void {
    const path = (this.polygon as any).getPath();
    ['insert_at', 'set_at', 'remove_at'].forEach((eventName) => {
      (google as any).maps.event.addListener(path, eventName, () =>
        this.ngZone.run(() => this.emitPolygon()),
      );
    });
  }

  private emitPolygon(): void {
    if (!this.polygon) return;
    const path = (this.polygon as any).getPath();
    const points: { lat: number; lng: number }[] = [];
    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      points.push({ lat: point.lat(), lng: point.lng() });
    }
    this.polygonChanged.emit(points);
  }

  protected clearPolygon(): void {
    if (this.polygon) {
      (this.polygon as any).setMap(null);
      this.polygon = null;
    }
    if (this.mapClickListener) {
      (google as any).maps.event.removeListener(this.mapClickListener);
      this.mapClickListener = null;
    }
    this.hasPolygon.set(false);
    this.polygonChanged.emit([]);
    this.startDrawing();
  }

  ngOnDestroy(): void {
    if (this.mapClickListener) {
      (google as any).maps.event.removeListener(this.mapClickListener);
    }
    if (this.polygon) (this.polygon as any).setMap(null);
    this.polygon = null;
    this.map = null;
  }
}
