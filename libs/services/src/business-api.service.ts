import { Injectable, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessAuthTokenService } from './business-auth-token.service';
import { ZITRO_API_BASE_URL } from './tokens';

export interface BusinessOrdersPagedResult {
  orders: BusinessOrderDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface ItemsPagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface BusinessJwtPayload {
  sub: string;
  business_id: string;
  role: string;
  exp: number;
}

/** Decode a JWT payload without verifying signature — client-side only. */
function decodeJwt(token: string): BusinessJwtPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    const payload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as BusinessJwtPayload;
  } catch {
    return null;
  }
}

/**
 * All API calls for the Business Portal (zitro-restaurant).
 * businessId is decoded directly from the stored JWT — never needs to be passed
 * separately.
 */
@Injectable({ providedIn: 'root' })
export class BusinessApiService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(BusinessAuthTokenService);
  private readonly baseUrl = inject(ZITRO_API_BASE_URL);

  /** Decoded payload from the stored Business JWT, or null if not logged in. */
  readonly currentUser = computed<BusinessJwtPayload | null>(() => {
    const token = this.tokenService.token();
    if (!token) return null;
    return decodeJwt(token);
  });

  readonly businessId = computed(() => this.currentUser()?.business_id ?? null);
  readonly currentUserId = computed(() => this.currentUser()?.sub ?? null);

  // ── Auth ────────────────────────────────────────────────────────────────────

  login(phone: string, password: string): Observable<BusinessLoginResponse> {
    return this.http.post<BusinessLoginResponse>(
      `${this.baseUrl}/api/business-auth/login`,
      { phoneNumber: phone, password },
    );
  }

  // ── Public application / invite ─────────────────────────────────────────────

  submitApplication(req: Record<string, unknown>): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-applications`,
      req,
    );
  }

  validateInviteToken(token: string): Observable<{ businessName: string }> {
    return this.http.get<{ businessName: string }>(
      `${this.baseUrl}/api/business-invite/${token}`,
    );
  }

  acceptInvite(token: string, password: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-invite/${token}/accept`,
      { password },
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  getDashboard(businessId: string): Observable<BusinessDashboardDto> {
    return this.http.get<BusinessDashboardDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/dashboard`,
    );
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  listOrders(
    businessId: string,
    params?: Record<string, string>,
  ): Observable<BusinessOrderDto[]> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    // GET .../orders returns a paginated wrapper ({ orders, totalCount, page, pageSize }),
    // not a bare array — unwrap here so every existing caller (typed on the array) keeps
    // working. Found live: the whole wrapper object was landing in a signal typed
    // BusinessOrderDto[], producing "newCollection[Symbol.iterator] is not a function" the
    // moment the template tried to @for over it — the Orders screen appeared empty despite
    // the dashboard correctly showing a non-zero pending count from a different endpoint.
    return this.http
      .get<BusinessOrdersPagedResult>(
        `${this.baseUrl}/api/business-portal/${businessId}/orders`,
        { params: p },
      )
      .pipe(map((res) => res.orders));
  }

  /**
   * Same endpoint as listOrders(), but returns the full paginated wrapper
   * (totalCount included) — for the "All orders" view, which needs a real
   * page count instead of just the current page's rows.
   */
  listOrdersPaged(
    businessId: string,
    params?: Record<string, string>,
  ): Observable<BusinessOrdersPagedResult> {
    let p = new HttpParams();
    if (params)
      Object.entries(params).forEach(([k, v]) => {
        if (v) p = p.set(k, v);
      });
    return this.http.get<BusinessOrdersPagedResult>(
      `${this.baseUrl}/api/business-portal/${businessId}/orders`,
      { params: p },
    );
  }

  getOrderDetail(
    businessId: string,
    orderId: string,
  ): Observable<BusinessOrderDetailDto> {
    return this.http.get<BusinessOrderDetailDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/orders/${orderId}`,
    );
  }

  updateOrderStatus(
    businessId: string,
    orderId: string,
    status: string,
    note?: string,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/orders/${orderId}/status`,
      { status, note },
    );
  }

  // ── Menu ────────────────────────────────────────────────────────────────────

  listCategories(businessId: string): Observable<MenuCategoryDto[]> {
    return this.http.get<MenuCategoryDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/categories`,
    );
  }

  createCategory(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<MenuCategoryDto> {
    return this.http.post<MenuCategoryDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/categories`,
      req,
    );
  }

  updateCategory(
    businessId: string,
    categoryId: string,
    req: Record<string, unknown>,
  ): Observable<MenuCategoryDto> {
    return this.http.put<MenuCategoryDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/categories/${categoryId}`,
      req,
    );
  }

  deleteCategory(businessId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/categories/${categoryId}`,
    );
  }

  listProducts(
    businessId: string,
    categoryId?: string,
  ): Observable<MenuItemDto[]> {
    const params = categoryId
      ? new HttpParams().set('categoryId', categoryId)
      : undefined;
    return this.http.get<MenuItemDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/products`,
      { params },
    );
  }

  createProduct(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<MenuItemDto> {
    return this.http.post<MenuItemDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/products`,
      req,
    );
  }

  updateProduct(
    businessId: string,
    productId: string,
    req: Record<string, unknown>,
  ): Observable<MenuItemDto> {
    return this.http.put<MenuItemDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/products/${productId}`,
      req,
    );
  }

  deleteProduct(businessId: string, productId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/products/${productId}`,
    );
  }

  /**
   * Independent-mode only — creates many products in one call (bulk menu-item grid).
   * Partial-failure tolerant: one bad row doesn't block the rest, each row's outcome is
   * reported back by its index in the request array.
   */
  createProductsBulk(
    businessId: string,
    items: {
      name: string;
      basePrice: number;
      categoryId?: string | null;
      foodType?: string | null;
      isAvailable: boolean;
      imageUrl?: string | null;
    }[],
  ): Observable<{
    items: {
      index: number;
      success: boolean;
      productId?: string;
      error?: string;
      errorCode?: string;
    }[];
  }> {
    return this.http.post<{
      items: {
        index: number;
        success: boolean;
        productId?: string;
        error?: string;
        errorCode?: string;
      }[];
    }>(
      `${this.baseUrl}/api/business-portal/${businessId}/products/bulk`,
      items,
    );
  }

  /** Uploads an image for a menu item and returns its public URL. */
  uploadProductMedia(
    businessId: string,
    file: File,
  ): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.baseUrl}/api/business-portal/${businessId}/products/media`,
      formData,
    );
  }

  /** Independent-mode only — bumps this business's own products by % or flat amount. */
  bulkAdjustProductPrices(
    businessId: string,
    req: {
      categoryId?: string | null;
      isPercentage: boolean;
      isIncrease: boolean;
      value: number;
    },
  ): Observable<{ updatedCount: number }> {
    return this.http.post<{ updatedCount: number }>(
      `${this.baseUrl}/api/business-portal/${businessId}/products/bulk-price-adjust`,
      req,
    );
  }

  // ── Shared brand menu (menu_mode = 'shared' branches only) ────────────────────

  getBrandMasterProducts(
    businessId: string,
  ): Observable<BrandMasterProductDto[]> {
    return this.http.get<BrandMasterProductDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/brand-master-products`,
    );
  }

  getBranchOverrides(businessId: string): Observable<BranchOverrideDto[]> {
    return this.http.get<BranchOverrideDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/branch-overrides`,
    );
  }

  upsertBranchOverride(
    businessId: string,
    req: {
      productId: string;
      priceOverride?: number | null;
      isHidden?: boolean;
      isAvailable?: boolean;
    },
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/branch-overrides`,
      req,
    );
  }

  deleteBranchOverride(
    businessId: string,
    productId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/branch-overrides/${productId}`,
    );
  }

  /** Shared-mode only — bumps this branch's effective price for every brand master
   * product in scope by % or flat amount, writing/updating a branch override per product. */
  bulkAdjustBranchOverridePrices(
    businessId: string,
    req: {
      categoryId?: string | null;
      isPercentage: boolean;
      isIncrease: boolean;
      value: number;
    },
  ): Observable<{ updatedCount: number }> {
    return this.http.post<{ updatedCount: number }>(
      `${this.baseUrl}/api/business-portal/${businessId}/branch-overrides/bulk-price-adjust`,
      req,
    );
  }

  parseMenuImages(
    businessId: string,
    files: File[],
  ): Observable<MenuImportParseResult> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return this.http.post<MenuImportParseResult>(
      `${this.baseUrl}/api/business-portal/${businessId}/menu-import/parse`,
      formData,
    );
  }

  commitMenuImport(
    businessId: string,
    categories: unknown[],
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/menu-import/commit`,
      { categories },
    );
  }

  // ── Profile ─────────────────────────────────────────────────────────────────

  getProfile(businessId: string): Observable<BusinessProfileDto> {
    return this.http.get<BusinessProfileDto>(
      `${this.baseUrl}/api/business-portal/${businessId}`,
    );
  }

  updateProfile(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/business-portal/${businessId}`,
      req,
    );
  }

  // ── Staff ───────────────────────────────────────────────────────────────────

  listStaff(businessId: string): Observable<StaffDto[]> {
    return this.http.get<StaffDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/users`,
    );
  }

  createStaff(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}/api/business-portal/${businessId}/users`,
      req,
    );
  }

  /** Omit any field to leave it unchanged. Set newPassword to force-reset it. Email is
   * only applied when the account doesn't already have one. */
  updateStaff(
    businessId: string,
    userId: string,
    req: Record<string, unknown>,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/users/${userId}`,
      req,
    );
  }

  /** Soft-delete. Refuses (400, errorCode "LAST_OWNER") if this is the business's only
   * active owner; a non-owner caller also can't remove an owner account ("FORBIDDEN"). */
  deleteStaff(businessId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/users/${userId}`,
    );
  }

  // ── Inventory ───────────────────────────────────────────────────────────────

  getInventory(businessId: string): Observable<InventoryItemDto[]> {
    return this.http.get<InventoryItemDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/inventory`,
    );
  }

  adjustInventory(
    businessId: string,
    req: { productId: string; quantity: number; reason: string },
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/inventory/adjust`,
      req,
    );
  }

  getInventoryAlerts(businessId: string): Observable<InventoryAlertDto[]> {
    return this.http.get<InventoryAlertDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/inventory/alerts`,
    );
  }

  // ── Delivery zones ──────────────────────────────────────────────────────────

  listDeliveryZones(businessId: string): Observable<BusinessZoneDto[]> {
    return this.http.get<BusinessZoneDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/delivery-zones`,
    );
  }

  /** Response is just { id } — the created row's other fields aren't echoed back,
   * so callers should reload the list rather than append this to their own state. */
  createDeliveryZone(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}/api/business-portal/${businessId}/delivery-zones`,
      req,
    );
  }

  deleteDeliveryZone(businessId: string, zoneId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/delivery-zones/${zoneId}`,
    );
  }

  // ── Ratings ─────────────────────────────────────────────────────────────────

  listRatings(businessId: string): Observable<RatingDto[]> {
    return this.http
      .get<
        ItemsPagedResult<RatingDto>
      >(`${this.baseUrl}/api/business-portal/${businessId}/ratings`)
      .pipe(map((res) => res.items));
  }

  replyToRating(
    businessId: string,
    ratingId: string,
    replyText: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/ratings/${ratingId}/reply`,
      { replyText, repliedByUserId: this.currentUserId() },
    );
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  listPayouts(businessId: string): Observable<PayoutDto[]> {
    return this.http
      .get<
        ItemsPagedResult<PayoutDto>
      >(`${this.baseUrl}/api/business-portal/${businessId}/payouts`)
      .pipe(map((res) => res.items));
  }

  /** The orders that were settled in one payout — its breakdown. */
  getPayoutOrders(
    businessId: string,
    payoutId: string,
  ): Observable<PayoutOrderDto[]> {
    return this.http.get<PayoutOrderDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/payouts/${payoutId}/orders`,
    );
  }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface BusinessLoginResponse {
  token: string;
  userId: string;
  businessId: string;
  role: string;
}

export interface BusinessDashboardDto {
  todayOrderCount: number;
  todayRevenue: number;
  pendingOrderCount: number;
  weekRevenue: number[];
  lowStockAlertCount: number;
}

export interface BusinessOrderDto {
  id: string;
  orderId: string;
  status: string;
  total: number;
  customerPhone?: string;
  createdAt: string;
  itemCount: number;
}

export interface BusinessOrderDetailDto extends BusinessOrderDto {
  items: OrderItemDto[];
  charges: Record<string, unknown>;
  deliveryAddress?: Record<string, string>;
  statusTimeline: StatusTimelineEntry[];
  paymentMethod?: string;
}

export interface OrderItemDto {
  name: string;
  price: number;
  qty: number;
  selectedVariationLabel?: string;
  selectedVariationPrice?: number;
  imageUrl?: string;
}

export interface StatusTimelineEntry {
  status: string;
  timestamp: string;
  note?: string;
}

export interface MenuCategoryDto {
  id: string;
  name: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItemDto {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  categoryId: string;
  isAvailable: boolean;
  foodType?: string;
  imageUrl?: string;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  isRecommended?: boolean;
}

export interface BusinessProfileDto {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  fssaiLicenseNumber?: string;
  gstNumber?: string;
  onboardingStatus: string;
  onboardingRejectionReason?: string;
  menuMode: 'shared' | 'independent';
  brandId?: string;
}

/** One brand master product with this branch's own override (if any) merged in. */
export interface BrandMasterProductDto {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  isPureVeg: boolean;
  priceOverride?: number;
  isHidden: boolean;
  isAvailable: boolean;
}

export interface BranchOverrideDto {
  productId: string;
  priceOverride?: number;
  isHidden: boolean;
  isAvailable: boolean;
  updatedAt: string;
}

export interface StaffDto {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isActive: boolean;
}

export interface InventoryItemDto {
  productId: string;
  productName: string;
  qtyAvailable: number;
  lowStockThreshold: number;
}

export interface InventoryAlertDto {
  productId: string;
  productName: string;
  qtyAvailable: number;
  alertType: string;
}

export interface BusinessZoneDto {
  id: string;
  name: string;
  baseFee: number;
  isActive: boolean;
}

export interface RatingDto {
  id: string;
  ratingValue: number;
  reviewText?: string;
  createdAt: string;
  replyText?: string;
}

export interface MenuImportParseResult {
  enabled: boolean;
  message?: string;
  categories?: unknown[];
}

export interface PayoutDto {
  id: string;
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

export interface PayoutOrderDto {
  orderId: string;
  actualDeliveryTime?: string;
  orderType: string;
  total: number;
  commissionAmount: number;
  netAmount: number;
}
