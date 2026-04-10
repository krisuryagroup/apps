import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RequestThrottleService } from './request-throttle.service';

describe('RequestThrottleService', () => {
  let service: RequestThrottleService;
  let originalDateNow: () => number;

  beforeEach(() => {
    service = new RequestThrottleService();
    originalDateNow = Date.now;
    vi.useFakeTimers();
  });

  afterEach(() => {
    Date.now = originalDateNow;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Request Throttling', () => {
    it('should allow first request', () => {
      const canMake = service.canMakeRequest('test-key');

      expect(canMake).toBe(true);
    });

    it('should block requests within minimum interval', () => {
      service.recordRequest('test-key');
      
      // Try immediately
      const canMake = service.canMakeRequest('test-key');

      expect(canMake).toBe(false);
    });

    it('should allow request after minimum interval', () => {
      service.recordRequest('test-key');
      
      // Advance time by 1 second
      vi.advanceTimersByTime(1000);
      
      const canMake = service.canMakeRequest('test-key');

      expect(canMake).toBe(true);
    });

    it('should block after exceeding max calls per minute', () => {
      // Make 10 requests (max allowed)
      for (let i = 0; i < 10; i++) {
        service.recordRequest('test-key');
        vi.advanceTimersByTime(1100); // Slightly over minimum interval
      }

      const canMake = service.canMakeRequest('test-key');

      expect(canMake).toBe(false);
    });

    it('should reset call count after one minute', () => {
      service.recordRequest('test-key');
      
      // Advance time by more than a minute
      vi.advanceTimersByTime(61000);
      
      const canMake = service.canMakeRequest('test-key');

      expect(canMake).toBe(true);
    });

    it('should unblock after block duration expires', () => {
      // Exceed max calls
      for (let i = 0; i < 11; i++) {
        service.recordRequest('test-key');
        vi.advanceTimersByTime(1100);
      }

      // Should be blocked
      expect(service.canMakeRequest('test-key')).toBe(false);

      // Advance past block duration
      vi.advanceTimersByTime(61000);

      // Should be unblocked
      expect(service.canMakeRequest('test-key')).toBe(true);
    });
  });

  describe('Throttled Request Execution', () => {
    it('should execute request when allowed', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await service.throttledRequest('test-key', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should not execute when throttled and return undefined', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      
      // First call succeeds
      await service.throttledRequest('test-key', mockFn);
      
      // Second immediate call should be blocked
      const result = await service.throttledRequest('test-key', mockFn);

      expect(result).toBeUndefined();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should return fallback value when throttled', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      
      await service.throttledRequest('test-key', mockFn);
      
      const result = await service.throttledRequest('test-key', mockFn, 'fallback');

      expect(result).toBe('fallback');
    });

    it('should handle request errors gracefully', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Request failed'));
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(service.throttledRequest('test-key', mockFn)).rejects.toThrow('Request failed');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Multiple Keys', () => {
    it('should throttle independently for different keys', () => {
      service.recordRequest('key-1');
      service.recordRequest('key-2');

      // Both should be blocked immediately after
      expect(service.canMakeRequest('key-1')).toBe(false);
      expect(service.canMakeRequest('key-2')).toBe(false);

      // Advance time
      vi.advanceTimersByTime(1100);

      // Both should be allowed now
      expect(service.canMakeRequest('key-1')).toBe(true);
      expect(service.canMakeRequest('key-2')).toBe(true);
    });

    it('should not affect other keys when one is blocked', () => {
      // Block key-1
      for (let i = 0; i < 11; i++) {
        service.recordRequest('key-1');
        vi.advanceTimersByTime(1100);
      }

      // key-1 should be blocked
      expect(service.canMakeRequest('key-1')).toBe(false);
      
      // key-2 should still work
      expect(service.canMakeRequest('key-2')).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old entries', () => {
      service.recordRequest('old-key');
      
      // Trigger cleanup (runs every 5 minutes)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // Old entry should still work but be reset
      expect(service.canMakeRequest('old-key')).toBe(true);
    });
  });

  describe('Request Recording', () => {
    it('should track request count', () => {
      service.recordRequest('test-key');
      service.recordRequest('test-key');
      service.recordRequest('test-key');

      // After 3 requests, should still allow more (under limit of 10)
      vi.advanceTimersByTime(1100);
      expect(service.canMakeRequest('test-key')).toBe(true);
    });

    it('should update last call time on each request', () => {
      const startTime = Date.now();
      service.recordRequest('test-key');
      
      vi.advanceTimersByTime(2000);
      service.recordRequest('test-key');

      // The interval check should be based on the last call
      expect(service.canMakeRequest('test-key')).toBe(false);
      
      vi.advanceTimersByTime(1100);
      expect(service.canMakeRequest('test-key')).toBe(true);
    });
  });
});
