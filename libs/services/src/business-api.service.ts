import { Injectable, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessAuthTokenService } from './business-auth-token.service';
import { ZITRO_API_BASE_URL } from './tokens';
import { RestaurantEndpoints, SharedEndpoints } from './endpoints';
import type {
  BusinessDocumentType,
  VerificationDocDto,
} from './business-document.model';

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
      `${this.baseUrl}${RestaurantEndpoints.auth.login()}`,
      { phoneNumber: phone, password },
    );
  }

  // ── Public application / invite ─────────────────────────────────────────────

  submitApplication(req: Record<string, unknown>): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.applications.submit()}`,
      req,
    );
  }

  validateInviteToken(token: string): Observable<{ businessName: string }> {
    return this.http.get<{ businessName: string }>(
      `${this.baseUrl}${RestaurantEndpoints.applications.validateInvite(token)}`,
    );
  }

  acceptInvite(token: string, password: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.applications.acceptInvite(token)}`,
      { password },
    );
  }

  /** Identity verification for the self-apply flow — no application is accepted server-side
   * until the owner phone has a recently-verified OTP session (see submitApplication()). */
  requestApplicantOtp(phone: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${SharedEndpoints.auth.otpRequest()}`,
      { phone },
    );
  }

  verifyApplicantOtp(phone: string, otp: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${SharedEndpoints.auth.otpVerify()}`,
      { phone, otp },
    );
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

  getDashboard(businessId: string): Observable<BusinessDashboardDto> {
    return this.http.get<BusinessDashboardDto>(
      `${this.baseUrl}${RestaurantEndpoints.dashboard.get(businessId)}`,
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
        `${this.baseUrl}${RestaurantEndpoints.orders.list(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.orders.list(businessId)}`,
      { params: p },
    );
  }

  getOrderDetail(
    businessId: string,
    orderId: string,
  ): Observable<BusinessOrderDetailDto> {
    return this.http.get<BusinessOrderDetailDto>(
      `${this.baseUrl}${RestaurantEndpoints.orders.byId(businessId, orderId)}`,
    );
  }

  updateOrderStatus(
    businessId: string,
    orderId: string,
    status: string,
    note?: string,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}${RestaurantEndpoints.orders.updateStatus(businessId, orderId)}`,
      { status, note },
    );
  }

  // ── Menu ────────────────────────────────────────────────────────────────────

  listCategories(businessId: string): Observable<MenuCategoryDto[]> {
    return this.http.get<MenuCategoryDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.categories.list(businessId)}`,
    );
  }

  createCategory(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<MenuCategoryDto> {
    return this.http.post<MenuCategoryDto>(
      `${this.baseUrl}${RestaurantEndpoints.categories.list(businessId)}`,
      req,
    );
  }

  updateCategory(
    businessId: string,
    categoryId: string,
    req: Record<string, unknown>,
  ): Observable<MenuCategoryDto> {
    return this.http.put<MenuCategoryDto>(
      `${this.baseUrl}${RestaurantEndpoints.categories.byId(businessId, categoryId)}`,
      req,
    );
  }

  deleteCategory(businessId: string, categoryId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${RestaurantEndpoints.categories.byId(businessId, categoryId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.products.list(businessId)}`,
      { params },
    );
  }

  createProduct(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<MenuItemDto> {
    return this.http.post<MenuItemDto>(
      `${this.baseUrl}${RestaurantEndpoints.products.list(businessId)}`,
      req,
    );
  }

  updateProduct(
    businessId: string,
    productId: string,
    req: Record<string, unknown>,
  ): Observable<MenuItemDto> {
    return this.http.put<MenuItemDto>(
      `${this.baseUrl}${RestaurantEndpoints.products.byId(businessId, productId)}`,
      req,
    );
  }

  deleteProduct(businessId: string, productId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${RestaurantEndpoints.products.byId(businessId, productId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.products.bulk(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.products.media(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.products.bulkPriceAdjust(businessId)}`,
      req,
    );
  }

  // ── Shared brand menu (menu_mode = 'shared' branches only) ────────────────────

  getBrandMasterProducts(
    businessId: string,
  ): Observable<BrandMasterProductDto[]> {
    return this.http.get<BrandMasterProductDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.sharedBrandMenu.brandMasterProducts(businessId)}`,
    );
  }

  getBranchOverrides(businessId: string): Observable<BranchOverrideDto[]> {
    return this.http.get<BranchOverrideDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.sharedBrandMenu.branchOverrides(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.sharedBrandMenu.branchOverrides(businessId)}`,
      req,
    );
  }

  deleteBranchOverride(
    businessId: string,
    productId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${RestaurantEndpoints.sharedBrandMenu.branchOverrideById(businessId, productId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.sharedBrandMenu.branchOverridesBulkPriceAdjust(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.menuImport.parse(businessId)}`,
      formData,
    );
  }

  commitMenuImport(
    businessId: string,
    categories: unknown[],
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.menuImport.commit(businessId)}`,
      { categories },
    );
  }

  // ── Profile ─────────────────────────────────────────────────────────────────

  getProfile(businessId: string): Observable<BusinessProfileDto> {
    return this.http.get<BusinessProfileDto>(
      `${this.baseUrl}${RestaurantEndpoints.profile.get(businessId)}`,
    );
  }

  updateProfile(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}${RestaurantEndpoints.profile.get(businessId)}`,
      req,
    );
  }

  /** Self-service deactivate — Owner-only (backend enforces the role check too). */
  deactivateBusiness(businessId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.profile.deactivate(businessId)}`,
      {},
    );
  }

  /** Restores a self-deactivated business — Owner-only (backend enforces the role check too). */
  reactivateBusiness(businessId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.profile.reactivate(businessId)}`,
      {},
    );
  }

  // ── KYC documents ─────────────────────────────────────────────────────────────

  /** Uploads one KYC document (PAN/FSSAI/GST/bank proof). Always lands as
   * Status: 'pending' — only Admin can move it to verified/rejected. */
  uploadDocument(
    businessId: string,
    documentType: BusinessDocumentType,
    file: File,
  ): Observable<VerificationDocDto> {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);
    return this.http.post<VerificationDocDto>(
      `${this.baseUrl}${RestaurantEndpoints.documents.upload(businessId)}`,
      formData,
    );
  }

  // ── Cover photo ───────────────────────────────────────────────────────────────

  /** Uploads the business's single cover photo (its listing image) — required before
   * Admin can approve the business for go-live, but uploaded post-registration, not
   * collected on the self-apply form. */
  uploadCoverPhoto(
    businessId: string,
    file: File,
  ): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.baseUrl}${RestaurantEndpoints.coverPhoto.upload(businessId)}`,
      formData,
    );
  }

  // ── Commission terms ──────────────────────────────────────────────────────────

  /** Owner explicitly accepts the platform's current commission rate — required
   * before Admin can approve the business for go-live. Owner-only (backend
   * enforces the role check too). */
  acceptCommissionTerms(businessId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.commission.accept(businessId)}`,
      {},
    );
  }

  // ── Staff ───────────────────────────────────────────────────────────────────

  listStaff(businessId: string): Observable<StaffDto[]> {
    return this.http.get<StaffDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.staff.list(businessId)}`,
    );
  }

  createStaff(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}${RestaurantEndpoints.staff.list(businessId)}`,
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
      `${this.baseUrl}${RestaurantEndpoints.staff.byId(businessId, userId)}`,
      req,
    );
  }

  /** Soft-delete. Refuses (400, errorCode "LAST_OWNER") if this is the business's only
   * active owner; a non-owner caller also can't remove an owner account ("FORBIDDEN"). */
  deleteStaff(businessId: string, userId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${RestaurantEndpoints.staff.byId(businessId, userId)}`,
    );
  }

  // ── Inventory ───────────────────────────────────────────────────────────────

  getInventory(businessId: string): Observable<InventoryItemDto[]> {
    return this.http.get<InventoryItemDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.inventory.list(businessId)}`,
    );
  }

  adjustInventory(
    businessId: string,
    req: { productId: string; quantity: number; reason: string },
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.inventory.adjust(businessId)}`,
      req,
    );
  }

  getInventoryAlerts(businessId: string): Observable<InventoryAlertDto[]> {
    return this.http.get<InventoryAlertDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.inventory.alerts(businessId)}`,
    );
  }

  // ── Delivery zones ──────────────────────────────────────────────────────────

  listDeliveryZones(businessId: string): Observable<BusinessZoneDto[]> {
    return this.http.get<BusinessZoneDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.deliveryZones.list(businessId)}`,
    );
  }

  /** Response is just { id } — the created row's other fields aren't echoed back,
   * so callers should reload the list rather than append this to their own state. */
  createDeliveryZone(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(
      `${this.baseUrl}${RestaurantEndpoints.deliveryZones.list(businessId)}`,
      req,
    );
  }

  deleteDeliveryZone(businessId: string, zoneId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}${RestaurantEndpoints.deliveryZones.byId(businessId, zoneId)}`,
    );
  }

  // ── Ratings ─────────────────────────────────────────────────────────────────

  listRatings(businessId: string): Observable<RatingDto[]> {
    return this.http
      .get<
        ItemsPagedResult<RatingDto>
      >(`${this.baseUrl}${RestaurantEndpoints.ratings.list(businessId)}`)
      .pipe(map((res) => res.items));
  }

  replyToRating(
    businessId: string,
    ratingId: string,
    replyText: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}${RestaurantEndpoints.ratings.reply(businessId, ratingId)}`,
      { replyText, repliedByUserId: this.currentUserId() },
    );
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  listPayouts(businessId: string): Observable<PayoutDto[]> {
    return this.http
      .get<
        ItemsPagedResult<PayoutDto>
      >(`${this.baseUrl}${RestaurantEndpoints.payouts.list(businessId)}`)
      .pipe(map((res) => res.items));
  }

  /** The orders that were settled in one payout — its breakdown. */
  getPayoutOrders(
    businessId: string,
    payoutId: string,
  ): Observable<PayoutOrderDto[]> {
    return this.http.get<PayoutOrderDto[]>(
      `${this.baseUrl}${RestaurantEndpoints.payouts.orders(businessId, payoutId)}`,
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
  panNumber?: string;
  payoutAccountId?: string;
  verificationDocs?: VerificationDocDto[];
  coverImageUrl?: string;
  cuisineTypes?: string[];
  restaurantCategory?: string;
  commissionPercentage?: number;
  commissionAcceptedAt?: string;
  onboardingStatus: string;
  onboardingRejectionReason?: string;
  menuMode: 'shared' | 'independent';
  brandId?: string;
  brandName?: string;
  isActive: boolean;
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
