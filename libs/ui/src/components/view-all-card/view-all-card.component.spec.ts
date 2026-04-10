import { ViewAllCardComponent } from './view-all-card.component';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ViewAllCardComponent', () => {
  let component: ViewAllCardComponent;

  beforeEach(() => {
    component = new ViewAllCardComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Default Values', () => {
    it('should have default size as medium', () => {
      expect(component.size).toBe('medium');
    });

    it('should have default variant as rounded', () => {
      expect(component.variant).toBe('rounded');
    });

    it('should have default icon as apps', () => {
      expect(component.icon).toBe('apps');
    });

    it('should have default label as View All', () => {
      expect(component.label).toBe('View All');
    });

    it('should show label by default', () => {
      expect(component.showLabel).toBe(true);
    });

    it('should not have description by default', () => {
      expect(component.description).toBeUndefined();
    });
  });

  describe('Input Properties', () => {
    it('should accept custom size', () => {
      component.size = 'small';
      expect(component.size).toBe('small');
    });

    it('should accept custom variant', () => {
      component.variant = 'circular';
      expect(component.variant).toBe('circular');
    });

    it('should accept custom icon', () => {
      component.icon = 'chevron_right';
      expect(component.icon).toBe('chevron_right');
    });

    it('should accept custom label', () => {
      component.label = 'See More';
      expect(component.label).toBe('See More');
    });

    it('should accept description', () => {
      component.description = 'Click to view all items';
      expect(component.description).toBe('Click to view all items');
    });

    it('should allow hiding label', () => {
      component.showLabel = false;
      expect(component.showLabel).toBe(false);
    });
  });

  describe('CSS Classes', () => {
    it('should apply size-small class when size is small', () => {
      component.size = 'small';
      expect(component.size).toBe('small');
    });

    it('should apply size-medium class when size is medium', () => {
      component.size = 'medium';
      expect(component.size).toBe('medium');
    });

    it('should apply size-large class when size is large', () => {
      component.size = 'large';
      expect(component.size).toBe('large');
    });

    it('should apply style-circular class when variant is circular', () => {
      component.variant = 'circular';
      expect(component.variant).toBe('circular');
    });

    it('should apply style-rounded class when variant is rounded', () => {
      component.variant = 'rounded';
      expect(component.variant).toBe('rounded');
    });

    it('should apply style-card class when variant is card', () => {
      component.variant = 'card';
      expect(component.variant).toBe('card');
    });
  });

  describe('Template Rendering', () => {
    it('should display the icon', () => {
      component.icon = 'star';
      expect(component.icon).toBe('star');
    });

    it('should display the label when showLabel is true', () => {
      component.label = 'Custom Label';
      component.showLabel = true;
      expect(component.label).toBe('Custom Label');
      expect(component.showLabel).toBe(true);
    });

    it('should not display content when showLabel is false', () => {
      component.showLabel = false;
      expect(component.showLabel).toBe(false);
    });

    it('should display description when provided and showLabel is true', () => {
      component.description = 'Test Description';
      component.showLabel = true;
      expect(component.description).toBe('Test Description');
      expect(component.showLabel).toBe(true);
    });

    it('should not display description when not provided', () => {
      component.description = undefined;
      component.showLabel = true;
      expect(component.description).toBeUndefined();
    });
  });

  describe('Click Event', () => {
    it('should emit clicked event when card is clicked', () => {
      const clickedSpy = vi.fn();
      component.clicked.subscribe(clickedSpy);
      
      component.onClick();
      
      expect(clickedSpy).toHaveBeenCalledTimes(1);
    });

    it('should call onClick method when card is clicked', () => {
      const onClickSpy = vi.spyOn(component, 'onClick');
      
      component.onClick();
      
      expect(onClickSpy).toHaveBeenCalled();
    });

    it('should stop propagation when event is provided', () => {
      const mockEvent = {
        stopPropagation: vi.fn()
      } as any;
      
      component.onClick(mockEvent);
      
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should not throw error when event is not provided', () => {
      expect(() => component.onClick()).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with small circular variant', () => {
      component.size = 'small';
      component.variant = 'circular';
      component.label = 'View All';
      
      expect(component.size).toBe('small');
      expect(component.variant).toBe('circular');
    });

    it('should work with medium rounded variant', () => {
      component.size = 'medium';
      component.variant = 'rounded';
      
      expect(component.size).toBe('medium');
      expect(component.variant).toBe('rounded');
    });

    it('should work with large card variant without label', () => {
      component.size = 'large';
      component.variant = 'card';
      component.showLabel = false;
      
      expect(component.size).toBe('large');
      expect(component.variant).toBe('card');
      expect(component.showLabel).toBe(false);
    });
  });
});
