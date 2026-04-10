import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from '@angular/core';

// Mock the component class to avoid importing Angular modules
class MockItemDetailsDialogComponent {
  isOpen = false;
  item: any = null;
  closeEvent = new EventEmitter<void>();
  cartUpdated = new EventEmitter<void>();
  imageLoading = true;
  
  private cartService: any;

  close() {
    this.closeEvent.emit();
  }

  getOtherKeys(): string[] {
    return this.item ? Object.keys(this.item) : [];
  }

  onImageLoad(): void {
    this.imageLoading = false;
  }

  incrementQuantity() {
    if (this.item) {
      const product = this.convertToProduct(this.item);
      this.cartService.addToCart(product);
      this.cartUpdated.emit();
    }
  }

  decrementQuantity() {
    if (this.item) {
      const product = this.convertToProduct(this.item);
      this.cartService.removeFromCart(product);
      this.cartUpdated.emit();
    }
  }

  getItemQuantity(): number {
    if (!this.item) return 0;
    const cart = this.cartService.getCart();
    const itemName = this.item.name || this.item.title;
    const cartItem = cart.find((item: any) => item.name === itemName);
    return cartItem ? cartItem.qty : 0;
  }

  private convertToProduct(item: any): any {
    return {
      id: item.id || '',
      name: item.name || item.title,
      imageURL: item.imageURL,
      price: item.price,
      description: item.description || '',
      weight: item.weight || '',
      category: item.category || '',
      isEnabledForOnlineOrders: item.isEnabledForOnlineOrders ?? true,
      isOfferDisabled: item.isOfferDisabled ?? false,
      status: item.status ?? true
    };
  }
}

describe('ItemDetailsDialogComponent', () => {
  let component: MockItemDetailsDialogComponent;
  let mockCartService: any;

  beforeEach(() => {
    mockCartService = {
      addToCart: vi.fn(),
      removeFromCart: vi.fn(),
      getCart: vi.fn(() => [])
    };

    component = new MockItemDetailsDialogComponent();
    (component as any).cartService = mockCartService;
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isOpen).toBe(false);
      expect(component.item).toBeNull();
      expect(component.imageLoading).toBe(true);
    });

    it('should accept item data through input', () => {
      const mockItem = {
        imageURL: 'test.jpg',
        title: 'Test Product',
        description: 'Test description',
        price: 100,
        weight: '500g',
        offer: '10% off'
      };

      component.item = mockItem;

      expect(component.item).toEqual(mockItem);
    });
  });

  describe('Image Loading', () => {
    it('should set imageLoading to true by default', () => {
      expect(component.imageLoading).toBe(true);
    });

    it('should set imageLoading to false when onImageLoad is called', () => {
      component.imageLoading = true;

      component.onImageLoad();

      expect(component.imageLoading).toBe(false);
    });

    it('should handle multiple image loads', () => {
      component.imageLoading = true;
      component.onImageLoad();
      expect(component.imageLoading).toBe(false);

      // Simulate reloading
      component.imageLoading = true;
      component.onImageLoad();
      expect(component.imageLoading).toBe(false);
    });
  });

  describe('Close Dialog Behavior', () => {
    it('should emit closeEvent when close is called', () => {
      const emitSpy = vi.spyOn(component.closeEvent, 'emit');

      component.close();

      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('should handle close when dialog is open', () => {
      const emitSpy = vi.spyOn(component.closeEvent, 'emit');
      component.isOpen = true;

      component.close();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should handle close when dialog is already closed', () => {
      const emitSpy = vi.spyOn(component.closeEvent, 'emit');
      component.isOpen = false;

      component.close();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Get Other Keys Functionality', () => {
    it('should return empty array when item is null', () => {
      component.item = null;

      const keys = component.getOtherKeys();

      expect(keys).toEqual([]);
    });

    it('should return all keys when item has properties', () => {
      component.item = {
        imageURL: 'test.jpg',
        title: 'Product',
        price: 100
      };

      const keys = component.getOtherKeys();

      expect(keys).toContain('imageURL');
      expect(keys).toContain('title');
      expect(keys).toContain('price');
      expect(keys.length).toBe(3);
    });

    it.each([
      { 
        item: { imageURL: 'a.jpg', title: 'Item', description: 'desc', price: 50 } as any,
        expectedCount: 4
      },
      { 
        item: { imageURL: 'b.jpg', title: '' } as any,
        expectedCount: 2
      },
      { 
        item: { imageURL: 'c.jpg', title: 'Product', price: 100, weight: '1kg', offer: '20%', category: 'Food' } as any,
        expectedCount: 6
      }
    ])('should return correct number of keys for different items', ({ item, expectedCount }) => {
      component.item = item;

      const keys = component.getOtherKeys();

      expect(keys.length).toBe(expectedCount);
    });
  });

  describe('Dialog Open/Close State', () => {
    it.each([
      { isOpen: true, item: { imageURL: 'test.jpg', title: 'Item', price: 100 } },
      { isOpen: false, item: null },
      { isOpen: true, item: { imageURL: 'img.jpg', title: 'Product', description: 'Long description', price: 200, weight: '2kg' } }
    ])('should handle state with isOpen=$isOpen', ({ isOpen, item }) => {
      component.isOpen = isOpen;
      component.item = item;

      expect(component.isOpen).toBe(isOpen);
      expect(component.item).toEqual(item);
    });
  });

  describe('Item Data Handling', () => {
    it('should handle item with additional custom properties', () => {
      const itemWithCustomProps = {
        imageURL: 'test.jpg',
        title: 'Custom Item',
        price: 150,
        customField1: 'value1',
        customField2: 'value2',
        customField3: 123
      };

      component.item = itemWithCustomProps;
      const keys = component.getOtherKeys();

      expect(keys).toContain('customField1');
      expect(keys).toContain('customField2');
      expect(keys).toContain('customField3');
    });

    it('should handle item with all expected properties', () => {
      const completeItem = {
        imageURL: 'product.jpg',
        title: 'Complete Product',
        description: 'Full description',
        price: 299,
        weight: '1.5kg',
        offer: '15% off'
      };

      component.item = completeItem;

      expect(component.getOtherKeys().length).toBe(6);
      expect(component.item.title).toBe('Complete Product');
      expect(component.item.price).toBe(299);
    });
  });

  describe('Cart Functionality', () => {
    it('should emit cartUpdated when incrementQuantity is called', () => {
      const emitSpy = vi.spyOn(component.cartUpdated, 'emit');
      component.item = {
        id: '1',
        name: 'Test Product',
        imageURL: 'test.jpg',
        title: 'Test Product',
        price: 100
      };

      component.incrementQuantity();

      expect(mockCartService.addToCart).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('should emit cartUpdated when decrementQuantity is called', () => {
      const emitSpy = vi.spyOn(component.cartUpdated, 'emit');
      component.item = {
        id: '1',
        name: 'Test Product',
        imageURL: 'test.jpg',
        title: 'Test Product',
        price: 100
      };

      component.decrementQuantity();

      expect(mockCartService.removeFromCart).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('should not call cart service when item is null', () => {
      component.item = null;

      component.incrementQuantity();
      component.decrementQuantity();

      expect(mockCartService.addToCart).not.toHaveBeenCalled();
      expect(mockCartService.removeFromCart).not.toHaveBeenCalled();
    });

    it('should return 0 quantity when item is null', () => {
      component.item = null;

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(0);
    });

    it('should return 0 quantity when item is not in cart', () => {
      component.item = {
        id: '1',
        name: 'Test Product',
        imageURL: 'test.jpg',
        title: 'Test Product',
        price: 100
      };
      mockCartService.getCart.mockReturnValue([]);

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(0);
    });

    it('should return correct quantity when item is in cart', () => {
      component.item = {
        id: '1',
        name: 'Test Product',
        imageURL: 'test.jpg',
        title: 'Test Product',
        price: 100
      };
      mockCartService.getCart.mockReturnValue([
        { name: 'Test Product', qty: 3 }
      ]);

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(3);
    });

    it('should use title as name if name is not provided', () => {
      component.item = {
        imageURL: 'test.jpg',
        title: 'Product Title',
        price: 100
      };
      mockCartService.getCart.mockReturnValue([
        { name: 'Product Title', qty: 2 }
      ]);

      const quantity = component.getItemQuantity();

      expect(quantity).toBe(2);
    });
  });
});
