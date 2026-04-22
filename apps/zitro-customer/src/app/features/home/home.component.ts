import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NearbyBusinessesService,
  TagsService,
  AnalyticsService,
  LocationSelectionService,
  BannerService,
} from '@zitro/services';
import { ThemeService } from '@zitro/theme';
import { NearbyBusiness, PlatformTag, Banner } from '@zitro/models';
import { I18nPipe } from '@zitro/i18n';
import {
  BusinessCardComponent,
  BannerCarouselComponent,
  CartSummaryComponent,
} from '@zitro/ui';
import {
  LOCATION_STORAGE_KEY,
  UserLocation,
  BUSINESS_TYPE_ORDER,
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_ICONS,
  NEARBY_API_RADIUS_KM,
} from '../../core/constants/app.constants';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    BusinessCardComponent,
    BannerCarouselComponent,
    CartSummaryComponent,
    I18nPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private nearbyService = inject(NearbyBusinessesService);
  private tagsService = inject(TagsService);
  private themeService = inject(ThemeService);
  private analyticsService = inject(AnalyticsService);
  private locationSelectionService = inject(LocationSelectionService);
  private bannerService = inject(BannerService);
  private destroyRef = inject(DestroyRef);

  private carouselRef = viewChild(BannerCarouselComponent);

  readonly BUSINESS_TYPE_LABELS = BUSINESS_TYPE_LABELS;
  readonly BUSINESS_TYPE_ICONS = BUSINESS_TYPE_ICONS;

  readonly isLoading = signal(true);
  readonly banners = signal<Banner[]>([]);
  readonly isPureVeg = signal(false);
  readonly searchQuery = signal('');
  readonly isListening = signal(false);
  readonly activeFilter = signal<string>('near_fast');

  readonly filterPills = [
    { key: 'near_fast',  label: '⚡ Near & Fast' },
    { key: 'top_rated', label: '⭐ Top Rated' },
    { key: 'new',       label: '✨ New' },
    { key: 'offers',    label: '🏷️ Offers' },
    { key: 'free_del',  label: '🆓 Free Delivery' },
  ];

  private readonly userLocation = signal<UserLocation | null>(null);
  readonly nearbyBusinesses = signal<NearbyBusiness[]>([]);
  readonly allTags = signal<PlatformTag[]>([]);
  readonly businessTypeTabs = signal<string[]>([]);
  readonly activeTab = signal('');
  readonly activeTagFilter = signal<string | null>(null); // stores tag slug

  readonly displayTags = computed(() => {
    const tagSlugsInView = new Set(this.nearbyBusinesses().flatMap(b => b.tags));
    return this.allTags().filter(t => tagSlugsInView.has(t.slug));
  });

  readonly displayBusinesses = computed(() => this.nearbyBusinesses());

  constructor() {
    effect(() => {
      if (this.banners().length > 1) {
        this.carouselRef()?.startAutoPlay();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.userLocation.set(this.loadStoredLocation());
    await this.analyticsService.logScreenView('Home', 'HomeComponent');
    this.loadHomeData();

    this.bannerService.getBanners()
      .then(b => this.banners.set(b))
      .catch(() => this.banners.set([]));

    this.locationSelectionService.selectedLocation$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(selectedLoc => {
        this.userLocation.set({
          lat: selectedLoc.coordinates?.lat ?? 0,
          lng: selectedLoc.coordinates?.lng ?? 0,
          label: selectedLoc.label,
          address: selectedLoc.address,
        });
        this.loadHomeData();
      });
  }

  onFilterChange(key: string): void {
    this.activeFilter.set(key);
    this.loadFilteredData();
  }


  onTabChange(type: string): void {
    this.activeTab.set(type);
    this.activeTagFilter.set(null);
    this.themeService.applyBusinessTypeTheme(type);
    this.loadFilteredData();
  }

  onTagFilterClick(slug: string): void {
    this.activeTagFilter.update(f => f === slug ? null : slug);
    this.loadFilteredData();
  }

  onBusinessClick(business: NearbyBusiness): void {
    this.router.navigate(['/listing'], { queryParams: { businessSlug: business.slug } });
  }

  togglePureVeg(): void {
    this.isPureVeg.update(v => !v);
    this.loadFilteredData();
  }

  onSearch(): void {
    const q = this.searchQuery().trim();
    if (q) {
      this.router.navigate(['/listing'], { queryParams: { search: q } });
    }
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  startVoiceSearch(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || this.isListening()) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    this.isListening.set(true);
    recognition.onresult = (event: any) => {
      this.searchQuery.set(event.results[0][0].transcript);
      this.isListening.set(false);
      this.onSearch();
    };
    recognition.onerror = () => { this.isListening.set(false); };
    recognition.onend = () => { this.isListening.set(false); };
    recognition.start();
  }

  private buildApiParams() {
    const loc = this.userLocation();
    const filterKey = this.activeFilter();
    const tagSlug = this.activeTagFilter();
    const tagId = tagSlug ? this.allTags().find(t => t.slug === tagSlug)?.id : undefined;

    let sort = 'distance';
    let freeDelivery: boolean | undefined;
    if (filterKey === 'top_rated') { sort = 'rating'; }
    else if (filterKey === 'new') { sort = 'new'; }
    else if (filterKey === 'free_del') { sort = 'distance'; freeDelivery = true; }

    return {
      lat: loc?.lat ?? 0,
      lng: loc?.lng ?? 0,
      radiusKm: NEARBY_API_RADIUS_KM,
      businessType: this.activeTab() || undefined,
      tagIds: tagId,
      vegOnly: this.isPureVeg() || undefined,
      sort,
      freeDelivery,
    };
  }

  private loadHomeData(): void {
    this.activeTab.set('');
    this.activeTagFilter.set(null);
    this.isLoading.set(true);

    forkJoin({
      result: this.nearbyService.getNearbyBusinesses(this.buildApiParams()),
      tags: this.tagsService.getTags(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ result, tags }) => {
        this.nearbyBusinesses.set(result.businesses);
        this.allTags.set(tags);
        const tabs = this.buildTabs(result.businesses);
        this.businessTypeTabs.set(tabs);
        if (tabs[0]) {
          this.themeService.applyBusinessTypeTheme(tabs[0]);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  private loadFilteredData(): void {
    this.isLoading.set(true);
    this.nearbyService
      .getNearbyBusinesses(this.buildApiParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ businesses }) => {
          this.nearbyBusinesses.set(businesses);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private buildTabs(businesses: NearbyBusiness[]): string[] {
    const typesPresent = new Set(businesses.map(b => b.businessType));
    return BUSINESS_TYPE_ORDER.filter(t => typesPresent.has(t));
  }

  private loadStoredLocation(): UserLocation | null {
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserLocation) : null;
    } catch {
      return null;
    }
  }
}
