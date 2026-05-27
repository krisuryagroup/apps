import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { getDistance } from 'geolib';
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
  BUSINESS_TYPE_ORDER,
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_ICONS,
  NEARBY_API_RADIUS_KM,
} from '../../core/constants/app.constants';

const DEFAULT_HOME_BUSINESS_TYPE = 'restaurant';

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
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private nearbyService = inject(NearbyBusinessesService);
  private tagsService = inject(TagsService);
  private themeService = inject(ThemeService);
  private analyticsService = inject(AnalyticsService);
  private locationSelectionService = inject(LocationSelectionService);
  private bannerService = inject(BannerService);
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);

  private carouselRef = viewChild(BannerCarouselComponent);

  readonly BUSINESS_TYPE_LABELS = BUSINESS_TYPE_LABELS;
  readonly BUSINESS_TYPE_ICONS = BUSINESS_TYPE_ICONS;

  readonly isLoading = signal(true);
  readonly banners = signal<Banner[]>([]);
  readonly isPureVeg = signal(false);
  readonly searchQuery = signal('');
  readonly isListening = signal(false);
  readonly isLocationSheetOpen = signal(false);
  readonly activeFilter = signal<string>('near_fast');
  readonly isHideableSectionHidden = signal(false);
  readonly isLoadingMore = signal(false);

  readonly filterPills = [
    { key: 'near_fast', label: '⚡ Near & Fast' },
    { key: 'top_rated', label: '⭐ Top Rated' },
    { key: 'new', label: '✨ New' },
    { key: 'offers', label: '🏷️ Offers' },
    { key: 'free_del', label: '🆓 Free Delivery' },
  ];

  private readonly userLocation = signal<{
    lat: number;
    lng: number;
    label: string;
    address: string;
  } | null>(null);
  readonly nearbyBusinesses = signal<NearbyBusiness[]>([]);
  readonly allTags = signal<PlatformTag[]>([]);
  readonly businessTypeTabs = signal<string[]>([]);
  readonly activeTab = signal('');
  readonly activeTagFilter = signal<string | null>(null); // stores tag slug
  readonly nextCursor = signal<string | null>(null);

  private _lastHomeRequestParams: ReturnType<
    HomeComponent['buildApiParams']
  > | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private observedLastCard: Element | null = null;
  private lastScrollTop = 0;
  // While this is true, scroll events are ignored to prevent the
  // max-height CSS animation from creating a layout-reflow feedback loop.
  private _hideableAnimating = false;
  private _hideableAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  // CSS transition duration (ms) + a small buffer
  private readonly HIDEABLE_TRANSITION_MS = 220;

  readonly displayTags = computed(() => this.allTags());

  readonly displayBusinesses = computed(() => this.nearbyBusinesses());

  constructor() {
    effect(() => {
      if (this.banners().length > 1) {
        this.carouselRef()?.startAutoPlay();
      }
    });

    // Scroll the active chip into the center of the chips row whenever
    // the selection changes or tags are (re)loaded.
    effect(() => {
      const activeSlug = this.activeTagFilter();
      this.allTags(); // track so this re-runs when tags first arrive
      if (activeSlug) {
        requestAnimationFrame(() => this.scrollActiveChipIntoView());
      }
    });
  }

  ngAfterViewInit(): void {
    this.observeLastBusinessCard();
  }

  ngOnDestroy(): void {
    this.disconnectIntersectionObserver();
    if (this._hideableAnimationTimer !== null) {
      clearTimeout(this._hideableAnimationTimer);
    }
  }

  async ngOnInit(): Promise<void> {
    this.userLocation.set(
      this.mapSelectedLocation(this.locationSelectionService.snapshot),
    );
    await this.analyticsService.logScreenView('Home', 'HomeComponent');

    this.bannerService
      .getBanners()
      .then((b) => this.banners.set(b))
      .catch(() => this.banners.set([]));

    this.locationSelectionService.sheetOpen$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((isOpen) => {
        const wasOpen = this.isLocationSheetOpen();
        this.isLocationSheetOpen.set(isOpen);
        if (wasOpen && !isOpen && this.hasValidLocation()) {
          this.loadHomeData();
        }
      });

    this.locationSelectionService.selectedLocation$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((selectedLoc) => {
        this.userLocation.set(this.mapSelectedLocation(selectedLoc));
        if (!this.isLocationSheetOpen()) {
          this.loadHomeData();
        }
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
    this.activeTagFilter.update((f) => (f === slug ? null : slug));
    this.loadFilteredData();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    // Block scroll processing while the max-height animation is running.
    // The animation causes layout reflow → the browser fires corrective
    // scroll events → without this lock those events toggle the state
    // back and forth producing the visible shake.
    if (this._hideableAnimating) return;

    const currentScroll =
      window.pageYOffset || this.document.documentElement.scrollTop || 0;
    const delta = currentScroll - this.lastScrollTop;
    this.lastScrollTop = currentScroll;

    if (currentScroll > 300 && delta > 0 && !this.isHideableSectionHidden()) {
      this.lockAndSetHideable(true);
    } else if (
      (delta < -10 || currentScroll < 100) &&
      this.isHideableSectionHidden()
    ) {
      this.lockAndSetHideable(false);
    }
  }

  private lockAndSetHideable(hidden: boolean): void {
    if (this._hideableAnimationTimer !== null) {
      clearTimeout(this._hideableAnimationTimer);
    }
    this._hideableAnimating = true;
    this.isHideableSectionHidden.set(hidden);
    this._hideableAnimationTimer = setTimeout(() => {
      this._hideableAnimating = false;
      this._hideableAnimationTimer = null;
    }, this.HIDEABLE_TRANSITION_MS);
  }

  onBusinessClick(business: NearbyBusiness): void {
    this.router.navigate(['/listing'], {
      queryParams: { businessSlug: business.slug },
    });
  }

  togglePureVeg(): void {
    this.isPureVeg.update((v) => !v);
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

  onChipImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    const fallback = img.parentElement?.querySelector(
      '.dh-chip-fallback',
    ) as HTMLElement | null;
    if (fallback) fallback.style.display = '';
  }

  startVoiceSearch(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
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
    recognition.onerror = () => {
      this.isListening.set(false);
    };
    recognition.onend = () => {
      this.isListening.set(false);
    };
    recognition.start();
  }

  private buildApiParams(includeDefaultBusinessType = true) {
    const loc = this.userLocation();
    const filterKey = this.activeFilter();
    const tagSlug = this.activeTagFilter();
    const tagId = tagSlug
      ? this.allTags().find((t) => t.slug === tagSlug)?.id
      : undefined;

    let sort = 'distance';
    let freeDelivery: boolean | undefined;
    if (filterKey === 'top_rated') {
      sort = 'rating';
    } else if (filterKey === 'new') {
      sort = 'new';
    } else if (filterKey === 'free_del') {
      sort = 'distance';
      freeDelivery = true;
    }

    return {
      lat: loc?.lat ?? 0,
      lng: loc?.lng ?? 0,
      radiusKm: NEARBY_API_RADIUS_KM,
      businessType:
        this.activeTab() ||
        (includeDefaultBusinessType ? DEFAULT_HOME_BUSINESS_TYPE : undefined),
      tagIds: tagId,
      vegOnly: this.isPureVeg() || undefined,
      sort,
      freeDelivery,
    };
  }

  private loadHomeData(): void {
    if (this.isLocationSheetOpen()) {
      this.isLoading.set(false);
      return;
    }

    this.activeTagFilter.set(null);
    this.isLoading.set(true);

    if (!this.hasValidLocation()) {
      this.promptForLocationSelection();
      return;
    }

    const requestParams = this.buildApiParams();
    if (this.isSameHomeRequest(this._lastHomeRequestParams, requestParams)) {
      this.isLoading.set(false);
      return;
    }
    this._lastHomeRequestParams = requestParams;

    const preferredActiveTab = this.activeTab() || DEFAULT_HOME_BUSINESS_TYPE;

    forkJoin({
      result: this.nearbyService.getNearbyBusinesses(requestParams),
      tags: this.tagsService.getTags(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ result, tags }) => {
          this.nearbyBusinesses.set(result.businesses);
          this.nextCursor.set(result.meta.nextCursor ?? null);
          this.allTags.set(tags);
          const tabs = this.buildTabs(result.businesses);
          this.businessTypeTabs.set(tabs);
          const nextActiveTab = tabs.includes(preferredActiveTab)
            ? preferredActiveTab
            : (tabs[0] ?? '');
          this.activeTab.set(nextActiveTab);
          if (nextActiveTab) {
            this.themeService.applyBusinessTypeTheme(nextActiveTab);
          }
          this.isLoading.set(false);
          this.observeLastBusinessCard();
        },
        error: () => {
          this._lastHomeRequestParams = null;
          this.nextCursor.set(null);
          this.isLoading.set(false);
        },
      });
  }

  private loadFilteredData(): void {
    if (this.isLocationSheetOpen()) {
      this.isLoading.set(false);
      return;
    }

    if (!this.hasValidLocation()) {
      this.isLoading.set(true);
      this.promptForLocationSelection();
      return;
    }

    this.isLoading.set(true);
    this.nearbyService
      .getNearbyBusinesses(this.buildApiParams())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ businesses, meta }) => {
          this.nearbyBusinesses.set(businesses);
          this.nextCursor.set(meta.nextCursor ?? null);
          this.isLoading.set(false);
          this.observeLastBusinessCard();
        },
        error: () => {
          this.nextCursor.set(null);
          this.isLoading.set(false);
        },
      });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (
      !cursor ||
      this.isLoading() ||
      this.isLoadingMore() ||
      this.isLocationSheetOpen()
    ) {
      return;
    }

    if (!this.hasValidLocation()) {
      return;
    }

    this.isLoadingMore.set(true);
    this.nearbyService
      .getNearbyBusinesses({
        ...this.buildApiParams(),
        cursor,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ businesses, meta }) => {
          const existingIds = new Set(this.nearbyBusinesses().map((b) => b.id));
          const newBusinesses = businesses.filter(
            (b) => !existingIds.has(b.id),
          );
          this.nearbyBusinesses.update((current) => [
            ...current,
            ...newBusinesses,
          ]);
          this.nextCursor.set(meta.nextCursor ?? null);
          this.isLoadingMore.set(false);
          this.observeLastBusinessCard();
        },
        error: () => {
          this.isLoadingMore.set(false);
        },
      });
  }

  private buildTabs(businesses: NearbyBusiness[]): string[] {
    const typesPresent = new Set(businesses.map((b) => b.businessType));
    return BUSINESS_TYPE_ORDER.filter((t) => typesPresent.has(t));
  }

  private hasValidLocation(): boolean {
    const loc = this.userLocation();
    return (
      !!loc &&
      Number.isFinite(loc.lat) &&
      Number.isFinite(loc.lng) &&
      (loc.lat !== 0 || loc.lng !== 0)
    );
  }

  private promptForLocationSelection(): void {
    this.nearbyBusinesses.set([]);
    this.nextCursor.set(null);
    this.allTags.set([]);
    this.businessTypeTabs.set([]);
    this.isLoading.set(false);
    this.disconnectIntersectionObserver();
    this.locationSelectionService.open();
  }

  private observeLastBusinessCard(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    if (!this.nextCursor() || this.nearbyBusinesses().length === 0) {
      this.disconnectIntersectionObserver();
      return;
    }

    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.loadMore();
          }
        },
        {
          root: null,
          threshold: 0.2,
          rootMargin: '120px 0px',
        },
      );
    }

    requestAnimationFrame(() => {
      const nextLastCard = this.document.querySelector(
        'lib-business-card[data-last-card="true"]',
      );
      if (!nextLastCard) {
        return;
      }

      if (this.observedLastCard && this.observedLastCard !== nextLastCard) {
        this.intersectionObserver?.unobserve(this.observedLastCard);
      }

      this.observedLastCard = nextLastCard;
      this.intersectionObserver?.observe(nextLastCard);
    });
  }

  private disconnectIntersectionObserver(): void {
    if (this.observedLastCard) {
      this.intersectionObserver?.unobserve(this.observedLastCard);
      this.observedLastCard = null;
    }
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
  }

  private scrollActiveChipIntoView(): void {
    const row = this.document.querySelector(
      '.dh-chips-row',
    ) as HTMLElement | null;
    const activeChip = this.document.querySelector(
      '.dh-chip.dh-chip-active',
    ) as HTMLElement | null;
    if (!row || !activeChip) return;

    const targetScrollLeft =
      activeChip.offsetLeft - row.clientWidth / 2 + activeChip.offsetWidth / 2;

    row.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
  }

  private isSameHomeRequest(
    previousParams: ReturnType<HomeComponent['buildApiParams']> | null,
    nextParams: ReturnType<HomeComponent['buildApiParams']>,
  ): boolean {
    if (!previousParams) return false;

    const sameBusinessType =
      previousParams.businessType === nextParams.businessType;
    const sameTagIds = previousParams.tagIds === nextParams.tagIds;
    const sameVegOnly = previousParams.vegOnly === nextParams.vegOnly;
    const sameSort = previousParams.sort === nextParams.sort;
    const sameFreeDelivery =
      previousParams.freeDelivery === nextParams.freeDelivery;
    const sameRadius = previousParams.radiusKm === nextParams.radiusKm;

    const coordinateDeltaMeters = getDistance(
      { latitude: previousParams.lat, longitude: previousParams.lng },
      { latitude: nextParams.lat, longitude: nextParams.lng },
    );

    return (
      sameBusinessType &&
      sameTagIds &&
      sameVegOnly &&
      sameSort &&
      sameFreeDelivery &&
      sameRadius &&
      coordinateDeltaMeters < 25
    );
  }

  private mapSelectedLocation(selectedLoc: {
    label: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  }): { lat: number; lng: number; label: string; address: string } {
    return {
      lat: selectedLoc.coordinates?.lat ?? 0,
      lng: selectedLoc.coordinates?.lng ?? 0,
      label: selectedLoc.label,
      address: selectedLoc.address,
    };
  }
}
