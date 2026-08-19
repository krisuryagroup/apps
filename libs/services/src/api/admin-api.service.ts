import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

/**
 * API calls for the Admin portal — covers both zitro-admin and zitro-superadmin
 * since they share the same backend Admin JWT scheme.
 */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(ZITRO_API_BASE_URL);

  login(req: AdminLoginRequest): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(
      `${this.baseUrl}/api/admin/auth/login`,
      req,
    );
  }
}
