import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TruncatedTextComponent } from './truncated-text.component';

describe('TruncatedTextComponent', () => {
  let component: TruncatedTextComponent;

  beforeEach(() => {
    component = new TruncatedTextComponent();
  });

  describe('Text Truncation Detection', () => {
    it.each([
      { text: 'Short text', maxLength: 100, expected: false, description: 'short text below maxLength' },
      { text: 'A'.repeat(100), maxLength: 100, expected: false, description: 'text exactly at maxLength' },
      { text: 'A'.repeat(101), maxLength: 100, expected: true, description: 'text exceeding maxLength' },
      { text: '', maxLength: 100, expected: false, description: 'empty text' },
      { text: 'Hello World', maxLength: 5, expected: true, description: 'short maxLength with normal text' }
    ])('should return $expected for shouldTruncate with $description', ({ text, maxLength, expected }) => {
      component.text = text;
      component.maxLength = maxLength;

      expect(component.shouldTruncate).toBe(expected);
    });
  });

  describe('Display Text Rendering', () => {
    it.each([
      // Cases where text is not truncated
      { text: 'Short', maxLength: 100, showFullText: false, expected: 'Short', description: 'short text displays fully' },
      { text: 'A'.repeat(150), maxLength: 100, showFullText: true, expected: 'A'.repeat(150), description: 'long text with showFullText enabled' },
      
      // Cases where text is truncated
      { text: 'Hello World This is a long text', maxLength: 11, showFullText: false, expected: 'Hello World', description: 'text truncated to maxLength' },
      { text: 'A'.repeat(200), maxLength: 50, showFullText: false, expected: 'A'.repeat(50), description: 'very long text truncated' },
      
      // Edge cases
      { text: '', maxLength: 100, showFullText: false, expected: '', description: 'empty text returns empty' },
      { text: 'Test', maxLength: 0, showFullText: false, expected: '', description: 'maxLength of 0 returns empty' }
    ])('should return "$expected" for $description', ({ text, maxLength, showFullText, expected }) => {
      component.text = text;
      component.maxLength = maxLength;
      component.showFullText = showFullText;

      expect(component.displayText).toBe(expected);
    });
  });

  describe('Read More Dialog Mode', () => {
    it('should emit showDialogEvent when showInDialog is true', () => {
      const emitSpy = vi.spyOn(component.showDialogEvent, 'emit');
      component.text = 'This is a long text that needs truncation';
      component.showInDialog = true;

      component.onReadMore();

      expect(emitSpy).toHaveBeenCalledWith({ text: component.text });
      expect(component.showFullText).toBe(false);
    });

    it('should emit with custom productName when provided', () => {
      const emitSpy = vi.spyOn(component.showDialogEvent, 'emit');
      component.text = 'Product description';
      component.showInDialog = true;

      component.onReadMore();

      expect(emitSpy).toHaveBeenCalledWith({ text: 'Product description' });
    });
  });

  describe('Read More Inline Mode', () => {
    it('should toggle showFullText when showInDialog is false', () => {
      component.text = 'Long text that needs expansion';
      component.showInDialog = false;
      component.showFullText = false;

      component.onReadMore();

      expect(component.showFullText).toBe(true);
    });

    it('should not emit event when showInDialog is false', () => {
      const emitSpy = vi.spyOn(component.showDialogEvent, 'emit');
      component.showInDialog = false;

      component.onReadMore();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Read Less Functionality', () => {
    it('should collapse text when showLess is called', () => {
      component.showFullText = true;

      component.showLess();

      expect(component.showFullText).toBe(false);
    });

    it('should update displayText after collapsing', () => {
      component.text = 'A'.repeat(200);
      component.maxLength = 50;
      component.showFullText = true;

      component.showLess();

      expect(component.displayText).toBe('A'.repeat(50));
    });
  });

  describe('Component Initialization', () => {
    it('should initialize with default values', () => {
      expect(component.text).toBe('');
      expect(component.maxLength).toBe(100);
      expect(component.showInDialog).toBe(true);
      expect(component.showFullText).toBe(false);
    });

    it.each([
      { text: 'Custom text', maxLength: 50, showInDialog: false },
      { text: 'Another example', maxLength: 200, showInDialog: true },
      { text: '', maxLength: 0, showInDialog: false }
    ])('should accept custom input values: %s', ({ text, maxLength, showInDialog }) => {
      component.text = text;
      component.maxLength = maxLength;
      component.showInDialog = showInDialog;

      expect(component.text).toBe(text);
      expect(component.maxLength).toBe(maxLength);
      expect(component.showInDialog).toBe(showInDialog);
    });
  });
});
