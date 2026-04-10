import { describe, it, expect, beforeEach } from 'vitest';
import { OrderLoadingModalComponent } from './order-loading-modal.component';

describe('OrderLoadingModalComponent', () => {
  let component: OrderLoadingModalComponent;

  beforeEach(() => {
    component = new OrderLoadingModalComponent();
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.isVisible).toBe(false);
      expect(component.stage).toBeNull();
    });

    it.each([
      { isVisible: true, stage: { stage: 'validating', message: 'Validating...' } },
      { isVisible: false, stage: { stage: 'creating', message: 'Creating...' } },
      { isVisible: true, stage: null }
    ])('should accept input values', ({ isVisible, stage }) => {
      component.isVisible = isVisible;
      component.stage = stage as any;

      expect(component.isVisible).toBe(isVisible);
      expect(component.stage).toEqual(stage);
    });
  });

  describe('Stage Title Generation', () => {
    it('should return default title when stage is null', () => {
      component.stage = null;

      const title = component.getStageTitle();

      expect(title).toBe('Processing Order');
    });

    it.each([
      { stage: 'validating', expected: 'Validating Order' },
      { stage: 'creating', expected: 'Creating Order' },
      { stage: 'processing', expected: 'Processing Payment' },
      { stage: 'confirming', expected: 'Confirming Order' },
      { stage: 'completed', expected: 'Order Completed!' },
      { stage: 'error', expected: 'Order Failed' }
    ])('should return "$expected" for $stage stage', ({ stage, expected }) => {
      component.stage = { stage, message: '' } as any;

      const title = component.getStageTitle();

      expect(title).toBe(expected);
    });

    it('should return default title for unknown stage', () => {
      component.stage = { stage: 'unknown-stage', message: '' } as any;

      const title = component.getStageTitle();

      expect(title).toBe('Processing Order');
    });

    it('should handle empty string stage', () => {
      component.stage = { stage: '', message: '' } as any;

      const title = component.getStageTitle();

      expect(title).toBe('Processing Order');
    });
  });

  describe('Active Stage Detection', () => {
    it('should return true when stage matches', () => {
      component.stage = { stage: 'validating', message: '' } as any;

      const isActive = component.isStageActive('validating');

      expect(isActive).toBe(true);
    });

    it('should return false when stage does not match', () => {
      component.stage = { stage: 'validating', message: '' } as any;

      const isActive = component.isStageActive('creating');

      expect(isActive).toBe(false);
    });

    it('should return false when stage is null', () => {
      component.stage = null;

      const isActive = component.isStageActive('validating');

      expect(isActive).toBe(false);
    });

    it.each([
      { currentStage: 'validating', checkStage: 'validating', expected: true },
      { currentStage: 'validating', checkStage: 'creating', expected: false },
      { currentStage: 'processing', checkStage: 'processing', expected: true },
      { currentStage: 'completed', checkStage: 'error', expected: false }
    ])('should return $expected when current is $currentStage and checking $checkStage', 
      ({ currentStage, checkStage, expected }) => {
        component.stage = { stage: currentStage, message: '' } as any;

        const isActive = component.isStageActive(checkStage);

        expect(isActive).toBe(expected);
      });
  });

  describe('Completed Stage Detection', () => {
    it('should return false when stage is null', () => {
      component.stage = null;

      const isCompleted = component.isStageCompleted('validating');

      expect(isCompleted).toBe(false);
    });

    it.each([
      // Current stage: validating (index 0)
      { currentStage: 'validating', checkStage: 'validating', expected: false },
      { currentStage: 'validating', checkStage: 'creating', expected: false },
      
      // Current stage: creating (index 1)
      { currentStage: 'creating', checkStage: 'validating', expected: true },
      { currentStage: 'creating', checkStage: 'creating', expected: false },
      { currentStage: 'creating', checkStage: 'processing', expected: false },
      
      // Current stage: processing (index 2)
      { currentStage: 'processing', checkStage: 'validating', expected: true },
      { currentStage: 'processing', checkStage: 'creating', expected: true },
      { currentStage: 'processing', checkStage: 'processing', expected: false },
      { currentStage: 'processing', checkStage: 'confirming', expected: false },
      
      // Current stage: confirming (index 3)
      { currentStage: 'confirming', checkStage: 'validating', expected: true },
      { currentStage: 'confirming', checkStage: 'creating', expected: true },
      { currentStage: 'confirming', checkStage: 'processing', expected: true },
      { currentStage: 'confirming', checkStage: 'confirming', expected: false },
      { currentStage: 'confirming', checkStage: 'completed', expected: false },
      
      // Current stage: completed (index 4)
      { currentStage: 'completed', checkStage: 'validating', expected: true },
      { currentStage: 'completed', checkStage: 'creating', expected: true },
      { currentStage: 'completed', checkStage: 'processing', expected: true },
      { currentStage: 'completed', checkStage: 'confirming', expected: true },
      { currentStage: 'completed', checkStage: 'completed', expected: false }
    ])('should return $expected when current=$currentStage checking=$checkStage', 
      ({ currentStage, checkStage, expected }) => {
        component.stage = { stage: currentStage, message: '' } as any;

        const isCompleted = component.isStageCompleted(checkStage);

        expect(isCompleted).toBe(expected);
      });

    it('should handle unknown stages gracefully', () => {
      component.stage = { stage: 'unknown', message: '' } as any;

      const isCompleted = component.isStageCompleted('validating');

      expect(isCompleted).toBe(false);
    });

    it('should handle non-existent check stage', () => {
      component.stage = { stage: 'processing', message: '' } as any;

      const isCompleted = component.isStageCompleted('nonexistent');

      // Non-existent stage has index -1, which is less than any stage, so returns true
      expect(isCompleted).toBe(true);
    });
  });

  describe('Stage Progression Flow', () => {
    const stages = ['validating', 'creating', 'processing', 'confirming', 'completed'];

    it('should track progress through all stages', () => {
      stages.forEach((currentStage, currentIndex) => {
        component.stage = { stage: currentStage, message: '' } as any;

        stages.forEach((checkStage, checkIndex) => {
          const isCompleted = component.isStageCompleted(checkStage);
          const shouldBeCompleted = currentIndex > checkIndex;

          expect(isCompleted).toBe(shouldBeCompleted);
        });
      });
    });

    it('should correctly identify active stage through progression', () => {
      stages.forEach(stageName => {
        component.stage = { stage: stageName, message: '' } as any;

        expect(component.isStageActive(stageName)).toBe(true);
        
        stages.filter(s => s !== stageName).forEach(otherStage => {
          expect(component.isStageActive(otherStage)).toBe(false);
        });
      });
    });
  });

  describe('Visibility State', () => {
    it.each([true, false])('should handle isVisible=%s', (visible) => {
      component.isVisible = visible;

      expect(component.isVisible).toBe(visible);
    });

    it('should allow visibility toggle', () => {
      expect(component.isVisible).toBe(false);

      component.isVisible = true;
      expect(component.isVisible).toBe(true);

      component.isVisible = false;
      expect(component.isVisible).toBe(false);
    });
  });

  describe('Error Stage Handling', () => {
    it('should handle error stage correctly', () => {
      component.stage = { stage: 'error', message: 'Failed' } as any;

      expect(component.getStageTitle()).toBe('Order Failed');
      expect(component.isStageActive('error')).toBe(true);
    });

    it('should not mark error as completed for any stage', () => {
      component.stage = { stage: 'error', message: '' } as any;

      const stages = ['validating', 'creating', 'processing', 'confirming', 'completed'];
      stages.forEach(stage => {
        expect(component.isStageCompleted(stage)).toBe(false);
      });
    });
  });

  describe('Stage Message Handling', () => {
    it('should store stage with message', () => {
      const stageWithMessage = { 
        stage: 'processing', 
        message: 'Please wait while we process your payment' 
      };

      component.stage = stageWithMessage as any;

      expect(component.stage?.message).toBe('Please wait while we process your payment');
      expect(component.getStageTitle()).toBe('Processing Payment');
    });

    it('should handle empty message', () => {
      component.stage = { stage: 'validating', message: '' } as any;

      expect(component.stage?.message).toBe('');
      expect(component.getStageTitle()).toBe('Validating Order');
    });
  });
});
