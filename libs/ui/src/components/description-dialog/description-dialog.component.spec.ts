import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DescriptionDialogComponent } from './description-dialog.component';

describe('DescriptionDialogComponent', () => {
  let component: DescriptionDialogComponent;

  beforeEach(() => {
    component = new DescriptionDialogComponent();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isOpen).toBe(false);
      expect(component.productName).toBe('');
      expect(component.description).toBe('');
    });

    it.each([
      { isOpen: true, productName: 'Margherita Pizza', description: 'Fresh mozzarella, tomatoes, basil' },
      { isOpen: false, productName: 'Caesar Salad', description: 'Romaine lettuce with parmesan' },
      { isOpen: true, productName: '', description: '' }
    ])('should accept input values: $productName', ({ isOpen, productName, description }) => {
      component.isOpen = isOpen;
      component.productName = productName;
      component.description = description;

      expect(component.isOpen).toBe(isOpen);
      expect(component.productName).toBe(productName);
      expect(component.description).toBe(description);
    });
  });

  describe('Close Dialog Behavior', () => {
    it('should emit closeEvent when closeDialog is called', () => {
      const emitSpy = vi.spyOn(component.closeEvent, 'emit');

      component.closeDialog();

      expect(emitSpy).toHaveBeenCalledOnce();
    });

    it('should emit closeEvent from overlay click', () => {
      const closeDialogSpy = vi.spyOn(component, 'closeDialog');
      const mockEvent = {} as Event;

      component.onOverlayClick(mockEvent);

      expect(closeDialogSpy).toHaveBeenCalled();
    });

    it('should handle multiple close attempts', () => {
      const emitSpy = vi.spyOn(component.closeEvent, 'emit');

      component.closeDialog();
      component.closeDialog();
      component.closeDialog();

      expect(emitSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Dialog Content Display', () => {
    it('should display full description text', () => {
      const longDescription = 'A'.repeat(500);
      component.description = longDescription;

      expect(component.description).toBe(longDescription);
      expect(component.description.length).toBe(500);
    });

    it.each([
      { productName: 'Pizza', description: 'Delicious' },
      { productName: 'A'.repeat(100), description: 'B'.repeat(1000) },
      { productName: '', description: 'No product name' },
      { productName: 'Test', description: '' }
    ])('should handle various content lengths', ({ productName, description }) => {
      component.productName = productName;
      component.description = description;

      expect(component.productName).toBe(productName);
      expect(component.description).toBe(description);
    });
  });

  describe('Dialog Open/Close State', () => {
    it('should toggle open state correctly', () => {
      expect(component.isOpen).toBe(false);

      component.isOpen = true;
      expect(component.isOpen).toBe(true);

      component.isOpen = false;
      expect(component.isOpen).toBe(false);
    });

    it('should maintain state after close event emission', () => {
      component.isOpen = true;
      const initialState = component.isOpen;

      component.closeDialog();

      // State is maintained (parent should handle closing)
      expect(component.isOpen).toBe(initialState);
    });
  });
});
