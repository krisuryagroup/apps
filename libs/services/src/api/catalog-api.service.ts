import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Product } from '@zitro/models';
import type { Category } from '@zitro/models';
import { CatalogMapper } from '@zitro/mappers';
import type { ProductDto, CategoryDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const CACHE_TTL_1HR = 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getProducts(businessSlug: string): Observable<Product[]> {
    const cacheKey = `products:${businessSlug}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_1HR)) {
      const cached = this.cache.getCachedData<Product[]>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/businesses/${businessSlug}/products`).pipe(
      map(dtos => CatalogMapper.toProductList(dtos)),
      tap(products => {
        this.cache.setCachedData(cacheKey, products);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  getCategories(businessSlug: string): Observable<Category[]> {
    const cacheKey = `categories:${businessSlug}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_1HR)) {
      const cached = this.cache.getCachedData<Category[]>(cacheKey);
      if (cached) return of(cached);
    }
    return this.http.get<CategoryDto[]>(`${this.baseUrl}/api/categories`, {
      params: { businessSlug },
    }).pipe(
      map(dtos => CatalogMapper.toCategoryList(dtos)),
      tap(categories => {
        this.cache.setCachedData(cacheKey, categories);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  getMenu(businessSlug: string, categoryId?: string): Observable<Product[]> {
    const cacheKey = `menu:${businessSlug}:${categoryId ?? 'all'}`;
    if (!this.cache.isCacheExpired(`${cacheKey}_ts`, CACHE_TTL_1HR)) {
      const cached = this.cache.getCachedData<Product[]>(cacheKey);
      if (cached) return of(cached);
    }
    const params: Record<string, string> = {};
    if (categoryId) params['categoryId'] = categoryId;
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/businesses/${businessSlug}/menu`, {
      params,
    }).pipe(
      map(dtos => CatalogMapper.toProductList(dtos)),
      tap(products => {
        this.cache.setCachedData(cacheKey, products);
        this.cache.setCacheTimestamp(`${cacheKey}_ts`);
      }),
    );
  }

  searchProducts(businessSlug: string, query: string): Observable<Product[]> {
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/products/search`, {
      params: { q: query, businessSlug },
    }).pipe(
      map(dtos => CatalogMapper.toProductList(dtos)),
    );
  }

  invalidateProductCache(businessSlug: string): void {
    this.cache.removeItem(`products:${businessSlug}_ts`);
    this.cache.removeItem(`menu:${businessSlug}:all_ts`);
  }
}
