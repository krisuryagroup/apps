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
    return this.http.get<AppConfigResponse>(`${this.baseUrl}/api/app-config`, {
      params,
    });
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
      `${this.baseUrl}/api/admin/feature-flags/${appSlug}`,
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
}
