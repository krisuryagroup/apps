import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { Location } from '@angular/common';
import { SwipeBackDirective } from './swipe-back.directive';

describe('SwipeBackDirective', () => {
  let directive: SwipeBackDirective;
  let mockLocation: any;
  let mockElementRef: ElementRef;

  beforeEach(() => {
    mockLocation = {
      back: vi.fn()
    };

    const mockElement = document.createElement('div');
    mockElementRef = new ElementRef(mockElement);

    directive = new SwipeBackDirective(mockElementRef, mockLocation);
  });

  describe('Swipe Gesture Recognition', () => {
    it.each([
      // Valid swipes - should trigger navigation
      { startX: 10, endX: 150, shouldNavigate: true, description: 'swipe from left edge with sufficient distance' },
      { startX: 0, endX: 101, shouldNavigate: true, description: 'swipe from far left edge with minimum distance' },
      { startX: 49, endX: 200, shouldNavigate: true, description: 'swipe from boundary of left edge threshold' },
      { startX: 20, endX: 300, shouldNavigate: true, description: 'long swipe from left edge' },
      
      // Invalid swipes - should NOT trigger navigation
      { startX: 51, endX: 200, shouldNavigate: false, description: 'swipe starting beyond left edge threshold' },
      { startX: 10, endX: 100, shouldNavigate: false, description: 'swipe from left edge with insufficient distance' },
      { startX: 10, endX: 50, shouldNavigate: false, description: 'short swipe from left edge' },
      { startX: 100, endX: 250, shouldNavigate: false, description: 'swipe from middle of screen' },
      { startX: 10, endX: 5, shouldNavigate: false, description: 'swipe in wrong direction (right to left)' },
      { startX: 200, endX: 100, shouldNavigate: false, description: 'backward swipe' },
      { startX: 0, endX: 100, shouldNavigate: false, description: 'swipe from edge with exactly threshold distance' }
    ])('should %s when %s', ({ startX, endX, shouldNavigate, description }) => {
      // Simulate touchstart
      const touchStartEvent = {
        touches: [{ clientX: startX }]
      } as unknown as TouchEvent;
      directive.onTouchStart(touchStartEvent);

      // Simulate touchend
      const touchEndEvent = {
        changedTouches: [{ clientX: endX }]
      } as unknown as TouchEvent;
      directive.onTouchEnd(touchEndEvent);

      if (shouldNavigate) {
        expect(mockLocation.back).toHaveBeenCalledOnce();
      } else {
        expect(mockLocation.back).not.toHaveBeenCalled();
      }
    });
  });

  describe('Gesture Sequence', () => {
    it('should only consider the most recent touchstart for navigation', () => {
      // First touchstart from middle
      directive.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as TouchEvent);

      // Second touchstart from left edge (overrides first)
      directive.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);

      // Touchend with sufficient distance from second touchstart
      directive.onTouchEnd({ changedTouches: [{ clientX: 150 }] } as unknown as TouchEvent);

      expect(mockLocation.back).toHaveBeenCalledOnce();
    });

    it('should handle multiple complete swipe gestures', () => {
      // First valid swipe
      directive.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);
      directive.onTouchEnd({ changedTouches: [{ clientX: 150 }] } as unknown as TouchEvent);

      // Second valid swipe
      directive.onTouchStart({ touches: [{ clientX: 20 }] } as unknown as TouchEvent);
      directive.onTouchEnd({ changedTouches: [{ clientX: 200 }] } as unknown as TouchEvent);

      expect(mockLocation.back).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle touchend without touchstart gracefully', () => {
      // Only trigger touchend (startX defaults to 0)
      directive.onTouchEnd({ changedTouches: [{ clientX: 150 }] } as unknown as TouchEvent);

      expect(mockLocation.back).toHaveBeenCalledOnce();
    });

    it('should not navigate on touchstart alone', () => {
      directive.onTouchStart({ touches: [{ clientX: 10 }] } as unknown as TouchEvent);

      expect(mockLocation.back).not.toHaveBeenCalled();
    });
  });
});
