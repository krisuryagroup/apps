import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryRangeDialogComponent } from './delivery-range-dialog.component';

describe('DeliveryRangeDialogComponent', () => {
  let component: DeliveryRangeDialogComponent;
  let mockDialogRef: any;
  let mockData: any;

  beforeEach(() => {
    mockDialogRef = {
      close: vi.fn()
    };

    mockData = {};

    component = new DeliveryRangeDialogComponent(mockDialogRef, mockData);
  });

  describe('Component Initialization', () => {
    it('should initialize with dialogRef', () => {
      expect(component.dialogRef).toBeDefined();
      expect(component.dialogRef).toBe(mockDialogRef);
    });

    it('should initialize with data', () => {
      expect(component.data).toBeDefined();
      expect(component.data).toBe(mockData);
    });

    it('should accept custom data', () => {
      const customData = { deliveryRange: 3, userAddress: 'Test Address' };
      component = new DeliveryRangeDialogComponent(mockDialogRef, customData);

      expect(component.data).toEqual(customData);
    });
  });

  describe('Cancel Action', () => {
    it('should close dialog with false on cancel', () => {
      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should call close exactly once', () => {
      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('should close with false multiple times', () => {
      component.onCancel();
      component.onCancel();
      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledTimes(3);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(1, false);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(2, false);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(3, false);
    });
  });

  describe('Proceed Action', () => {
    it('should close dialog with true on proceed', () => {
      component.onProceed();

      expect(mockDialogRef.close).toHaveBeenCalledWith(true);
    });

    it('should call close exactly once', () => {
      component.onProceed();

      expect(mockDialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('should close with true multiple times', () => {
      component.onProceed();
      component.onProceed();
      component.onProceed();

      expect(mockDialogRef.close).toHaveBeenCalledTimes(3);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(1, true);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(2, true);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(3, true);
    });
  });

  describe('Dialog Return Values', () => {
    it.each([
      { action: 'onCancel', expected: false },
      { action: 'onProceed', expected: true }
    ])('should return $expected when $action is called', ({ action, expected }) => {
      (component as any)[action]();

      expect(mockDialogRef.close).toHaveBeenCalledWith(expected);
    });
  });

  describe('Dialog Reference Methods', () => {
    it('should use injected dialogRef for cancel', () => {
      const customDialogRef = { close: vi.fn() };
      component = new DeliveryRangeDialogComponent(customDialogRef as any, mockData);

      component.onCancel();

      expect(customDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should use injected dialogRef for proceed', () => {
      const customDialogRef = { close: vi.fn() };
      component = new DeliveryRangeDialogComponent(customDialogRef as any, mockData);

      component.onProceed();

      expect(customDialogRef.close).toHaveBeenCalledWith(true);
    });
  });

  describe('Data Injection', () => {
    it.each([
      { data: { range: 3 }, description: 'with range data' },
      { data: { range: 5, message: 'Custom' }, description: 'with multiple properties' },
      { data: {}, description: 'with empty data' },
      { data: null, description: 'with null data' }
    ])('should accept $description', ({ data }) => {
      component = new DeliveryRangeDialogComponent(mockDialogRef, data);

      expect(component.data).toEqual(data);
    });

    it('should handle data with delivery range', () => {
      const dataWithRange = { deliveryRange: 3, restaurantName: 'Test Restaurant' };
      component = new DeliveryRangeDialogComponent(mockDialogRef, dataWithRange);

      expect(component.data.deliveryRange).toBe(3);
      expect(component.data.restaurantName).toBe('Test Restaurant');
    });
  });

  describe('User Flow', () => {
    it('should handle cancel then proceed', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenLastCalledWith(false);

      component.onProceed();
      expect(mockDialogRef.close).toHaveBeenLastCalledWith(true);
    });

    it('should handle proceed then cancel', () => {
      component.onProceed();
      expect(mockDialogRef.close).toHaveBeenLastCalledWith(true);

      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenLastCalledWith(false);
    });

    it('should track call order', () => {
      component.onCancel();
      component.onProceed();
      component.onCancel();

      expect(mockDialogRef.close).toHaveBeenCalledTimes(3);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(1, false);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(2, true);
      expect(mockDialogRef.close).toHaveBeenNthCalledWith(3, false);
    });
  });

  describe('Dialog State', () => {
    it('should maintain dialogRef throughout lifecycle', () => {
      const initialRef = component.dialogRef;

      component.onCancel();
      expect(component.dialogRef).toBe(initialRef);

      component.onProceed();
      expect(component.dialogRef).toBe(initialRef);
    });

    it('should maintain data throughout lifecycle', () => {
      const testData = { test: 'value' };
      component = new DeliveryRangeDialogComponent(mockDialogRef, testData);
      const initialData = component.data;

      component.onCancel();
      expect(component.data).toBe(initialData);

      component.onProceed();
      expect(component.data).toBe(initialData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive cancels', () => {
      for (let i = 0; i < 10; i++) {
        component.onCancel();
      }

      expect(mockDialogRef.close).toHaveBeenCalledTimes(10);
    });

    it('should handle rapid successive proceeds', () => {
      for (let i = 0; i < 10; i++) {
        component.onProceed();
      }

      expect(mockDialogRef.close).toHaveBeenCalledTimes(10);
    });

    it('should handle alternating calls', () => {
      for (let i = 0; i < 5; i++) {
        component.onCancel();
        component.onProceed();
      }

      expect(mockDialogRef.close).toHaveBeenCalledTimes(10);
    });
  });

  describe('Component Properties', () => {
    it('should expose dialogRef as public property', () => {
      expect(component.dialogRef).toBeDefined();
      expect(typeof component.dialogRef.close).toBe('function');
    });

    it('should expose data as public property', () => {
      expect(component.data).toBeDefined();
    });

    it('should have onCancel as public method', () => {
      expect(typeof component.onCancel).toBe('function');
    });

    it('should have onProceed as public method', () => {
      expect(typeof component.onProceed).toBe('function');
    });
  });

  describe('Dialog Closing Behavior', () => {
    it('should close with boolean value', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith(expect.any(Boolean));

      component.onProceed();
      expect(mockDialogRef.close).toHaveBeenCalledWith(expect.any(Boolean));
    });

    it('should close with different values for different actions', () => {
      component.onCancel();
      const firstCall = mockDialogRef.close.mock.calls[0][0];

      component.onProceed();
      const secondCall = mockDialogRef.close.mock.calls[1][0];

      expect(firstCall).not.toBe(secondCall);
      expect(firstCall).toBe(false);
      expect(secondCall).toBe(true);
    });
  });
});
