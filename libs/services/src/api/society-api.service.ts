import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { NearbySociety, SocietyTower } from '@zitro/models';
import { SocietyMapper } from '@zitro/mappers';
import type { NearbySocietyDto, TowerDto } from '@zitro/mappers';
import { ZITRO_API_BASE_URL } from '../tokens';
import { CustomerEndpoints } from '../endpoints';

/** Apartment/society lookup for the optional apartment-address picker. */
@Injectable({ providedIn: 'root' })
export class SocietyApiService {
  private http = inject(HttpClient);
  private baseUrl = inject(ZITRO_API_BASE_URL);

  getNearby(
    lat: number,
    lng: number,
    radiusMetres = 5000,
  ): Observable<NearbySociety[]> {
    return this.http
      .get<NearbySocietyDto[]>(
        `${this.baseUrl}${CustomerEndpoints.society.nearby()}`,
        {
          params: {
            lat: String(lat),
            lng: String(lng),
            radiusMetres: String(radiusMetres),
          },
        },
      )
      .pipe(map((dtos) => dtos.map(SocietyMapper.toNearbySociety)));
  }

  getTowers(societyId: string): Observable<SocietyTower[]> {
    return this.http
      .get<
        TowerDto[]
      >(`${this.baseUrl}${CustomerEndpoints.society.towers(societyId)}`)
      .pipe(map((dtos) => dtos.map(SocietyMapper.toTower)));
  }
}
