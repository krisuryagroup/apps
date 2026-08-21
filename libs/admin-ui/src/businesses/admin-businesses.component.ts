import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminApiService,
  BrandDto,
  BusinessSummaryDto,
  GoogleGeocodingService,
  PagedResult,
} from '@zitro/services';
import { I18nPipe } from '@zitro/i18n';
import { LocationPickerComponent } from '@zitro/ui';
import {
  DataTableComponent,
  DataTableColumn,
  DataTablePagination,
} from '../data-table/data-table.component';

@Component({
  selector: 'lib-admin-businesses',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    I18nPipe,
    DecimalPipe,
    DataTableComponent,
    LocationPickerComponent,
  ],
  templateUrl: './admin-businesses.component.html',
  styleUrl: './admin-businesses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBusinessesComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly geocoding = inject(GoogleGeocodingService);

  protected result = signal<PagedResult<BusinessSummaryDto> | null>(null);
  protected loading = signal(true);
  protected error = signal(false);
  protected page = signal(1);
  protected readonly pageSize = 20;
  protected search = '';
  protected statusFilter = '';
  protected typeFilter = '';

  protected pagination = computed<DataTablePagination | null>(() => {
    const r = this.result();
    return r
      ? { page: r.page, pageSize: r.pageSize, total: r.totalCount }
      : null;
  });

  protected showInviteForm = signal(false);
  protected inviteName = '';
  protected invitePhone = '';
  protected inviteEmail = '';
  protected inviteOwnerName = '';
  protected inviteType = 'restaurant';
  protected inviteTown = '';
  protected inviteBrandId = '';
  protected inviting = signal(false);
  protected brands = signal<BrandDto[]>([]);

  // ── Map picker (optional lat/lng capture) ──────────────────────────────────
  protected showMapPicker = signal(false);
  protected inviteLat: number | null = null;
  protected inviteLng: number | null = null;
  protected resolvingLocation = signal(false);

  protected readonly columns: DataTableColumn<BusinessSummaryDto>[] = [
    { key: 'name', labelKey: 'businesses.name' },
    { key: 'slug', labelKey: 'businesses.slug' },
    { key: 'businessType', labelKey: 'businesses.type' },
    { key: 'town', labelKey: 'businesses.town' },
    {
      key: 'onboardingStatus',
      labelKey: 'businesses.status',
      format: (r) => r.onboardingStatus,
    },
    {
      key: 'isActive',
      labelKey: 'businesses.active',
      format: (r) => (r.isActive ? '✓' : '✗'),
    },
  ];

  ngOnInit(): void {
    this.load();
    this.api.listBrands().subscribe({
      next: (page) => this.brands.set(page.items),
      error: () => this.brands.set([]),
    });
    // "+ Add Branch" on the Brands page links here with ?brandId=X — pre-select it
    // and jump straight into the invite form instead of making the admin hunt for it.
    const brandId = this.route.snapshot.queryParamMap.get('brandId');
    if (brandId) {
      this.inviteBrandId = brandId;
      this.showInviteForm.set(true);
    }
  }

  protected load(): void {
    this.page.set(1);
    this.fetch();
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    const p: Record<string, string> = {
      page: String(this.page()),
      pageSize: String(this.pageSize),
    };
    if (this.search) p['search'] = this.search;
    if (this.statusFilter) p['onboardingStatus'] = this.statusFilter;
    if (this.typeFilter) p['businessType'] = this.typeFilter;
    this.api.listBusinesses(p).subscribe({
      next: (r) => {
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  protected onRowClick(row: BusinessSummaryDto): void {
    this.router.navigate(['/businesses', row.id]);
  }

  /**
   * A pin drop/drag is purely {lat, lng} from MapPickerComponent — reverse-geocoding
   * it into a town name (so the admin doesn't have to type one after already
   * pointing at it on the map) is this component's job, not the map's.
   */
  protected onLocationPicked(coords: { lat: number; lng: number }): void {
    this.inviteLat = coords.lat;
    this.inviteLng = coords.lng;
    this.resolvingLocation.set(true);
    this.geocoding
      .getFullAddressComponents(coords.lat, coords.lng)
      .then((addr) => {
        if (addr.town) this.inviteTown = addr.town;
        this.resolvingLocation.set(false);
      })
      .catch(() => this.resolvingLocation.set(false));
  }

  protected submitInvite(): void {
    this.inviting.set(true);
    // One atomic backend call — POST /api/businesses/invite creates the business, the
    // (not-yet-usable) owner account, and the invite together. Slug is omitted; the
    // backend auto-generates one from the name.
    const req: Record<string, unknown> = {
      name: this.inviteName,
      businessType: this.inviteType,
      address: this.inviteTown ? { town: this.inviteTown } : null,
      ownerName: this.inviteOwnerName,
      ownerPhone: this.invitePhone,
      ownerEmail: this.inviteEmail,
    };
    if (this.inviteBrandId) req['brandId'] = this.inviteBrandId;
    // Lat/lng are optional — an admin can create a business from a typed town name
    // alone, exactly as before this feature existed.
    if (this.inviteLat != null && this.inviteLng != null) {
      req['coordinatesLat'] = this.inviteLat;
      req['coordinatesLng'] = this.inviteLng;
    }
    this.api.inviteBusinessOwner(req).subscribe({
      next: () => {
        this.showInviteForm.set(false);
        this.inviting.set(false);
        this.resetInviteForm();
        this.load();
      },
      error: () => this.inviting.set(false),
    });
  }

  private resetInviteForm(): void {
    this.inviteName = '';
    this.invitePhone = '';
    this.inviteEmail = '';
    this.inviteOwnerName = '';
    this.inviteType = 'restaurant';
    this.inviteTown = '';
    this.inviteBrandId = '';
    this.inviteLat = null;
    this.inviteLng = null;
    this.showMapPicker.set(false);
  }
}
