import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { Address } from '@zitro/models';
import { UserMapper } from '@zitro/mappers';
import type { AddressDto } from '@zitro/mappers';
import { CacheService } from '../cache.service';
import { ZITRO_API_BASE_URL } from '../tokens';

const ADDRESSES_KEY = 'user:addresses';

@Injectable({ providedIn: 'root' })
export class AddressApiService {
  private http = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getAddresses(): Observable<Address[]> {
    const cached = this.cache.get<Address[]>(ADDRESSES_KEY);
    if (cached) return of(cached);
    return this.http.get<AddressDto[]>(`${this.baseUrl}/api/users/me/addresses`).pipe(
      map(dtos => dtos.map(dto => UserMapper.toAddress(dto))),
      tap(addresses => this.cache.set(ADDRESSES_KEY, addresses, { ttlHours: 1 / 12 })),
    );
  }

  createAddress(address: Omit<Address, 'id'>): Observable<Address> {
    const request = UserMapper.fromAddress(address);
    return this.http.post<AddressDto>(`${this.baseUrl}/api/users/me/addresses`, request).pipe(
      map(dto => UserMapper.toAddress(dto)),
      tap(() => this.cache.invalidate(ADDRESSES_KEY)),
    );
  }

  updateAddress(id: string, address: Partial<Omit<Address, 'id'>>): Observable<Address> {
    const request = UserMapper.fromAddressWithId({ id, ...address } as Address);
    return this.http.put<AddressDto>(`${this.baseUrl}/api/users/me/addresses/${id}`, request).pipe(
      map(dto => UserMapper.toAddress(dto)),
      tap(() => this.cache.invalidate(ADDRESSES_KEY)),
    );
  }

  deleteAddress(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/api/users/me/addresses/${id}`).pipe(
      tap(() => this.cache.invalidate(ADDRESSES_KEY)),
    );
  }
}
