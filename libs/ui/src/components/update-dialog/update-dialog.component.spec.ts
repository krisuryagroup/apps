import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateDialogComponent } from './update-dialog.component';

describe('UpdateDialogComponent', () => {
  let component: UpdateDialogComponent;

  beforeEach(() => {
    component = new UpdateDialogComponent();
  });

  describe('Initialization', () => {
    it('should create component with default properties', () => {
      expect(component).toBeDefined();
      expect(component.message).toBe('');
      expect(component.isMandatory).toBe(false);
      expect(component.updateButtonText).toBe('Update Now');
      expect(component.laterButtonText).toBe('Later');
    });

    it('should have event emitters defined', () => {
      expect(component.update).toBeDefined();
      expect(component.later).toBeDefined();
    });
  });

  describe('Input Properties', () => {
    it.each([
      ['message', 'Custom update message', 'message text'],
      ['updateButtonText', 'Install Now', 'update button text'],
      ['laterButtonText', 'Remind Me Later', 'later button text']
    ])('should accept custom %s', (property, value) => {
      (component as any)[property] = value;
      expect((component as any)[property]).toBe(value);
    });

    it.each([
      [true, 'mandatory update'],
      [false, 'optional update']
    ])('should accept %s flag for %s', (value) => {
      component.isMandatory = value;
      expect(component.isMandatory).toBe(value);
    });
  });

  describe('Update Button Behavior', () => {
    it('should emit update event when button clicked', () => {
      const updateSpy = vi.fn();
      component.update.subscribe(updateSpy);

      component.onUpdate();

      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('should emit update event regardless of mandatory flag', () => {
      const updateSpy = vi.fn();
      component.update.subscribe(updateSpy);

      component.isMandatory = true;
      component.onUpdate();

      component.isMandatory = false;
      component.onUpdate();

      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Later Button Behavior', () => {
    it.each([
      [false, 1, 'optional update'],
      [true, 0, 'mandatory update']
    ])('should emit %i times for %s', (isMandatory, expectedCalls) => {
      component.isMandatory = isMandatory;
      const laterSpy = vi.fn();
      component.later.subscribe(laterSpy);

      component.onLater();

      expect(laterSpy).toHaveBeenCalledTimes(expectedCalls);
    });
  });
});
