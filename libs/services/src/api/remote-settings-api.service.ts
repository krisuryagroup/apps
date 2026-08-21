import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ZITRO_API_BASE_URL } from '../tokens';
import { AdminAuthTokenService } from '../admin-auth-token.service';

export interface RemoteSettingsResponse {
  isClearCacheMandatory: boolean;
  isLoginClearCacheMandatory: boolean;
  cacheManagementJson: string | null;
  updatedAt: string;
}

export interface RemoteSettingsTriggerResult {
  updatedAt: string;
}

/**
 * Force-logout / cache-clear remote triggers every app polls for at boot. Replaces the old
 * Firestore appSettings/restaurantDetails/onlineorders subcollection read.
 *
 * GET is public. The two admin POSTs need an Admin JWT, attached manually here rather than via
 * the shared adminJwtAuthInterceptor: zitro-customer's HTTP client runs in 'firebase' authMode
 * (see provide-services.ts), which never includes that interceptor, so it would silently never
 * attach the header if relied on here.
 */
@Injectable({ providedIn: 'root' })
export class RemoteSettingsApiService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);
  private adminAuth = inject(AdminAuthTokenService);

  getRemoteSettings(): Observable<RemoteSettingsResponse> {
    return this.http.get<RemoteSettingsResponse>(
      `${this.baseUrl}/api/app-config/remote-settings`,
    );
  }

  triggerForceLogout(): Observable<RemoteSettingsTriggerResult> {
    return this.http.post<RemoteSettingsTriggerResult>(
      `${this.baseUrl}/api/admin/remote-settings/force-logout`,
      {},
      { headers: this.adminHeaders() },
    );
  }

  triggerCacheClear(
    cacheManagementJson?: string,
  ): Observable<RemoteSettingsTriggerResult> {
    return this.http.post<RemoteSettingsTriggerResult>(
      `${this.baseUrl}/api/admin/remote-settings/cache-clear`,
      { cacheManagementJson: cacheManagementJson ?? null },
      { headers: this.adminHeaders() },
    );
  }

  private adminHeaders(): HttpHeaders {
    const token = this.adminAuth.token();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
