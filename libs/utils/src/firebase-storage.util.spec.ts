import { describe, it, expect } from 'vitest';
import { FirebaseStorageUtil } from './firebase-storage.util';

describe('FirebaseStorageUtil', () => {
  
  describe('convertStorageUrlToHttps', () => {
    it.each([
      // Valid gs:// conversions
      ['gs://my-bucket/images/food.jpg', 'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/images%2Ffood.jpg?alt=media', 'exact', 'simple path'],
      ['gs://my-bucket/path/to/deep/image.png', 'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/path%2Fto%2Fdeep%2Fimage.png?alt=media', 'exact', 'nested path'],
      ['gs://my-bucket/images/food item.jpg', 'food%20item.jpg', 'contains', 'spaces in filename'],
      // Non-gs:// URLs (passthrough)
      ['https://example.com/image.jpg', 'https://example.com/image.jpg', 'exact', 'https URL'],
      ['http://example.com/image.jpg', 'http://example.com/image.jpg', 'exact', 'http URL'],
      ['', '', 'exact', 'empty string'],
      ['regular-string', 'regular-string', 'exact', 'plain text'],
      // Edge cases
      ['gs://my-bucket', 'gs://my-bucket', 'exact', 'bucket only']
    ])('should handle %s', (input, expected, assertionType, _description) => {
      const result = FirebaseStorageUtil.convertStorageUrlToHttps(input);
      
      if (assertionType === 'exact') {
        expect(result).toBe(expected);
      } else {
        expect(result).toContain(expected);
      }
    });
  });

  describe('processImageUrls', () => {
    it('should convert gs:// URLs for all items', () => {
      const items = [
        { id: 1, name: 'Pizza', imageURL: 'gs://bucket/pizza.jpg' },
        { id: 2, name: 'Burger', imageURL: 'gs://bucket/burger.jpg' }
      ];
      const result = FirebaseStorageUtil.processImageUrls(items as any);

      expect(result[0].imageURL).toContain('https://firebasestorage.googleapis.com');
      expect(result[1].imageURL).toContain('https://firebasestorage.googleapis.com');
    });

    it.each([
      [[], 'empty array'],
      [[{ id: 1, imageURL: 'https://example.com/image.jpg' }], 'https URL']
    ])('should handle %s', (items, _description) => {
      const result = FirebaseStorageUtil.processImageUrls(items as any);
      
      if (items.length === 0) {
        expect(result).toEqual([]);
      } else {
        expect(result[0].imageURL).toBe('https://example.com/image.jpg');
      }
    });
  });
});
