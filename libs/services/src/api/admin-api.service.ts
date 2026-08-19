import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ZITRO_API_BASE_URL } from '../tokens';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

// ── TASK-036 response types ────────────────────────────────────────────────────

export interface AppConfigResponse {
  features: Record<string, boolean>;
  ui: Record<string, unknown> | null;
  maintenance: {
    isUnderMaintenance: boolean;
    maintenanceTitle: string | null;
    maintenanceMessage: string | null;
  };
  translations: Record<string, string>;
  themes: { available: AppThemeDto[]; userDefault: string };
}

export interface TranslationsResponse {
  lang: string;
  version: string;
  keys: Record<string, string>;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface TranslationDto {
  id: string;
  lang: string;
  key: string;
  app: string;
  value: string;
  updatedAt: string;
}

export interface AppFeatureFlagDto {
  id: string;
  app: string;
  platform: string;
  key: string;
  isEnabled: boolean;
  description: string | null;
  updatedAt: string;
}

export interface AppThemeDto {
  id: string;
  name: string;
  previewColor: string | null;
  isBuiltIn: boolean;
  tokens: Record<string, string> | null;
}

export interface UiConfigDto {
  app: string;
  config: Record<string, unknown> | null;
  updatedAt: string;
}

/**
 * API calls for the Admin portal — covers both zitro-admin and zitro-superadmin
 * since they share the same backend Admin JWT scheme.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ZITRO_API_BASE_URL);

  // ── Auth ────────────────────────────────────────────────────────────────────

  login(req: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(
      `${this.baseUrl}/api/admin/auth/login`,
      req,
    );
  }

  // ── App config (public read, admin write) ───────────────────────────────────

  getAppConfig(
    app: string,
    platform = 'web',
    lang = 'en',
  ): Observable<AppConfigResponse> {
    const params = new HttpParams()
      .set('app', app)
      .set('platform', platform)
      .set('lang', lang);
    return this.http.get<AppConfigResponse>(
      `${this.baseUrl}/api/app-config/bundle`,
      { params },
    );
  }

  getSupportedLanguages(): Observable<SupportedLanguage[]> {
    return this.http.get<SupportedLanguage[]>(
      `${this.baseUrl}/api/app-config/supported-languages`,
    );
  }

  getTranslations(lang: string, app: string): Observable<TranslationsResponse> {
    const params = new HttpParams().set('lang', lang).set('app', app);
    return this.http.get<TranslationsResponse>(
      `${this.baseUrl}/api/translations`,
      { params },
    );
  }

  // ── Translations admin ──────────────────────────────────────────────────────

  listTranslations(lang: string, app?: string): Observable<TranslationDto[]> {
    let params = new HttpParams().set('lang', lang);
    if (app) params = params.set('app', app);
    return this.http.get<TranslationDto[]>(
      `${this.baseUrl}/api/admin/translations`,
      { params },
    );
  }

  upsertTranslation(req: {
    lang: string;
    key: string;
    app: string | null;
    value: string;
  }): Observable<TranslationDto> {
    return this.http.post<TranslationDto>(
      `${this.baseUrl}/api/admin/translations`,
      req,
    );
  }

  deleteTranslation(key: string, lang: string, app: string): Observable<void> {
    const params = new HttpParams().set('lang', lang).set('app', app);
    return this.http.delete<void>(
      `${this.baseUrl}/api/admin/translations/${encodeURIComponent(key)}`,
      { params },
    );
  }

  // ── App feature flags admin ─────────────────────────────────────────────────

  listAppFeatureFlags(appSlug: string): Observable<AppFeatureFlagDto[]> {
    return this.http.get<AppFeatureFlagDto[]>(
      `${this.baseUrl}/api/admin/app-feature-flags/${appSlug}`,
    );
  }

  updateAppFeatureFlag(
    appSlug: string,
    req: {
      key: string;
      isEnabled: boolean;
      platform?: string;
      description?: string;
    },
  ): Observable<AppFeatureFlagDto> {
    return this.http.put<AppFeatureFlagDto>(
      `${this.baseUrl}/api/admin/app-feature-flags/${appSlug}`,
      req,
    );
  }

  // ── Themes admin ────────────────────────────────────────────────────────────

  getAdminThemes(app?: string): Observable<AppThemeDto[]> {
    const params = app ? new HttpParams().set('app', app) : undefined;
    return this.http.get<AppThemeDto[]>(`${this.baseUrl}/api/admin/themes`, {
      params,
    });
  }

  createTheme(req: {
    name: string;
    previewColor?: string;
    tokensJson: string;
    apps?: string[];
  }): Observable<AppThemeDto> {
    return this.http.post<AppThemeDto>(`${this.baseUrl}/api/admin/themes`, req);
  }

  updateTheme(
    id: string,
    req: {
      name: string;
      previewColor?: string;
      tokensJson: string;
      apps?: string[];
    },
  ): Observable<AppThemeDto> {
    return this.http.put<AppThemeDto>(
      `${this.baseUrl}/api/admin/themes/${id}`,
      req,
    );
  }

  // ── UI config admin ─────────────────────────────────────────────────────────

  updateUiConfig(app: string, configJson: string): Observable<UiConfigDto> {
    return this.http.put<UiConfigDto>(
      `${this.baseUrl}/api/admin/ui-config/${app}`,
      { configJson },
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  getDashboard(): Observable<AdminDashboardDto> {
    return this.http.get<AdminDashboardDto>(
      `${this.baseUrl}/api/admin/dashboard`,
    );
  }

  // ── Businesses ──────────────────────────────────────────────────────────────

  listBusinesses(
    params?: Record<string, string>,
  ): Observable<PagedResult<BusinessSummaryDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<PagedResult<BusinessSummaryDto>>(
      `${this.baseUrl}/api/businesses`,
      { params: p },
    );
  }

  getBusinessById(id: string): Observable<BusinessDetailDto> {
    return this.http.get<BusinessDetailDto>(
      `${this.baseUrl}/api/businesses/${id}`,
    );
  }

  createBusiness(req: Record<string, unknown>): Observable<BusinessDetailDto> {
    return this.http.post<BusinessDetailDto>(
      `${this.baseUrl}/api/businesses`,
      req,
    );
  }

  updateBusiness(
    id: string,
    req: Record<string, unknown>,
  ): Observable<BusinessDetailDto> {
    return this.http.put<BusinessDetailDto>(
      `${this.baseUrl}/api/businesses/${id}`,
      req,
    );
  }

  approveBusiness(
    id: string,
    approved: boolean,
    rejectionReason?: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/businesses/${id}/approve`,
      { approved, rejectionReason },
    );
  }

  inviteBusinessOwner(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/businesses/invite`, req);
  }

  listBusinessUsers(businessId: string): Observable<BusinessUserDto[]> {
    return this.http.get<BusinessUserDto[]>(
      `${this.baseUrl}/api/businesses/${businessId}/users`,
    );
  }

  // ── Brands ──────────────────────────────────────────────────────────────────

  listBrands(): Observable<BrandDto[]> {
    return this.http.get<BrandDto[]>(`${this.baseUrl}/api/brands`);
  }

  createBrand(req: {
    name: string;
    description?: string;
    logoUrl?: string;
  }): Observable<BrandDto> {
    return this.http.post<BrandDto>(`${this.baseUrl}/api/brands`, req);
  }

  updateBrand(
    id: string,
    req: { name: string; description?: string; logoUrl?: string },
  ): Observable<BrandDto> {
    return this.http.put<BrandDto>(`${this.baseUrl}/api/brands/${id}`, req);
  }

  deleteBrand(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/brands/${id}`);
  }

  getBrandBranches(brandId: string): Observable<BusinessSummaryDto[]> {
    return this.http.get<BusinessSummaryDto[]>(
      `${this.baseUrl}/api/brands/${brandId}/branches`,
    );
  }

  // ── Tags ────────────────────────────────────────────────────────────────────

  listAdminTags(): Observable<TagDto[]> {
    return this.http.get<TagDto[]>(`${this.baseUrl}/api/admin/tags`);
  }

  createTag(req: {
    name: string;
    icon?: string;
    priority?: number;
  }): Observable<TagDto> {
    return this.http.post<TagDto>(`${this.baseUrl}/api/admin/tags`, req);
  }

  updateTag(
    id: string,
    req: { name: string; icon?: string; priority?: number },
  ): Observable<TagDto> {
    return this.http.put<TagDto>(`${this.baseUrl}/api/admin/tags/${id}`, req);
  }

  deactivateTag(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/admin/tags/${id}`);
  }

  // ── Products ────────────────────────────────────────────────────────────────

  searchProducts(params?: Record<string, string>): Observable<ProductDto[]> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/products/search`, {
      params: p,
    });
  }

  createProduct(req: Record<string, unknown>): Observable<ProductDto> {
    return this.http.post<ProductDto>(
      `${this.baseUrl}/api/admin/products`,
      req,
    );
  }

  updateProduct(
    id: string,
    req: Record<string, unknown>,
  ): Observable<ProductDto> {
    return this.http.put<ProductDto>(
      `${this.baseUrl}/api/admin/products/${id}`,
      req,
    );
  }

  deleteProduct(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/admin/products/${id}`);
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  listCategories(params?: Record<string, string>): Observable<CategoryDto[]> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<CategoryDto[]>(`${this.baseUrl}/api/categories`, {
      params: p,
    });
  }

  createCategory(req: Record<string, unknown>): Observable<CategoryDto> {
    return this.http.post<CategoryDto>(
      `${this.baseUrl}/api/admin/categories`,
      req,
    );
  }

  updateCategory(
    id: string,
    req: Record<string, unknown>,
  ): Observable<CategoryDto> {
    return this.http.put<CategoryDto>(
      `${this.baseUrl}/api/admin/categories/${id}`,
      req,
    );
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/admin/categories/${id}`);
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  listAdminOrders(
    params?: Record<string, string>,
  ): Observable<OrderSummaryDto[]> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<OrderSummaryDto[]>(
      `${this.baseUrl}/api/admin/orders`,
      { params: p },
    );
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  listAdminCustomers(
    params?: Record<string, string>,
  ): Observable<PagedResult<CustomerDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<PagedResult<CustomerDto>>(
      `${this.baseUrl}/api/admin/users`,
      { params: p },
    );
  }

  updateCustomerStatus(id: string, isActive: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/admin/users/${id}/status`, {
      isActive,
    });
  }

  // ── Coupons ─────────────────────────────────────────────────────────────────

  listCoupons(): Observable<CouponDto[]> {
    return this.http.get<CouponDto[]>(`${this.baseUrl}/api/admin/coupons`);
  }

  createCoupon(req: Record<string, unknown>): Observable<CouponDto> {
    return this.http.post<CouponDto>(`${this.baseUrl}/api/admin/coupons`, req);
  }

  updateCoupon(
    id: string,
    req: Record<string, unknown>,
  ): Observable<CouponDto> {
    return this.http.put<CouponDto>(
      `${this.baseUrl}/api/admin/coupons/${id}`,
      req,
    );
  }

  deleteCoupon(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/admin/coupons/${id}`);
  }

  // ── Delivery partners ───────────────────────────────────────────────────────

  listDeliveryPartners(
    params?: Record<string, string>,
  ): Observable<DeliveryPartnerDto[]> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<DeliveryPartnerDto[]>(
      `${this.baseUrl}/api/admin/delivery/partners`,
      { params: p },
    );
  }

  updateDeliveryPartnerStatus(id: string, status: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/admin/delivery/partners/${id}/status`,
      { status },
    );
  }

  // ── Delivery zones ──────────────────────────────────────────────────────────

  listDeliveryZones(): Observable<DeliveryZoneDto[]> {
    return this.http.get<DeliveryZoneDto[]>(
      `${this.baseUrl}/api/admin/delivery/zones`,
    );
  }

  createDeliveryZone(
    req: Record<string, unknown>,
  ): Observable<DeliveryZoneDto> {
    return this.http.post<DeliveryZoneDto>(
      `${this.baseUrl}/api/admin/delivery/zones`,
      req,
    );
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  generatePayouts(fromDate: string, toDate: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/api/admin/payouts/generate`, {
      fromDate,
      toDate,
    });
  }

  markPayoutPaid(id: string, payoutReference: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/admin/payouts/${id}/mark-paid`,
      { payoutReference },
    );
  }

  // ── Banners ─────────────────────────────────────────────────────────────────

  listBanners(): Observable<BannerAdminDto[]> {
    return this.http.get<BannerAdminDto[]>(`${this.baseUrl}/api/banners`);
  }

  createBanner(req: Record<string, unknown>): Observable<BannerAdminDto> {
    return this.http.post<BannerAdminDto>(`${this.baseUrl}/api/banners`, req);
  }

  updateBanner(
    id: string,
    req: Record<string, unknown>,
  ): Observable<BannerAdminDto> {
    return this.http.put<BannerAdminDto>(
      `${this.baseUrl}/api/banners/${id}`,
      req,
    );
  }

  deleteBanner(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/banners/${id}`);
  }

  // ── Admin users (SuperAdmin) ────────────────────────────────────────────────

  listAdmins(
    params?: Record<string, string>,
  ): Observable<PagedResult<AdminUserDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<PagedResult<AdminUserDto>>(
      `${this.baseUrl}/api/admin/admins`,
      { params: p },
    );
  }

  createAdmin(req: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Observable<AdminUserDto> {
    return this.http.post<AdminUserDto>(
      `${this.baseUrl}/api/admin/admins`,
      req,
    );
  }

  updateAdmin(
    id: string,
    req: { name: string; role: string; permissions?: string[] },
  ): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(
      `${this.baseUrl}/api/admin/admins/${id}`,
      req,
    );
  }

  setAdminStatus(id: string, activate: boolean): Observable<void> {
    const action = activate ? 'activate' : 'deactivate';
    return this.http.post<void>(
      `${this.baseUrl}/api/admin/admins/${id}/${action}`,
      {},
    );
  }
}

// ── Shared DTO types ──────────────────────────────────────────────────────────

export interface AdminDashboardDto {
  todayOrderCount: number;
  todayRevenue: number;
  newUsersToday: number;
  activeBusinesses: number;
  pendingOnboardingCount: number;
  pendingPayoutCount: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface BusinessSummaryDto {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  town: string;
  onboardingStatus: string;
  isActive: boolean;
  createdAt: string;
}

export interface BusinessDetailDto extends BusinessSummaryDto {
  description?: string;
  phone?: string;
  email?: string;
  fssaiLicenseNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  commissionPercentage?: number;
  onboardingRejectionReason?: string;
  verificationDocs?: unknown[];
}

export interface BusinessUserDto {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  isActive: boolean;
}

export interface BrandDto {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  branchCount?: number;
}

export interface TagDto {
  id: string;
  name: string;
  icon?: string;
  priority: number;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  isAvailable: boolean;
  categoryId?: string;
  businessId?: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  path: string;
  displayOrder: number;
  parentId?: string;
}

export interface OrderSummaryDto {
  id: string;
  orderId: string;
  businessName?: string;
  customerPhone?: string;
  status: string;
  total: number;
  createdAt: string;
}

export interface CustomerDto {
  id: string;
  name?: string;
  phone: string;
  email?: string;
  isActive: boolean;
  totalOrders: number;
  createdAt: string;
}

export interface CouponDto {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  validTo?: string;
  usedCount: number;
}

export interface DeliveryPartnerDto {
  id: string;
  name: string;
  phone: string;
  status: string;
  isAvailable: boolean;
  totalDeliveries: number;
}

export interface DeliveryZoneDto {
  id: string;
  name: string;
  businessId?: string;
  isActive: boolean;
}

export interface BannerAdminDto {
  id: string;
  title: string;
  bannerType: string;
  isActive: boolean;
  displayOrder: number;
  impressionCount: number;
  clickCount: number;
}

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
}
