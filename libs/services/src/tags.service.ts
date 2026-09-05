import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import type { PlatformTag } from '@zitro/models';
import { CacheService } from './cache.service';
import { ZITRO_API_BASE_URL } from './tokens';
import { CustomerEndpoints } from './endpoints';

const TAGS_CACHE_KEY = 'platform_tags';

@Injectable({ providedIn: 'root' })
export class TagsService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getTags(): Observable<PlatformTag[]> {
    const cached = this.cache.get<PlatformTag[]>(TAGS_CACHE_KEY);
    if (cached) return of(cached);

    return this.http
      .get<PlatformTag[]>(`${this.baseUrl}${CustomerEndpoints.tags.list()}`)
      .pipe(
        tap((tags) => this.cache.set(TAGS_CACHE_KEY, tags, { ttlHours: 1 })),
      );
  }

  getTagsForSlugs(slugs: string[], allTags: PlatformTag[]): PlatformTag[] {
    const slugSet = new Set(slugs);
    return allTags.filter((tag) => slugSet.has(tag.slug));
  }
}
