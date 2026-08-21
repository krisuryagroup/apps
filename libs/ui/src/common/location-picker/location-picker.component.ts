import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  GoogleGeocodingService,
  GeoSearchSuggestion,
  LocationService,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import {
  MapPickerComponent,
  MapPickerConfig,
  MAP_PICKER_DEFAULT_CONFIG,
} from '../map-picker/map-picker.component';

/**
 * The full "find my location" trio, shared across apps: a place-search box with
 * autocomplete suggestions, a "use current location" button, and the draggable-pin
 * map (MapPickerComponent) — composed together because every consumer so far
 * (zitro-customer's address picker, zitro-admin's business location picker) wants
 * all three, not just the bare map. Still deliberately stops short of resolving a
 * dropped pin into an address — that's the caller's job via GoogleGeocodingService,
 * same as MapPickerComponent, since different callers want different fields filled
 * (delivery address vs. business town).
 */
@Component({
  selector: 'lib-location-picker',
  standalone: true,
  imports: [FormsModule, I18nPipe, MapPickerComponent],
  templateUrl: './location-picker.component.html',
  styleUrl: './location-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPickerComponent implements OnDestroy {
  @ViewChild(MapPickerComponent) private mapPicker?: MapPickerComponent;

  private readonly geocoding = inject(GoogleGeocodingService);
  private readonly locationService = inject(LocationService);

  config = input<MapPickerConfig>(MAP_PICKER_DEFAULT_CONFIG);
  initialCoordinates = input<{ lat: number; lng: number } | null>(null);

  locationPicked = output<{ lat: number; lng: number }>();
  loadError = output<void>();

  protected searchQuery = '';
  protected searchSuggestions = signal<GeoSearchSuggestion[]>([]);
  protected isSearching = signal(false);
  protected isGettingLocation = signal(false);
  protected locationError = signal<string | null>(null);

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor() {
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((q) => this.runSearch(q));
  }

  protected onSearchInput(value: string): void {
    this.searchQuery = value;
    if (!value.trim()) {
      this.searchSuggestions.set([]);
      this.isSearching.set(false);
      return;
    }
    this.isSearching.set(true);
    this.search$.next(value);
  }

  protected clearSearch(): void {
    this.searchQuery = '';
    this.searchSuggestions.set([]);
    this.isSearching.set(false);
  }

  private async runSearch(query: string): Promise<void> {
    try {
      this.searchSuggestions.set(await this.geocoding.searchAddresses(query));
    } catch {
      this.searchSuggestions.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  protected selectSuggestion(s: GeoSearchSuggestion): void {
    this.searchQuery = s.name;
    this.searchSuggestions.set([]);
    this.isSearching.set(false);
    // panTo() itself emits locationPicked via the inner MapPickerComponent — no
    // separate emit needed here.
    this.mapPicker?.panTo(s.coordinates.lat, s.coordinates.lng);
  }

  protected async useCurrentLocation(): Promise<void> {
    this.isGettingLocation.set(true);
    this.locationError.set(null);
    try {
      const result = await this.locationService.checkLocationPermission();
      if (result.hasLocation && result.coordinates) {
        this.mapPicker?.panTo(result.coordinates.lat, result.coordinates.lng);
      } else {
        this.locationError.set(
          result.error ??
            'Unable to get your location. Please enable location access.',
        );
      }
    } catch {
      this.locationError.set('Unable to get your current location.');
    } finally {
      this.isGettingLocation.set(false);
    }
  }

  protected onLocationPicked(coords: { lat: number; lng: number }): void {
    this.locationPicked.emit(coords);
  }

  protected onLoadError(): void {
    this.loadError.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
