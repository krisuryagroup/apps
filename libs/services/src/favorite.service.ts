import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FavoriteService {
  // Mocked favorite item names (could be ids in real app)
  private favoriteNames = ['Margherita Pizza', 'Classic Burger', 'Chocolate Cake'];

  getFavorites(allItems: any[]) {
    return allItems.filter(item => this.favoriteNames.includes(item.name));
  }

  isFavorite(item: any) {
    return this.favoriteNames.includes(item.name);
  }

  // For demo: toggle favorite
  toggleFavorite(item: any) {
    if (this.isFavorite(item)) {
      this.favoriteNames = this.favoriteNames.filter(n => n !== item.name);
    } else {
      this.favoriteNames.push(item.name);
    }
  }

  getFavoriteNames() {
    return this.favoriteNames;
  }
}
