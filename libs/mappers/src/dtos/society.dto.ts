// Wire shape for GET /api/societies/{id}/towers
export interface TowerDto {
  id: string;
  name: string;
  displayOrder: number;
}

// Wire shape for GET /api/societies/nearby and /api/societies/search — towers
// are bundled in directly by the backend.
export interface NearbySocietyDto {
  id: string;
  name: string;
  area: string | null;
  pincode: string;
  town: string;
  state: string;
  distanceMetres: number;
  towers: TowerDto[];
}
