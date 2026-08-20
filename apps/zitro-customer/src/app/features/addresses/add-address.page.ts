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
import type { AddressLocationPatch } from '@zitro/ui';
import {
  AddressApiService,
  LocationService,
  GoogleGeocodingService,
  GeoSearchSuggestion as SearchSuggestion,
  DialogService,
  UserManagementService,
  SocietyApiService,
  LocationSelectionService,
} from '@zitro/services';
import {
  Address,
  AddressFormData,
  NearbySociety,
  SocietyTower,
} from '@zitro/models';
import {
  DELIVERY_PINCODE_CONFIG,
  LOCATION_STORAGE_KEY,
} from '../../core/constants/app.constants';
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
  private readonly userManagement = inject(UserManagementService);
  private readonly societyApi = inject(SocietyApiService);
  private readonly locationSelectionService = inject(LocationSelectionService);
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
  readonly locationPatch = signal<AddressLocationPatch | null>(null);
  readonly nearbySocieties = signal<NearbySociety[]>([]);
  readonly societyTowers = signal<SocietyTower[]>([]);

  mode: 'checkout' | 'manage' | 'default' = 'default';
  readonly editingAddressId = signal<string | null>(null);
  private checkoutBusinessSlug: string | null = null;
  /** True when reached via LocationSelectionComponent's "Search your Location" —
   * this page doubles as how a location-less user sets their initial delivery
   * location, so a successful save must also persist LOCATION_STORAGE_KEY. */
  private setInitialLocation = false;

  private map: unknown = null;
  private marker: unknown = null;
  private static mapsApiPromise: Promise<void> | null = null;
  private presetCoords: { lat: number; lng: number } | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  async ngOnInit(): Promise<void> {
    const snap = this.route.snapshot.queryParamMap;
    const modeParam = snap.get('mode');
    if (modeParam === 'checkout') this.mode = 'checkout';
    else if (modeParam === 'manage') this.mode = 'manage';

    this.setInitialLocation = snap.get('setInitialLocation') === 'true';
    this.checkoutBusinessSlug = snap.get('business');

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
      .subscribe((q) => this.runSearch(q));

    const editId = snap.get('addressId');
    if (editId) {
      this.editingAddressId.set(editId);
      const addresses = await this.addressApi
        .getAddresses()
        .toPromise()
        .catch(() => []);
      const existing = (addresses ?? []).find((a: Address) => a.id === editId);
      if (existing) {
        this.initialFormData.set(existing);
        return;
      }
    }

    const userPhone = await this.userManagement
      .getCurrentUserPhone()
      .catch(() => null);

    this.initialFormData.set({
      type: 'Home',
      state: 'Uttar Pradesh',
      isDefault: false,
      phone: userPhone ?? '',
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
      // Falls back to the user's already-selected delivery-area coordinates
      // before the last-resort hardcoded point — this page used to always
      // open centered on a fixed Lucknow-area coordinate regardless of
      // whether the user's actual area was hundreds of km away.
      const fallbackCenter = this.locationSelectionService.snapshot
        .coordinates ?? { lat: 26.8467, lng: 80.9462 };
      const center = this.presetCoords ?? fallbackCenter;
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
      (this.map as any).addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        (this.marker as any).setPosition(event.latLng);
        this.ngZone.run(() => this.onMarkerDrop(lat, lng));
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
        const { lat, lng } = result.coordinates;
        const pos = { lat, lng };
        (this.map as any)?.panTo(pos);
        (this.marker as any)?.setPosition(pos);
        await this.onMarkerDrop(lat, lng);
      }
    } catch {
      /* silent */
    }
  }

  private async onMarkerDrop(lat: number, lng: number): Promise<void> {
    this.isGettingLocation.set(true);
    this.mapAddress.set('');
    this.locationFromMap.set(false);
    try {
      const addr = await this.geocodingService.getFullAddressComponents(
        lat,
        lng,
      );
      this.mapAddress.set(addr.formattedAddress);
      this.locationFromMap.set(true);
      this.checkPincodeRestriction(addr.pincode);
      this.locationPatch.set({
        pincode: addr.pincode,
        town: addr.town,
        state: addr.state,
        landmark: addr.landmark,
        lat,
        lng,
      });
      this.fetchNearbySocieties(lat, lng);
    } catch {
      this.errorMessage.set(
        'Could not resolve address for this location. Please enter manually.',
      );
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
        await this.geocodingService.searchAddresses(query),
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
          result.error ??
            'Unable to get your location. Please enable location access.',
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
    this.locationPatch.set({
      pincode: '',
      town: '',
      state: 'Uttar Pradesh',
      landmark: '',
    });
    this.nearbySocieties.set([]);
    this.societyTowers.set([]);
  }

  private fetchNearbySocieties(lat: number, lng: number): void {
    this.societyApi.getNearby(lat, lng).subscribe({
      next: (societies) => this.nearbySocieties.set(societies),
      error: () => this.nearbySocieties.set([]),
    });
  }

  onSocietySelected(societyId: string | null): void {
    if (!societyId) {
      this.societyTowers.set([]);
      return;
    }
    this.societyApi.getTowers(societyId).subscribe({
      next: (towers) => this.societyTowers.set(towers),
      error: () => this.societyTowers.set([]),
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
    this.router.navigate(this.mode === 'checkout' ? ['/cart'] : ['/addresses']);
  }

  onFormSubmitted(data: AddressFormData): void {
    if (this.pincodeRestricted() && this.pincodeConfig.enabled) {
      this.errorMessage.set(
        'Delivery is not available at this pincode. Please choose a different location.',
      );
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set('');

    const addressData: Omit<Address, 'id'> &
      Pick<AddressFormData, 'towerNameOther'> = {
      name: data.name,
      phone: data.phone,
      houseAndStreet: data.houseAndStreet,
      landmark: data.landmark ?? '',
      pincode: data.pincode,
      town: data.town,
      state: data.state ?? 'Uttar Pradesh',
      type: data.type,
      isDefault: data.isDefault,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      addressMode: data.addressMode ?? 'manual',
      societyId: data.societyId ?? null,
      societyName: data.societyName ?? null,
      towerId: data.towerId ?? null,
      towerNameOther: data.towerNameOther ?? null,
      flatNumber: data.flatNumber ?? null,
    };

    const editingId = this.editingAddressId();
    const save$ = editingId
      ? this.addressApi.updateAddress(editingId, addressData)
      : this.addressApi.createAddress(addressData);

    save$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.handlePostSave(addressData);
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

  private async handlePostSave(saved: {
    houseAndStreet: string;
    town: string;
    lat?: number | null;
    lng?: number | null;
  }): Promise<void> {
    if (this.setInitialLocation) {
      const location = {
        lat: saved.lat ?? 0,
        lng: saved.lng ?? 0,
        label: saved.town,
        address: `${saved.houseAndStreet}, ${saved.town}`,
      };
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
      this.locationSelectionService.setLocation({
        label: location.label,
        address: location.address,
        coordinates:
          location.lat !== 0 || location.lng !== 0
            ? { lat: location.lat, lng: location.lng }
            : undefined,
        type: location.lat !== 0 ? 'gps' : 'saved',
      });
      this.router.navigate(['/home']);
      return;
    }

    if (this.mode === 'checkout') {
      const cartPath = this.checkoutBusinessSlug
        ? `/cart?business=${this.checkoutBusinessSlug}`
        : '/cart';
      const goToCart = await this.dialogService.showConfirmation({
        title: 'Address Saved Successfully',
        message: 'Where would you like to go?',
        confirmText: 'Go to Cart',
        cancelText: 'Add more items',
      });
      if (goToCart) {
        this.router.navigateByUrl(cartPath);
      } else {
        this.router.navigate(['/home']);
      }
    } else {
      this.router.navigate(['/addresses']);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
