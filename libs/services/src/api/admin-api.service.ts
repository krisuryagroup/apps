import { Injectable, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ZITRO_API_BASE_URL } from '../tokens';
import { AdminAuthTokenService } from '../admin-auth-token.service';

interface AdminJwtPayload {
  sub: string;
  role: string;
  exp: number;
  /** JWT encodes repeated "permission" claims — a single one decodes as a bare string, not an array. */
  permission?: string | string[];
}

/** Decode a JWT payload without verifying signature — client-side only. */
function decodeAdminJwt(token: string): AdminJwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as AdminJwtPayload;
  } catch {
    return null;
  }
}

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
  apps: string[];
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
  private readonly tokenService = inject(AdminAuthTokenService);

  /** Decoded payload from the stored Admin JWT, or null if not logged in. */
  readonly currentAdmin = computed<AdminJwtPayload | null>(() => {
    const token = this.tokenService.token();
    if (!token) return null;
    return decodeAdminJwt(token);
  });

  /** JWT `role` claim is lowercase snake_case (super_admin/ops/support/finance) — see TokenService.CreateAdminToken. */
  readonly isSuperAdmin = computed(
    () => this.currentAdmin()?.role === 'super_admin',
  );

  private readonly currentPermissions = computed<string[]>(() => {
    const p = this.currentAdmin()?.permission;
    if (!p) return [];
    return Array.isArray(p) ? p : [p];
  });

  /** SuperAdmin bypasses all permission checks server-side too — see RequirePermissionAttribute. */
  hasPermission(permission: string): boolean {
    return (
      this.isSuperAdmin() || this.currentPermissions().includes(permission)
    );
  }

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

  /**
   * Creates the business, a not-yet-usable owner account, and a single-use invite in
   * one atomic step, then emails the owner a setup link. There is no separate
   * "create business" call in this flow — POST /api/businesses/invite does both.
   */
  inviteBusinessOwner(
    req: Record<string, unknown>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}/api/businesses/invite`,
      req,
    );
  }

  listBusinessUsers(businessId: string): Observable<BusinessUserDto[]> {
    return this.http.get<BusinessUserDto[]>(
      `${this.baseUrl}/api/businesses/${businessId}/users`,
    );
  }

  // ── Brands ──────────────────────────────────────────────────────────────────

  listBrands(
    params?: Record<string, string>,
  ): Observable<PagedResult<BrandDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<PagedResult<BrandDto>>(`${this.baseUrl}/api/brands`, {
      params: p,
    });
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

  /**
   * One-time migration: reparents a branch's own products/categories to its brand's
   * master catalog and switches it to shared menu mode. Use to retrofit an existing
   * independent branch as the first branch of a brand.
   */
  promoteBranchToBrandMaster(
    businessId: string,
  ): Observable<{ productsPromoted: number; categoriesPromoted: number }> {
    return this.http.post<{
      productsPromoted: number;
      categoriesPromoted: number;
    }>(
      `${this.baseUrl}/api/businesses/${businessId}/promote-to-brand-master`,
      {},
    );
  }

  // ── Tags ────────────────────────────────────────────────────────────────────

  listAdminTags(): Observable<TagDto[]> {
    return this.http.get<TagDto[]>(`${this.baseUrl}/api/admin/tags`);
  }

  createTag(req: {
    name: string;
    iconUrl?: string;
    priority?: number;
  }): Observable<TagDto> {
    return this.http.post<TagDto>(`${this.baseUrl}/api/admin/tags`, req);
  }

  updateTag(
    id: string,
    req: { name: string; iconUrl?: string; priority?: number },
  ): Observable<TagDto> {
    return this.http.put<TagDto>(`${this.baseUrl}/api/admin/tags/${id}`, req);
  }

  deactivateTag(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/admin/tags/${id}`);
  }

  listTagBusinesses(tagId: string): Observable<TagBusinessDto[]> {
    return this.http.get<TagBusinessDto[]>(
      `${this.baseUrl}/api/admin/tags/${tagId}/businesses`,
    );
  }

  /** Adds this tag to a business without removing its existing tags. */
  addBusinessTag(businessId: string, tagId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/admin/businesses/${businessId}/tags`,
      { tagIds: [tagId] },
    );
  }

  removeBusinessTag(businessId: string, tagId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/admin/businesses/${businessId}/tags/${tagId}`,
    );
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
    // Use admin endpoint for global listing (no businessSlug required).
    // GET /api/categories requires businessSlug (business-specific); the admin
    // global catalog uses GET /api/admin/categories instead.
    return this.http.get<CategoryDto[]>(`${this.baseUrl}/api/admin/categories`);
  }

  /** Backend only returns `{ id }` on create, not a full CategoryDto — refetch the list to display it. */
  createCategory(req: Record<string, unknown>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
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

  /**
   * Backend returns `{ orders, totalCount, page, pageSize }` (see
   * AdminSearchOrdersResponse), not a bare array — normalize to the shared
   * PagedResult shape here so callers don't each have to know the field-name
   * mismatch.
   */
  listAdminOrders(
    params?: Record<string, string>,
  ): Observable<PagedResult<OrderSummaryDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http
      .get<{
        orders: OrderSummaryDto[];
        totalCount: number;
        page: number;
        pageSize: number;
      }>(`${this.baseUrl}/api/admin/orders`, { params: p })
      .pipe(
        map((r) => ({
          items: r.orders,
          totalCount: r.totalCount,
          page: r.page,
          pageSize: r.pageSize,
        })),
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

  /**
   * Backend returns `{ items, totalCount, page, pageSize }` — `totalCount`,
   * not `total`. Normalize to the shared PagedResult shape here.
   */
  listCoupons(
    params?: Record<string, string>,
  ): Observable<PagedResult<CouponDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http
      .get<{
        items: CouponDto[];
        totalCount: number;
        page: number;
        pageSize: number;
      }>(`${this.baseUrl}/api/admin/coupons`, { params: p })
      .pipe(
        map((r) => ({
          items: r.items,
          totalCount: r.totalCount,
          page: r.page,
          pageSize: r.pageSize,
        })),
      );
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

  /**
   * Backend returns `{ items, total }` (see ListPartnersResponse) — no `page`/
   * `pageSize` echoed back, unlike the other paged admin endpoints. Normalize
   * to the shared PagedResult shape using the page/pageSize we requested with.
   */
  listDeliveryPartners(
    params?: Record<string, string>,
  ): Observable<PagedResult<DeliveryPartnerDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    const page = Number(params?.['page'] ?? 1);
    const pageSize = Number(params?.['pageSize'] ?? 20);
    return this.http
      .get<{
        items: DeliveryPartnerDto[];
        total: number;
      }>(`${this.baseUrl}/api/admin/delivery/partners`, { params: p })
      .pipe(
        map((r) => ({ items: r.items, totalCount: r.total, page, pageSize })),
      );
  }

  updateDeliveryPartnerStatus(id: string, status: string): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/admin/delivery/partners/${id}/status`,
      { status },
    );
  }

  // ── Delivery zones ──────────────────────────────────────────────────────────

  /** Zones are strictly business-scoped server-side — businessId is required. */
  listDeliveryZones(businessId: string): Observable<DeliveryZoneDto[]> {
    const params = new HttpParams().set('businessId', businessId);
    return this.http.get<DeliveryZoneDto[]>(
      `${this.baseUrl}/api/admin/delivery/zones`,
      { params },
    );
  }

  createDeliveryZone(req: {
    businessId: string;
    name: string;
    polygonCoords: string;
    baseFee: number;
    feePerKm: number;
    surgeMultiplier?: number;
  }): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}/api/admin/delivery/zones`,
      req,
    );
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  listAdminPayouts(
    params?: Record<string, string>,
  ): Observable<PagedResult<AdminPayoutDto>> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<PagedResult<AdminPayoutDto>>(
      `${this.baseUrl}/api/admin/payouts`,
      { params: p },
    );
  }

  /**
   * Request body field names are `from`/`to` (matches GeneratePayoutsRequest's
   * DateOnly From/To) — NOT fromDate/toDate, which silently bound to nothing
   * and generated payouts against default dates.
   */
  generatePayouts(
    fromDate: string,
    toDate: string,
  ): Observable<GeneratedPayoutDto[]> {
    return this.http.post<GeneratedPayoutDto[]>(
      `${this.baseUrl}/api/admin/payouts/generate`,
      { from: fromDate, to: toDate },
    );
  }

  markPayoutPaid(
    id: string,
    payoutReference: string,
  ): Observable<MarkPayoutPaidDto> {
    return this.http.put<MarkPayoutPaidDto>(
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

  /** Uploads an image file to Firebase Storage and returns its public URL. */
  uploadBannerMedia(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.baseUrl}/api/banners/media`,
      formData,
    );
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
    permissions: string[];
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

  resetAdminPassword(id: string, newPassword: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/admin/admins/${id}/reset-password`,
      { newPassword },
    );
  }

  getMyProfile(): Observable<MyProfileDto> {
    return this.http.get<MyProfileDto>(`${this.baseUrl}/api/admin/admins/me`);
  }

  changeMyPassword(
    currentPassword: string,
    newPassword: string,
  ): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/api/admin/admins/me/password`, {
      currentPassword,
      newPassword,
    });
  }
}

export interface MyProfileDto {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLoginAt?: string;
  permissions: string[];
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

/**
 * Matches the backend's shared `PagedResult<T>` (Zitro.Shared) JSON shape exactly —
 * that class serializes the count field as `totalCount`, not `total`. Most admin
 * paged endpoints return this shape directly; `listDeliveryPartners` is normalized
 * to it too (its backend response has a differently-named/shaped count field).
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
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
  menuMode: 'shared' | 'independent';
  brandId?: string;
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
  coordinatesLat?: number;
  coordinatesLng?: number;
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
  slug: string;
  name: string;
  iconUrl?: string;
  priority: number;
  isActive: boolean;
}

export interface TagBusinessDto {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
}

/** Matches GET /api/products/search's actual SearchProductDto shape exactly. */
export interface ProductDto {
  id: string;
  name: string;
  description?: string;
  price: number;
  isEnabledForOnlineOrders: boolean;
  categoryId?: string;
  businessId?: string;
}

/** Matches GET /api/admin/categories' actual anonymous-object shape exactly. */
export interface CategoryDto {
  id: string;
  name: string;
  path: string;
  parentCategoryId?: string;
  businessId?: string;
  priority: number;
  isEnabledForOnlineOrders: boolean;
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

/** Matches backend ZoneDto exactly — zones don't echo businessId back (implicit from the query filter). */
export interface DeliveryZoneDto {
  id: string;
  name: string;
  baseFee: number;
  feePerKm: number;
  surgeMultiplier: number;
  isActive: boolean;
}

export interface AdminPayoutDto {
  id: string;
  businessId: string;
  businessName: string;
  periodFrom: string;
  periodTo: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  orderCount: number;
  status: string;
  payoutReference?: string;
  paidAt?: string;
}

/** Shape returned by POST /payouts/generate — narrower than AdminPayoutDto (no period/reference/paidAt). */
export interface GeneratedPayoutDto {
  payoutId: string;
  businessId: string;
  businessName: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  orderCount: number;
  status: string;
}

export interface MarkPayoutPaidDto {
  payoutId: string;
  businessId: string;
  netAmount: number;
  payoutReference: string;
  paidAt: string;
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
