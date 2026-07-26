import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { UserManagementService, UserAddress } from '@zitro/services';
import { AddressApiService } from '@zitro/services';
import { LocationService } from '@zitro/services';
import { GoogleGeocodingService } from '@zitro/services';
import { SearchSuggestion } from '@zitro/services';
import { DialogService } from '@zitro/services';
import { AddressFormData } from '@zitro/models';
import {
  DELIVERY_PINCODE_CONFIG,
  ERROR_MESSAGES,
} from '../../core/constants/app.constants';
import { environment } from '../../../environments/environment';
declare const google: any;

/**
 * Generic Add Address page.
 *
 * Supports query-param `mode`:
 *   - `checkout`  → came from cart; post-save dialog asks "Go to Cart" / "Add more items"
 *   - `manage`    → came from Manage Addresses; navigates back to /addresses on save
 *   - (absent)    → same as `manage`
 *
 * Pincode restriction:
 *   Reads DELIVERY_PINCODE_CONFIG from app.constants.  When enabled + typed/detected
 *   pincode is NOT in allowedPincodes, the form is disabled and a "service not available"
 *   banner is shown with a "Connect with Restaurant" button → /contact.
 */
@Component({
  selector: 'app-add-address',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-address.component.html',
  styleUrls: ['./add-address.component.scss'],
})
export class AddAddressComponent implements OnInit, AfterViewInit, OnDestroy {
  private userManagementService = inject(UserManagementService);
  private addressApiService = inject(AddressApiService);
  private locationService = inject(LocationService);
  private geocodingService = inject(GoogleGeocodingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogService = inject(DialogService);
  private ngZone = inject(NgZone);

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  form: Partial<AddressFormData> = {};
  isSaving = false;
  isGettingLocation = false;
  isMapLoading = true;
  mapLoadError = false;
  errorMessage = '';
  mapAddress = '';
  fieldErrors: { [key: string]: string } = {};
  pincodeRestricted = false;
  locationFromMap = false;

  // ── Place search ─────────────────────────────────────────────────────────
  searchQuery = '';
  searchSuggestions: SearchSuggestion[] = [];
  isSearching = false;
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  mode: 'checkout' | 'manage' | 'default' = 'default';
  existingAddresses: UserAddress[] = [];

  private map: any = null;
  private marker: any = null;
  private static mapsApiPromise: Promise<void> | null = null;
  private presetCoords: { lat: number; lng: number } | null = null;

  readonly pincodeConfig = DELIVERY_PINCODE_CONFIG;

  async ngOnInit() {
    const snap = this.route.snapshot.queryParamMap;
    const modeParam = snap.get('mode');
    if (modeParam === 'checkout') this.mode = 'checkout';
    else if (modeParam === 'manage') this.mode = 'manage';

    const latParam = snap.get('lat');
    const lngParam = snap.get('lng');
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.presetCoords = { lat, lng };
      }
    }

    // Debounced place search
    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => this.runSearch(query));

    await this.initForm();
  }

  async ngAfterViewInit() {
    await this.initMap();
  }

  // ─── Map ──────────────────────────────────────────────────────────────────

  private loadMapsApi(): Promise<void> {
    if (typeof google !== 'undefined' && (google as any).maps)
      return Promise.resolve();
    if (AddAddressComponent.mapsApiPromise)
      return AddAddressComponent.mapsApiPromise;
    AddAddressComponent.mapsApiPromise = new Promise<void>(
      (resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.google.mapsApiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => {
          AddAddressComponent.mapsApiPromise = null;
          reject(new Error('Failed to load Google Maps'));
        };
        document.head.appendChild(script);
      },
    );
    return AddAddressComponent.mapsApiPromise;
  }

  private async initMap() {
    try {
      await this.loadMapsApi();
      // Use preset coords if available; otherwise open at India level — device
      // location will auto-center via tryAutoCenter() immediately after init.
      const center = this.presetCoords ?? { lat: 20.5937, lng: 78.9629 };
      const zoom = this.presetCoords ? 16 : 5;
      this.map = new (google as any).maps.Map(this.mapContainer.nativeElement, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      });
      this.marker = new (google as any).maps.Marker({
        position: center,
        map: this.map,
        draggable: true,
        animation: (google as any).maps.Animation.DROP,
      });
      this.marker.addListener('dragend', () => {
        const pos = this.marker.getPosition();
        this.ngZone.run(() => this.onMarkerDrop(pos.lat(), pos.lng()));
      });
      this.isMapLoading = false;
      if (this.presetCoords) {
        // Auto-geocode the preset coords so fields are pre-filled
        await this.onMarkerDrop(this.presetCoords.lat, this.presetCoords.lng);
      } else {
        this.tryAutoCenter();
      }
    } catch (e) {
      console.error('Map init error:', e);
      this.isMapLoading = false;
      this.mapLoadError = true;
    }
  }

  private async tryAutoCenter() {
    try {
      const result = await this.locationService.checkLocationPermission();
      if (result.hasLocation && result.coordinates) {
        const { lat, lng } = result.coordinates;
        const pos = { lat, lng };
        this.map?.panTo(pos);
        this.map?.setZoom(16);
        this.marker?.setPosition(pos);
        // Geocode so pincode/town/state are prefilled from device location
        await this.onMarkerDrop(lat, lng);
      }
    } catch {
      /* silent */
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Place search ────────────────────────────────────────────────────────

  onSearchInput(value: string): void {
    this.searchQuery = value;
    if (!value.trim()) {
      this.searchSuggestions = [];
      this.isSearching = false;
      return;
    }
    this.isSearching = true;
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchSuggestions = [];
    this.isSearching = false;
  }

  private async runSearch(query: string): Promise<void> {
    try {
      this.searchSuggestions =
        await this.geocodingService.searchAddresses(query);
    } catch {
      this.searchSuggestions = [];
    } finally {
      this.isSearching = false;
    }
  }

  async selectSuggestion(s: SearchSuggestion): Promise<void> {
    this.searchQuery = s.name;
    this.searchSuggestions = [];
    this.isSearching = false;
    if (this.map && this.marker) {
      const pos = { lat: s.coordinates.lat, lng: s.coordinates.lng };
      this.map.panTo(pos);
      this.map.setZoom(16);
      this.marker.setPosition(pos);
    }
    await this.onMarkerDrop(s.coordinates.lat, s.coordinates.lng);
  }

  private async onMarkerDrop(lat: number, lng: number) {
    this.isGettingLocation = true;
    this.mapAddress = '';
    this.locationFromMap = false;
    try {
      const addr = await this.geocodingService.getFullAddressComponents(
        lat,
        lng,
      );
      this.mapAddress = addr.formattedAddress;
      this.form.pincode = addr.pincode;
      this.form.town = addr.town;
      this.form.state = addr.state;
      this.locationFromMap = true;
      this.checkPincodeRestriction(addr.pincode);
      delete this.fieldErrors['pincode'];
      delete this.fieldErrors['town'];
    } catch {
      this.errorMessage =
        'Could not resolve address for this location. Please enter manually.';
    } finally {
      this.isGettingLocation = false;
    }
  }

  clearMapSelection() {
    this.locationFromMap = false;
    this.mapAddress = '';
    this.pincodeRestricted = false;
    this.form.pincode = '';
    this.form.town = '';
    this.form.state = 'Uttar Pradesh';
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private async initForm() {
    const phoneNumber = await this.userManagementService.getCurrentUserPhone();
    const userName = '';

    if (phoneNumber) {
      try {
        // existingAddresses used to check isDefault; address list from API not available in legacy component
        void phoneNumber;
      } catch {
        /* ignore */
      }
    }

    // pincode/town/state will be filled by geocode once the map auto-centers
    // to device location (tryAutoCenter) or the user picks a location.
    this.form = {
      name: userName,
      phone: phoneNumber ?? '',
      houseAndStreet: '',
      landmark: '',
      pincode: '',
      town: '',
      state: '',
      type: 'Home',
      isDefault: this.existingAddresses.length === 0,
    };
  }

  private checkPincodeRestriction(pincode: string) {
    if (!this.pincodeConfig.enabled) {
      this.pincodeRestricted = false;
      return;
    }
    const allowed = this.pincodeConfig.allowedPincodes as readonly string[];
    this.pincodeRestricted = !allowed.includes(pincode);
  }

  // ─── Public template methods ─────────────────────────────────────────────

  onPincodeChange(value: string) {
    this.form.pincode = value;
    this.locationFromMap = false; // manual edit breaks map lock
    if (value.length === 6) {
      this.checkPincodeRestriction(value);
    } else {
      this.pincodeRestricted = false;
    }
  }

  async useCurrentLocation() {
    this.isGettingLocation = true;
    this.errorMessage = '';
    try {
      const result = await this.locationService.checkLocationPermission();
      if (result.hasLocation && result.coordinates) {
        const { lat, lng } = result.coordinates;
        if (this.map && this.marker) {
          const pos = { lat, lng };
          this.map.panTo(pos);
          this.map.setZoom(16);
          this.marker.setPosition(pos);
        }
        await this.onMarkerDrop(lat, lng);
      } else {
        this.errorMessage =
          result.error ??
          'Unable to get your location. Please enable location access.';
        this.isGettingLocation = false;
      }
    } catch {
      this.errorMessage = 'Unable to get your current location.';
      this.isGettingLocation = false;
    }
  }

  goToContact() {
    this.router.navigate(['/contact']);
  }

  goBack() {
    if (this.mode === 'checkout') {
      this.router.navigate(['/cart']);
    } else {
      this.router.navigate(['/addresses']);
    }
  }

  validateForm(): boolean {
    this.fieldErrors = {};
    let valid = true;

    if (!this.form.name?.trim()) {
      this.fieldErrors['name'] = 'Please enter your full name';
      valid = false;
    }

    if (!this.form.phone?.trim()) {
      this.fieldErrors['phone'] = 'Please enter your phone number';
      valid = false;
    } else if (!/^[+]?[\d\s\-()\u202a\u202c]{10,15}$/.test(this.form.phone)) {
      this.fieldErrors['phone'] =
        'Please enter a valid phone number (10-15 digits)';
      valid = false;
    }

    if (!this.form.houseAndStreet?.trim()) {
      this.fieldErrors['houseAndStreet'] = 'Please enter house no. & street';
      valid = false;
    }

    if (!this.form.pincode?.trim()) {
      this.fieldErrors['pincode'] = 'Please enter your pincode';
      valid = false;
    } else if (!/^\d{6}$/.test(this.form.pincode)) {
      this.fieldErrors['pincode'] = 'Please enter a valid 6-digit pincode';
      valid = false;
    }

    if (!this.form.town?.trim()) {
      this.fieldErrors['town'] = 'Please enter your town / district';
      valid = false;
    }

    if (!this.form.type) {
      this.fieldErrors['type'] = 'Please select an address type';
      valid = false;
    }

    return valid;
  }

  async saveAddress() {
    if (this.pincodeRestricted && this.pincodeConfig.enabled) return;
    if (!this.validateForm()) return;

    try {
      this.isSaving = true;
      this.errorMessage = '';

      const phoneNumber =
        await this.userManagementService.getCurrentUserPhone();
      if (!phoneNumber) {
        this.errorMessage = ERROR_MESSAGES.UNABLE_TO_GET_PHONE;
        return;
      }

      const formData = this.form as AddressFormData;

      // Unset existing defaults before marking this one as default
      if (formData.isDefault && this.existingAddresses.length > 0) {
        // Legacy component: UserAddress has no id, skip API call
        this.existingAddresses.forEach((a) => {
          a.isDefault = false;
        });
      }

      const newAddress = {
        name: formData.name,
        phone: formData.phone,
        houseAndStreet: formData.houseAndStreet,
        landmark: formData.landmark ?? '',
        pincode: formData.pincode,
        town: formData.town,
        state: formData.state ?? 'Uttar Pradesh',
        type: formData.type,
        isDefault: formData.isDefault,
      };

      await firstValueFrom(
        this.addressApiService.createAddress(newAddress as any),
      );
      await this.handlePostSave();
    } catch (err) {
      console.error('Error saving address:', err);
      this.errorMessage = 'An error occurred while saving the address.';
    } finally {
      this.isSaving = false;
    }
  }

  private async handlePostSave() {
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

  get isSaveDisabled(): boolean {
    return (
      this.isSaving || (this.pincodeRestricted && this.pincodeConfig.enabled)
    );
  }
}
