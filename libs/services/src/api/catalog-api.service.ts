import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Product } from '@zitro/models';
import type { Category } from '@zitro/models';
import { CatalogMapper } from '@zitro/mappers';
import type { ProductDto, CategoryDto, BusinessMenuResponseDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getProducts(businessSlug: string): Observable<Product[]> {
    const cacheKey = `products:${businessSlug}`;
    const cached = this.cache.get<Product[]>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/businesses/${businessSlug}/products`).pipe(
      map(dtos => CatalogMapper.toProductList(dtos)),
      tap(products => this.cache.set(cacheKey, products, { ttlHours: 1 })),
    );
  }

  getCategories(businessSlug: string): Observable<Category[]> {
    const cacheKey = `categories:${businessSlug}`;
    const cached = this.cache.get<Category[]>(cacheKey);
    if (cached) return of(cached);
    return this.http.get<CategoryDto[]>(`${this.baseUrl}/api/categories`, {
      params: { businessSlug },
    }).pipe(
      map(dtos => CatalogMapper.toCategoryList(dtos)),
      tap(categories => this.cache.set(cacheKey, categories, { ttlHours: 1 })),
    );
  }

  getMenu(businessSlug: string, categoryId?: string): Observable<Product[]> {
    const cacheKey = `menu:${businessSlug}:${categoryId ?? 'all'}`;
    const cached = this.cache.get<Product[]>(cacheKey);
    if (cached) return of(cached);
    const params: Record<string, string> = {};
    if (categoryId) params['categoryId'] = categoryId;
    return this.http.get<ProductDto[]>(`${this.baseUrl}/api/businesses/${businessSlug}/menu`, {
      params,
    }).pipe(
      map(dtos => CatalogMapper.toProductList(dtos)),
      tap(products => this.cache.set(cacheKey, products, { ttlHours: 1 })),
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
    this.cache.invalidate(`products:${businessSlug}`);
    this.cache.invalidate(`menu:${businessSlug}:all`);
  }

  /**
   * Fetches the full business menu from GET /api/businesses/{slug}/menu.
   * Extracts both products and categories from the response
   * (categories are embedded in each product's `category` field).
   */
  getBusinessMenu(businessSlug: string): Observable<{ products: Product[]; categories: Category[] }> {
    const cacheKey = `businessMenu:${businessSlug}`;
    const cached = this.cache.get<{ products: Product[]; categories: Category[] }>(cacheKey);
    if (cached) return of(cached);
    return this.http
      .get<BusinessMenuResponseDto>(`${this.baseUrl}/api/businesses/${businessSlug}/menu`)
      .pipe(
        map(dto => CatalogMapper.toBusinessMenuProductsAndCategories(dto)),
        tap(menu => this.cache.set(cacheKey, menu, { ttlHours: 1 })),
      );
  }
}
