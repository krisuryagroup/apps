import { Injectable } from '@angular/core';

interface RequestInfo {
  lastCallTime: number;
  callCount: number;
  isBlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RequestThrottleService {
  private requests = new Map<string, RequestInfo>();
  private readonly MAX_CALLS_PER_MINUTE = 10;
  private readonly BLOCK_DURATION = 60 * 1000; // 1 minute
  private readonly MIN_INTERVAL_BETWEEN_CALLS = 1000; // 1 second

  constructor() {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const requestInfo = this.requests.get(key) || {
      lastCallTime: 0,
      callCount: 0,
      isBlocked: false
    };

    // If blocked, check if block period has expired
    if (requestInfo.isBlocked) {
      if (now - requestInfo.lastCallTime > this.BLOCK_DURATION) {
        requestInfo.isBlocked = false;
        requestInfo.callCount = 0;
      } else {
        console.warn(`Request throttled: ${key} is blocked for ${Math.round((this.BLOCK_DURATION - (now - requestInfo.lastCallTime)) / 1000)}s`);
        return false;
      }
    }

    // Check minimum interval between calls
    if (now - requestInfo.lastCallTime < this.MIN_INTERVAL_BETWEEN_CALLS) {
      console.warn(`Request throttled: ${key} called too frequently`);
      return false;
    }

    // Reset call count if more than a minute has passed
    if (now - requestInfo.lastCallTime > 60 * 1000) {
      requestInfo.callCount = 0;
    }

    // Check if too many calls in the last minute
    if (requestInfo.callCount >= this.MAX_CALLS_PER_MINUTE) {
      requestInfo.isBlocked = true;
      console.warn(`Request throttled: ${key} exceeded ${this.MAX_CALLS_PER_MINUTE} calls per minute`);
      return false;
    }

    return true;
  }

  recordRequest(key: string): void {
    const now = Date.now();
    const requestInfo = this.requests.get(key) || {
      lastCallTime: 0,
      callCount: 0,
      isBlocked: false
    };

    requestInfo.lastCallTime = now;
    requestInfo.callCount++;
    this.requests.set(key, requestInfo);
  }

  async throttledRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    fallback?: T
  ): Promise<T | undefined> {
    if (!this.canMakeRequest(key)) {
      return fallback;
    }

    try {
      this.recordRequest(key);
      return await requestFn();
    } catch (error) {
      console.error(`Throttled request failed for ${key}:`, error);
      throw error;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.requests.entries()) {
      // Remove entries older than 5 minutes
      if (now - info.lastCallTime > 5 * 60 * 1000) {
        this.requests.delete(key);
      }
    }
  }

  // Method to manually clear throttling for a specific key
  clearThrottling(key: string): void {
    this.requests.delete(key);
  }

  // Method to get current throttling status
  getThrottleStatus(key: string): RequestInfo | null {
    return this.requests.get(key) || null;
  }
}
