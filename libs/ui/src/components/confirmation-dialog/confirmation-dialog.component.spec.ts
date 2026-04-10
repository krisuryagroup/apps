import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

describe('ConfirmationDialogComponent', () => {
  let component: ConfirmationDialogComponent;

  beforeEach(() => {
    component = new ConfirmationDialogComponent();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isVisible).toBe(false);
      expect(component.title).toBe('Confirm');
      expect(component.message).toBe('Are you sure?');
      expect(component.confirmText).toBe('Yes');
      expect(component.cancelText).toBe('No');
    });

    it.each([
      { title: 'Delete Item', message: 'Are you sure you want to delete?', confirmText: 'Delete', cancelText: 'Cancel' },
      { title: 'Save Changes', message: 'Do you want to save?', confirmText: 'Save', cancelText: 'Discard' },
      { title: 'Logout', message: 'Are you sure you want to logout?', confirmText: 'Logout', cancelText: 'Stay' }
    ])('should accept custom input values: $title', ({ title, message, confirmText, cancelText }) => {
      component.title = title;
      component.message = message;
      component.confirmText = confirmText;
      component.cancelText = cancelText;

      expect(component.title).toBe(title);
      expect(component.message).toBe(message);
      expect(component.confirmText).toBe(confirmText);
      expect(component.cancelText).toBe(cancelText);
    });
  });

  describe('Confirm Action', () => {
    it('should emit true and hide dialog when confirmed', () => {
      const emitSpy = vi.spyOn(component.confirmed, 'emit');
      component.isVisible = true;

      component.onConfirm();

      expect(emitSpy).toHaveBeenCalledWith(true);
      expect(component.isVisible).toBe(false);
    });

    it('should only emit once per confirmation', () => {
      const emitSpy = vi.spyOn(component.confirmed, 'emit');

      component.onConfirm();
      component.onConfirm();

      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenNthCalledWith(1, true);
      expect(emitSpy).toHaveBeenNthCalledWith(2, true);
    });
  });

  describe('Cancel Action', () => {
    it('should emit false and hide dialog when cancelled', () => {
      const emitSpy = vi.spyOn(component.confirmed, 'emit');
      component.isVisible = true;

      component.onCancel();

      expect(emitSpy).toHaveBeenCalledWith(false);
      expect(component.isVisible).toBe(false);
    });

    it('should close dialog from any visible state', () => {
      component.isVisible = true;

      component.onCancel();

      expect(component.isVisible).toBe(false);
    });
  });

  describe('Overlay Click Behavior', () => {
    it('should trigger cancel when overlay is clicked', () => {
      const cancelSpy = vi.spyOn(component, 'onCancel');
      const mockEvent = {} as Event;

      component.onOverlayClick(mockEvent);

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should emit false when clicking overlay', () => {
      const emitSpy = vi.spyOn(component.confirmed, 'emit');
      component.isVisible = true;
      const mockEvent = {} as Event;

      component.onOverlayClick(mockEvent);

      expect(emitSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('Dialog State Management', () => {
    it.each([
      { action: 'onConfirm', initialVisible: true, expectedResult: true },
      { action: 'onConfirm', initialVisible: false, expectedResult: true },
      { action: 'onCancel', initialVisible: true, expectedResult: false },
      { action: 'onCancel', initialVisible: false, expectedResult: false }
    ])('should emit $expectedResult when $action is called with isVisible=$initialVisible', 
      ({ action, initialVisible, expectedResult }) => {
        const emitSpy = vi.spyOn(component.confirmed, 'emit');
        component.isVisible = initialVisible;

        if (action === 'onConfirm') {
          component.onConfirm();
        } else {
          component.onCancel();
        }

        expect(emitSpy).toHaveBeenCalledWith(expectedResult);
        expect(component.isVisible).toBe(false);
      });
  });
});
