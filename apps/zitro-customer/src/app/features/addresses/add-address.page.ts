import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { I18nPipe } from '@zitro/i18n';
import { AddAddressFormComponent } from '@zitro/ui';
import {
  AddressApiService,
  LocationService,
  GoogleGeocodingService,
  GeoSearchSuggestion as SearchSuggestion,
  DialogService,
} from '@zitro/services';
import { Address, AddressFormData } from '@zitro/models';
import { DELIVERY_PINCODE_CONFIG } from '../../core/constants/app.constants';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-add-address-page',
  standalone: true,
  imports: [I18nPipe, AddAddressFormComponent],
  templateUrl: './add-address.page.html',
  styleUrl: './add-address.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddAddressPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private readonly addressApi = inject(AddressApiService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GoogleGeocodingService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly ngZone = inject(NgZone);

  readonly pincodeConfig = DELIVERY_PINCODE_CONFIG;

  readonly isSaving = signal(false);
  readonly isGettingLocation = signal(false);
  readonly isMapLoading = signal(true);
  readonly mapLoadError = signal(false);
  readonly errorMessage = signal('');
  readonly mapAddress = signal('');
  readonly pincodeRestricted = signal(false);
  readonly locationFromMap = signal(false);
  readonly searchQuery = signal('');
  readonly searchSuggestions = signal<SearchSuggestion[]>([]);
  readonly isSearching = signal(false);

  readonly initialFormData = signal<Partial<Address> | null>(null);

  mode: 'checkout' | 'manage' | 'default' = 'default';

  private map: unknown = null;
  private marker: unknown = null;
  private static mapsApiPromise: Promise<void> | null = null;
  private presetCoords: { lat: number; lng: number } | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  ngOnInit(): void {
    const snap = this.route.snapshot.queryParamMap;
    const modeParam = snap.get('mode');
    if (modeParam === 'checkout') this.mode = 'checkout';
    else if (modeParam === 'manage') this.mode = 'manage';

    const lat = snap.get('lat');
    const lng = snap.get('lng');
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        this.presetCoords = { lat: parsedLat, lng: parsedLng };
      }
    }

    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(q => this.runSearch(q));

    this.initialFormData.set({
      type: 'Home',
      state: 'Uttar Pradesh',
      isDefault: false,
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initMap();
  }

  private async loadMapsApi(): Promise<void> {
    if (typeof google !== 'undefined' && (google as any).maps) return;
    if (AddAddressPage.mapsApiPromise) return AddAddressPage.mapsApiPromise;
    AddAddressPage.mapsApiPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.google.mapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        AddAddressPage.mapsApiPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };
      document.head.appendChild(script);
    });
    return AddAddressPage.mapsApiPromise;
  }

  private async initMap(): Promise<void> {
    try {
      await this.loadMapsApi();
      const center = this.presetCoords ?? { lat: 26.8467, lng: 80.9462 };
      this.map = new (google as any).maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom: 16,
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
        this.ngZone.run(() => this.onMarkerDrop(pos.lat(), pos.lng()));
      });
      this.isMapLoading.set(false);
      if (this.presetCoords) {
        await this.onMarkerDrop(this.presetCoords.lat, this.presetCoords.lng);
      } else {
        this.tryAutoCenter();
      }
    } catch {
      this.isMapLoading.set(false);
      this.mapLoadError.set(true);
    }
  }

  private async tryAutoCenter(): Promise<void> {
    try {
      const result = await this.locationService.checkLocationPermission();
      if (result.hasLocation && result.coordinates) {
        const pos = { lat: result.coordinates.lat, lng: result.coordinates.lng };
        (this.map as any)?.panTo(pos);
        (this.marker as any)?.setPosition(pos);
      }
    } catch { /* silent */ }
  }

  private async onMarkerDrop(lat: number, lng: number): Promise<void> {
    this.isGettingLocation.set(true);
    this.mapAddress.set('');
    this.locationFromMap.set(false);
    try {
      const addr = await this.geocodingService.getFullAddressComponents(lat, lng);
      this.mapAddress.set(addr.formattedAddress);
      this.locationFromMap.set(true);
      this.checkPincodeRestriction(addr.pincode);
      this.initialFormData.set({
        ...this.initialFormData(),
        pincode: addr.pincode,
        town: addr.town,
        state: addr.state,
      });
    } catch {
      this.errorMessage.set('Could not resolve address for this location. Please enter manually.');
    } finally {
      this.isGettingLocation.set(false);
    }
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    if (!value.trim()) {
      this.searchSuggestions.set([]);
      this.isSearching.set(false);
      return;
    }
    this.isSearching.set(true);
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSuggestions.set([]);
    this.isSearching.set(false);
  }

  private async runSearch(query: string): Promise<void> {
    try {
      this.searchSuggestions.set(
        await this.geocodingService.searchAddresses(query)
      );
    } catch {
      this.searchSuggestions.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  async selectSuggestion(s: SearchSuggestion): Promise<void> {
    this.searchQuery.set(s.name);
    this.searchSuggestions.set([]);
    this.isSearching.set(false);
    if (this.map && this.marker) {
      const pos = { lat: s.coordinates.lat, lng: s.coordinates.lng };
      (this.map as any).panTo(pos);
      (this.map as any).setZoom(16);
      (this.marker as any).setPosition(pos);
    }
    await this.onMarkerDrop(s.coordinates.lat, s.coordinates.lng);
  }

  async useCurrentLocation(): Promise<void> {
    this.isGettingLocation.set(true);
    this.errorMessage.set('');
    try {
      const result = await this.locationService.checkLocationPermission();
      if (result.hasLocation && result.coordinates) {
        const { lat, lng } = result.coordinates;
        const pos = { lat, lng };
        (this.map as any)?.panTo(pos);
        (this.map as any)?.setZoom(16);
        (this.marker as any)?.setPosition(pos);
        await this.onMarkerDrop(lat, lng);
      } else {
        this.errorMessage.set(
          result.error ?? 'Unable to get your location. Please enable location access.'
        );
        this.isGettingLocation.set(false);
      }
    } catch {
      this.errorMessage.set('Unable to get your current location.');
      this.isGettingLocation.set(false);
    }
  }

  clearMapSelection(): void {
    this.locationFromMap.set(false);
    this.mapAddress.set('');
    this.pincodeRestricted.set(false);
    this.initialFormData.set({
      ...this.initialFormData(),
      pincode: '',
      town: '',
      state: 'Uttar Pradesh',
    });
  }

  private checkPincodeRestriction(pincode: string): void {
    if (!this.pincodeConfig.enabled) {
      this.pincodeRestricted.set(false);
      return;
    }
    const allowed = this.pincodeConfig.allowedPincodes as readonly string[];
    this.pincodeRestricted.set(!allowed.includes(pincode));
  }

  goToContact(): void {
    this.router.navigate(['/contact']);
  }

  goBack(): void {
    this.router.navigate(
      this.mode === 'checkout' ? ['/cart'] : ['/addresses']
    );
  }

  onFormSubmitted(data: AddressFormData): void {
    if (this.pincodeRestricted() && this.pincodeConfig.enabled) return;
    this.isSaving.set(true);
    this.errorMessage.set('');

    const addressData: Omit<Address, 'id'> = {
      name: data.name,
      phone: data.phone,
      houseAndStreet: data.houseAndStreet,
      landmark: data.landmark ?? '',
      pincode: data.pincode,
      town: data.town,
      state: data.state ?? 'Uttar Pradesh',
      type: data.type,
      isDefault: data.isDefault,
    };

    this.addressApi.createAddress(addressData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.handlePostSave();
      },
      error: () => {
        this.errorMessage.set('Failed to save address. Please try again.');
        this.isSaving.set(false);
      },
    });
  }

  onFormCancelled(): void {
    this.goBack();
  }

  private async handlePostSave(): Promise<void> {
    if (this.mode === 'checkout') {
      const goToCart = await this.dialogService.showConfirmation({
        title: 'Address Added Successfully',
        message: 'Where would you like to go?',
        confirmText: 'Go to Cart',
        cancelText: 'Add more items',
      });
      this.router.navigate(goToCart ? ['/cart'] : ['/home']);
    } else {
      this.router.navigate(['/addresses']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
