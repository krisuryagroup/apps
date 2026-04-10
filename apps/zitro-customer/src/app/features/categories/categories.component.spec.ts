import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CategoriesComponent } from './categories.component';
import { Router } from '@angular/router';
import { CategoriesService, Category } from '../../core/services/categories.service';

describe('CategoriesComponent', () => {
  let component: CategoriesComponent;
  let mockRouter: any;
  let mockCategoriesService: any;

  const mockCategory: Category = {
    id: 'cat-1',
    name: 'Pizza',
    imageURL: 'https://example.com/pizza.jpg',
    status: true,
    isEnabledForOnlineOrders: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
  };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn(),
    };

    mockCategoriesService = {
      getCategories: vi.fn(),
    };

    component = new CategoriesComponent(mockRouter, mockCategoriesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create instance', () => {
      expect(component).toBeDefined();
    });

    it('should start with loading state true', () => {
      expect(component.isLoading).toBe(true);
    });

    it('should start with empty categories', () => {
      expect(component.categories).toEqual([]);
    });
  });

  describe('Load Categories', () => {
    it('should load categories successfully', async () => {
      const mockCategories = [mockCategory];
      mockCategoriesService.getCategories.mockResolvedValue(mockCategories);

      await component.loadCategories();

      expect(mockCategoriesService.getCategories).toHaveBeenCalled();
      expect(component.categories).toEqual(mockCategories);
      expect(component.isLoading).toBe(false);
    });

    it('should handle errors and set loading to false', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockCategoriesService.getCategories.mockRejectedValue(new Error('Load failed'));

      await component.loadCategories();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(component.isLoading).toBe(false);
    });

    it('should call loadCategories on ngOnInit', async () => {
      const loadCategoriesSpy = vi.spyOn(component, 'loadCategories').mockResolvedValue();

      await component.ngOnInit();

      expect(loadCategoriesSpy).toHaveBeenCalled();
    });
  });

  describe('Navigate to Listing', () => {
    it('should navigate with category name', () => {
      component.navigateToListing(mockCategory);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/listing'],
        { queryParams: { category: 'Pizza' } }
      );
    });

    it.each([
      { name: 'Pizza', expected: 'Pizza' },
      { name: 'BURGERS', expected: 'BURGERS' },
      { name: 'Pasta Dishes', expected: 'Pasta Dishes' },
    ])('should navigate with category name "$name" preserving case', ({ name, expected }) => {
      const category = { ...mockCategory, name };

      component.navigateToListing(category);

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        ['/listing'],
        expect.objectContaining({
          queryParams: expect.objectContaining({ category: expected })
        })
      );
    });
  });

  describe('Go Back', () => {
    it('should navigate to home', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
    });
  });
});
