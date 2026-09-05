import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { User } from '@zitro/models';
import { UserMapper } from '@zitro/mappers';
import type { UserDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';
import { CustomerEndpoints } from '../endpoints';

const PROFILE_KEY = 'user:profile';

export interface UpdateProfileData {
  name?: string;
  email?: string;
  photoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getProfile(): Observable<User> {
    const cached = this.cache.get<User>(PROFILE_KEY);
    if (cached) return of(cached);
    return this.http
      .get<UserDto>(`${this.baseUrl}${CustomerEndpoints.user.me()}`)
      .pipe(
        map((dto) => UserMapper.toUser(dto)),
        tap((user) => this.cache.set(PROFILE_KEY, user, { ttlHours: 1 / 12 })),
      );
  }

  updateProfile(data: UpdateProfileData): Observable<User> {
    return this.http
      .put<UserDto>(`${this.baseUrl}${CustomerEndpoints.user.me()}`, data)
      .pipe(
        map((dto) => UserMapper.toUser(dto)),
        tap((user) => this.cache.set(PROFILE_KEY, user, { ttlHours: 1 / 12 })),
      );
  }

  invalidateProfileCache(): void {
    this.cache.invalidate(PROFILE_KEY);
  }
}
