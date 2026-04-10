import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatOpenCloseTime, isRestaurantOpen, convertFirebaseDate, matchesSearch } from './common.util';

describe('common.util', () => {
  
  describe('formatOpenCloseTime', () => {
    it.each([
      ['09:00', '17:00', '9AM - 5PM', 'times with no minutes as 12-hour format without minutes'],
      ['09:30', '17:45', '9:30AM - 5:45PM', 'times with minutes as 12-hour format with minutes'],
      ['00:00', '23:59', '12AM - 11:59PM', 'midnight (00:00) as 12AM'],
      ['12:00', '13:00', '12PM - 1PM', 'noon (12:00) as 12PM'],
      ['14:30', '22:00', '2:30PM - 10PM', 'afternoon times correctly'],
      ['06:15', '08:45', '6:15AM - 8:45AM', 'early morning times'],
      ['09:05', '17:05', '9:05AM - 5:05PM', 'single digit minutes with zero padding']
    ])('should format %s-%s as %s (%s)', (openTime, closeTime, expected) => {
      const result = formatOpenCloseTime(openTime, closeTime);
      expect(result).toBe(expected);
    });
  });

  describe('isRestaurantOpen', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      // Empty/invalid inputs
      ['', '17:00', 'openTime is empty'],
      ['09:00', '', 'closeTime is empty'],
      ['', '', 'both times are empty']
    ])('should return false when %s', (openTime, closeTime, _description) => {
      expect(isRestaurantOpen(openTime, closeTime)).toBe(false);
    });

    it.each([
      // Within operating hours
      ['2024-01-01T10:00:00', '09:00', '17:00', true, 'current time is between open and close times'],
      // Outside operating hours
      ['2024-01-01T08:00:00', '09:00', '17:00', false, 'current time is before open time'],
      ['2024-01-01T18:00:00', '09:00', '17:00', false, 'current time is after close time'],
      // Boundary conditions
      ['2024-01-01T09:00:00', '09:00', '17:00', true, 'current time equals open time'],
      ['2024-01-01T17:00:00', '09:00', '17:00', true, 'current time equals close time'],
      // Late night hours
      ['2024-01-01T23:00:00', '18:00', '23:30', true, 'late night hours']
    ])('should return %s when %s', (mockTime, openTime, closeTime, expected, _description) => {
      vi.setSystemTime(new Date(mockTime));
      expect(isRestaurantOpen(openTime, closeTime)).toBe(expected);
    });
  });

  describe('convertFirebaseDate', () => {
    it.each([
      // Null/undefined inputs - return current date
      [null, 'null'],
      [undefined, 'undefined']
    ])('should return current date when input is %s', (input, _description) => {
      const before = Date.now();
      const result = convertFirebaseDate(input);
      const after = Date.now();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it.each([
      // Firebase Timestamp objects
      [new Date('2024-01-15T10:30:00Z'), 'basic Firebase Timestamp'],
      [new Date('2024-12-25T12:00:00Z'), 'Firebase Timestamp with seconds and nanoseconds']
    ])('should convert Firebase Timestamp object using toDate method', (expectedDate, _description) => {
      const mockFirebaseTimestamp = { toDate: vi.fn().mockReturnValue(expectedDate) };
      const result = convertFirebaseDate(mockFirebaseTimestamp);
      
      expect(mockFirebaseTimestamp.toDate).toHaveBeenCalledOnce();
      expect(result).toBe(expectedDate);
    });

    it('should return Date object as-is when input is already a Date', () => {
      const inputDate = new Date('2024-06-20T14:30:00Z');
      const result = convertFirebaseDate(inputDate);
      
      expect(result).toBe(inputDate);
      expect(result).toBeInstanceOf(Date);
    });

    it.each([
      // String and number conversions
      ['2024-03-10T08:45:30Z', 'ISO string'],
      [1704067200000, 'timestamp number']
    ])('should convert %s to Date', (input, _description) => {
      const result = convertFirebaseDate(input);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date(input).getTime());
    });
  });

  describe('matchesSearch', () => {
    it.each([
      // Empty inputs - should return false
      ['', 'pizza', false, 'itemName is empty'],
      ['Margherita Pizza', '', false, 'search is empty'],
      ['', '', false, 'both are empty'],
      // No match cases - should return false
      ['Cheese Pizza', 'cheese burger', false, 'some tokens are missing'],
      ['Cheese Pizza', 'burger fries', false, 'no tokens overlap'],
      // Case-insensitive matches - should return true
      ['Margherita Pizza', 'pizza', true, 'exact word case-insensitively'],
      ['margherita pizza', 'PIZZA', true, 'uppercase search term'],
      ['Margherita Pizza', 'MaRgHeRiTa', true, 'mixed case search term'],
      // Partial matches - should return true
      ['Cheese Pizza', 'chee', true, 'partial word substring'],
      ['Margherita Pizza', 'heri', true, 'substring in middle of word'],
      ['Pepperoni', 'pepper', true, 'search is subset of single word'],
      ['Pepperoni Pizza', 'pep', true, 'search token is superset'],
      // CamelCase splitting - should return true
      ['WhiteSausePasta', 'white', true, 'camelCase splitting - white'],
      ['WhiteSausePasta', 'sause', true, 'camelCase splitting - sause'],
      ['WhiteSausePasta', 'pasta', true, 'camelCase splitting - pasta'],
      // Token order - should return true
      ['Chicken Tikka Masala', 'masala chicken', true, 'multiple tokens in any order'],
      ['Pepperoni Pizza Large', 'large pepperoni', true, 'tokens in reversed order'],
      // Special characters - should return true
      ['Chicken-Tikka', 'chicken tikka', true, 'special characters as spaces'],
      ['chicken_tikka_masala', 'tikka', true, 'underscores as word separators'],
      ['Café Latte', 'cafe', true, 'accented or non-ASCII characters'],
      // Numbers and spaces - should return true
      ['Pizza 12 inch', '12', true, 'numbers in search'],
      ['Cheese    Pizza', 'cheese pizza', true, 'multiple spaces in item name'],
      ['Cheese Pizza', 'cheese    pizza', true, 'multiple spaces in search term'],
      ['Pizza A La Carte', 'a', true, 'single character tokens']
    ])('should return %s when searching "%s" for "%s" (%s)', (itemName, search, expected, _description) => {
      expect(matchesSearch(itemName, search)).toBe(expected);
    });
  });
});
