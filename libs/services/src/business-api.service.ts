import { Injectable, inject, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BusinessAuthTokenService } from './business-auth-token.service';
import { ZITRO_API_BASE_URL } from './tokens';

interface BusinessOrdersPagedResult {
  orders: BusinessOrderDto[];
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
  ): Observable<BusinessProfileDto> {
    return this.http.put<BusinessProfileDto>(
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
  ): Observable<StaffDto> {
    return this.http.post<StaffDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/users`,
      req,
    );
  }

  updateStaff(
    businessId: string,
    userId: string,
    req: Record<string, unknown>,
  ): Observable<StaffDto> {
    return this.http.put<StaffDto>(
      `${this.baseUrl}/api/business-portal/${businessId}/users/${userId}`,
      req,
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

  createDeliveryZone(
    businessId: string,
    req: Record<string, unknown>,
  ): Observable<BusinessZoneDto> {
    return this.http.post<BusinessZoneDto>(
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
    return this.http.get<RatingDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/ratings`,
    );
  }

  replyToRating(
    businessId: string,
    ratingId: string,
    reply: string,
  ): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/business-portal/${businessId}/ratings/${ratingId}/reply`,
      { reply },
    );
  }

  // ── Payouts ─────────────────────────────────────────────────────────────────

  listPayouts(businessId: string): Observable<PayoutDto[]> {
    return this.http.get<PayoutDto[]>(
      `${this.baseUrl}/api/business-portal/${businessId}/payouts`,
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
}

export interface StaffDto {
  id: string;
  name: string;
  phone: string;
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
  rating: number;
  comment?: string;
  targetType: string;
  createdAt: string;
  reply?: string;
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
  netAmount: number;
  status: string;
  paidAt?: string;
}
