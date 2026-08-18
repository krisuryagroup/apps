/** A tower/block within a society. */
export interface SocietyTower {
  id: string;
  name: string;
  displayOrder: number;
}

/**
 * A society/apartment complex returned by GET /api/societies/nearby or /search.
 * Towers are bundled in directly — avoids a second round trip to
 * GET /api/societies/{id}/towers the moment a society is picked from the list.
 */
export interface NearbySociety {
  id: string;
  name: string;
  area: string | null;
  pincode: string;
  town: string;
  state: string;
  distanceMetres: number;
  towers: SocietyTower[];
}
