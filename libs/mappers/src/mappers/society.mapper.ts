import type { NearbySociety, SocietyTower } from '@zitro/models';
import type { NearbySocietyDto, TowerDto } from '../dtos/society.dto';

export const SocietyMapper = {
  toNearbySociety(dto: NearbySocietyDto): NearbySociety {
    return {
      id: dto.id,
      name: dto.name,
      area: dto.area,
      pincode: dto.pincode,
      town: dto.town,
      state: dto.state,
      distanceMetres: dto.distanceMetres,
      towers: dto.towers.map(SocietyMapper.toTower),
    };
  },

  toTower(dto: TowerDto): SocietyTower {
    return {
      id: dto.id,
      name: dto.name,
      displayOrder: dto.displayOrder,
    };
  },
};
