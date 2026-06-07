/**
 * Simple in-memory rate limiter for API requests
 *
 * Tracks requests in a sliding window to enforce rate limits
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request can be made
   * @returns true if request is allowed, false if rate limit exceeded
   */
  canMakeRequest(): boolean {
    this.cleanupOldRequests();
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a request
   * @throws Error if rate limit exceeded
   */
  recordRequest(): void {
    this.cleanupOldRequests();

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const timeUntilReset = Math.ceil(
        (oldestRequest + this.windowMs - Date.now()) / 1000 / 60,
      );
      throw new Error(
        `Rate limit exceeded. Try again in ${timeUntilReset} minute${timeUntilReset !== 1 ? 's' : ''}.`,
      );
    }

    this.requests.push(Date.now());
  }

  /**
   * Get current request count
   */
  getRequestCount(): number {
    this.cleanupOldRequests();
    return this.requests.length;
  }

  /**
   * Get remaining requests in current window
   */
  getRemainingRequests(): number {
    this.cleanupOldRequests();
    return Math.max(0, this.maxRequests - this.requests.length);
  }

  /**
   * Remove requests older than the time window
   */
  private cleanupOldRequests(): void {
    const now = Date.now();
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.windowMs,
    );
  }

  /**
   * Reset all tracked requests
   */
  reset(): void {
    this.requests = [];
  }
}
