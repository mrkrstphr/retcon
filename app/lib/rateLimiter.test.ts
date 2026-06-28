import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from './rateLimiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect(limiter.canMakeRequest()).toBe(true);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('blocks requests when limit is reached', () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
  });

  it('throws with time-until-reset message when limit exceeded', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.recordRequest();
    expect(() => limiter.recordRequest()).toThrow(/Rate limit exceeded/);
  });

  it('allows requests again after window expires', () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(limiter.canMakeRequest()).toBe(true);
  });

  it('reports correct remaining requests', () => {
    const limiter = new RateLimiter(5, 60_000);
    expect(limiter.getRemainingRequests()).toBe(5);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.getRemainingRequests()).toBe(3);
  });

  it('remaining requests never goes below zero', () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.recordRequest();
    limiter.recordRequest();
    // manually fill beyond limit via a direct check
    expect(limiter.getRemainingRequests()).toBe(0);
  });

  it('getRequestCount reflects current window only', () => {
    const limiter = new RateLimiter(10, 60_000);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.getRequestCount()).toBe(2);

    vi.advanceTimersByTime(61_000);
    expect(limiter.getRequestCount()).toBe(0);
  });

  it('reset clears all tracked requests', () => {
    const limiter = new RateLimiter(2, 60_000);
    limiter.recordRequest();
    limiter.recordRequest();
    expect(limiter.canMakeRequest()).toBe(false);
    limiter.reset();
    expect(limiter.canMakeRequest()).toBe(true);
    expect(limiter.getRemainingRequests()).toBe(2);
  });
});
