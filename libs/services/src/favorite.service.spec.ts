import { describe, it, expect, beforeEach } from 'vitest';
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  let service: FavoriteService;

  const mockItems = [
    { id: '1', name: 'Margherita Pizza', price: 199 },
    { id: '2', name: 'Classic Burger', price: 149 },
    { id: '3', name: 'Pasta Carbonara', price: 179 },
    { id: '4', name: 'Chocolate Cake', price: 89 }
  ];

  beforeEach(() => {
    service = new FavoriteService();
  });

  describe('Initialization', () => {
    it('should initialize with default favorite items', () => {
      const favorites = service.getFavoriteNames();
      
      expect(favorites).toContain('Margherita Pizza');
      expect(favorites).toContain('Classic Burger');
      expect(favorites).toContain('Chocolate Cake');
    });
  });

  describe('getFavorites', () => {
    it('should filter items by favorite names', () => {
      const favorites = service.getFavorites(mockItems);

      expect(favorites).toHaveLength(3);
      expect(favorites.every(item => 
        ['Margherita Pizza', 'Classic Burger', 'Chocolate Cake'].includes(item.name)
      )).toBe(true);
    });

    it('should return empty array when no items match', () => {
      const nonFavorites = [
        { id: '5', name: 'Item A', price: 100 },
        { id: '6', name: 'Item B', price: 200 }
      ];

      const result = service.getFavorites(nonFavorites);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      const result = service.getFavorites([]);

      expect(result).toEqual([]);
    });
  });

  describe('isFavorite', () => {
    it.each([
      ['Margherita Pizza', true],
      ['Classic Burger', true],
      ['Chocolate Cake', true],
      ['Pasta Carbonara', false],
      ['Unknown Item', false]
    ])('should check if "%s" is favorite: %s', (name, expected) => {
      const item = { name, price: 100 };
      
      expect(service.isFavorite(item)).toBe(expected);
    });
  });

  describe('toggleFavorite', () => {
    it('should add item to favorites when not already favorite', () => {
      const item = { name: 'Pasta Carbonara', price: 179 };
      
      expect(service.isFavorite(item)).toBe(false);
      
      service.toggleFavorite(item);
      
      expect(service.isFavorite(item)).toBe(true);
      expect(service.getFavoriteNames()).toContain('Pasta Carbonara');
    });

    it('should remove item from favorites when already favorite', () => {
      const item = { name: 'Margherita Pizza', price: 199 };
      
      expect(service.isFavorite(item)).toBe(true);
      
      service.toggleFavorite(item);
      
      expect(service.isFavorite(item)).toBe(false);
      expect(service.getFavoriteNames()).not.toContain('Margherita Pizza');
    });

    it('should handle multiple toggles correctly', () => {
      const item = { name: 'Test Item', price: 100 };
      
      // Add
      service.toggleFavorite(item);
      expect(service.isFavorite(item)).toBe(true);
      
      // Remove
      service.toggleFavorite(item);
      expect(service.isFavorite(item)).toBe(false);
      
      // Add again
      service.toggleFavorite(item);
      expect(service.isFavorite(item)).toBe(true);
    });
  });

  describe('getFavoriteNames', () => {
    it('should return array of favorite names', () => {
      const names = service.getFavoriteNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
    });

    it('should reflect changes after toggle', () => {
      const initialCount = service.getFavoriteNames().length;
      
      service.toggleFavorite({ name: 'New Item', price: 100 });
      
      const newCount = service.getFavoriteNames().length;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Edge cases', () => {
    it('should handle items with same name', () => {
      const items = [
        { id: '1', name: 'Margherita Pizza', price: 199 },
        { id: '2', name: 'Margherita Pizza', price: 249 }
      ];

      const favorites = service.getFavorites(items);

      expect(favorites).toHaveLength(2);
    });

    it('should not modify original items array', () => {
      const itemsCopy = [...mockItems];
      
      service.getFavorites(mockItems);
      
      expect(mockItems).toEqual(itemsCopy);
    });
  });
});
