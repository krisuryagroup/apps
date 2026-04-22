import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { BehaviorSubject, of } from 'rxjs';
import { HomeComponent } from './home.component';
import {
  NearbyBusinessesService,
  TagsService,
  AnalyticsService,
  LocationSelectionService,
  BannerService,
} from '@zitro/services';
import { ThemeService } from '@zitro/theme';
import { provideI18nForTests } from '@zitro/i18n';
function createMockNearbyService() {
  return { getNearbyBusinesses: vi.fn(() => of({ businesses: [] })) };
}

function createMockTagsService() {
  return { getTags: vi.fn(() => of([])) };
}

function createMockThemeService() {
  return { applyBusinessTypeTheme: vi.fn() };
}

function createMockAnalyticsService() {
  return { logScreenView: vi.fn(() => Promise.resolve()) };
}

function createMockLocationService() {
  const selectedLocation$ = new BehaviorSubject({
    label: 'Home',
    address: 'Set your location',
    type: 'none' as const,
  });
  const sheetOpen$ = new BehaviorSubject(false);

  return {
    selectedLocation$,
    sheetOpen$,
    open: vi.fn(),
    get snapshot() {
      return selectedLocation$.value;
    },
  };
}

function createMockBannerService() {
  return { getBanners: vi.fn(() => Promise.resolve([])) };
}

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        provideI18nForTests(),
        { provide: NearbyBusinessesService, useValue: createMockNearbyService() },
        { provide: TagsService, useValue: createMockTagsService() },
        { provide: ThemeService, useValue: createMockThemeService() },
        { provide: AnalyticsService, useValue: createMockAnalyticsService() },
        { provide: LocationSelectionService, useValue: createMockLocationService() },
        { provide: BannerService, useValue: createMockBannerService() },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialise with loading state true', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    expect(component.isLoading()).toBe(true);
  });

  it('should initialise with empty banners', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.banners()).toEqual([]);
  });

  it('should initialise with veg filter off', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.isPureVeg()).toBe(false);
  });

  it('should toggle veg filter', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    expect(component.isPureVeg()).toBe(false);
    component.togglePureVeg();
    expect(component.isPureVeg()).toBe(true);
    component.togglePureVeg();
    expect(component.isPureVeg()).toBe(false);
  });

  it('should update search query on input event', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const event = { target: { value: 'biryani' } } as unknown as Event;
    component.onSearchInput(event);
    expect(component.searchQuery()).toBe('biryani');
  });

  it('should clear search query', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const event = { target: { value: 'pizza' } } as unknown as Event;
    component.onSearchInput(event);
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });

  it('should update active tab and reset tag filter on tab change', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const themeService = TestBed.inject(ThemeService as any);

    component.onTabChange('grocery');
    expect(component.activeTab()).toBe('grocery');
    expect(component.activeTagFilter()).toBeNull();
    expect(themeService.applyBusinessTypeTheme).toHaveBeenCalledWith('grocery');
  });

  it('should toggle tag filter on and off', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    component.onTagFilterClick('pizza');
    expect(component.activeTagFilter()).toBe('pizza');
    component.onTagFilterClick('pizza');
    expect(component.activeTagFilter()).toBeNull();
  });

  it('should return empty displayBusinesses when no nearby businesses', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance.displayBusinesses()).toEqual([]);
  });

  it('should open location modal and skip nearby request when coordinates are missing', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const nearbyService = TestBed.inject(NearbyBusinessesService as any);
    const locationSelectionService = TestBed.inject(LocationSelectionService as any);

    await component.ngOnInit();

    expect(locationSelectionService.open).toHaveBeenCalled();
    expect(nearbyService.getNearbyBusinesses).not.toHaveBeenCalled();
  });

  it('should default nearby businessType to restaurant when no tab is selected', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const nearbyService = TestBed.inject(NearbyBusinessesService as any);
    const locationSelectionService = TestBed.inject(LocationSelectionService as any);

    locationSelectionService.selectedLocation$.next({
      label: 'Home',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 26.8467, lng: 80.9462 },
    });

    await component.ngOnInit();

    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 26.8467,
        lng: 80.9462,
        businessType: 'restaurant',
      })
    );
  });

  it('should not call nearby while location modal is open even if coordinates arrive', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const nearbyService = TestBed.inject(NearbyBusinessesService as any);
    const locationSelectionService = TestBed.inject(LocationSelectionService as any);

    locationSelectionService.sheetOpen$.next(true);
    await component.ngOnInit();
    nearbyService.getNearbyBusinesses.mockClear();

    locationSelectionService.selectedLocation$.next({
      label: 'Current Location',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 26.8467, lng: 80.9462 },
    });

    expect(nearbyService.getNearbyBusinesses).not.toHaveBeenCalled();

    locationSelectionService.sheetOpen$.next(false);

    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalled();
  });

  it('should not call nearby multiple times for the same initial location state', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const nearbyService = TestBed.inject(NearbyBusinessesService as any);
    const locationSelectionService = TestBed.inject(LocationSelectionService as any);

    locationSelectionService.selectedLocation$.next({
      label: 'Current Location',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 26.8467, lng: 80.9462 },
    });

    await component.ngOnInit();
    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalledTimes(1);

    locationSelectionService.sheetOpen$.next(true);
    locationSelectionService.sheetOpen$.next(false);
    locationSelectionService.selectedLocation$.next({
      label: 'Current Location',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 26.8467, lng: 80.9462 },
    });

    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalledTimes(1);
  });

  it('should not call nearby again when auto-location only shifts a few meters', async () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    const nearbyService = TestBed.inject(NearbyBusinessesService as any);
    const locationSelectionService = TestBed.inject(LocationSelectionService as any);

    locationSelectionService.selectedLocation$.next({
      label: 'Current Location',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 28.608366050966605, lng: 77.45597726127718 },
    });

    await component.ngOnInit();
    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalledTimes(1);

    locationSelectionService.selectedLocation$.next({
      label: 'Current Location',
      address: 'Lucknow',
      type: 'gps',
      coordinates: { lat: 28.608298999999995, lng: 77.45609658 },
    });

    expect(nearbyService.getNearbyBusinesses).toHaveBeenCalledTimes(1);
  });
});
