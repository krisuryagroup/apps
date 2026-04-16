import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { User } from '@zitro/models';
import { UserMapper } from '@zitro/mappers';
import type { UserDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const CACHE_TTL_5MIN = 5 * 60 * 1000;
const PROFILE_KEY = 'user:profile';

export interface UpdateProfileData {
  name?: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class UserApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getProfile(): Observable<User> {
    if (!this.cache.isCacheExpired(`${PROFILE_KEY}_ts`, CACHE_TTL_5MIN)) {
      const cached = this.cache.getCachedData<User>(PROFILE_KEY);
      if (cached) return of(cached);
    }
    return this.http.get<UserDto>(`${this.baseUrl}/api/users/me`).pipe(
      map(dto => UserMapper.toUser(dto)),
      tap(user => {
        this.cache.setCachedData(PROFILE_KEY, user);
        this.cache.setCacheTimestamp(`${PROFILE_KEY}_ts`);
      }),
    );
  }

  updateProfile(data: UpdateProfileData): Observable<User> {
    return this.http.put<UserDto>(`${this.baseUrl}/api/users/me`, data).pipe(
      map(dto => UserMapper.toUser(dto)),
      tap(user => {
        this.cache.setCachedData(PROFILE_KEY, user);
        this.cache.setCacheTimestamp(`${PROFILE_KEY}_ts`);
      }),
    );
  }

  invalidateProfileCache(): void {
    this.cache.removeItem(`${PROFILE_KEY}_ts`);
  }
}
