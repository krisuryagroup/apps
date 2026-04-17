import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NearbyBusinessesService, TagsService, AnalyticsService } from '@zitro/services';
import { ThemeService } from '@zitro/theme';
import { NearbyBusiness, PlatformTag } from '@zitro/models';
import { BusinessCardComponent } from '@zitro/ui';
import { CartSummaryComponent } from '@zitro/ui';
import { BannerComponent } from '@zitro/ui';
import { LoaderComponent } from '@zitro/ui';
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
    CommonModule,
    FormsModule,
    BusinessCardComponent,
    CartSummaryComponent,
    BannerComponent,
    LoaderComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  private nearbyService = inject(NearbyBusinessesService);
  private tagsService = inject(TagsService);
  private themeService = inject(ThemeService);
  private analyticsService = inject(AnalyticsService);

  readonly BUSINESS_TYPE_LABELS = BUSINESS_TYPE_LABELS;
  readonly BUSINESS_TYPE_ICONS = BUSINESS_TYPE_ICONS;

  isLoading = true;

  userLocation: UserLocation | null = null;
  nearbyBusinesses: NearbyBusiness[] = [];
  allTags: PlatformTag[] = [];
  businessTypeTabs: string[] = [];
  activeTab = '';
  activeTagFilter: string | null = null;

  // Search + veg filter (kept from previous home)
  searchQuery = '';
  isListening = false;
  isPureVeg = false;

  get filteredByTab(): NearbyBusiness[] {
    if (!this.activeTab) return this.nearbyBusinesses;
    return this.nearbyBusinesses.filter(b => b.businessType === this.activeTab);
  }

  get displayTags(): PlatformTag[] {
    const tagSlugsInTab = new Set(this.filteredByTab.flatMap(b => b.tags));
    return this.allTags.filter(t => tagSlugsInTab.has(t.slug));
  }

  get displayBusinesses(): NearbyBusiness[] {
    if (!this.activeTagFilter) return this.filteredByTab;
    return this.filteredByTab.filter(b => b.tags.includes(this.activeTagFilter!));
  }

  async ngOnInit(): Promise<void> {
    this.userLocation = this.loadStoredLocation();
    await this.analyticsService.logScreenView('Home', 'HomeComponent');
    this.loadData();
  }

  onTabChange(type: string): void {
    this.activeTab = type;
    this.activeTagFilter = null;
    this.themeService.applyBusinessTypeTheme(type);
  }

  onTagFilterClick(slug: string): void {
    this.activeTagFilter = this.activeTagFilter === slug ? null : slug;
  }

  onBusinessClick(business: NearbyBusiness): void {
    this.router.navigate(['/listing'], { queryParams: { businessSlug: business.slug } });
  }

  onLocationHeaderClick(): void {
    this.router.navigate(['/location-selection']);
  }

  // Search (kept from previous home)
  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/listing'], {
        queryParams: { search: this.searchQuery.trim() },
      });
    }
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  togglePureVeg(): void {
    this.isPureVeg = !this.isPureVeg;
  }

  startVoiceSearch(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || this.isListening) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    this.isListening = true;
    recognition.onresult = (event: any) => {
      this.searchQuery = event.results[0][0].transcript;
      this.isListening = false;
      this.onSearch();
    };
    recognition.onerror = () => { this.isListening = false; };
    recognition.onend = () => { this.isListening = false; };
    recognition.start();
  }

  private loadData(): void {
    const loc = this.userLocation;
    const lat = loc?.lat ?? 0;
    const lng = loc?.lng ?? 0;

    this.isLoading = true;
    forkJoin({
      businesses: this.nearbyService.getNearbyBusinesses(lat, lng, NEARBY_API_RADIUS_KM),
      tags: this.tagsService.getTags(),
    }).subscribe({
      next: ({ businesses, tags }) => {
        this.nearbyBusinesses = businesses;
        this.allTags = tags;
        this.businessTypeTabs = this.buildTabs(businesses);
        this.activeTab = this.businessTypeTabs[0] ?? '';
        if (this.activeTab) {
          this.themeService.applyBusinessTypeTheme(this.activeTab);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
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
