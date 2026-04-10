import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';
import * as firestore from 'firebase/firestore';
import * as firebaseApp from 'firebase/app';

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }))
  }
}));

vi.mock('firebase/app', () => ({
  getApp: vi.fn()
}));

describe('FirebaseErrorHandlerService', () => {
  let service: FirebaseErrorHandlerService;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    service = new FirebaseErrorHandlerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
    });
  });

  describe('handleError', () => {
    it.each([
      // Firebase error codes with expected messages
      ['permission-denied', 'Access denied. Please check your permissions.', false],
      ['unavailable', 'Service temporarily unavailable. Please try again.', true],
      ['not-found', 'Requested data not found.', false],
      ['cancelled', 'Operation was cancelled.', true],
      ['deadline-exceeded', 'Request timed out. Please try again.', true],
      ['invalid-argument', 'Invalid request. Please check your data.', false],
      ['unauthenticated', 'Authentication required.', false],
    ])('should handle Firebase error: %s', (code, expectedMessage, shouldRetry) => {
      const error = {
        code,
        message: `Firebase error: ${code}`
      };

      const result = service.handleError(error);

      expect(result.code).toBe(code);
      expect(result.userFriendlyMessage).toBe(expectedMessage);
      expect(result.shouldRetry).toBe(shouldRetry);
    });

    it('should handle unknown errors', () => {
      const error = new Error('Some random error');

      const result = service.handleError(error);

      expect(result.code).toBe('unknown');
      expect(result.userFriendlyMessage).toBe('Something went wrong. Please try again.');
      expect(result.shouldRetry).toBe(true);
    });

    it('should handle non-error objects', () => {
      const result = service.handleError('string error');

      expect(result.code).toBe('unknown');
      expect(result.shouldRetry).toBe(true);
    });

    it('should handle null/undefined errors', () => {
      const result1 = service.handleError(null);
      const result2 = service.handleError(undefined);

      expect(result1.code).toBe('unknown');
      expect(result2.code).toBe('unknown');
    });

    it('should include action for specific error codes', () => {
      const error = { code: 'permission-denied', message: 'Access denied' };

      const result = service.handleError(error);

      expect(result.action).toBe('Check Firebase Security Rules and ensure they allow read access');
    });

    it('should log error details', () => {
      const error = { code: 'test-error', message: 'Test message' };

      service.handleError(error);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Error information structure', () => {
    it('should return complete error info object', () => {
      const error = { code: 'permission-denied', message: 'Access denied' };

      const result = service.handleError(error);

      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userFriendlyMessage');
      expect(result).toHaveProperty('shouldRetry');
    });
  });

  describe('Edge cases', () => {
    it('should handle errors without code property', () => {
      const error = { message: 'Error without code' };

      const result = service.handleError(error);

      expect(result.code).toBe('unknown');
    });

    it('should handle errors with non-string code', () => {
      const error = { code: 12345, message: 'Numeric code' };

      const result = service.handleError(error);

      expect(result.code).toBe(12345);
    });
  });
});
