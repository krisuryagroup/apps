// import { describe, it, expect, beforeEach } from 'vitest';
// import { CategoriesComponent } from './categories.component';

// describe('CategoriesComponent', () => {
//   let component: CategoriesComponent;

//   beforeEach(() => {
//     component = new CategoriesComponent();
//   });

//   describe('Component Initialization', () => {
//     it('should initialize with empty categories array', () => {
//       expect(component.categories).toEqual([]);
//     });

//     it('should accept categories input', () => {
//       const categories = [
//         { id: '1', name: 'Category 1', route: '/cat1' },
//         { id: '2', name: 'Category 2', route: '/cat2' }
//       ];

//       component.categories = categories;

//       expect(component.categories).toEqual(categories);
//     });
//   });

//   describe('Navigate Method', () => {
//     it('should have navigate method', () => {
//       expect(component.navigate).toBeDefined();
//       expect(typeof component.navigate).toBe('function');
//     });

//     it('should not throw when navigating with category with route', () => {
//       const category = { id: '1', name: 'Test', route: '/test' };

//       expect(() => component.navigate(category)).not.toThrow();
//     });

//     it('should not throw when navigating with category without route', () => {
//       const category = { id: '1', name: 'Test' };

//       expect(() => component.navigate(category)).not.toThrow();
//     });
//   });

//   describe('Categories Input', () => {
//     it.each([
//       { 
//         categories: [
//           { id: '1', name: 'Appetizers', route: '/appetizers' },
//           { id: '2', name: 'Main Course', route: '/main' }
//         ]
//       },
//       { 
//         categories: [
//           { id: '1', name: 'Desserts' }
//         ]
//       },
//       { categories: [] }
//     ])('should accept categories array', ({ categories }) => {
//       component.categories = categories;

//       expect(component.categories).toEqual(categories);
//     });

//     it('should handle large category arrays', () => {
//       const categories = Array.from({ length: 100 }, (_, i) => ({
//         id: String(i + 1),
//         name: `Category ${i + 1}`,
//         route: `/cat${i + 1}`
//       }));

//       component.categories = categories;

//       expect(component.categories.length).toBe(100);
//       expect(component.categories).toEqual(categories);
//     });
//   });

//   describe('Category Data Structures', () => {
//     it('should accept categories with various properties', () => {
//       const categories = [
//         { id: '1', name: 'Category 1', route: '/cat1', icon: 'icon1.png' },
//         { id: '2', name: 'Category 2', description: 'Description' },
//         { id: '3', name: 'Category 3', route: '/cat3', active: true }
//       ];

//       component.categories = categories;

//       expect(component.categories).toEqual(categories);
//     });

//     it('should preserve category data integrity', () => {
//       const categories = [
//         { id: '1', name: 'Test', extra: { nested: 'data' } }
//       ];

//       component.categories = categories;

//       expect(component.categories[0].extra).toEqual({ nested: 'data' });
//     });
//   });

//   describe('Navigation Logic', () => {
//     it('should check for route property before navigating', () => {
//       const categoryWithRoute = { id: '1', name: 'Test', route: '/test' };
//       const categoryWithoutRoute = { id: '2', name: 'Test2' };

//       expect(() => component.navigate(categoryWithRoute)).not.toThrow();
//       expect(() => component.navigate(categoryWithoutRoute)).not.toThrow();
//     });

//     it('should handle categories with empty route', () => {
//       const category = { id: '1', name: 'Test', route: '' };

//       expect(() => component.navigate(category)).not.toThrow();
//     });

//     it('should handle categories with null route', () => {
//       const category = { id: '1', name: 'Test', route: null };

//       expect(() => component.navigate(category)).not.toThrow();
//     });
//   });

//   describe('Edge Cases', () => {
//     it('should handle undefined categories', () => {
//       component.categories = undefined as any;

//       expect(component.categories).toBeUndefined();
//     });

//     it('should handle categories with missing properties', () => {
//       const categories = [
//         { id: '1' } as any,
//         { name: 'Category' } as any
//       ];

//       component.categories = categories;

//       expect(component.categories.length).toBe(2);
//     });

//     it('should handle empty strings in category properties', () => {
//       const categories = [
//         { id: '', name: '', route: '' }
//       ];

//       component.categories = categories;

//       expect(component.categories[0].id).toBe('');
//       expect(component.categories[0].name).toBe('');
//       expect(component.categories[0].route).toBe('');
//     });
//   });
// });
